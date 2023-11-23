import {
	InternalFailure,
	InvalidScoreFailure,
	SkipScoreFailure,
	SongOrChartNotFoundFailure,
} from "../../../framework/common/converter-failures";
import db from "external/mongo/db";
import { CreateScoreID } from "lib/score-import/framework/score-importing/score-id";
import { GetGPTString } from "tachi-common";
import { IsNullishOrEmptyStr } from "utils/misc";
import { FindIIDXChartOnInGameIDVersion, FindIIDXChartWith2DXtraHash } from "utils/queries/charts";
import { FindSongOnID } from "utils/queries/songs";
import type { DryScore } from "../../../framework/common/types";
import type { ConverterFunction } from "../../common/types";
import type { FervidexContext, FervidexScore } from "./types";
import type { Difficulties, Playtypes } from "tachi-common";

export const FERVIDEX_LAMP_LOOKUP = {
	0: "NO PLAY",
	1: "FAILED",
	2: "ASSIST CLEAR",
	3: "EASY CLEAR",
	4: "CLEAR",
	5: "HARD CLEAR",
	6: "EX HARD CLEAR",
	7: "FULL COMBO",
} as const;

export function TachifyAssist(
	assist: Required<FervidexScore>["option"]["assist"]
): DryScore<"iidx:DP" | "iidx:SP">["scoreMeta"]["assist"] {
	switch (assist) {
		case "FULL_ASSIST":
		case "ASCR_LEGACY":
			return "FULL ASSIST";
		case "AUTO_SCRATCH":
			return "AUTO SCRATCH";
		case "LEGACY_NOTE":
			return "LEGACY NOTE";
		case null:
		case undefined:
			return "NO ASSIST";
	}
}

export function TachifyGauge(
	gauge: Required<FervidexScore>["option"]["gauge"]
): DryScore<"iidx:DP" | "iidx:SP">["scoreMeta"]["gauge"] {
	switch (gauge) {
		case "ASSISTED_EASY":
			return "ASSISTED EASY";
		case "EASY":
			return "EASY";
		case "EX_HARD":
			return "EX-HARD";
		case "HARD":
			return "HARD";
		case null:
		case undefined:
			return "NORMAL";
	}
}

export function TachifyRange(
	gauge: Required<FervidexScore>["option"]["range"]
): DryScore<"iidx:DP" | "iidx:SP">["scoreMeta"]["range"] {
	switch (gauge) {
		case "HIDDEN_PLUS":
			return "HIDDEN+";
		case "LIFT":
			return "LIFT";
		case "LIFT_SUD_PLUS":
			return "LIFT SUD+";
		case "SUDDEN_PLUS":
			return "SUDDEN+";
		case "SUD_PLUS_HID_PLUS":
			return "SUD+ HID+";
		case null:
		case undefined:
			return "NONE";
	}
}

export function TachifyRandom(gauge: Required<FervidexScore>["option"]["style"]) {
	switch (gauge) {
		case "RANDOM":
			return "RANDOM";
		case "S_RANDOM":
			return "S-RANDOM";
		case "R_RANDOM":
			return "R-RANDOM";
		case "MIRROR":
			return "MIRROR";
		case null:
		case undefined:
			return "NONRAN";
	}
}

export function SplitFervidexChartRef(ferDif: FervidexScore["chart"]) {
	let playtype: Playtypes["iidx"];

	if (ferDif.startsWith("sp")) {
		playtype = "SP";
	} else {
		playtype = "DP";
	}

	let difficulty: Difficulties["iidx:DP" | "iidx:SP"];

	switch (ferDif[ferDif.length - 1]) {
		case "b":
			throw new SkipScoreFailure(`BEGINNER charts are not supported.`);

		case "n": {
			difficulty = "NORMAL";
			break;
		}

		case "h": {
			difficulty = "HYPER";
			break;
		}

		case "a": {
			difficulty = "ANOTHER";
			break;
		}

		case "l": {
			difficulty = "LEGGENDARIA";
			break;
		}

		default:
			throw new InternalFailure(`Invalid fervidex difficulty of ${ferDif}`);
	}

	return { playtype, difficulty };
}

export const ConverterIRFervidex: ConverterFunction<FervidexScore, FervidexContext> = async (
	data,
	context,
	importType,
	logger
) => {
	// eslint-disable-next-line prefer-const
	let { difficulty, playtype } = SplitFervidexChartRef(data.chart);

	// Scripted Long used to be an ANOTHER with id 21201
	//
	// now it has an id of 12250 and is a legg.
	// Versions of omnimix prior to oct 2023 depend on this behaviour.
	if (data.entry_id === 21201 && difficulty === "ANOTHER") {
		data.entry_id = 12250;
		difficulty = "LEGGENDARIA";
	}

	let chart;

	if (data.custom === true) {
		if (IsNullishOrEmptyStr(data.chart_sha256)) {
			throw new InvalidScoreFailure("Score has no chart_sha256 but is a custom?");
		}

		chart = await FindIIDXChartWith2DXtraHash(data.chart_sha256);
	} else {
		chart = await FindIIDXChartOnInGameIDVersion(
			data.entry_id,
			playtype,
			difficulty,
			context.version
		);
	}

	if (!chart) {
		throw new SongOrChartNotFoundFailure(
			`Could not find chart with songID ${data.entry_id} (${playtype} ${difficulty} [${context.version}])`,
			importType,
			data,
			context
		);
	}

	const song = await FindSongOnID("iidx", chart.songID);

	if (!song) {
		logger.severe(`Song ${chart.songID} (iidx) has no parent song?`);
		throw new InternalFailure(`Song ${chart.songID} (iidx) has no parent song?`);
	}

	const gaugeHistory = data.gauge.map((e) => (e > 200 ? null : e));

	const gauge = gaugeHistory[gaugeHistory.length - 1];

	// If gauge exists and is greater than 100
	// must be invalid
	if ((gauge ?? 0) > 100) {
		throw new InvalidScoreFailure(`Invalid value of gauge ${gauge}.`);
	}

	let bp: number | null = data.bad + data.poor;

	if (data.dead) {
		bp = null;
	}

	const dryScore: DryScore<"iidx:DP" | "iidx:SP"> = {
		game: "iidx",
		service: "Fervidex",
		comment: null,
		importType: "ir/fervidex",
		timeAchieved: context.timeReceived,
		scoreData: {
			score: data.ex_score,
			lamp: FERVIDEX_LAMP_LOOKUP[data.clear_type],
			judgements: {
				pgreat: data.pgreat,
				great: data.great,
				good: data.good,
				bad: data.bad,
				poor: data.poor,
			},
			optional: {
				fast: data.fast,
				slow: data.slow,
				maxCombo: null,
				gaugeHistory,
				scoreHistory: data.ghost,
				gauge,
				bp,
				comboBreak: data.combo_break,
				gsmEasy: data["2dx-gsm"]?.EASY,
				gsmNormal: data["2dx-gsm"]?.NORMAL,
				gsmHard: data["2dx-gsm"]?.HARD,
				gsmEXHard: data["2dx-gsm"]?.EX_HARD,
			},
		},
		scoreMeta: {
			assist: TachifyAssist(data.option?.assist),
			gauge: TachifyGauge(data.option?.gauge),

			random:
				chart.playtype === "SP"
					? TachifyRandom(data.option?.style)
					: [TachifyRandom(data.option?.style), TachifyRandom(data.option?.style_2p)],
			range: TachifyRange(data.option?.range),
		},
	};

	// When [9] is pressed on the keypad in game, Fervidex will send the score (again)
	// marked as a duplicate, but with highlight set. As such, we should highlight
	// the score this is for.
	if (data.highlight === true) {
		const scoreID = CreateScoreID(
			GetGPTString("iidx", chart.playtype),
			context.userID,
			dryScore,
			chart.chartID
		);

		await db.scores.update({ scoreID }, { $set: { highlight: true } });

		// now, just continue on with the regular import process. We already handle
		// discarding duplicates, so this shouldn't matter.
	}

	return { song, chart, dryScore };
};
