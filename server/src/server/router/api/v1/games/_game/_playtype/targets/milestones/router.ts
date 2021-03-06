import { Router } from "express";
import db from "external/mongo/db";
import { SearchCollection } from "lib/search/search";
import { EvaluateMilestoneProgress, GetGoalsInMilestone } from "lib/targets/milestones";
import prValidate from "server/middleware/prudence-validate";
import { FormatGame } from "tachi-common";
import { GetMostSubscribedMilestones } from "utils/db";
import { IsString } from "utils/misc";
import { AssignToReqTachiData, GetGPT, GetTachiData } from "utils/req-tachi-data";
import { GetUsersWithIDs, ResolveUser } from "utils/user";
import type { RequestHandler } from "express";

const router: Router = Router({ mergeParams: true });

const ResolveMilestoneID: RequestHandler = async (req, res, next) => {
	const { game, playtype } = GetGPT(req);
	const milestoneID = req.params.milestoneID;

	const milestone = await db.milestones.findOne({
		milestoneID,
		game,
		playtype,
	});

	if (!milestone) {
		return res.status(404).json({
			success: false,
			description: `A milestone with ID ${milestoneID} doesn't exist.`,
		});
	}

	AssignToReqTachiData(req, { milestoneDoc: milestone });

	next();
};

/**
 * Search milestones for this GPT.
 *
 * @param search - The query to search for.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/milestones
 */
router.get("/", async (req, res) => {
	const { game, playtype } = GetGPT(req);

	if (!IsString(req.query.search)) {
		return res.status(400).json({
			success: false,
			description: `Invalid value for search.`,
		});
	}

	const milestones = await SearchCollection(
		db.milestones,
		req.query.search,
		{ game, playtype },
		50
	);

	return res.status(200).json({
		success: true,
		description: `Returned ${milestones.length} milestones.`,
		body: milestones,
	});
});

/**
 * Find the most subscribed-to milestones for this GPT.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/milestones/popular
 */
router.get("/popular", async (req, res) => {
	const { game, playtype } = GetGPT(req);

	const milestones = await GetMostSubscribedMilestones({ game, playtype });

	return res.status(200).json({
		success: true,
		description: `Returned ${milestones.length} popular milestones.`,
		body: milestones,
	});
});

/**
 * Retrieve information about this milestone and who is subscribed to it.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/milestones/:milestoneID
 */
router.get("/:milestoneID", ResolveMilestoneID, async (req, res) => {
	const milestone = GetTachiData(req, "milestoneDoc");

	const milestoneSubs = await db["milestone-subs"].find({
		milestoneID: milestone.milestoneID,
	});

	const users = await GetUsersWithIDs(milestoneSubs.map((e) => e.userID));

	const goals = await GetGoalsInMilestone(milestone);

	const parentMilestoneSets = await db["milestone-sets"].find({
		milestones: milestone.milestoneID,
	});

	return res.status(200).json({
		success: true,
		description: `Retrieved information about ${milestone.name}.`,
		body: {
			milestone,
			milestoneSubs,
			users,
			goals,
			parentMilestoneSets,
		},
	});
});

/**
 * Evaluates a milestone upon a user, even if they aren't subscribed to it.
 *
 * @param userID - The userID to evaluate this goal against. Must be a player of this GPT.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/milestones/:milestoneID/evaluate-for
 */
router.get(
	"/:milestoneID/evaluate-for",
	ResolveMilestoneID,
	prValidate({ userID: "string" }),
	async (req, res) => {
		const { game, playtype } = GetGPT(req);

		const userID = req.query.userID as string;

		const user = await ResolveUser(userID);

		if (!user) {
			return res.status(404).json({
				success: false,
				description: `The user ${userID} does not exist.`,
			});
		}

		const hasPlayed = await db["game-stats"].findOne({
			game,
			playtype,
			userID: user.id,
		});

		if (!hasPlayed) {
			return res.status(400).json({
				success: false,
				description: `The user ${user.username} hasn't played ${FormatGame(
					game,
					playtype
				)}.`,
			});
		}

		const milestone = GetTachiData(req, "milestoneDoc");

		const milestoneProgress = await EvaluateMilestoneProgress(user.id, milestone);

		return res.status(200).json({
			success: true,
			description: `Evaluated ${milestone.name} for ${user.username}.`,
			body: milestoneProgress,
		});
	}
);

export default router;
