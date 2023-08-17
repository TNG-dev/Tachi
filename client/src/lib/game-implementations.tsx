import { NumericSOV } from "util/sorts";
import { ChangeOpacity } from "util/color-opacity";
import { COLOUR_SET, GPTString, GetGPTString, PBScoreDocument, ScoreDocument } from "tachi-common";
import CHUNITHMJudgementCell from "components/tables/cells/CHUNITHMJudgementCell";
import ITGJudgementCell from "components/tables/cells/ITGJudgementCell";
import JubeatJudgementCell from "components/tables/cells/JubeatJudgementCell";
import JubeatScoreCell from "components/tables/cells/JubeatScoreCell";
import JubilityCell from "components/tables/cells/JubilityCell";
import LampCell from "components/tables/cells/LampCell";
import MaimaiJudgementCell from "components/tables/cells/MaimaiJudgementCell";
import MaimaiDXJudgementCell from "components/tables/cells/MaimaiDXJudgementCell";
import MillionsScoreCell from "components/tables/cells/MillionsScoreCell";
import MusecaJudgementCell from "components/tables/cells/MusecaJudgementCell";
import PopnJudgementCell from "components/tables/cells/PopnJudgementCell";
import PopnLampCell from "components/tables/cells/PopnLampCell";
import RatingCell from "components/tables/cells/RatingCell";
import ScoreCell from "components/tables/cells/ScoreCell";
import WaccaJudgementCell from "components/tables/cells/WACCAJudgementCell";
import React from "react";
import { CreateRatingSys, bg, bgc } from "./games/_util";
import { BMS_14K_IMPL, BMS_7K_IMPL, PMS_IMPL } from "./games/bms-pms";
import { IIDX_DP_IMPL, IIDX_SP_IMPL } from "./games/iidx";
import { GPTClientImplementation } from "./types";
import { SDVX_IMPL, USC_IMPL } from "./games/sdvx-usc";
import { GITADORA_DORA_IMPL, GITADORA_GITA_IMPL } from "./games/gitadora";

type GPTClientImplementations = {
	[GPT in GPTString]: GPTClientImplementation<GPT>;
};

const defaultEnumIcons = {
	grade: "sort-alpha-up",
	lamp: "lightbulb",
} as const;

export const GPT_CLIENT_IMPLEMENTATIONS: GPTClientImplementations = {
	"iidx:SP": IIDX_SP_IMPL,
	"iidx:DP": IIDX_DP_IMPL,
	"chunithm:Single": {
		enumIcons: defaultEnumIcons,
		classColours: {
			colour: {
				BLUE: bgc("var(--bs-info)", "var(--bs-light)"),
				GREEN: bgc("green", "var(--bs-light)"),
				ORANGE: bgc("orange", "var(--bs-dark)"),
				RED: bgc("red", "var(--bs-light)"),
				PURPLE: bgc("purple", "var(--bs-light)"),
				COPPER: bgc("sienna", "var(--bs-light)"),
				SILVER: bgc("gray", "var(--bs-light)"),
				GOLD: bgc("var(--bs-warning)", "var(--bs-dark)"),
				PLATINUM: bgc("silver", "var(--bs-dark)"),
				RAINBOW: {
					background:
						"linear-gradient(-45deg, #f0788a, #f48fb1, #9174c2, #79bcf2, #70a173, #f7ff99, #faca7d, #ff9d80, #f0788a)",
					color: "var(--bs-dark)",
				},
			},
		},
		enumColours: {
			grade: {
				D: COLOUR_SET.red,
				C: COLOUR_SET.purple,
				B: COLOUR_SET.paleBlue,
				BB: COLOUR_SET.blue,
				BBB: COLOUR_SET.vibrantBlue,
				A: COLOUR_SET.paleGreen,
				AA: COLOUR_SET.green,
				AAA: COLOUR_SET.vibrantGreen,
				S: COLOUR_SET.orange,
				"S+": COLOUR_SET.vibrantOrange,
				SS: COLOUR_SET.vibrantYellow,
				"SS+": COLOUR_SET.gold,
				SSS: COLOUR_SET.teal,
				"SSS+": COLOUR_SET.white,
			},
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.paleGreen,
				"FULL COMBO": COLOUR_SET.paleBlue,
				"ALL JUSTICE": COLOUR_SET.gold,
				"ALL JUSTICE CRITICAL": COLOUR_SET.white,
			},
		},
		difficultyColours: {
			BASIC: COLOUR_SET.blue,
			ADVANCED: COLOUR_SET.orange,
			EXPERT: COLOUR_SET.red,
			MASTER: COLOUR_SET.purple,
			ULTIMA: COLOUR_SET.vibrantRed,
		},
		ratingSystems: [],
		scoreHeaders: [
			["Score", "Score", NumericSOV((x) => x.scoreData.score)],
			["Judgements", "Hits", NumericSOV((x) => x.scoreData.score)],
			["Lamp", "Lamp", NumericSOV((x) => x.scoreData.enumIndexes.lamp)],
		],
		scoreCoreCells: ({ sc, chart }) => (
			<>
				<MillionsScoreCell
					score={sc.scoreData.score}
					grade={sc.scoreData.grade}
					colour={GetEnumColour(sc, "grade")}
				/>
				<CHUNITHMJudgementCell score={sc} />
				<LampCell lamp={sc.scoreData.lamp} colour={GetEnumColour(sc, "lamp")} />
			</>
		),
		ratingCell: ({ sc, rating }) => <RatingCell score={sc} rating={rating} />,
	},
	"jubeat:Single": {
		enumIcons: defaultEnumIcons,
		enumColours: {
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.blue,
				"FULL COMBO": COLOUR_SET.teal,
				EXCELLENT: COLOUR_SET.white,
			},
			grade: {
				E: COLOUR_SET.gray,
				D: COLOUR_SET.maroon,
				C: COLOUR_SET.red,
				B: COLOUR_SET.blue,
				A: COLOUR_SET.green,
				S: COLOUR_SET.gold,
				SS: COLOUR_SET.orange,
				SSS: COLOUR_SET.teal,
				EXC: COLOUR_SET.white,
			},
		},
		classColours: {
			colour: {
				BLACK: bgc("var(--bs-secondary)", "var(--bs-light)"),
				YELLOW_GREEN: bgc("yellowgreen", "var(--bs-dark)"),
				GREEN: bgc("green", "var(--bs-light)"),
				LIGHT_BLUE: bgc("cyan", "var(--bs-dark)"),
				BLUE: bgc("var(--bs-info)", "var(--bs-light)"),
				VIOLET: bgc("violet", "var(--bs-dark)"),
				PURPLE: bgc("purple", "var(--bs-light)"),
				PINK: bgc("pink", "var(--bs-dark)"),
				ORANGE: bgc("orange", "var(--bs-dark)"),
				GOLD: bgc("var(--bs-warning)", "var(--bs-dark)"),
			},
		},
		difficultyColours: {
			BSC: COLOUR_SET.green,
			ADV: COLOUR_SET.gold,
			EXT: COLOUR_SET.red,
			"HARD BSC": COLOUR_SET.darkGreen,
			"HARD ADV": COLOUR_SET.orange,
			"HARD EXT": COLOUR_SET.vibrantRed,
		},
		ratingSystems: [],
		scoreHeaders: [
			["Score", "Score", NumericSOV((x) => x?.scoreData.score ?? -Infinity)],
			["Judgements", "Hits", NumericSOV((x) => x?.scoreData.musicRate ?? -Infinity)],
			["Lamp", "Lamp", NumericSOV((x) => x?.scoreData.enumIndexes.lamp ?? -Infinity)],
		],
		scoreCoreCells: ({ sc, chart }) => (
			<>
				<JubeatScoreCell sc={sc} />
				<JubeatJudgementCell score={sc} />
				<LampCell lamp={sc.scoreData.lamp} colour={GetEnumColour(sc, "lamp")} />
			</>
		),
		ratingCell: ({ sc }) => <JubilityCell score={sc} />,
	},
	"maimai:Single": {
		enumIcons: defaultEnumIcons,
		enumColours: {
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.green,
				"FULL COMBO": COLOUR_SET.blue,
				"ALL PERFECT": COLOUR_SET.gold,
				"ALL PERFECT+": COLOUR_SET.teal,
			},
			grade: {
				F: COLOUR_SET.gray,
				E: COLOUR_SET.gray,
				D: COLOUR_SET.gray,
				C: COLOUR_SET.red,
				B: COLOUR_SET.maroon,
				A: COLOUR_SET.green,
				AA: COLOUR_SET.paleBlue,
				AAA: COLOUR_SET.blue,
				S: COLOUR_SET.gold,
				"S+": COLOUR_SET.vibrantYellow,
				SS: COLOUR_SET.paleOrange,
				"SS+": COLOUR_SET.orange,
				SSS: COLOUR_SET.teal,
				"SSS+": COLOUR_SET.white,
			},
		},
		classColours: {
			dan: {
				DAN_1: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_2: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_3: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_4: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_5: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_6: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_7: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_8: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_9: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_10: bgc("var(--bs-warning)", "var(--bs-dark)"),

				KAIDEN: bgc("var(--bs-warning)", "var(--bs-dark)"),

				SHINDAN_1: bgc("purple", "var(--bs-light)"),
				SHINDAN_2: bgc("purple", "var(--bs-light)"),
				SHINDAN_3: bgc("purple", "var(--bs-light)"),
				SHINDAN_4: bgc("purple", "var(--bs-light)"),
				SHINDAN_5: bgc("purple", "var(--bs-light)"),
				SHINDAN_6: bgc("purple", "var(--bs-light)"),
				SHINDAN_7: bgc("purple", "var(--bs-light)"),
				SHINDAN_8: bgc("purple", "var(--bs-light)"),
				SHINDAN_9: bgc("purple", "var(--bs-light)"),
				SHINDAN_10: bgc("purple", "var(--bs-light)"),

				SHINKAIDEN: bgc("purple", "var(--bs-light)"),
			},
			colour: {
				WHITE: bgc("white", "var(--bs-dark)"),
				BLUE: bgc("cyan", "var(--bs-dark)"),
				GREEN: bgc("green", "var(--bs-light)"),
				YELLOW: bgc("yellow", "var(--bs-dark)"),
				RED: bgc("red", "var(--bs-light)"),
				PURPLE: bgc("purple", "var(--bs-light)"),
				BRONZE: bgc("brown", "var(--bs-light)"),
				SILVER: bgc("gray", "var(--bs-light)"),
				GOLD: bgc("var(--bs-warning)", "var(--bs-dark)"),

				RAINBOW: {
					background:
						"linear-gradient(-45deg, #f0788a, #f48fb1, #9174c2, #79bcf2, #70a173, #f7ff99, #faca7d, #ff9d80, #f0788a)",
					color: "var(--bs-dark)",
				},
			},
		},
		difficultyColours: {
			Easy: COLOUR_SET.blue,
			Basic: COLOUR_SET.green,
			Advanced: COLOUR_SET.orange,
			Expert: COLOUR_SET.red,
			Master: COLOUR_SET.purple,
			"Re:Master": COLOUR_SET.white,
		},
		ratingSystems: [],
		scoreHeaders: [
			["Percent", "%", NumericSOV((x) => x?.scoreData.percent)],
			["Judgements", "Hits", NumericSOV((x) => x?.scoreData.percent)],
			["Lamp", "Lamp", NumericSOV((x) => x?.scoreData.enumIndexes.lamp)],
		],
		scoreCoreCells: ({ sc }) => (
			<>
				<ScoreCell
					colour={GetEnumColour(sc, "grade")}
					grade={sc.scoreData.grade}
					percent={sc.scoreData.percent}
				/>
				<MaimaiJudgementCell score={sc} />
				<LampCell lamp={sc.scoreData.lamp} colour={GetEnumColour(sc, "lamp")} />
			</>
		),
		ratingCell: ({ sc, rating }) => <RatingCell score={sc} rating={rating} />,
	},
	"maimaidx:Single": {
		enumIcons: defaultEnumIcons,
		enumColours: {
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.green,
				"FULL COMBO": COLOUR_SET.blue,
				"FULL COMBO+": COLOUR_SET.paleBlue,
				"ALL PERFECT": COLOUR_SET.gold,
				"ALL PERFECT+": COLOUR_SET.teal,
			},
			grade: {
				D: COLOUR_SET.gray,
				C: COLOUR_SET.red,
				B: COLOUR_SET.maroon,
				BB: COLOUR_SET.purple,
				BBB: COLOUR_SET.paleGreen,
				A: COLOUR_SET.green,
				AA: COLOUR_SET.paleBlue,
				AAA: COLOUR_SET.blue,
				S: COLOUR_SET.gold,
				"S+": COLOUR_SET.vibrantYellow,
				SS: COLOUR_SET.paleOrange,
				"SS+": COLOUR_SET.orange,
				SSS: COLOUR_SET.teal,
				"SSS+": COLOUR_SET.white,
			},
		},
		classColours: {
			dan: {
				DAN_1: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_2: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_3: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_4: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_5: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_6: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_7: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_8: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_9: bgc("var(--bs-warning)", "var(--bs-dark)"),
				DAN_10: bgc("var(--bs-warning)", "var(--bs-dark)"),

				SHINDAN_1: bgc("purple", "var(--bs-light)"),
				SHINDAN_2: bgc("purple", "var(--bs-light)"),
				SHINDAN_3: bgc("purple", "var(--bs-light)"),
				SHINDAN_4: bgc("purple", "var(--bs-light)"),
				SHINDAN_5: bgc("purple", "var(--bs-light)"),
				SHINDAN_6: bgc("purple", "var(--bs-light)"),
				SHINDAN_7: bgc("purple", "var(--bs-light)"),
				SHINDAN_8: bgc("purple", "var(--bs-light)"),
				SHINDAN_9: bgc("purple", "var(--bs-light)"),
				SHINDAN_10: bgc("purple", "var(--bs-light)"),

				SHINKAIDEN: bgc("purple", "var(--bs-light)"),

				URAKAIDEN: {
					background:
						"linear-gradient(-45deg, #f0788a, #f48fb1, #9174c2, #79bcf2, #70a173, #f7ff99, #faca7d, #ff9d80, #f0788a)",
					color: "var(--bs-dark)",
				},
			},
			colour: {
				WHITE: bgc("white", "var(--bs-dark)"),
				BLUE: bgc("cyan", "var(--bs-dark)"),
				GREEN: bgc("green", "var(--bs-light)"),
				YELLOW: bgc("yellow", "var(--bs-dark)"),
				RED: bgc("red", "var(--bs-light)"),
				PURPLE: bgc("purple", "var(--bs-light)"),
				BRONZE: bgc("brown", "var(--bs-light)"),
				SILVER: bgc("gray", "var(--bs-light)"),
				GOLD: bgc("var(--bs-warning)", "var(--bs-dark)"),
				PLATINUM: bgc("lightgoldenrodyellow", "var(--bs-dark)"),

				RAINBOW: {
					background:
						"linear-gradient(-45deg, #f0788a, #f48fb1, #9174c2, #79bcf2, #70a173, #f7ff99, #faca7d, #ff9d80, #f0788a)",
					color: "var(--bs-dark)",
				},
			},
			matchingClass: {
				B5: bgc("green", "var(--bs-light)"),
				B4: bgc("green", "var(--bs-light)"),
				B3: bgc("green", "var(--bs-light)"),
				B2: bgc("green", "var(--bs-light)"),
				B1: bgc("green", "var(--bs-light)"),
				A5: bgc("red", "var(--bs-light)"),
				A4: bgc("red", "var(--bs-light)"),
				A3: bgc("red", "var(--bs-light)"),
				A2: bgc("red", "var(--bs-light)"),
				A1: bgc("red", "var(--bs-light)"),
				S5: bgc("brown", "var(--bs-light)"),
				S4: bgc("brown", "var(--bs-light)"),
				S3: bgc("brown", "var(--bs-light)"),
				S2: bgc("brown", "var(--bs-light)"),
				S1: bgc("brown", "var(--bs-light)"),
				SS5: bgc("gray", "var(--bs-light)"),
				SS4: bgc("gray", "var(--bs-light)"),
				SS3: bgc("gray", "var(--bs-light)"),
				SS2: bgc("gray", "var(--bs-light)"),
				SS1: bgc("gray", "var(--bs-light)"),
				SSS5: bgc("var(--bs-warning)", "var(--bs-dark)"),
				SSS4: bgc("var(--bs-warning)", "var(--bs-dark)"),
				SSS3: bgc("var(--bs-warning)", "var(--bs-dark)"),
				SSS2: bgc("var(--bs-warning)", "var(--bs-dark)"),
				SSS1: bgc("var(--bs-warning)", "var(--bs-dark)"),
				LEGEND: {
					background:
						"linear-gradient(-45deg, #f0788a, #f48fb1, #9174c2, #79bcf2, #70a173, #f7ff99, #faca7d, #ff9d80, #f0788a)",
					color: "var(--bs-dark)",
				}
			}
		},
		difficultyColours: {
			Basic: COLOUR_SET.green,
			Advanced: COLOUR_SET.orange,
			Expert: COLOUR_SET.red,
			Master: COLOUR_SET.purple,
			"Re:Master": COLOUR_SET.white,
			"DX Basic": COLOUR_SET.green,
			"DX Advanced": COLOUR_SET.orange,
			"DX Expert": COLOUR_SET.red,
			"DX Master": COLOUR_SET.purple,
			"DX Re:Master": COLOUR_SET.white,
		},
		ratingSystems: [],
		scoreHeaders: [
			["Percent", "%", NumericSOV((x) => x?.scoreData.percent)],
			["Judgements", "Hits", NumericSOV((x) => x?.scoreData.percent)],
			["Lamp", "Lamp", NumericSOV((x) => x?.scoreData.enumIndexes.lamp)],
		],
		scoreCoreCells: ({ sc }) => (
			<>
				<ScoreCell
					colour={GetEnumColour(sc, "grade")}
					grade={sc.scoreData.grade}
					percent={sc.scoreData.percent}
				/>
				<MaimaiDXJudgementCell score={sc} />
				<LampCell lamp={sc.scoreData.lamp} colour={GetEnumColour(sc, "lamp")} />
			</>
		),
		ratingCell: ({ sc, rating }) => <RatingCell score={sc} rating={rating} />,
	},
	"museca:Single": {
		enumIcons: defaultEnumIcons,
		enumColours: {
			grade: {
				没: COLOUR_SET.gray,
				拙: COLOUR_SET.maroon,
				凡: COLOUR_SET.red,
				佳: COLOUR_SET.paleGreen,
				良: COLOUR_SET.paleBlue,
				優: COLOUR_SET.green,
				秀: COLOUR_SET.blue,
				傑: COLOUR_SET.teal,
				傑G: COLOUR_SET.gold,
			},
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.green,
				"CONNECT ALL": COLOUR_SET.teal,
				"PERFECT CONNECT ALL": COLOUR_SET.gold,
			},
		},
		classColours: {},
		difficultyColours: {
			Green: COLOUR_SET.green,
			Yellow: COLOUR_SET.vibrantYellow,
			Red: COLOUR_SET.red,
		},
		ratingSystems: [],

		scoreHeaders: [
			["Score", "Score", NumericSOV((x) => x?.scoreData.score)],
			["Near - Miss", "Nr. Ms.", NumericSOV((x) => x?.scoreData.score)],
			["Lamp", "Lamp", NumericSOV((x) => x?.scoreData.enumIndexes.lamp)],
		],
		scoreCoreCells: ({ sc, chart }) => (
			<>
				<MillionsScoreCell
					score={sc.scoreData.score}
					grade={sc.scoreData.grade}
					colour={GetEnumColour(sc, "grade")}
				/>
				<MusecaJudgementCell score={sc} />
				<LampCell lamp={sc.scoreData.lamp} colour={GetEnumColour(sc, "lamp")} />
			</>
		),
		ratingCell: ({ sc, rating }) => <RatingCell score={sc} rating={rating} />,
	},
	"popn:9B": {
		enumIcons: {
			grade: "sort-alpha-up",
			lamp: "lightbulb",
			clearMedal: "medal",
		},
		enumColours: {
			grade: {
				E: COLOUR_SET.gray,
				D: COLOUR_SET.maroon,
				C: COLOUR_SET.red,
				B: COLOUR_SET.blue,
				A: COLOUR_SET.green,
				AA: COLOUR_SET.orange,
				AAA: COLOUR_SET.gold,
				S: COLOUR_SET.teal,
			},
			lamp: {
				FAILED: COLOUR_SET.red,
				"EASY CLEAR": COLOUR_SET.green,
				CLEAR: COLOUR_SET.blue,
				"FULL COMBO": COLOUR_SET.teal,
				PERFECT: COLOUR_SET.gold,
			},
			clearMedal: {
				failedCircle: COLOUR_SET.red,
				failedDiamond: COLOUR_SET.red,
				failedStar: COLOUR_SET.red,
				easyClear: COLOUR_SET.green,
				clearCircle: COLOUR_SET.blue,
				clearDiamond: COLOUR_SET.blue,
				clearStar: COLOUR_SET.blue,
				fullComboCircle: COLOUR_SET.teal,
				fullComboDiamond: COLOUR_SET.teal,
				fullComboStar: COLOUR_SET.teal,
				perfect: COLOUR_SET.gold,
			},
		},
		classColours: {
			class: {
				KITTY: bgc("brown", "var(--bs-light)"),
				STUDENT: bgc("green", "var(--bs-light)"),
				DELINQUENT: bgc("lime", "var(--bs-dark)"),
				DETECTIVE: bgc("purple", "var(--bs-light)"),
				IDOL: bgc("var(--bs-danger)", "var(--bs-light)"),
				GENERAL: bgc("darkgoldenrod", "var(--bs-light)"),
				HERMIT: bgc("var(--bs-success)", "var(--bs-light)"),
				GOD: bgc("var(--bs-warning)", "var(--bs-dark)"),
			},
		},
		difficultyColours: {
			Easy: COLOUR_SET.blue,
			Normal: COLOUR_SET.green,
			Hyper: COLOUR_SET.orange,
			EX: COLOUR_SET.red,
		},
		ratingSystems: [],
		scoreHeaders: [
			["Score", "Score", NumericSOV((x) => x.scoreData.score)],
			["Judgements", "Hits", NumericSOV((x) => x.scoreData.score)],
			["Lamp", "Lamp", NumericSOV((x) => x.scoreData.enumIndexes.clearMedal)],
		],
		scoreCoreCells: ({ sc }) => (
			<>
				<MillionsScoreCell
					score={sc.scoreData.score}
					grade={sc.scoreData.grade}
					colour={GetEnumColour(sc, "grade")}
				/>
				<PopnJudgementCell score={sc} />
				<PopnLampCell score={sc} />
			</>
		),
		ratingCell: ({ sc, rating }) => <RatingCell score={sc} rating={rating} />,
	},
	"wacca:Single": {
		enumIcons: defaultEnumIcons,
		enumColours: {
			grade: {
				D: COLOUR_SET.gray,
				C: COLOUR_SET.maroon,
				B: COLOUR_SET.red,
				A: COLOUR_SET.paleGreen,
				AA: COLOUR_SET.green,
				AAA: COLOUR_SET.vibrantGreen,
				S: COLOUR_SET.gold,
				"S+": COLOUR_SET.vibrantYellow,
				SS: COLOUR_SET.paleOrange,
				"SS+": COLOUR_SET.orange,
				SSS: COLOUR_SET.pink,
				"SSS+": COLOUR_SET.vibrantPink,
				MASTER: COLOUR_SET.white,
			},
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.blue,
				MISSLESS: COLOUR_SET.orange,
				"FULL COMBO": COLOUR_SET.pink,
				"ALL MARVELOUS": COLOUR_SET.gold,
			},
		},
		classColours: {
			colour: {
				ASH: bgc("var(--bs-secondary)", "var(--bs-light)"),
				NAVY: bgc("darkblue", "var(--bs-light)"),
				YELLOW: bgc("orange", "var(--bs-dark)"),
				RED: bgc("red", "var(--bs-light)"),
				PURPLE: bgc("purple", "var(--bs-light)"),
				BLUE: bgc("var(--bs-info)", "var(--bs-light)"),
				SILVER: bgc("silver", "var(--bs-dark)"),
				GOLD: bgc("var(--bs-warning)", "var(--bs-dark)"),
				RAINBOW: {
					background:
						"linear-gradient(-45deg, #f0788a, #f48fb1, #9174c2, #79bcf2, #70a173, #f7ff99, #faca7d, #ff9d80, #f0788a)",
					color: "var(--bs-dark)",
				},
			},
			stageUp: {
				I: bgc("var(--bs-dark)", "var(--bs-light)"),
				II: bgc("var(--bs-dark)", "var(--bs-light)"),
				III: bgc("var(--bs-dark)", "var(--bs-light)"),
				IV: bgc("var(--bs-dark)", "var(--bs-light)"),
				V: bgc("var(--bs-dark)", "var(--bs-light)"),
				VI: bgc("var(--bs-dark)", "var(--bs-light)"),
				VII: bgc("var(--bs-dark)", "var(--bs-light)"),
				VIII: bgc("var(--bs-dark)", "var(--bs-light)"),
				IX: bgc("var(--bs-dark)", "var(--bs-light)"),
				X: bgc("var(--bs-dark)", "var(--bs-light)"),
				XI: bgc("var(--bs-dark)", "var(--bs-light)"),
				XII: bgc("var(--bs-dark)", "var(--bs-light)"),
				XIII: bgc("var(--bs-dark)", "var(--bs-light)"),
				XIV: bgc("var(--bs-dark)", "var(--bs-light)"),
			},
		},
		difficultyColours: {
			NORMAL: COLOUR_SET.blue,
			HARD: COLOUR_SET.gold,
			EXPERT: COLOUR_SET.pink,
			INFERNO: COLOUR_SET.purple,
		},
		ratingSystems: [],
		scoreHeaders: [
			["Score", "Score", NumericSOV((x) => x.scoreData.score)],
			["Judgements", "Hits", NumericSOV((x) => x.scoreData.score)],
			["Lamp", "Lamp", NumericSOV((x) => x.scoreData.enumIndexes.lamp)],
		],
		scoreCoreCells: ({ sc }) => (
			<>
				<MillionsScoreCell
					score={sc.scoreData.score}
					grade={sc.scoreData.grade}
					colour={GetEnumColour(sc, "grade")}
				/>
				<WaccaJudgementCell score={sc} />
				<LampCell lamp={sc.scoreData.lamp} colour={GetEnumColour(sc, "lamp")} />
			</>
		),
		ratingCell: ({ sc, rating }) => <RatingCell score={sc} rating={rating} />,
	},
	"itg:Stamina": {
		enumIcons: defaultEnumIcons,
		enumColours: {
			grade: {
				F: COLOUR_SET.gray,
				D: COLOUR_SET.red,
				C: COLOUR_SET.maroon,
				B: COLOUR_SET.purple,
				A: COLOUR_SET.green,
				S: COLOUR_SET.orange,
				"★": COLOUR_SET.pink,
				"★★": COLOUR_SET.vibrantPink,
				"★★★": COLOUR_SET.teal,
				"★★★★": COLOUR_SET.white,
			},
			lamp: {
				FAILED: COLOUR_SET.red,
				CLEAR: COLOUR_SET.blue,
				"FULL COMBO": COLOUR_SET.pink,
				"FULL EXCELLENT COMBO": COLOUR_SET.gold,
				QUAD: COLOUR_SET.teal,
				QUINT: COLOUR_SET.white,
			},
		},
		difficultyColours: {
			// this game has dynamic difficulties. Formatting is handled elsewhere.
		},
		classColours: {},
		ratingSystems: [
			CreateRatingSys(
				"BPM",
				"How fast are the streams in this chart?",
				(c) => c.data.streamBPM,
				(c) => c.data.streamBPM?.toString(),
				(c) => undefined,
				(s) => [
					s.scoreData.lamp === "FAILED"
						? `Failed ${s.scoreData.survivedPercent.toFixed(2)}%`
						: s.scoreData.lamp,
					s.scoreData.lamp !== "FAILED",
				]
			),
		],
		scoreHeaders: [
			["Score", "Score", NumericSOV((x) => x.scoreData.finalPercent)],
			["Judgements", "Hits", NumericSOV((x) => x.scoreData.scorePercent)],
			["Lamp", "Lamp", NumericSOV((x) => x.scoreData.enumIndexes.lamp)],
		],
		scoreCoreCells: ({ sc, chart }) => (
			<>
				<ScoreCell
					colour={GetEnumColour(sc, "grade")}
					grade={sc.scoreData.grade}
					percent={sc.scoreData.scorePercent}
				/>
				<ITGJudgementCell score={sc} />
				<td
					style={{
						backgroundColor: ChangeOpacity(GetEnumColour(sc, "lamp"), 0.2),
					}}
				>
					{sc.scoreData.lamp === "FAILED" ? (
						<strong>DIED @ {Math.floor(sc.scoreData.survivedPercent)}%</strong>
					) : (
						<strong>{sc.scoreData.lamp}</strong>
					)}
				</td>
			</>
		),
		ratingCell: ({ sc, chart, rating }) => (
			<>
				{rating === "blockRating" ? (
					<td>
						<strong>
							{chart.data.rankedLevel === null
								? "Unranked Chart."
								: sc.calculatedData.blockRating === null
									? "Failed"
									: sc.calculatedData.blockRating}
						</strong>
					</td>
				) : (
					<RatingCell score={sc} rating={rating} />
				)}
			</>
		),
	},
	"gitadora:Dora": GITADORA_DORA_IMPL,
	"gitadora:Gita": GITADORA_GITA_IMPL,
	"bms:14K": BMS_14K_IMPL,
	"bms:7K": BMS_7K_IMPL,
	"pms:Controller": PMS_IMPL,
	"pms:Keyboard": PMS_IMPL,
	"sdvx:Single": SDVX_IMPL,
	"usc:Controller": USC_IMPL,
	"usc:Keyboard": USC_IMPL,
};

export function GetEnumColour(score: ScoreDocument | PBScoreDocument, enumName: string) {
	const gptImpl = GPT_CLIENT_IMPLEMENTATIONS[GetGPTString(score.game, score.playtype)];

	// @ts-expect-error lol
	return gptImpl.enumColours[enumName][score.scoreData[enumName]];
}
