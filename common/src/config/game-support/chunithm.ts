import { FAST_SLOW_MAXCOMBO } from "./_common";
import { FmtNum } from "../../utils/util";
import { ClassValue, zodNonNegativeInt } from "../config-utils";
import { p } from "prudence";
import { z } from "zod";
import type { INTERNAL_GAME_CONFIG, INTERNAL_GAME_PT_CONFIG } from "../../types/internals";

export const CHUNITHM_CONF = {
	name: "CHUNITHM",
	playtypes: ["Single"],
	songData: z.strictObject({
		genre: z.string(),
		displayVersion: z.string(),
	}),
} as const satisfies INTERNAL_GAME_CONFIG;

export const CHUNITHMColours = [
	ClassValue("BLUE", "青", "Blue: 0 - 1.99 Rating"),
	ClassValue("GREEN", "緑", "Green: 2 - 3.99 Rating"),
	ClassValue("ORANGE", "橙", "Orange: 4 - 6.99 Rating"),
	ClassValue("RED", "赤", "Red: 7 - 9.99 Rating"),
	ClassValue("PURPLE", "紫", "Purple: 10 - 11.99 Rating"),
	ClassValue("COPPER", "銅", "Copper: 12 - 13.24 Rating"),
	ClassValue("SILVER", "銀", "Silver: 13.25 - 14.49 Rating"),
	ClassValue("GOLD", "金", "Gold: 14.50 - 15.24 Rating"),
	ClassValue("PLATINUM", "鉑", "Platinum: 15.25 - 15.99 Rating"),
	ClassValue("RAINBOW", "虹", "Rainbow: >=16 Rating"),
];

export const CHUNITHMClasses = [
	ClassValue("DAN_I", "I", "Class I"),
	ClassValue("DAN_II", "II", "Class II"),
	ClassValue("DAN_III", "III", "Class III"),
	ClassValue("DAN_IV", "IV", "Class IV"),
	ClassValue("DAN_V", "V", "Class V"),
	ClassValue("DAN_INFINITE", "∞", "Infinite Class"),
]

export const CHUNITHM_SINGLE_CONF = {
	providedMetrics: {
		score: {
			type: "INTEGER",
			validate: p.isBetween(0, 1_010_000),
			formatter: FmtNum,
			description: "The score value. This is between 0 and 1.01 million.",
		},
		lamp: {
			type: "ENUM",
			values: ["FAILED", "CLEAR", "FULL COMBO", "ALL JUSTICE", "ALL JUSTICE CRITICAL"],
			minimumRelevantValue: "CLEAR",
			description: "The type of clear this was.",
		},
	},

	derivedMetrics: {
		grade: {
			type: "ENUM",
			values: [
				"D",
				"C",
				"B",
				"BB",
				"BBB",
				"A",
				"AA",
				"AAA",
				"S",
				"S+",
				"SS",
				"SS+",
				"SSS",
				"SSS+",
			],
			minimumRelevantValue: "A",
			description: "The grade this score was.",
		},
	},

	defaultMetric: "score",
	preferredDefaultEnum: "grade",

	optionalMetrics: {
		...FAST_SLOW_MAXCOMBO,
	},

	scoreRatingAlgs: {
		rating: {
			description:
				"The rating value of this score. This is identical to the system used in game.",
		},
	},
	sessionRatingAlgs: {
		naiveRating: { description: "The average of your best 10 ratings this session." },
	},
	profileRatingAlgs: {
		naiveRating: {
			description:
				"The average of your best 30 ratings. This is different to in-game, as it does not take into account your recent scores in any way.",
		},
	},

	defaultScoreRatingAlg: "rating",
	defaultSessionRatingAlg: "naiveRating",
	defaultProfileRatingAlg: "naiveRating",

	// This game technically has a dynamic set of difficulties, with a chart being
	// able to have as many WORLD'S END charts as it likes. However, this is a little
	// awkward to implement, and I can't be bothered. Sorry!
	difficulties: {
		type: "FIXED",
		order: ["BASIC", "ADVANCED", "EXPERT", "MASTER", "ULTIMA"],
		shorthand: {
			BASIC: "B",
			ADVANCED: "A",
			EXPERT: "E",
			MASTER: "M",
			ULTIMA: "U",
		},
		default: "MASTER",
	},

	classes: {
		colour: {
			type: "DERIVED",
			values: CHUNITHMColours,
		},

		dan: {
			type: "PROVIDED",
			values: CHUNITHMClasses,
		},

		emblem: {
			type: "PROVIDED",
			values: CHUNITHMClasses,
		}
	},

	orderedJudgements: ["jcrit", "justice", "attack", "miss"],

	versions: {
		paradiselost: "PARADISE LOST",
		sun: "SUN",
	},

	chartData: z.strictObject({
		inGameID: zodNonNegativeInt,
	}),

	preferences: z.strictObject({}),

	scoreMeta: z.strictObject({}),

	supportedMatchTypes: ["inGameID", "songTitle", "tachiSongID"],
} as const satisfies INTERNAL_GAME_PT_CONFIG;
