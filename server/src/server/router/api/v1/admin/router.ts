/* eslint-disable no-await-in-loop */
import { Router } from "express";
import db from "external/mongo/db";
import { SYMBOL_TACHI_API_AUTH } from "lib/constants/tachi";
import { ONE_MINUTE } from "lib/constants/time";
import CreateLogCtx, { ChangeRootLogLevel, GetLogLevel } from "lib/logger/logger";
import { SendSiteAnnouncementNotification } from "lib/notifications/notification-wrappers";
import { UpdateGoalsForUser } from "lib/score-import/framework/goals/goals";
import { UpdateQuestsForUser } from "lib/score-import/framework/quests/quests";
import { DeleteMultipleScores, DeleteScore } from "lib/score-mutation/delete-scores";
import { ServerConfig, TachiConfig } from "lib/setup/config";
import { p } from "prudence";
import prValidate from "server/middleware/prudence-validate";
import { UserAuthLevels } from "tachi-common";
import { RecalcAllScores, UpdateAllPBs } from "utils/calculations/recalc-scores";
import { RecalcSessions } from "utils/calculations/recalc-sessions";
import { IsValidPlaytype } from "utils/misc";
import DestroyUserGamePlaytypeData from "utils/reset-state/destroy-ugpt";
import { GetUserWithID, ResolveUser } from "utils/user";
import type { RequestHandler } from "express";
import type { Game, GoalSubscriptionDocument, integer, Playtype } from "tachi-common";

const logger = CreateLogCtx(__filename);

const router: Router = Router({ mergeParams: true });

const RequireAdminLevel: RequestHandler = async (req, res, next) => {
	if (req[SYMBOL_TACHI_API_AUTH].userID === null) {
		return res.status(401).json({
			success: false,
			description: `You are not authenticated.`,
		});
	}

	const userDoc = await GetUserWithID(req[SYMBOL_TACHI_API_AUTH].userID);

	if (!userDoc) {
		logger.severe(
			`Api Token ${req[SYMBOL_TACHI_API_AUTH].token} is assigned to ${req[SYMBOL_TACHI_API_AUTH].userID}, who does not exist?`
		);

		return res.status(500).json({
			success: false,
			description: `An internal error has occured.`,
		});
	}

	if (userDoc.authLevel !== UserAuthLevels.ADMIN) {
		return res.status(403).json({
			success: false,
			description: `You are not authorised to perform this.`,
		});
	}

	next();
};

const LOG_LEVEL = ServerConfig.LOGGER_CONFIG.LOG_LEVEL;

router.use(RequireAdminLevel);

let currentLogLevelTimer: NodeJS.Timeout | null = null;

/**
 * Changes the current server log level to the provided `logLevel` in the request body.
 *
 * @param logLevel - The log level to change to.
 * @param duration - The amount of minutes to wait before changing the log level back to the default.
 * Defaults to 60 minutes.
 * @param noReset - If true, do not ever reset this decision.
 *
 * @name POST /api/v1/admin/change-log-level
 */
router.post(
	"/change-log-level",
	prValidate({
		logLevel: p.isIn("crit", "severe", "error", "warn", "info", "verbose", "debug"),
		duration: p.optional(p.isPositiveNonZero),
		noReset: p.optional("boolean"),
	}),
	(req, res) => {
		const body = req.safeBody as {
			logLevel: "crit" | "debug" | "error" | "info" | "severe" | "verbose" | "warn";
			duration?: integer;
			noReset?: boolean;
		};

		const logLevel = GetLogLevel();

		ChangeRootLogLevel(body.logLevel);

		const duration = body.duration ?? 60;

		if (currentLogLevelTimer) {
			logger.verbose(`Removing last timer to reset log level to ${LOG_LEVEL}.`);
			clearTimeout(currentLogLevelTimer);
		}

		logger.info(`Log level has been changed to ${body.logLevel}.`);

		if (body.noReset !== true) {
			logger.info(`This will reset to "${LOG_LEVEL}" level in ${duration} minutes.`);

			currentLogLevelTimer = setTimeout(() => {
				logger.verbose(`Changing log level back to ${LOG_LEVEL}.`);
				ChangeRootLogLevel(LOG_LEVEL);
				logger.info(`Reset log level back to ${LOG_LEVEL}.`);
			}, duration * ONE_MINUTE);
		}

		return res.status(200).json({
			success: true,
			description: `Changed log level from ${logLevel} to ${body.logLevel}.`,
			body: {},
		});
	}
);

/**
 * Resynchronises all PBs that match the given query or users.
 *
 * @param userIDs - Optionally, An array of integers of users to resync.
 * @param filter - Optionally, the set of scores to resync.
 *
 * @name POST /api/v1/admin/resync-pbs
 */
router.post(
	"/resync-pbs",
	prValidate({
		userIDs: p.optional([p.isPositiveInteger]),
		filter: "*object",
	}),
	async (req, res) => {
		const body = req.safeBody as {
			userIDs?: Array<integer>;
			filter?: object;
		};

		await UpdateAllPBs(body.userIDs, body.filter);

		return res.status(200).json({
			success: true,
			description: `Done.`,
			body: {},
		});
	}
);

/**
 * Force Delete anyones score.
 *
 * @param scoreID - The scoreID to delete.
 *
 * @name POST /api/v1/admin/delete-score
 */
router.post("/delete-score", prValidate({ scoreID: "string" }), async (req, res) => {
	const body = req.safeBody as { scoreID: string };

	const score = await db.scores.findOne({ scoreID: body.scoreID });

	if (!score) {
		return res.status(404).json({
			success: false,
			description: `This score does not exist.`,
		});
	}

	await DeleteScore(score);

	return res.status(200).json({
		success: true,
		description: `Removed score.`,
		body: {},
	});
});

/**
 * Destroys a users UGPT profile and forces a leaderboard recalc.
 *
 * @param userID - The U...
 * @param game - The G...
 * @param playtype - And the PT to delete.
 *
 * @name POST /api/v1/admin/destroy-ugpt
 */
router.post(
	"/destroy-ugpt",
	prValidate({
		userID: p.isInteger,
		game: p.isIn(TachiConfig.GAMES),
		playtype: (self, parent) => {
			if (typeof self !== "string") {
				return "Expected a string for a playtype.";
			}

			if (!IsValidPlaytype(parent.game as Game, self)) {
				return `Invalid playtype of ${self} for game ${parent.game as Game}.`;
			}

			return true;
		},
	}),
	async (req, res) => {
		const { userID, game, playtype } = req.safeBody as {
			userID: integer;
			game: Game;
			playtype: Playtype;
		};

		const ugpt = await db["game-stats"].findOne({
			userID,
			game,
			playtype,
		});

		if (!ugpt) {
			return res.status(404).json({
				success: false,
				description: `No stats for ${userID} (${game} ${playtype}) exist.`,
			});
		}

		await DestroyUserGamePlaytypeData(userID, game, playtype);

		return res.status(200).json({
			success: true,
			description: `Completely destroyed UGPT for ${userID} (${game} ${playtype}).`,
			body: {},
		});
	}
);

/**
 * Destroy a chart and all of its scores (and sessions).
 *
 * @param chartID - The chartID to delete.
 * @param game - The game this chart is for. Necessary for doing lookups.
 *
 * @name POST /api/v1/admin/destroy-chart
 */
router.post(
	"/destroy-chart",
	prValidate({ chartID: "string", game: p.isIn(TachiConfig.GAMES) }),
	async (req, res) => {
		const body = req.safeBody as {
			game: Game;
			chartID: string;
		};

		const { game, chartID } = body;

		const scores = await db.scores.find({
			chartID,
		});

		await DeleteMultipleScores(scores);

		await db.anyCharts[game].remove({
			chartID,
		});

		await db["personal-bests"].remove({
			chartID,
		});

		return res.status(200).json({
			success: true,
			description: `Obliterated chart.`,
			body: {},
		});
	}
);

/**
 * Perform a site recalc on this set of scores.
 *
 * @name POST /api/v1/admin/recalc
 */
router.post("/recalc", async (req, res) => {
	const filter = req.safeBody;

	await RecalcAllScores(filter);

	const scoreIDs = (
		await db.scores.find(filter, {
			projection: {
				scoreID: 1,
			},
		})
	).map((e) => e.scoreID);

	await RecalcSessions({
		scoreIDs: { $in: scoreIDs },
	});

	return res.status(200).json({
		success: true,
		description: `Recalced scores.`,
		body: {
			scoresRecalced: scoreIDs.length,
		},
	});
});

/**
 * Send an announcement to the site.
 *
 * @name POST /api/v1/admin/announcement
 */
router.post(
	"/announcement",
	prValidate({
		game: p.optional(p.isIn(TachiConfig.GAMES)),
		playtype: "*string",
		title: "string",
	}),
	async (req, res) => {
		const { game, playtype, title } = req.safeBody as {
			game?: Game;
			playtype?: string;
			title: string;
		};

		let maybePlaytype: Playtype | undefined;

		if (game && playtype) {
			if (!IsValidPlaytype(game, playtype)) {
				return res.status(400).json({
					success: false,
					description: `Invalid playtype '${playtype}' for game '${game}'.`,
				});
			}

			maybePlaytype = playtype;
		}

		await SendSiteAnnouncementNotification(title, game, maybePlaytype);

		return res.status(200).json({
			success: true,
			description: `Sent notification '${title}'.`,
			body: {},
		});
	}
);

/**
 * Make this user a Tachi supporter.
 *
 * @name POST /api/v1/admin/supporter/:userID
 */
router.post("/supporter/:userID", async (req, res) => {
	const user = await ResolveUser(req.params.userID);

	if (!user) {
		return res.status(404).json({
			success: false,
			description: `This user does not exist.`,
		});
	}

	await db.users.update({ id: user.id }, { $set: { isSupporter: true } });

	return res.status(200).json({
		success: true,
		description: `Done.`,
		body: {},
	});
});

/**
 * Un-Make this user a Tachi supporter.
 *
 * @name POST /api/v1/admin/supporter/:userID
 */
router.delete("/supporter/:userID", async (req, res) => {
	const user = await ResolveUser(req.params.userID);

	if (!user) {
		return res.status(404).json({
			success: false,
			description: `This user does not exist.`,
		});
	}

	await db.users.update({ id: user.id }, { $set: { isSupporter: false } });

	return res.status(200).json({
		success: true,
		description: `Done.`,
		body: {},
	});
});

/**
 * Reprocess all goals for every user. This should be used to un-screw the site
 * if the server goes down or peoples goals fall out of sync. Obviously, this
 * should never happen, but the error handling around this stuff is really wacky.
 *
 * @name POST /api/v1/admin/reprocess-all-goals
 */
router.post("/reprocess-all-goals", async (req, res) => {
	const ugpts = await db["game-stats"].find({});

	const promises = [];

	for (const ugpt of ugpts) {
		promises.push(async () => {
			const logger = CreateLogCtx(`${ugpt.userID} ${ugpt.game}`);

			const goalSubs = await db["goal-subs"].find({
				game: ugpt.game,
				playtype: ugpt.playtype,
				userID: ugpt.userID,
			});

			const goalSubsMap = new Map<string, GoalSubscriptionDocument>();

			for (const gSub of goalSubs) {
				goalSubsMap.set(gSub.goalID, gSub);
			}

			const goals = await db.goals.find({
				goalID: { $in: goalSubs.map((e) => e.goalID) },
			});

			await UpdateGoalsForUser(goals, goalSubsMap, ugpt.userID, logger);

			const allQuestSubs = await db["quest-subs"].find({
				game: ugpt.game,
				playtype: ugpt.playtype,
				userID: ugpt.userID,
			});

			const quests = await db.quests.find({
				questID: { $in: allQuestSubs.map((e) => e.questID) },
			});

			await UpdateQuestsForUser(quests, allQuestSubs, ugpt.game, ugpt.userID, logger);
		});
	}

	await Promise.all(promises);

	return res.status(200).json({
		success: true,
		description: "Reprocessed all goals.",
		body: {},
	});
});

export default router;
