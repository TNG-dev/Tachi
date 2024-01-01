import { GetImportFromParam, RequireOwnershipOfImportOrAdmin } from "./middleware";
import { Router } from "express";
import db from "external/mongo/db";
import { JOB_RETRY_COUNT } from "lib/constants/tachi";
import { RevertImport } from "lib/imports/imports";
import CreateLogCtx from "lib/logger/logger";
import ScoreImportQueue, { ScoreImportQueueEvents } from "lib/score-import/worker/queue";
import { ServerConfig, TachiConfig } from "lib/setup/config";
import { p } from "prudence";
import { RequirePermissions } from "server/middleware/auth";
import prValidate from "server/middleware/prudence-validate";
import { GetRelevantSongsAndCharts } from "utils/db";
import { DeleteUndefinedProps } from "utils/misc";
import { GetTachiData } from "utils/req-tachi-data";
import { GetUsersWithIDs, GetUserWithID } from "utils/user";
import type { ScoreImportWorkerReturns } from "lib/score-import/worker/types";
import type { FilterQuery } from "mongodb";
import type { ImportTrackerDocument, ImportTypes } from "tachi-common";

const router: Router = Router({ mergeParams: true });

const logger = CreateLogCtx(__filename);

/**
 * Query imports. Returns the 500 most recently-finished imports.
 *
 * @param importType - Optionally, limit the returns to only this import type.
 * @param userIntent - Optionally, limit returns to only those with or without userIntent.
 *
 * @name GET /api/v1/imports
 */
router.get(
	"/",
	prValidate({
		importType: p.optional(p.isIn(TachiConfig.IMPORT_TYPES)),
		userIntent: p.optional(p.isIn("true", "false")),
	}),
	async (req, res) => {
		const importType = req.query.importType as ImportTypes | undefined;

		// all query input ends up as strings, so we need convert it into an optional
		// boolean
		const userIntent =
			req.query.userIntent === undefined ? undefined : req.query.userIntent === "true";

		const query = {
			userIntent,
			importType,
		};

		DeleteUndefinedProps(query);

		const imports = await db.imports.find(query, {
			sort: { timeFinished: -1 },
			limit: 500,
		});

		// mayaswell attach the users for better UI.
		const users = await GetUsersWithIDs(imports.map((e) => e.userID));

		return res.status(200).json({
			success: true,
			description: `Found ${imports.length} imports.`,
			body: {
				imports,
				users,
			},
		});
	}
);

/**
 * Query *failed* imports. Returns the 500 most recently-finished imports.
 *
 * This is done by checking import-trackers for imports that ended with a thrown
 * error. An import is considered 'failed' if ScoreImportFatalError is thrown at any
 * point during the process, or if any unknown error is thrown.
 *
 * @param importType - Optionally, limit the returns to only this import type.
 * @param userIntent - Optionally, limit returns to only those with or without userIntent.
 *
 * @name GET /api/v1/imports/failed
 */
router.get(
	"/failed",
	prValidate({
		importType: p.optional(p.isIn(TachiConfig.IMPORT_TYPES)),
		userIntent: p.optional(p.isIn("true", "false")),
	}),
	async (req, res) => {
		const importType = req.query.importType as ImportTypes | undefined;

		// all query input ends up as strings, so we need convert it into an optional
		// boolean
		const userIntent =
			req.query.userIntent === undefined ? undefined : req.query.userIntent === "true";

		const query: FilterQuery<ImportTrackerDocument> = {
			userIntent,
			importType,
			type: "FAILED",
		};

		DeleteUndefinedProps(query);

		const trackers = await db["import-trackers"].find(query, {
			sort: { timeStarted: -1 },
			limit: 500,
		});

		// mayaswell attach the users for better UI.
		const users = await GetUsersWithIDs(trackers.map((e) => e.userID));

		return res.status(200).json({
			success: true,
			description: `Found ${trackers.length} failed imports.`,
			body: {
				failedImports: trackers,
				users,
			},
		});
	}
);

/**
 * Retrieve an import with this ID.
 *
 * @name GET /api/v1/imports/:importID
 */
router.get("/:importID", GetImportFromParam, async (req, res) => {
	const importDoc = GetTachiData(req, "importDoc");

	const scores = await db.scores.find({
		scoreID: { $in: importDoc.scoreIDs },
	});

	const { songs, charts } = await GetRelevantSongsAndCharts(scores, importDoc.game);

	const sessions = await db.sessions.find({
		sessionID: { $in: importDoc.createdSessions.map((e) => e.sessionID) },
	});

	const user = await GetUserWithID(importDoc.userID);

	if (!user) {
		logger.severe(`User ${importDoc.userID} doesn't exist, yet has a session?`);
		return res.status(500).json({
			success: false,
			description: `An internal server error has occured.`,
		});
	}

	return res.status(200).json({
		success: true,
		description: `Returned info about this session.`,
		body: {
			scores,
			songs,
			charts,
			sessions,
			import: importDoc,
			user,
		},
	});
});

/**
 * Delete this import and revert it from having ever happened. This un-imports all
 * of the scores that were imported.
 *
 * Must be a request from the owner of this import.
 *
 * Counterintuitively, this endpoint requires the "delete_score" permission. This is
 * because reverting an import is actually just deleting all of its scores.
 *
 * @name POST /api/v1/imports/:importID/revert
 */
router.post(
	"/:importID/revert",
	GetImportFromParam,
	RequireOwnershipOfImportOrAdmin,
	RequirePermissions("delete_score"),
	async (req, res) => {
		const importDoc = GetTachiData(req, "importDoc");

		const k = await RevertImport(importDoc);

		if (k !== null) {
			return res.status(409).json({
				success: false,
				description: `You already have an import or a revert ongoing.`,
			});
		}

		return res.status(200).json({
			success: true,
			description: `Reverted import.`,
			body: {},
		});
	}
);

// Finding jobs is slightly harder than just doing a key lookup, because of retrying.
async function FindImportJob(importID: string) {
	const possibleImportIDs = [];

	for (let i = 1; i <= JOB_RETRY_COUNT; i++) {
		possibleImportIDs.push(`${importID}:TRY${i}`);
	}

	// Note that instead of the cleaner await-inside-for here, we parallelise this
	// for performance.
	// Just for scalings sake.
	const maybeJob = (
		await Promise.all(possibleImportIDs.map((i) => ScoreImportQueue.getJob(i)))
	).find((k) => k);

	return maybeJob;
}

/**
 * Retrieve the status of an ongoing import.
 * If the import has been finalised and was successful, return 200.
 *
 * If the import is ongoing, return its progress.
 *
 * If the import was never ongoing, return 404.
 *
 * If the import was finalised and was unsuccessful (i.e. threw a fatal error)
 * return its error information in expressified form.
 *
 * @name GET /api/v1/import/:importID/poll-status
 */
router.get("/:importID/poll-status", async (req, res) => {
	if (!ServerConfig.USE_EXTERNAL_SCORE_IMPORT_WORKER) {
		return res.status(501).json({
			success: false,
			description: `${TachiConfig.NAME} does not use an external score import worker. Polling imports is not possible. This import may be ongoing, or it may have never occured.`,
		});
	}

	const importDoc = await db.imports.findOne({ importID: req.params.importID });

	if (importDoc) {
		return res.status(200).json({
			success: true,
			description: `Import was completed!`,
			body: {
				importStatus: "completed",
				import: importDoc,
			},
		});
	}

	const job = await FindImportJob(req.params.importID);

	if (!job) {
		const tracker = await db["import-trackers"].findOne({
			importID: req.params.importID,
		});

		if (!tracker) {
			return res.status(404).json({
				success: false,
				description: `There is no ongoing import here.`,
			});
		}

		// the user has requested the status of the import before the job has even
		// been sent to redis. This is rare, but prevents a race condition of saying
		// that an import is not ongoing when it is.

		switch (tracker.type) {
			case "ONGOING":
				return res.status(200).json({
					success: true,
					description: `Import is ongoing.`,
					body: {
						importStatus: "ongoing",
						progress: 0,
					},
				});
			case "FAILED":
				return res.status(tracker.error.statusCode ?? 500).json({
					success: false,
					description: tracker.error.message,
				});
			default:
				throw new Error(
					// eslint-disable-next-line lines-around-comment
					// @ts-expect-error shouldn't happen
					`Unknown tracker type ${tracker.type}, expected ONGOING or FAILED.`
				);
		}
	}

	// job.isFailed() actually means a critical error has occured.
	// As in, an unhandled exception was thrown.
	if (await job.isFailed()) {
		logger.error("Internal Server Error with job?", { job });

		return res.status(500).json({
			success: false,
			description: `An internal service error has occured with this import. This has been reported!`,
		});
	} else if (await job.isCompleted()) {
		const content = (await job.waitUntilFinished(
			ScoreImportQueueEvents
		)) as ScoreImportWorkerReturns;

		// Since job.isFailed() is for whether a job had a fatal exception
		// or not. We still want to check whether a job failed from say,
		// nonsense user input.
		// As such, if content.success == true, then the import was
		// successful.
		// Else, it was a "score import fatal error", which means the user
		// screwed something up and we had to bail on the import.
		if (content.success) {
			return res.status(200).json({
				success: true,
				description: `Import was completed!`,
				body: {
					importStatus: "completed",
					import: content.importDocument,
				},
			});
		}

		return res.status(content.statusCode).json({
			success: false,
			description: content.description,
		});
	}

	const progress = job.progress;

	return res.status(200).json({
		success: true,
		description: `Import is ongoing.`,
		body: {
			importStatus: "ongoing",
			progress: progress === 0 ? { description: "Starting up import." } : progress,
		},
	});
});

export default router;
