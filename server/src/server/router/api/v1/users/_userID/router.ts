import apiTokensRouter from "./api-tokens/router";
import bannerRouter from "./banner/router";
import followingRouter from "./following/router";
import gameSpecificRouter from "./games/@gameSpecificRoutes/router";
import gamePTRouter from "./games/_game/_playtype/router";
import importsRouter from "./imports/router";
import integrationsRouter from "./integrations/router";
import invitesRouter from "./invites/router";
import { GetUserFromParam, RequireSelfRequestFromUser } from "./middleware";
import notifsRouter from "./notifications/router";
import pfpRouter from "./pfp/router";
import sessionsRouter from "./sessions/router";
import settingsRouter from "./settings/router";
import { HashPassword, PasswordCompare, ValidatePassword } from "../../auth/auth";
import { Router } from "express";
import db from "external/mongo/db";
import { GetRecentActivity } from "lib/activity/activity";
import { ONE_MONTH } from "lib/constants/time";
import CreateLogCtx from "lib/logger/logger";
import { GetRivalIDs } from "lib/rivals/rivals";
import { p } from "prudence";
import prValidate from "server/middleware/prudence-validate";
import { DeleteUndefinedProps, IsNonEmptyString, StripUrl } from "utils/misc";
import { optNullFluffStrField } from "utils/prudence";
import {
	GetGoalSummary,
	GetRecentPlaycount,
	GetRecentSessions,
	GetRecentlyViewedFoldersAnyGPT,
} from "utils/queries/summary";
import { GetUser } from "utils/req-tachi-data";
import { FormatUserDoc, GetAllRankings, GetUserWithID } from "utils/user";
import type {
	AnyProfileRatingAlg,
	GPTString,
	ImportTypes,
	UserGameStats,
	integer,
} from "tachi-common";

const logger = CreateLogCtx(__filename);

const router: Router = Router({ mergeParams: true });

router.use(GetUserFromParam);

/**
 * Get the user at this ID or name.
 * @name GET /api/v1/users/:userID
 */
router.get("/", (req, res) => {
	const user = GetUser(req);

	return res.status(200).json({
		success: true,
		description: `Found user ${user.username}.`,
		body: user,
	});
});

interface UserPatchBody {
	about?: string | null;
	status?: string | null;
	discord?: string | null;
	twitter?: string | null;
	twitch?: string | null;
	youtube?: string | null;
	github?: string | null;
	steam?: string | null;
}

/**
 * Modify this user document. All parameters are optional.
 *
 * @param about - An about me, this is rendered as markdown.
 * @param status - A user status. This is not rendered as markdown, and is short.
 * @param discord - The user's discord tag.
 * @param twitter - The user's twitter tag.
 * @param github - The user's github.
 * @param steam - The user's steamID.
 * @param youtube - The user's youtube.
 * @param twitch - The user's twitch.
 *
 * @name PATCH /api/v1/users/:userID
 */
router.patch(
	"/",
	RequireSelfRequestFromUser,
	prValidate(
		{
			about: p.optional(p.isBoundedString(0, 2000)),
			status: optNullFluffStrField,
			discord: optNullFluffStrField,
			twitter: optNullFluffStrField,
			github: optNullFluffStrField,
			steam: optNullFluffStrField,
			youtube: optNullFluffStrField,
			twitch: optNullFluffStrField,
		},
		{
			about: "Your about me is too long.",
		}
	),
	async (req, res) => {
		const user = GetUser(req);

		const body = req.safeBody as UserPatchBody;

		if (Object.keys(body).length === 0) {
			return res.status(400).json({
				success: false,
				description: `Nothing was provided to modify.`,
			});
		}

		// Hack stuff for user experience.
		// In kt1, users would repeatedly mess up these fields.
		if (IsNonEmptyString(body.twitter)) {
			body.twitter = StripUrl("twitter.com/", body.twitter);
		}

		if (IsNonEmptyString(body.github)) {
			body.github = StripUrl("github.com/", body.github);
		}

		if (IsNonEmptyString(body.youtube)) {
			// youtube has two user urls lol
			body.youtube = StripUrl("youtube.com/user/", body.youtube);
			body.youtube = StripUrl("youtube.com/channel/", body.youtube);
		}

		if (IsNonEmptyString(body.twitch)) {
			body.twitch = StripUrl("twitch.tv/", body.twitch);
		}

		if (IsNonEmptyString(body.steam)) {
			body.steam = StripUrl("steamcommunity.com/id/", body.steam);
		}

		if (body.about === null) {
			return res.status(400).json({
				success: false,
				description: `Cannot set about me to null.`,
			});
		}

		// :(
		const modifyObject: Partial<
			Record<
				| "status"
				| `socialMedia.${
						| "discord"
						| "github"
						| "steam"
						| "twitch"
						| "twitter"
						| "youtube"}`,
				string | null
			> & { about: string }
		> = {
			about: body.about,
			status: body.status,
		};

		for (const socMed of [
			"twitch",
			"github",
			"youtube",
			"steam",
			"twitter",
			"discord",
		] as const) {
			modifyObject[`socialMedia.${socMed}` as const] = body[socMed];
		}

		DeleteUndefinedProps(modifyObject);

		await db.users.update(
			{
				id: user.id,
			},
			{
				$set: modifyObject,
			}
		);

		const newUser = await GetUserWithID(user.id);

		if (!newUser) {
			logger.severe(
				`User ${FormatUserDoc(user)} updated profile but user doc no longer exists?`,
				{ user }
			);

			return res.status(500).json({
				success: false,
				description: `An internal error has occured.`,
			});
		}

		if (req.session.tachi?.user) {
			req.session.tachi.user = newUser;
		}

		return res.status(200).json({
			success: true,
			description: `Successfully updated user.`,
			body: newUser,
		});
	}
);

/**
 * Returns all of the game-stats this user has.
 * Additionally, adds a __rankingData property, which contains this users
 * ranking information.
 * This endpoint doubles up as a way of checking what games a user has played.
 *
 * @name GET /api/v1/users/:userID/game-stats
 */
router.get("/game-stats", async (req, res) => {
	const user = GetUser(req);

	// a user has played a game if and only if they have stats for it.
	const stats: Array<
		UserGameStats & {
			__rankingData?: Record<AnyProfileRatingAlg, { outOf: number; ranking: number }>;
		}
	> = await db["game-stats"].find({ userID: user.id });

	await Promise.all(
		stats.map(async (s) => {
			const data = await GetAllRankings(s);

			// eslint-disable-next-line require-atomic-updates
			s.__rankingData = data;
		})
	);

	return res.status(200).json({
		success: true,
		description: `Returned ${stats.length} stats objects.`,
		body: stats,
	});
});

/**
 * Returns a summary of what the user has achieved in the past 16 hours.
 * Used on the main dashboard page to give users quick links to sessions,
 * alongside other information.
 *
 * @name GET /api/v1/users/:userID/recent-summary
 */
router.get("/recent-summary", async (req, res) => {
	const user = GetUser(req);

	const [
		recentPlaycount,
		recentSessions,
		{ folders: recentFolders, stats: recentFolderStats },
		{ achievedGoals, goals, improvedGoals },
	] = await Promise.all([
		GetRecentPlaycount(user.id),
		GetRecentSessions(user.id),
		GetRecentlyViewedFoldersAnyGPT(user.id),
		GetGoalSummary(user.id),
	]);

	return res.status(200).json({
		success: true,
		description: `Retrieved information about ${FormatUserDoc(user)}.`,
		body: {
			recentPlaycount,
			recentSessions,
			recentFolders,
			recentFolderStats,
			recentAchievedGoals: achievedGoals,
			recentGoals: goals,
			recentImprovedGoals: improvedGoals,
		},
	});
});

/**
 * Returns whether the user has verified their email or not.
 * Requires self-key level permissions.
 *
 * @name GET /api/v1/users/:userID/is-email-verified
 */
router.get("/is-email-verified", RequireSelfRequestFromUser, async (req, res) => {
	const user = GetUser(req);

	const verifyInfo = await db["verify-email-codes"].findOne({
		userID: user.id,
	});

	if (verifyInfo) {
		return res.status(200).json({
			success: true,
			description: `User has not verified email.`,
			body: false,
		});
	}

	return res.status(200).json({
		success: true,
		description: `User has verified email.`,
		body: true,
	});
});

/**
 * Changes the users password.
 * Requires self-key level permissions.
 *
 * @param !password - The new password. Must pass password validation rules.
 * @param !oldPassword - The old password.
 *
 * @name POST /api/v1/users/:userID/change-password
 */
router.post(
	"/change-password",
	RequireSelfRequestFromUser,
	prValidate({
		"!password": ValidatePassword,
		"!oldPassword": ValidatePassword,
	}),
	async (req, res) => {
		const body = req.safeBody as {
			"!password": string;
			"!oldPassword": string;
		};

		const user = req.session.tachi?.user;

		/* istanbul ignore next */
		if (!user) {
			logger.severe(
				`IP ${req.ip} got to /change-password without a user, but passed RequireSelfRequest?`
			);

			// this should be a 500, but lie to them.
			return res.status(403).json({
				success: false,
				description: `You are not authorised to perform this action.`,
			});
		}

		const privateInfo = await db["user-private-information"].findOne({
			userID: user.id,
		});

		/* istanbul ignore next */
		if (!privateInfo) {
			logger.severe(`User ${FormatUserDoc(user)} has no private information?`, { user });
			return res.status(500).json({
				success: false,
				description: `An internal server error has occured.`,
			});
		}

		const isLastPasswordValid = await PasswordCompare(
			body["!oldPassword"],
			privateInfo.password
		);

		if (!isLastPasswordValid) {
			return res.status(401).json({
				success: false,
				description: `Old Password doesn't match what we have in our records.`,
			});
		}

		const newPasswordHash = await HashPassword(body["!password"]);

		await db["user-private-information"].update(
			{
				userID: user.id,
			},
			{
				$set: {
					password: newPasswordHash,
				},
			}
		);

		return res.status(200).json({
			success: true,
			description: `Updated Password.`,
			body: {},
		});
	}
);

/**
 * Get the recent import types this user has used.
 *
 * @name GET /api/v1/users/:userID/recent-imports
 */
router.get("/recent-imports", async (req, res) => {
	const user = GetUser(req);

	const recentImports: Array<{ _id: ImportTypes; count: integer }> = await db.imports.aggregate([
		{
			$match: {
				userID: user.id,
				timeFinished: { $gt: Date.now() - ONE_MONTH },
				userIntent: true,
				importType: {
					$nin: ["file/mypagescraper-records-csv", "file/mypagescraper-player-csv"],
				},
			},
		},
		{
			$group: {
				_id: "$importType",
				count: { $sum: 1 },
			},
		},
	]);

	// rename _id to importType.
	const imports = recentImports.map((e) => ({ importType: e._id, count: e.count }));

	return res.status(200).json({
		success: true,
		description: `Found ${recentImports.length} imports.`,
		body: imports.sort((a, b) => b.count - a.count),
	});
});

/**
 * Fetch this users recent activity, and all of their rivals for each GPT they've played.
 *
 * @name GET /api/v1/users/:userID/activity
 */
router.use(
	"/activity",
	prValidate({
		startTime: "*string",
		includeRivals: p.optional(p.isIn("true", "false")),
		includeFollowers: p.optional(p.isIn("true", "false")),
	}),
	async (req, res) => {
		const qStartTime = req.query.startTime as string | undefined;

		const includeRivals = req.query.includeRivals === "true";
		const includeFollowers = req.query.includeFollowers === "true";

		const startTime = qStartTime ? Number(qStartTime) : null;

		if (Number.isNaN(startTime)) {
			return res.status(400).json({
				success: false,
				description: `Invalid startTime, got a non number.`,
			});
		}

		const user = GetUser(req);

		const gpts = await db["game-stats"].find({
			userID: user.id,
		});

		const data: Partial<Record<GPTString, unknown>> = {};

		const settings = await db["user-settings"].findOne({ userID: user.id });

		if (!settings) {
			logger.error(`User ${FormatUserDoc(user)} doesn't have any settings?`);
			return res.status(500).json({
				success: false,
				description: `This user has no settings.`,
			});
		}

		await Promise.all(
			gpts.map(async (e) => {
				const userIDs: Array<integer> = [user.id];

				if (includeRivals) {
					const rivalIDs = await GetRivalIDs(user.id, e.game, e.playtype);

					userIDs.push(...rivalIDs);
				}

				// n.b. it is intentional behaviour that you only get updates for
				// people you follow on games you play.
				if (includeFollowers) {
					userIDs.push(...settings.following);
				}

				const activity = await GetRecentActivity(
					e.game,
					{
						game: e.game,
						playtype: e.playtype,
						userID: { $in: userIDs },
					},
					30,
					startTime
				);

				data[`${e.game}:${e.playtype}` as GPTString] = activity;
			})
		);

		return res.status(200).json({
			success: true,
			description: `Returned recent activity.`,
			body: data,
		});
	}
);

router.use("/games", gameSpecificRouter);
router.use("/games/:game/:playtype", gamePTRouter);
router.use("/pfp", pfpRouter);
router.use("/banner", bannerRouter);
router.use("/integrations", integrationsRouter);
router.use("/settings", settingsRouter);
router.use("/api-tokens", apiTokensRouter);
router.use("/invites", invitesRouter);
router.use("/imports", importsRouter);
router.use("/notifications", notifsRouter);
router.use("/following", followingRouter);
router.use("/sessions", sessionsRouter);

export default router;
