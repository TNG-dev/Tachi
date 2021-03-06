import db from "external/mongo/db";
import CreateLogCtx from "lib/logger/logger";
import { WrapScriptPromise } from "utils/misc";
import type { IObjectID } from "monk";
import type { integer } from "tachi-common";

const logger = CreateLogCtx(__filename);

async function DedupeScoreIDs() {
	const dups: Array<{ id: string; dups: Array<IObjectID>; count: integer }> =
		await db.scores.aggregate(
			[
				{
					$group: {
						_id: "$scoreID",
						dups: { $addToSet: "$_id" },
						count: { $sum: 1 },
					},
				},
				{
					$match: {
						count: { $gt: 1 },
					},
				},
			],
			{ allowDiskUse: true }
		);

	logger.info(`Found ${dups.length} dups.`);

	for (const dup of dups) {
		dup.dups.shift();
		// eslint-disable-next-line no-await-in-loop
		await db.scores.remove({ _id: { $in: dup.dups } });
	}
}

if (require.main === module) {
	WrapScriptPromise(DedupeScoreIDs(), logger);
}
