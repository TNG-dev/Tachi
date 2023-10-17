import {
	GetGPTString,
	GetGameConfig,
	GetGamePTConfig,
	GetSpecificGPTConfig,
} from "../config/config";
import type { GradeBoundary } from "../constants/grade-boundaries";
import type {
	BMSCourseDocument,
	ChartDocument,
	GPTString,
	GPTStrings,
	Game,
	Playtypes,
	SongDocument,
	integer,
} from "../types";
import type { PrudenceError, ValidSchemaValue } from "prudence";
import type { AnyZodObject } from "zod";

export function FormatInt(v: number): string {
	return Math.floor(v).toFixed(0);
}

export function FormatDifficulty(chart: ChartDocument, game: Game): string {
	if (game === "bms" || game === "pms") {
		const bmsChart = chart as ChartDocument<"bms:7K" | "bms:14K">;

		return (
			bmsChart.data.tableFolders.map((e) => `${e.table}${e.level}`).join(", ") || "Unrated"
		);
	}

	if (game === "itg") {
		const itgChart = chart as ChartDocument<"itg:Stamina">;

		const level = itgChart.data.rankedLevel ?? itgChart.data.chartLevel;
		const unranked = itgChart.data.rankedLevel === null ? "UNRANKED " : "";

		return `${unranked}${itgChart.data.difficultyTag} ${level} (${itgChart.data.charter})`;
	}

	if (game === "gitadora") {
		const ch = chart as ChartDocument<GPTStrings["gitadora"]>;

		const gptConfig = GetSpecificGPTConfig<GPTStrings["gitadora"]>(
			GetGPTString(game, chart.playtype) as GPTStrings["gitadora"]
		);

		// it's complaining that since the dora config doesn't have shorthand for
		// "BASS BASIC", this assignment may fail.
		// it's technically correct, but in the worst way, since this isn't
		// actually possible.
		// todo: come up with something better.
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
		// @ts-ignore this fails in my IDE but is fine in the compiler, can't use ts-expect-err here.
		const shortDiff = gptConfig.difficulties.shorthand[ch.difficulty];

		// gitadora should always use short diffs. they just look better.
		return `${shortDiff} ${chart.level}`;
	}

	const gameConfig = GetGameConfig(game);

	if (gameConfig.playtypes.length > 1) {
		return `${chart.playtype} ${chart.difficulty} ${chart.level}`;
	}

	return `${chart.difficulty} ${chart.level}`;
}

/**
 * Formats a chart's difficulty into a shorter variant. This handles a lot of
 * game-specific strange edge cases.
 */
export function FormatDifficultyShort(chart: ChartDocument, game: Game): string {
	const gameConfig = GetGameConfig(game);
	const gptConfig = GetGamePTConfig(game, chart.playtype);

	if (game === "itg") {
		const itgChart = chart as ChartDocument<"itg:Stamina">;

		return `S${itgChart.data.difficultyTag} ${chart.level}`;
	}

	if (gptConfig.difficulties.type === "DYNAMIC") {
		// TODO cap string length
		return `${chart.difficulty} ${chart.level}`;
	}

	const shortDiff = gptConfig.difficulties.shorthand[chart.difficulty] ?? chart.difficulty;

	if (gameConfig.playtypes.length === 1 || game === "gitadora") {
		return `${shortDiff} ${chart.level}`;
	}

	if (game === "usc") {
		return `${chart.playtype === "Controller" ? "CON" : "KB"} ${shortDiff} ${chart.level}`;
	}

	return `${chart.playtype}${shortDiff} ${chart.level}`;
}

export function FormatGame(game: Game, playtype: Playtypes[Game]): string {
	const gameConfig = GetGameConfig(game);

	if (gameConfig.playtypes.length === 1) {
		return gameConfig.name;
	}

	if (game === "usc" && playtype === "Keyboard") {
		return `${gameConfig.name} (Keyboard/Other)`;
	}

	return `${gameConfig.name} (${playtype})`;
}

export function FormatChart(
	game: Game,
	song: SongDocument,
	chart: ChartDocument,
	short = false
): string {
	if (game === "bms") {
		const tables = (chart as ChartDocument<GPTStrings["bms"]>).data.tableFolders;

		const bmsSong = song as SongDocument<"bms">;

		let realTitle = bmsSong.title;

		if (bmsSong.data.subtitle) {
			realTitle = `${realTitle} - ${bmsSong.data.subtitle}`;
		}

		if (bmsSong.data.genre) {
			realTitle = `${realTitle} [${bmsSong.data.genre}]`;
		}

		if (tables.length === 0) {
			return realTitle;
		}

		return `${realTitle} (${tables.map((e) => `${e.table}${e.level}`).join(", ")})`;
	} else if (game === "usc") {
		const uscChart = chart as ChartDocument<GPTStrings["usc"]>;

		// If this chart isn't an official, render it differently
		if (!uscChart.data.isOfficial) {
			// Same as BMS. turn this into SongTitle (Keyboard MXM normal1, insane2)
			return `${song.title} (${chart.playtype} ${
				chart.difficulty
			} ${uscChart.data.tableFolders.map((e) => `${e.table}${e.level}`).join(", ")})`;
		} else if (uscChart.data.tableFolders.length !== 0) {
			// if this chart is an official **AND** is on tables (unlikely), render
			// it as so:

			// SongTitle (Keyboard MXM 17, normal1, insane2)
			return `${song.title} (${chart.playtype} ${chart.difficulty} ${
				chart.level
			}, ${uscChart.data.tableFolders.map((e) => `${e.table}${e.level}`).join(", ")})`;
		}

		// otherwise, it's just an official and should be rendered like any other game.
	} else if (game === "itg") {
		const itgChart = chart as ChartDocument<"itg:Stamina">;
		const itgSong = song as SongDocument<"itg">;

		const level = itgChart.data.rankedLevel ?? `${itgChart.data.chartLevel}?`;

		return `${itgSong.title}${itgSong.data.subtitle ? ` ${itgSong.data.subtitle}` : ""} ${
			itgChart.data.difficultyTag
		} ${level}`;
	}

	const gameConfig = GetGameConfig(game);

	let playtypeStr = `${chart.playtype}`;

	if (gameConfig.playtypes.length === 1) {
		playtypeStr = "";
	}

	const gptConfig = GetGamePTConfig(game, chart.playtype);

	let diff: string;

	if (gptConfig.difficulties.type === "DYNAMIC") {
		diff = chart.difficulty;
	} else if (short) {
		diff = gptConfig.difficulties.shorthand[chart.difficulty] ?? chart.difficulty;
	} else {
		diff = chart.difficulty;
	}

	// iidx formats things like SPA instead of SP A.
	// this is a hack, this should be part of the gptConfig, tbh.
	let space = "";

	if ((game === "iidx" && short) || !playtypeStr) {
		space = "";
	} else {
		space = " ";
	}

	// return the most recent version this chart appeared in if it
	// is not primary.
	if (!chart.isPrimary) {
		return `${song.title} (${playtypeStr}${space}${diff} ${chart.level} ${chart.versions[0]})`;
	}

	return `${song.title} (${playtypeStr}${space}${diff} ${chart.level})`;
}

/**
 * Run a zod schema inside prudence.
 */
export function PrudenceZodShim(zodSchema: AnyZodObject): ValidSchemaValue {
	return (self) => {
		const res = zodSchema.safeParse(self);

		if (res.success) {
			return true;
		}

		return res.error.message;
	};
}

/**
 * Formats a number (14100) into "14K".
 */
export function FmtNumCompact(num: number) {
	return Intl.NumberFormat("en", { notation: "compact" }).format(num);
}

/**
 * Formats a number (14100) into "14,100"
 */
export function FmtNum(num: number) {
	return num.toLocaleString();
}

export function FmtPercent(v: number, dp = 2) {
	return `${v.toFixed(dp)}%`;
}

/**
 * Turns a number of 12834 into "12834" instead of "12,834".
 */
export function FmtScoreNoCommas(v: number) {
	return v.toString();
}

function WrapGrade(grade: string) {
	if (grade.endsWith("-") || grade.endsWith("+")) {
		return `(${grade})`;
	}

	return grade;
}

function RelativeGradeDelta<G extends string>(
	gradeBoundaries: Array<GradeBoundary<G>>,
	scoreGrade: G,
	scoreValue: number,
	// Positive number means higher grade, etc.
	relativeIndex: number
) {
	const gradeBoundary =
		gradeBoundaries[gradeBoundaries.findIndex((e) => e.name === scoreGrade) + relativeIndex];

	if (!gradeBoundary) {
		return null;
	}

	return AbsoluteGradeDelta(gradeBoundary, scoreValue);
}

function AbsoluteGradeDelta<G extends string>(gradeBoundary: GradeBoundary<G>, scoreValue: number) {
	return {
		grade: gradeBoundary.name,
		delta: scoreValue - gradeBoundary.lowerBound,
	};
}

export function GetGradeDeltas<G extends string>(
	gradeBoundaries: Array<GradeBoundary<G>>,
	scoreGrade: G,
	scoreValue: number,
	formatNumFn = FmtNumCompact
) {
	const scoreGradeBoundary = gradeBoundaries.find((e) => e.name === scoreGrade);

	if (!scoreGradeBoundary) {
		throw new Error(
			`Passed a scoreGrade of ${scoreGrade} but no such boundary exists in ${gradeBoundaries
				.map((e) => e.name)
				.join(", ")}`
		);
	}

	const upper = RelativeGradeDelta(gradeBoundaries, scoreGrade, scoreValue, 1);
	const lower = AbsoluteGradeDelta(scoreGradeBoundary, scoreValue);

	const formatLower = `${WrapGrade(lower.grade)}+${formatNumFn(lower.delta)}`;

	// there might be *no* grade above this one, in this case lower obviously wins.
	if (!upper) {
		return {
			lower: formatLower,
			closer: "lower",
		};
	}

	// this will automatically have a - separating the two.
	const formatUpper = `${WrapGrade(upper.grade)}${formatNumFn(upper.delta)}`;

	// are we closer to the lower bound, or the upper one?
	let closer: "lower" | "upper" = upper.delta + lower.delta < 0 ? "lower" : "upper";

	// lovely hardcoded exception for IIDXLikes - (MAX-)+ is always a stupid metric
	// so always mute it.
	if (formatLower.startsWith("(MAX-)+")) {
		closer = "upper";
	}

	return {
		lower: formatLower,
		upper: formatUpper,
		closer,
	};
}

export function GetCloserGradeDelta<G extends string>(
	gradeBoundaries: Array<GradeBoundary<G>>,
	scoreGrade: G,
	scoreValue: number,
	formatNumFn = FmtNumCompact
): string {
	const { lower, upper, closer } = GetGradeDeltas(
		gradeBoundaries,
		scoreGrade,
		scoreValue,
		formatNumFn
	);

	if (closer === "upper") {
		// this type assertion is unecessary in theory, but in practice older versions
		// of TS aren't happy with it.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		return upper!;
	}

	return lower;
}

export function CreateSongMap<G extends Game = Game>(songs: Array<SongDocument<G>>) {
	const songMap = new Map<integer, SongDocument<G>>();

	for (const song of songs) {
		songMap.set(song.id, song);
	}

	return songMap;
}

export function CreateChartMap<GPT extends GPTString = GPTString>(
	charts: Array<ChartDocument<GPT>>
) {
	const chartMap = new Map<string, ChartDocument<GPT>>();

	for (const chart of charts) {
		chartMap.set(chart.chartID, chart);
	}

	return chartMap;
}

/**
 * Formats a PrudenceError into something a little more readable.
 * @param err - The prudence error to format.
 * @param foreword - A description of what kind of error this was. Defaults to "Error".
 */
export function FormatPrError(err: PrudenceError, foreword = "Error"): string {
	const receivedText =
		typeof err.userVal === "object" && err.userVal !== null
			? ""
			: ` | Received ${err.userVal} [${err.userVal === null ? "null" : typeof err.userVal}]`;

	return `${foreword}: ${err.keychain} | ${err.message}${receivedText}.`;
}

export function GetBMSCourseIndex(course: BMSCourseDocument) {
	const gptConf = GetGamePTConfig("bms", course.playtype);

	const cls = gptConf.classes[course.set];

	if (!cls) {
		throw new Error(
			`Invalid BMSCourse set of ${course.set}. No classes are defined for this set.`
		);
	}

	return cls.values.findIndex((e) => e.id === course.value);
}

/**
 * Util for getting a games' grade for a given score.
 */
export function GetGrade<G extends string>(grades: Array<GradeBoundary<G>>, score: number): G {
	// sort grades going downwards in their boundaries.
	const descendingGrades = grades.slice(0).sort((a, b) => b.lowerBound - a.lowerBound);

	for (const { name, lowerBound } of descendingGrades) {
		if (score >= lowerBound) {
			return name;
		}
	}

	throw new Error(`Could not resolve grade for score ${score}.`);
}
