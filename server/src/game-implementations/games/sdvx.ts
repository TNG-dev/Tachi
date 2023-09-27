import {
	SDVXLIKE_CLASS_DERIVERS,
	SDVXLIKE_DEFAULT_MERGE_NAME,
	SDVXLIKE_DERIVERS,
	SDVXLIKE_GOAL_FMT,
	SDVXLIKE_GOAL_OO_FMT,
	SDVXLIKE_GOAL_PG_FMT,
	SDVXLIKE_PROFILE_CALCS,
	SDVXLIKE_SCORE_CALCS,
	SDVXLIKE_SCORE_VALIDATORS,
	SDVXLIKE_SESSION_CALCS,
} from "./_common";
import { CreatePBMergeFor } from "game-implementations/utils/pb-merge";
import type { GPTServerImplementation } from "game-implementations/types";

export const SDVX_IMPL: GPTServerImplementation<"sdvx:Single"> = {
	derivers: SDVXLIKE_DERIVERS,
	chartSpecificValidators: {
		exScore: (exScore, chart) => {
			if (exScore < 0) {
				return `EX Score must be non-negative. Got ${exScore}`;
			}

			// TODO
			// gotta figure this out somehow?
			// we need to store notecounts or something. For now, just allow
			// any +ve integer, I guess.

			return true;
		},
	},
	scoreCalcs: SDVXLIKE_SCORE_CALCS,
	sessionCalcs: SDVXLIKE_SESSION_CALCS,
	profileCalcs: SDVXLIKE_PROFILE_CALCS,
	classDerivers: SDVXLIKE_CLASS_DERIVERS,
	goalCriteriaFormatters: SDVXLIKE_GOAL_FMT,
	goalProgressFormatters: SDVXLIKE_GOAL_PG_FMT,
	goalOutOfFormatters: SDVXLIKE_GOAL_OO_FMT,
	pbMergeFunctions: [
		CreatePBMergeFor("largest", "enumIndexes.lamp", "Best Lamp", (base, score) => {
			base.scoreData.lamp = score.scoreData.lamp;
		}),
		CreatePBMergeFor("largest", "optional.exScore", "Best EX Score", (base, score) => {
			base.scoreData.optional.exScore = score.scoreData.optional.exScore;
		}),
	],
	defaultMergeRefName: SDVXLIKE_DEFAULT_MERGE_NAME,
	scoreValidators: SDVXLIKE_SCORE_VALIDATORS,
};
