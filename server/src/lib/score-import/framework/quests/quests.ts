import db from "external/mongo/db";
import { EvaluateQuestProgress } from "lib/targets/quests";
import { EmitWebhookEvent } from "lib/webhooks/webhooks";
import type { KtLogger } from "lib/logger/logger";
import type { BulkWriteUpdateOneOperation } from "mongodb";
import type {
	Game,
	GoalImportInfo,
	integer,
	Playtype,
	QuestDocument,
	QuestImportInfo,
	QuestSubscriptionDocument,
} from "tachi-common";

export async function UpdateUsersQuests(
	importGoalInfo: Array<GoalImportInfo>,
	game: Game,
	playtypes: Array<Playtype>,
	userID: integer,
	logger: KtLogger
) {
	const goalIDs = importGoalInfo.map((e) => e.goalID);

	const { quests, questSubs } = await GetRelevantQuests(goalIDs, game, playtypes, userID, logger);

	return UpdateQuestsForUser(quests, questSubs, game, userID, logger);
}

export async function UpdateQuestsForUser(
	quests: Array<QuestDocument>,
	questSubs: Array<QuestSubscriptionDocument>,

	game: Game,
	userID: integer,
	logger: KtLogger
) {
	// create a map here to avoid linear searching when
	// co-iterating
	const questSubMap = new Map<string, QuestSubscriptionDocument>();

	for (const um of questSubs) {
		questSubMap.set(um.questID, um);
	}

	const bwrite: Array<BulkWriteUpdateOneOperation<QuestSubscriptionDocument>> = [];

	const importQuestInfo: Array<QuestImportInfo> = [];

	await Promise.all(
		quests.map(async (quest) => {
			const { achieved, progress } = await EvaluateQuestProgress(userID, quest);

			const questSub = questSubMap.get(quest.questID);

			if (!questSub) {
				logger.warn(
					`Invalid state achieved in quest processing - processed quest that user did not have? ${quest.questID}`
				);

				return;
			}

			const bwriteOp: BulkWriteUpdateOneOperation<QuestSubscriptionDocument> = {
				updateOne: {
					filter: { questID: quest.questID, userID },
					update: {
						$set: {
							achieved,
							progress,
						},
					},
				},
			};

			const questInfo = {
				questID: questSub.questID,
				old: {
					progress: questSub.progress,
					achieved: questSub.achieved,
				},
				new: {
					progress,
					achieved,
				},
			};

			if (progress !== questSub.progress) {
				importQuestInfo.push(questInfo);

				// @ts-expect-error This property isn't read only, because I said so.
				bwriteOp.updateOne.update.$set!.lastInteraction = Date.now();
			}

			if (achieved && !questSub.achieved) {
				void EmitWebhookEvent({
					type: "quest-achieved/v1",
					content: {
						userID,
						...questInfo,
						game,
						playtype: quest.playtype,
					},
				});

				// make sure we mark the time achieved if this was just achieved.
				// @ts-expect-error This property isn't read only, because I said so.
				bwriteOp.updateOne.update.$set!.timeAchieved = Date.now();
			}

			bwrite.push(bwriteOp);
		})
	);

	if (bwrite.length !== 0) {
		await db["quest-subs"].bulkWrite(bwrite, { ordered: false });
	}

	return importQuestInfo;
}

async function GetRelevantQuests(
	goalIDs: Array<string>,
	game: Game,
	playtypes: Array<Playtype>,
	userID: integer,
	logger: KtLogger
) {
	const questSubs = await db["quest-subs"].find({
		game,
		playtype: { $in: playtypes },
		userID,
	});

	logger.debug(`Found ${questSubs.length} quest-subs.`);

	const quests = await db.quests.find({
		questID: { $in: questSubs.map((e) => e.questID) },
		"questData.goals.goalID": { $in: goalIDs },
	});

	logger.debug(`Found ${quests.length} relevant quests.`);

	return { questSubs, quests };
}
