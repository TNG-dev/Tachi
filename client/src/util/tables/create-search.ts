import { HumanFriendlyStrToEnumIndex } from "util/str-to-num";
import { ValueGetterOrHybrid } from "util/ztable/search";
import {
	BMS_TABLES,
	ChartDocument,
	Game,
	GamePTConfig,
	GetGamePTConfig,
	GPTString,
	PBScoreDocument,
	Playtype,
	ScoreDocument,
} from "tachi-common";
import { ComparePBsDataset, FolderDataset, PBDataset, ScoreDataset } from "types/tables";

function GetBMSTableVal(chart: ChartDocument<"bms:7K" | "bms:14K">, key: string) {
	for (const table of chart.data.tableFolders) {
		if (table.table === key) {
			return Number(table.level);
		}
	}

	return null;
}

export function CreateDefaultScoreSearchParams<GPT extends GPTString = GPTString>(
	game: Game,
	playtype: Playtype
) {
	const gptConfig = GetGamePTConfig(game, playtype);

	const searchFunctions: Record<string, ValueGetterOrHybrid<ScoreDataset<GPT>[0]>> = {
		artist: (x) => x.__related.song.artist,
		title: (x) => x.__related.song.title,
		searchTerms: (x) => x.__related.song.searchTerms.join(", "),
		difficulty: (x) => x.__related.chart.difficulty,
		level: (x) => x.__related.chart.levelNum,
		highlight: (x) => !!x.highlight,
		...GetMetricSearchParams(game, playtype),
		...CreateCalcDataSearchFns(gptConfig),
	};

	if (game === "bms") {
		HandleBMSNonsense(searchFunctions, playtype, (k) => k.__related.chart);
	}

	return searchFunctions;
}

export function GetMetricSearchParams(
	game: Game,
	playtype: Playtype,
	kMapper: (v: any) => PBScoreDocument | ScoreDocument = (v) => v
) {
	const searchFns: Record<string, ValueGetterOrHybrid<PBScoreDocument | ScoreDocument>> = {};

	const gptConfig = GetGamePTConfig(game, playtype);

	for (const [metric, conf] of Object.entries({
		...gptConfig.providedMetrics,
		...gptConfig.derivedMetrics,
	})) {
		switch (conf.type) {
			case "ENUM":
				searchFns[metric] = {
					// @ts-expect-error lol this is fine pls
					valueGetter: (x) => kMapper(x)?.scoreData[metric] ?? null,
					strToNum: HumanFriendlyStrToEnumIndex(game, playtype, metric),
				};
				break;
			case "INTEGER":
			case "DECIMAL":
				// @ts-expect-error lol this is fine pls
				searchFns[metric] = (x) => kMapper(x)?.scoreData[metric] ?? null;
		}
	}

	return searchFns;
}

export function CreateDefaultPBSearchParams<GPT extends GPTString = GPTString>(
	game: Game,
	playtype: Playtype
) {
	const gptConfig = GetGamePTConfig(game, playtype);

	const searchFunctions: Record<string, ValueGetterOrHybrid<PBDataset<GPT>[0]>> = {
		artist: (x) => x.__related.song.artist,
		title: (x) => x.__related.song.title,
		searchTerms: (x) => x.__related.song.searchTerms.join(", "),
		difficulty: (x) => x.__related.chart.difficulty,
		level: (x) => x.__related.chart.levelNum,
		ranking: (x) => x.rankingData.rank,
		rivalRanking: (x) => x.rankingData.rivalRank,
		highlight: (x) => !!x.highlight,
		username: (x) => x.__related.user?.username ?? null,
		...GetMetricSearchParams(game, playtype),
		...CreateCalcDataSearchFns(gptConfig),
	};

	if (game === "bms") {
		HandleBMSNonsense(searchFunctions, playtype, (k) => k.__related.chart);
	}

	return searchFunctions;
}

export function CreatePBCompareSearchParams<GPT extends GPTString = GPTString>(
	game: Game,
	playtype: Playtype
) {
	const searchFunctions: Record<string, ValueGetterOrHybrid<ComparePBsDataset<GPT>[0]>> = {
		artist: (x) => x.song.artist,
		title: (x) => x.song.title,
		searchTerms: (x) => x.song.searchTerms.join(", "),
		difficulty: (x) => x.chart.difficulty,
		level: (x) => x.chart.levelNum,
	};

	if (game === "bms") {
		HandleBMSNonsense(searchFunctions, playtype, (k) => k.chart);
	}

	return searchFunctions;
}

export function CreateDefaultFolderSearchParams<GPT extends GPTString = GPTString>(
	game: Game,
	playtype: Playtype
) {
	const gptConfig = GetGamePTConfig(game, playtype);

	const searchFunctions: Record<string, ValueGetterOrHybrid<FolderDataset<GPT>[0]>> = {
		artist: (x) => x.__related.song.artist,
		title: (x) => x.__related.song.title,
		searchTerms: (x) => x.__related.song.searchTerms.join(", "),
		difficulty: (x) => x.difficulty,
		level: (x) => x.levelNum,
		ranking: (x) => x.__related.pb?.rankingData.rank ?? null,
		rivalRanking: (x) => x.__related.pb?.rankingData.rivalRank ?? null,
		highlight: (x) => !!x.__related.pb?.highlight,
		played: (x) => !!x.__related.pb,
		...GetMetricSearchParams(game, playtype, (k) => k.__related.pb),
		...CreateFolderCalcDataSearchFns(gptConfig),
	};

	if (game === "bms") {
		HandleBMSNonsense(searchFunctions, playtype, (k) => k);
	}

	return searchFunctions;
}

function CreateFolderCalcDataSearchFns(gptConfig: GamePTConfig) {
	return Object.fromEntries(
		Object.keys(gptConfig.scoreRatingAlgs).map((e) => [
			e.toLowerCase(),
			// @ts-expect-error this is fine please leave me alone
			(x: FolderDataset[0]) => x.__related.pb?.calculatedData[e] ?? null,
		])
	);
}

function CreateCalcDataSearchFns(gptConfig: GamePTConfig) {
	return Object.fromEntries(
		Object.keys(gptConfig.scoreRatingAlgs).map(
			// @ts-expect-error this is fine please leave me alone
			(e) => [e.toLowerCase(), (x: PBDataset[0]) => x.calculatedData[e]] ?? null
		)
	);
}

/**
 * Add BMS tables to the list of available searchy things.
 */
function HandleBMSNonsense(
	searchFunctions: Record<string, any>,
	playtype: Playtype,
	chartGetter: (u: any) => ChartDocument<"bms:7K" | "bms:14K">
) {
	const appendSearches: Record<string, ValueGetterOrHybrid<any>> = Object.fromEntries(
		BMS_TABLES.filter((e) => e.playtype === playtype).map((e) => [
			e.asciiPrefix,
			(x) => GetBMSTableVal(chartGetter(x), e.prefix),
		])
	);

	Object.assign(searchFunctions, appendSearches);
}
