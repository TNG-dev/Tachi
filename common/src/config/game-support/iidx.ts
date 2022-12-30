import { COLOUR_SET } from "../../constants/colour-set";
import { IIDXDans } from "../game-classes";
import type {
	INTERNAL_GAME_CONFIG,
	INTERNAL_GPT_CONFIG as INTERNAL_GPT_CONFIG,
} from "../../types/internals";

export const IIDX_CONF = {
	defaultPlaytype: "SP",
	name: "beatmania IIDX",
	validPlaytypes: ["SP", "DP"],
} as const satisfies INTERNAL_GAME_CONFIG;

export const IIDX_SP_CONF = {
	mandatoryMetrics: {
		score: { type: "INTEGER" },
		lamp: {
			type: "ENUM",
			minimumRelevantValue: "CLEAR",
			values: [
				"NO PLAY",
				"FAILED",
				"ASSIST CLEAR",
				"EASY CLEAR",
				"CLEAR",
				"HARD CLEAR",
				"EX HARD CLEAR",
				"FULL COMBO",
			],
		},
	},

	derivedMetrics: {
		percent: {
			type: "DECIMAL",
		},
		grade: {
			type: "ENUM",
			minimumRelevantValue: "A",
			values: ["F", "E", "D", "C", "B", "A", "AA", "AAA", "MAX-", "MAX"],
		},
	},

	primaryMetric: "percent",

	additionalMetrics: {
		bp: { type: "INTEGER" },
		gauge: { type: "DECIMAL" },
		comboBreak: { type: "INTEGER" },

		// The players history for the gauge type they were playing on.
		gaugeHistory: { type: "GRAPH" },

		// if "GSM" is enabled (via fervidex.dll) then all graphs
		// are sent. we should store all of them.
		gsmEasy: { type: "GRAPH" },
		gsmNormal: { type: "GRAPH" },
		gsmHard: { type: "GRAPH" },
		gsmEXHard: { type: "GRAPH" },
	},

	defaultScoreRatingAlg: "ktLampRating",
	defaultSessionRatingAlg: "ktLampRating",
	defaultProfileRatingAlg: "ktLampRating",

	scoreRatingAlgs: {
		ktLampRating: {
			description:
				"A rating system that values your clear lamps on charts. Tierlist information is taken into account.",
		},
		BPI: {
			description:
				"A rating system for Kaiden level play. Only applies to 11s and 12s. A BPI of 0 states the score is equal to the Kaiden Average for that chart. A BPI of 100 is equal to the world record.",
		},
	},

	profileRatingAlgs: {
		ktLampRating: { description: `An average of your best 20 ktLampRatings.` },
		BPI: { description: `An average of your best 20 BPIs.` },
	},
	sessionRatingAlgs: {
		ktLampRating: { description: `An average of the best 10 ktLampRatings this session.` },
		BPI: { description: `An average of the best 10 BPIs this session.` },
	},

	difficultyConfig: {
		type: "FIXED",
		difficultyOrder: [
			"NORMAL",
			"HYPER",
			"ANOTHER",
			"LEGGENDARIA",
			"All Scratch NORMAL",
			"All Scratch HYPER",
			"All Scratch ANOTHER",
			"All Scratch LEGGENDARIA",
			"Kichiku NORMAL",
			"Kichiku HYPER",
			"Kichiku ANOTHER",
			"Kichiku LEGGENDARIA",
			"Kiraku NORMAL",
			"Kiraku HYPER",
			"Kiraku ANOTHER",
			"Kiraku LEGGENDARIA",
		],
		difficultyShorthand: {
			NORMAL: "N",
			HYPER: "H",
			ANOTHER: "A",
			LEGGENDARIA: "L",
			"All Scratch NORMAL": "N (Scr.)",
			"All Scratch HYPER": "H (Scr.)",
			"All Scratch ANOTHER": "A (Scr.)",
			"All Scratch LEGGENDARIA": "L (Scr.)",
			"Kichiku NORMAL": "N (Kc.)",
			"Kichiku HYPER": "H (Kc.)",
			"Kichiku ANOTHER": "A (Kc.)",
			"Kichiku LEGGENDARIA": "L (Kc.)",
			"Kiraku NORMAL": "N (Kr.)",
			"Kiraku HYPER": "H (Kr.)",
			"Kiraku ANOTHER": "A (Kr.)",
			"Kiraku LEGGENDARIA": "L (Kr.)",
		},
		defaultDifficulty: "ANOTHER",
		difficultyColours: {
			NORMAL: COLOUR_SET.blue,
			HYPER: COLOUR_SET.orange,
			ANOTHER: COLOUR_SET.red,
			LEGGENDARIA: COLOUR_SET.purple,
			"All Scratch NORMAL": COLOUR_SET.blue,
			"All Scratch HYPER": COLOUR_SET.orange,
			"All Scratch ANOTHER": COLOUR_SET.red,
			"All Scratch LEGGENDARIA": COLOUR_SET.purple,
			"Kichiku NORMAL": COLOUR_SET.blue,
			"Kichiku HYPER": COLOUR_SET.orange,
			"Kichiku ANOTHER": COLOUR_SET.red,
			"Kichiku LEGGENDARIA": COLOUR_SET.purple,
			"Kiraku NORMAL": COLOUR_SET.blue,
			"Kiraku HYPER": COLOUR_SET.orange,
			"Kiraku ANOTHER": COLOUR_SET.red,
			"Kiraku LEGGENDARIA": COLOUR_SET.purple,
		},
	},

	supportedClasses: {
		dan: {
			downgradable: false,
			canBeBatchManualSubmitted: true,
			values: IIDXDans,
		},
	},

	orderedJudgements: ["pgreat", "great", "good", "bad", "poor"],

	scoreBucket: "lamp",

	supportedVersions: [
		"3rd Style CS",
		"4th Style CS",
		"5th Style CS",
		"6th Style CS",
		"7th Style CS",
		"8th Style CS",
		"9th Style CS",
		"10th Style CS",
		"IIDX RED CS",
		"HAPPY SKY CS",
		"DISTORTED CS",
		"GOLD CS",
		"DJ TROOPERS CS",
		"EMPRESS CS",
		"tricoro",
		"SPADA",
		"PENDUAL",
		"copula",
		"SINOBUZ",
		"CANNON BALLERS",
		"ROOTAGE",
		"HEROIC VERSE",
		"BISTROVER",
		"CastHour",
		"Resident",
		"ROOTAGE Omnimix",
		"HEROIC VERSE Omnimix",
		"BISTROVER Omnimix",
		"CastHour Omnimix",
		"HEROIC VERSE 2dxtra",
		"BISTROVER 2dxtra",
		"BEATMANIA US",
		"INFINITAS",
	],

	supportedTierlists: {
		"kt-NC": {
			description:
				"The Normal Clear tiers for Kamaitachi. These are adapted from multiple sources.",
		},
		"kt-HC": {
			description:
				"The Hard Clear tiers for Kamaitachi. These are adapted from multiple sources.",
		},
		"kt-EXHC": {
			description:
				"The EX-HARD Clear tiers for Kamaitachi. These are adapted from multiple sources.",
		},
	},

	supportedMatchTypes: ["inGameID", "tachiSongID", "songTitle"],
} as const satisfies INTERNAL_GPT_CONFIG;

/**
 * IIDX's DP configuration. This is almost identical to the IIDX SP configuration, but
 * with different tierlists marked as supported.
 */
export const IIDX_DP_CONF = {
	...IIDX_SP_CONF,

	supportedTierlists: {
		"dp-tier": {
			description:
				"The unofficial DP tiers, taken from https://zasa.sakura.ne.jp/dp/run.php.",
		},
	},
} as const satisfies INTERNAL_GPT_CONFIG;