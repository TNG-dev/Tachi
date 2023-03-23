import { NumericSOV } from "util/sorts";
import { ChangeOpacity } from "util/color-opacity";
import { FormatMillions } from "util/misc";
import { GPTClientImplementation } from "lib/types";
import { COLOUR_SET, GPTStrings } from "tachi-common";
import MillionsScoreCell from "components/tables/cells/MillionsScoreCell";
import SDVXJudgementCell from "components/tables/cells/SDVXJudgementCell";
import SDVXLampCell from "components/tables/cells/SDVXLampCell";
import { GetEnumColour } from "lib/game-implementations";
import React from "react";
import VF6Cell from "components/tables/cells/VF6Cell";
import { CreateRatingSys, bg, bgc } from "./_util";

type SDVXLikes = GPTStrings["usc" | "sdvx"];

const SDVXLIKE_ENUM_COLOURS: GPTClientImplementation<SDVXLikes>["enumColours"] = {
	grade: {
		D: COLOUR_SET.gray,
		C: COLOUR_SET.red,
		B: COLOUR_SET.maroon,
		A: COLOUR_SET.paleBlue,
		"A+": COLOUR_SET.blue,
		AA: COLOUR_SET.paleGreen,
		"AA+": COLOUR_SET.green,
		AAA: COLOUR_SET.gold,
		"AAA+": COLOUR_SET.vibrantOrange,
		S: COLOUR_SET.teal,
		PUC: COLOUR_SET.pink,
	},
	lamp: {
		FAILED: COLOUR_SET.red,
		CLEAR: COLOUR_SET.green,
		"EXCESSIVE CLEAR": COLOUR_SET.purple,
		"ULTIMATE CHAIN": COLOUR_SET.teal,
		"PERFECT ULTIMATE CHAIN": COLOUR_SET.gold,
	},
};

const USCCoreCells: GPTClientImplementation<GPTStrings["usc"]>["scoreCoreCells"] = ({ sc }) => (
	<>
		<MillionsScoreCell
			score={sc.scoreData.score}
			grade={sc.scoreData.grade}
			colour={GetEnumColour(sc, "grade")}
		/>
		<SDVXJudgementCell score={sc} />
		<SDVXLampCell score={sc} />
	</>
);

const SDVXCoreCells: GPTClientImplementation<"sdvx:Single">["scoreCoreCells"] = ({ sc }) => (
	<>
		<td
			style={{
				backgroundColor: ChangeOpacity(GetEnumColour(sc, "grade"), 0.2),
			}}
		>
			<strong>{sc.scoreData.grade}</strong>
			<br />
			{FormatMillions(sc.scoreData.score)}
			{sc.scoreData.optional.exScore && (
				<>
					<br />
					[EX: {sc.scoreData.optional.exScore}]
				</>
			)}
		</td>
		<SDVXJudgementCell score={sc} />
		<SDVXLampCell score={sc} />
	</>
);

const SDVXRatingCell: GPTClientImplementation<SDVXLikes>["ratingCell"] = ({ sc, chart }) => (
	<VF6Cell score={sc} chart={chart} />
);

export const SDVX_IMPL: GPTClientImplementation<"sdvx:Single"> = {
	enumColours: SDVXLIKE_ENUM_COLOURS,
	enumIcons: {
		grade: "sort-alpha-up",
		lamp: "lightbulb",
	},
	difficultyColours: {
		NOV: COLOUR_SET.purple,
		ADV: COLOUR_SET.vibrantYellow,
		EXH: COLOUR_SET.red,
		INF: COLOUR_SET.vibrantPink,
		GRV: COLOUR_SET.orange,
		HVN: COLOUR_SET.teal,
		VVD: COLOUR_SET.pink,
		XCD: COLOUR_SET.blue,
		MXM: COLOUR_SET.white,
	},
	classColours: {
		dan: {
			DAN_1: bg(COLOUR_SET.red),
			DAN_2: bg(COLOUR_SET.paleBlue),
			DAN_3: bgc("gold", "black"),
			DAN_4: bg("gray"),
			DAN_5: bgc(COLOUR_SET.teal, "black"),
			DAN_6: bg("blue"),
			DAN_7: bgc(COLOUR_SET.vibrantPink, "black"),
			DAN_8: bgc("pink", "black"),
			DAN_9: bgc("white", "black"),
			DAN_10: "warning",
			DAN_11: "danger",
			INF: bgc("purple", "gold"),
		},
		vfClass: {
			SIENNA_I: bg(COLOUR_SET.red),
			SIENNA_II: bg(COLOUR_SET.red),
			SIENNA_III: bg(COLOUR_SET.red),
			SIENNA_IV: bg(COLOUR_SET.red),
			COBALT_I: bg(COLOUR_SET.paleBlue),
			COBALT_II: bg(COLOUR_SET.paleBlue),
			COBALT_III: bg(COLOUR_SET.paleBlue),
			COBALT_IV: bg(COLOUR_SET.paleBlue),
			DANDELION_I: bgc(COLOUR_SET.gold, "black"),
			DANDELION_II: bgc(COLOUR_SET.gold, "black"),
			DANDELION_III: bgc(COLOUR_SET.gold, "black"),
			DANDELION_IV: bgc(COLOUR_SET.gold, "black"),
			CYAN_I: bgc(COLOUR_SET.teal, "black"),
			CYAN_II: bgc(COLOUR_SET.teal, "black"),
			CYAN_III: bgc(COLOUR_SET.teal, "black"),
			CYAN_IV: bgc(COLOUR_SET.teal, "black"),
			SCARLET_I: bgc(COLOUR_SET.vibrantPink, "black"),
			SCARLET_II: bgc(COLOUR_SET.vibrantPink, "black"),
			SCARLET_III: bgc(COLOUR_SET.vibrantPink, "black"),
			SCARLET_IV: bgc(COLOUR_SET.vibrantPink, "black"),
			CORAL_I: bgc(COLOUR_SET.pink, "black"),
			CORAL_II: bgc(COLOUR_SET.pink, "black"),
			CORAL_III: bgc(COLOUR_SET.pink, "black"),
			CORAL_IV: bgc(COLOUR_SET.pink, "black"),
			ARGENTO_I: bgc(COLOUR_SET.white, "black"),
			ARGENTO_II: bgc(COLOUR_SET.white, "black"),
			ARGENTO_III: bgc(COLOUR_SET.white, "black"),
			ARGENTO_IV: bgc(COLOUR_SET.white, "black"),
			ELDORA_I: "warning",
			ELDORA_II: "warning",
			ELDORA_III: "warning",
			ELDORA_IV: "warning",
			CRIMSON_I: bg(COLOUR_SET.vibrantRed),
			CRIMSON_II: bg(COLOUR_SET.vibrantRed),
			CRIMSON_III: bg(COLOUR_SET.vibrantRed),
			CRIMSON_IV: bg(COLOUR_SET.vibrantRed),
			IMPERIAL_I: bg(COLOUR_SET.vibrantPurple),
			IMPERIAL_II: bg(COLOUR_SET.vibrantPurple),
			IMPERIAL_III: bg(COLOUR_SET.vibrantPurple),
			IMPERIAL_IV: bg(COLOUR_SET.vibrantPurple),
		},
	},
	ratingSystems: [
		CreateRatingSys(
			"Tierlist",
			"The unofficial SDVX clearing tierlist",
			(c) => c.data.clearTier?.value,
			(c) => c.data.clearTier?.text,
			(c) => c.data.clearTier?.individualDifference,
			(s) => [s.scoreData.lamp, s.scoreData.lamp !== "FAILED"]
		),
	],
	scoreHeaders: [
		["Score", "Score", NumericSOV((x) => x?.scoreData.score)],
		["Near - Miss", "Nr. Ms.", NumericSOV((x) => x?.scoreData.score)],
		["Lamp", "Lamp", NumericSOV((x) => x?.scoreData.enumIndexes.lamp)],
	],
	scoreCoreCells: SDVXCoreCells,
	ratingCell: SDVXRatingCell,
};
export const USC_IMPL: GPTClientImplementation<GPTStrings["usc"]> = {
	enumColours: SDVXLIKE_ENUM_COLOURS,
	enumIcons: {
		grade: "sort-alpha-up",
		lamp: "lightbulb",
	},
	difficultyColours: {
		NOV: COLOUR_SET.purple,
		ADV: COLOUR_SET.vibrantYellow,
		EXH: COLOUR_SET.red,
		INF: COLOUR_SET.vibrantPink,
	},
	ratingSystems: [],
	scoreHeaders: [
		["Score", "Score", NumericSOV((x) => x?.scoreData.score)],
		["Near - Miss", "Nr. Ms.", NumericSOV((x) => x?.scoreData.score)],
		["Lamp", "Lamp", NumericSOV((x) => x?.scoreData.enumIndexes.lamp)],
	],
	classColours: {
		vfClass: SDVX_IMPL.classColours.vfClass,
	},
	scoreCoreCells: USCCoreCells,
	ratingCell: SDVXRatingCell,
};
