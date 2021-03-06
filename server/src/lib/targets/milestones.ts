import { EvaluateGoalForUser, SubscribeToGoal } from "./goals";
import db from "external/mongo/db";
import { SubscribeFailReasons } from "lib/constants/err-codes";
import CreateLogCtx from "lib/logger/logger";
import { BulkSendNotification } from "lib/notifications/notifications";
import type { EvaluatedGoalReturn } from "./goals";
import type {
	GoalDocument,
	GoalSubscriptionDocument,
	integer,
	MilestoneDocument,
	MilestoneSubscriptionDocument,
} from "tachi-common";

const logger = CreateLogCtx(__filename);

/**
 * Retrieves the goalID documents in a single array from the
 * nested structure of milestones.
 */
export function GetGoalIDsFromMilestone(milestone: MilestoneDocument) {
	// this sucks - maybe a nicer way to do this, because nested
	// maps are just ugly
	return milestone.milestoneData.map((e) => e.goals.map((e) => e.goalID)).flat(1);
}

/**
 * Return all the goals inside this milestone.
 */
export async function GetGoalsInMilestone(milestone: MilestoneDocument) {
	const goalIDs = GetGoalIDsFromMilestone(milestone);

	const goals = await db.goals.find({
		goalID: { $in: goalIDs },
	});

	if (goals.length !== goalIDs.length) {
		logger.error(
			`Milestone ${milestone.name} has ${goalIDs.length} goals registered, but we could only find ${goals.length} in the database?`,
			{ goals: goals.length, milestone, goalIDs: goalIDs.length }
		);
		throw new Error(`Milestone is corrupt. Not the right amount of goals in db?`);
	}

	if (goalIDs.length < 2) {
		logger.error(
			`Milestone ${milestone.name} resolves to less than 2 goals. Isn't a valid milestone?`,
			{ milestone }
		);
		throw new Error(`Milestone is corrupt. Doesn't have enough goals.`);
	}

	return goals;
}

/**
 * Work out how many goals need to be achieved for this
 * milestone to be considered completed.
 */
export function CalculateMilestoneOutOf(milestone: MilestoneDocument) {
	const goalIDs = GetGoalIDsFromMilestone(milestone);

	switch (milestone.criteria.type) {
		case "all":
			return goalIDs.length;
		case "total": {
			// It's not possible according to the types, but I want to check it anyway.
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (milestone.criteria.value === null) {
				throw new Error(
					`Invalid milestone ${milestone.milestoneID} - total and null are not compatible.`
				);
			}

			return milestone.criteria.value;
		}

		default:
			// Typescript annoyingly complains that milestone.criteria is of type never now.
			// it's right! but if we get here, I want to log the error somehow.
			throw new Error(
				`Invalid milestone.criteria.type of ${
					(milestone.criteria as MilestoneDocument["criteria"]).type
				} -- milestoneID ${milestone.milestoneID}`
			);
	}
}

type EvaluatedGoalResult = EvaluatedGoalReturn & { goalID: string };

/**
 * Evaluate a user's progress on a milestone, regardless of whether they have it
 * assigned or not.
 *
 * @returns All of the goals in the milestone. The users progress on each individual goal,
 * their overall progress, what the milestone was outOf, and whether they achieved it or
 * not.
 */
export async function EvaluateMilestoneProgress(userID: integer, milestone: MilestoneDocument) {
	const goals = await GetGoalsInMilestone(milestone);

	const isSubscribedToMilestone = await db["milestone-subs"].findOne({
		milestoneID: milestone.milestoneID,
	});

	// If the user is subscribed the milestone, we don't need to calculate
	// their progress on each goal.
	const goalSubMap = new Map<string, GoalSubscriptionDocument>();

	if (isSubscribedToMilestone) {
		const goalSubs = await db["goal-subs"].find({
			goalID: { $in: goals.map((e) => e.goalID) },
			userID,
		});

		for (const sub of goalSubs) {
			goalSubMap.set(sub.goalID, sub);
		}
	}

	const goalResults: Array<EvaluatedGoalResult> = await Promise.all(
		goals.map(async (goal) => {
			if (isSubscribedToMilestone) {
				const goalSub = goalSubMap.get(goal.goalID);

				if (!goalSub) {
					logger.error(
						`User ${userID} has a corrupt subscription to milestone '${milestone.name}', They do not have all the goals in this milestone assigned.`
					);

					throw new Error(
						`User has corrupt subscription to milestone. Cannot calculate.`
					);
				}

				return {
					achieved: goalSub.achieved,
					progress: goalSub.progress,
					outOf: goalSub.outOf,
					progressHuman: goalSub.progressHuman,
					outOfHuman: goalSub.outOfHuman,
					goalID: goal.goalID,
				};
			}

			const result = await EvaluateGoalForUser(goal, userID, logger);

			if (!result) {
				logger.error(
					`Failed to calculate ${userID} result for goal '${goal.name}'. Is the goal valid?`,
					{ goal, milestone }
				);

				throw new Error(`Goal inside milestone is corrupt.`);
			}

			return {
				achieved: result.achieved,
				progress: result.progress,
				outOf: result.outOf,
				progressHuman: result.progressHuman,
				outOfHuman: result.outOfHuman,
				goalID: goal.goalID,
			};
		})
	);

	const progress = goalResults.filter((e) => e.achieved).length;
	const outOf = CalculateMilestoneOutOf(milestone);

	const achieved = progress >= outOf;

	return {
		goals,
		goalResults,
		achieved,
		progress,
		outOf,
	};
}

interface MilestoneSubscriptionReturns {
	milestoneSub: MilestoneSubscriptionDocument;
	goals: Array<GoalDocument>;
	goalResults: Array<EvaluatedGoalResult>;
}

/**
 * Subscribes the given user to a provided milestone. If the user is already subscribed,
 * null is returned.
 *
 * @param cancelIfAchieved - Don't subscribe to the milestone if subscribing would cause
 * the user to immediately achieve it.
 */
export async function SubscribeToMilestone(
	userID: integer,
	milestone: MilestoneDocument,
	cancelIfAchieved: false
): Promise<MilestoneSubscriptionReturns | SubscribeFailReasons.ALREADY_SUBSCRIBED>;
export async function SubscribeToMilestone(
	userID: integer,
	milestone: MilestoneDocument,
	cancelIfAchieved = true
): Promise<
	| MilestoneSubscriptionReturns
	| SubscribeFailReasons.ALREADY_ACHIEVED
	| SubscribeFailReasons.ALREADY_SUBSCRIBED
> {
	const isSubscribedToMilestone = await db["milestone-subs"].findOne({
		userID,
		milestoneID: milestone.milestoneID,
	});

	if (isSubscribedToMilestone) {
		return SubscribeFailReasons.ALREADY_SUBSCRIBED;
	}

	const result = await EvaluateMilestoneProgress(userID, milestone);

	if (result.achieved && cancelIfAchieved) {
		return SubscribeFailReasons.ALREADY_ACHIEVED;
	}

	// @ts-expect-error TS can't resolve this.
	// because it can't explode out the types.
	const milestoneSub: MilestoneSubscriptionDocument = {
		progress: result.progress,
		userID,
		milestoneID: milestone.milestoneID,
		wasInstantlyAchieved: result.achieved,
		timeSet: Date.now(),
		game: milestone.game,
		playtype: milestone.playtype,
		achieved: result.achieved,
		timeAchieved: result.achieved ? Date.now() : null,
		lastInteraction: null,
	};

	// @optimisable, EvaluateMilestoneProgress calculates the users progress
	// on each goal. We could probably shorten this by directly inserting the records
	// from result.goalResults ourselves.
	// evaluating goals is fairly cheap though.
	await Promise.all(result.goals.map((goal) => SubscribeToGoal(userID, goal, false)));

	await db["milestone-subs"].insert(milestoneSub);

	logger.info(`User ${userID} subscribed to '${milestone.name}'.`);

	return { milestoneSub, goals: result.goals, goalResults: result.goalResults };
}

export async function UnsubscribeFromMilestone(userID: integer, milestoneID: string) {
	await db["milestone-subs"].remove({
		userID,
		milestoneID,
	});
}

/**
 * Given a milestoneID, update all of its subscriptions to potentially subscribe to any
 * new goals added to it.
 *
 * @note Updating milestone subscriptions just means ensuring that any subscribing
 * users are also subscribed to all goals in that milestone. Nothing more.
 *
 * A milestone that removes goals will not result in those users having goal subs removed.
 */
export async function UpdateMilestoneSubscriptions(milestoneID: string) {
	logger.info(`Received update-subscribe call to milestone ${milestoneID}.`);

	const subscriptions = await db["milestone-subs"].find({ milestoneID });

	const maybeMilestone = await db.milestones.findOne({ milestoneID });

	if (!maybeMilestone) {
		logger.info(
			`Milestone ${milestoneID} has been deleted. Unsubscribing ${subscriptions.length} users.`
		);

		return Promise.all(
			subscriptions.map((e) => UnsubscribeFromMilestone(e.userID, e.milestoneID))
		);
	}

	const goals = await GetGoalsInMilestone(maybeMilestone);

	const goalSubscriptionPromises = [];

	for (const sub of subscriptions) {
		for (const goal of goals) {
			// attempt to subscribe to all goals in this milestone.
			// even if they're already subscribed, it's not a problem -- will just fail fast.
			const goalSubPromise = SubscribeToGoal(sub.userID, goal, false);

			goalSubscriptionPromises.push(goalSubPromise);
		}
	}

	const subscriptionResults = await Promise.all(goalSubscriptionPromises);

	const newStuff = subscriptionResults.filter(
		(e) => e !== SubscribeFailReasons.ALREADY_SUBSCRIBED
	).length;

	if (newStuff !== 0) {
		logger.info(
			`Updating subscriptions for '${maybeMilestone.name}' resulted in ${newStuff} updates.`
		);

		await BulkSendNotification(
			`The milestone '${maybeMilestone.name}' has changed, You have been automatically subscribed to some new goals.`,
			subscriptions.map((e) => e.userID),
			{
				type: "MILESTONE_CHANGED",
				content: {
					milestoneID,
				},
			}
		);
	}

	return subscriptionResults;
}
