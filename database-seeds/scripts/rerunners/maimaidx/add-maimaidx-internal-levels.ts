/**
 * Run parse-maimaidx-dataset.js first.
 *
 * Internal levels for FESTiVAL+ songs are at
 * https://docs.google.com/spreadsheets/d/1xqXfzfDfxiEE9mREwgX_ITIY8AowRM7w-TH2t1I_RJE/edit
 *
 * Download sheets as CSV and use `-f <CSV filename>`.
 *
 * If you have a `music` folder from a current maimai DX dump, pass it with `-d path/to/music`.
 */
import fs from "fs";
import path from "path";
import { Command } from "commander";
import { parse } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";
import { ReadCollection, MutateCollection } from "../../util";
import { ChartDocument, SongDocument } from "tachi-common";

interface XmlNotes {
	file: { path: string };

	level: number;
	levelDecimal: number;

	notesDesigner: { id: number; str: string };
	notesType: number;

	musicLevelID: number;
	maxNotes: number;
	isEnable: boolean;
}

const diffMap = new Map([
	["BAS", "Basic"],
	["ADV", "Advanced"],
	["EXP", "Expert"],
	["MAS", "Master"],
	["ReMAS", "Re:Master"],
]);

const categoryMap = new Map([
	["POPS&アニメ", "POPS＆アニメ"],
	["niconico", "niconico＆ボーカロイド"],
	["東方", "東方Project"],
	["maimaiオリジナル", "maimai"],
	["ゲーム&Variety", "ゲーム＆バラエティ"],
	["ゲキチュウ", "オンゲキ＆CHUNITHM"],
]);

const manualTitleMap = new Map([
	// 14 and higher
	["Excalibur ～Revived Resolution～", "Excalibur ～Revived resolution～"],
	["Sqlupp(Camellia's Sqleipd*Hiytex Remix)", 'Sqlupp (Camellia\'s "Sqleipd*Hiytex" Remix)'],
	["≠彡゛/了→", '≠彡"/了→'],
	["Mjolnir", "Mjölnir"],
	["FREEDOM DiVE(tpz Overcute Remix)", "FREEDOM DiVE (tpz Overcute Remix)"],

	// 13+
	["GRANDIR", "GRÄNDIR"],
	["D✪N’T ST✪P R✪CKIN’", "D✪N’T  ST✪P  R✪CKIN’"],
	["Seclet Sleuth", "Secret Sleuth"],
	["L'epilogue", "L'épilogue"],

	// 13
	[
		"REVIVER オルタンシア･サーガ-蒼の騎士団- オリジナルVer.",
		"REVIVER オルタンシア・サーガ -蒼の騎士団- オリジナルVer.",
	],
	[
		"チルノのパーフェクトさんすう教室6 ⑨周年バージョン",
		"チルノのパーフェクトさんすう教室　⑨周年バージョン",
	],
	[
		"【東方ニコカラ】秘神マターラfeat.魂音泉【IOSYS】",
		"【東方ニコカラ】秘神マターラ feat.魂音泉【IOSYS】",
	],
	["Save This World νMix", "Save This World νMIX"],
	["ウッーウッーウマウマ( ﾟ∀ﾟ)", "ウッーウッーウマウマ(ﾟ∀ﾟ)"],
	["砂の惑星 feat.HATSUNE MIKU", "砂の惑星 feat. HATSUNE MIKU"],
	[
		"Seyana.～何でも言うことを聞いてくれるアカネチャン～",
		"Seyana. ～何でも言うことを聞いてくれるアカネチャン～",
	],
	["レッツゴー！陰陽師", "レッツゴー!陰陽師"],
	["L4TS:2018(feat.あひる＆KTA)", "L4TS:2018 (feat. あひる & KTA)"],
	["曖昧Mind", "曖昧mind"],
	["紅星ミゼラブル〜廃憶編", "紅星ミゼラブル～廃憶編"],
	["ファンタジーゾーンOPA!-OPA! -GMT remix-", "ファンタジーゾーン OPA-OPA! -GMT remix-"],
	["Turn Around", "Turn around"],
	["ぼくたちいつでもしゅわっしゅわ！", "ぼくたちいつでも　しゅわっしゅわ！"],
	["God Knows…", "God knows..."],
	["Jorqer", "Jörqer"],
	["スカーレット警察のゲットーパトロール２４時", "スカーレット警察のゲットーパトロール24時"],
	["Bad Apple!! feat.nomico 〜五十嵐撫子Ver.〜", "Bad Apple!! feat.nomico ～五十嵐 撫子 Ver.～"],
]);

function normalizeTitle(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/ /gu, "")
			// ideographic space is used in some titles
			// eslint-disable-next-line no-irregular-whitespace
			.replace(/　/gu, "")
			// so is nbsp I think?
			// eslint-disable-next-line no-irregular-whitespace
			.replace(/ /gu, "")
			.replace(/：/gu, ":")
			.replace(/（/gu, "(")
			.replace(/）/gu, ")")
			.replace(/！/gu, "!")
			.replace(/？/gu, "?")
			.replace(/`/gu, "'")
			.replace(/’/gu, "'")
			.replace(/”/gu, '"')
			.replace(/“/gu, '"')
			.replace(/～/gu, "~")
			.replace(/－/gu, "-")
			.replace(/＠/gu, "@")
			.replace(/１/gu, "1")
			.replace(/２/gu, "2")
			.replace(/３/gu, "3")
			.replace(/４/gu, "4")
			.replace(/５/gu, "5")
			.replace(/６/gu, "6")
			.replace(/７/gu, "7")
			.replace(/８/gu, "8")
			.replace(/９/gu, "9")
			.replace(/０/gu, "0")
	);
}

function findSong(
	songs: SongDocument<"maimaidx">[],
	title: string,
	category: string
): SongDocument<"maimaidx"> | undefined {
	// There are two songs with the exact same title and that only differs
	// by category:
	// - Link (maimai) is 68
	// - Link (niconico) is 244
	if (title === "Link") {
		return songs.find((s) => s.id === (category === "maimai" ? 68 : 244));
	}

	// These songs will return the same result if normalized
	if (title === "Heartbeats") {
		return songs.find((s) => s.id === 131);
	}
	if (title === "Heart Beats") {
		return songs.find((s) => s.id === 211);
	}

	return songs.find(
		(s) =>
			normalizeTitle(s.title) === normalizeTitle(title) ||
			s.title === manualTitleMap.get(title)
	);
}

function calculateDisplayLevel(internalLevel: number): string {
	const plusDifficulty = (internalLevel * 10) % 10 >= 7;
	const level = `${Math.floor(internalLevel)}${plusDifficulty && internalLevel >= 7 ? "+" : ""}`;
	return level;
}

function calculateDifficulty(style: string, sheetDifficulty: string): string {
	return `${style === "DX" ? `${style} ` : ""}${diffMap.get(sheetDifficulty)}`;
}

function addTmaiSheet(csvData: string[][]) {
	const songs = ReadCollection("songs-maimaidx.json");

	MutateCollection("charts-maimaidx.json", (charts: ChartDocument<"maimaidx:Single">[]) => {
		for (let rowNumber = 1; rowNumber < csvData.length; rowNumber++) {
			const row = csvData[rowNumber]!;
			const title = row[1];
			if (!title) {
				break;
			}

			const song = findSong(songs, title, "");
			if (!song) {
				console.log(`Could not find song ${title}`);
				continue;
			}

			const difficulty = calculateDifficulty(row[2]!, row[3]!);
			const chart = charts.find((c) => c.songID === song.id && c.difficulty === difficulty);
			if (!chart) {
				console.log(`Could not find chart ${difficulty} for ${title}`);
				continue;
			}

			const internalLevel = Number(row[7]!);
			const level = calculateDisplayLevel(internalLevel);
			if (chart.level !== level) {
				console.log(
					`Overwriting level for ${song.title} [${chart.difficulty}]: ${chart.level} -> ${level}`
				);
				chart.level = level;
			}
			if (chart.levelNum !== internalLevel) {
				console.log(
					`Overwriting levelNum for ${song.title} [${chart.difficulty}]: ${chart.levelNum} -> ${internalLevel}`
				);
				chart.levelNum = internalLevel;
			}
		}
		return charts;
	});
}

/**
 * Adds internal levels to charts from a CSV file.
 * @param csvData raw CSV data
 * @param parseCategory whether to include category header in parsing
 * @param headerRow the index (starting from 0) of the first row with a song
 * 	(or with category if `parseCategory` is `true`)
 *
 *  **To be considered a category only the first column can have text.**
 * @param hasCategoryColumn whether there is a category column for each song
 * @param markLatest whether to mark chart as latest
 */
function addOtherSheet(
	csvData: string[][],
	parseCategory: boolean,
	headerRow: number,
	hasCategoryColumn: boolean,
	markLatest: boolean
) {
	const songs = ReadCollection("songs-maimaidx.json");
	const categoryColumnOffset = hasCategoryColumn ? 1 : 0;
	let currentCategory = "";

	MutateCollection("charts-maimaidx.json", (charts) => {
		for (
			let colNumber = 0;
			colNumber + 4 + categoryColumnOffset < csvData[0]!.length;
			colNumber += 6 + categoryColumnOffset
		) {
			for (let rowNumber = headerRow; rowNumber < csvData.length; rowNumber++) {
				const row = csvData[rowNumber]!;
				const title = row[colNumber]!;

				if (
					parseCategory &&
					title &&
					[1, 2, 3, 4].every((i) => !row[colNumber + categoryColumnOffset + i])
				) {
					currentCategory = categoryMap.get(title) ?? "";
					continue;
				}

				const style = row[colNumber + categoryColumnOffset + 1];
				if (style !== "DX" && style !== "STD") {
					continue;
				}

				const sheetDifficulty = row[colNumber + categoryColumnOffset + 2]!;
				const internalLevelString = row[colNumber + categoryColumnOffset + 4];
				if (
					!internalLevelString ||
					internalLevelString === "#N/A" ||
					internalLevelString === "-"
				) {
					continue;
				}
				const internalLevel = Number(internalLevelString.match(/\d+\.\d+/u)?.[0]);
				const level = calculateDisplayLevel(internalLevel);

				const song = findSong(songs, title, currentCategory);
				if (!song) {
					console.log(`Could not find song ${title}`);
					continue;
				}

				const difficulty = calculateDifficulty(style, sheetDifficulty);
				const chart = charts.find(
					(c) => c.songID === song.id && c.difficulty === difficulty
				);
				if (!chart) {
					console.log(`Could not find chart ${difficulty} for ${title}`);
					continue;
				}
				if (chart.level !== level) {
					console.log(
						`Overwriting level for ${song.title} [${chart.difficulty}]: ${chart.level} -> ${level}`
					);
					chart.level = level;
				}
				if (chart.levelNum !== internalLevel) {
					console.log(
						`Overwriting levelNum for ${song.title} [${chart.difficulty}]: ${chart.levelNum} -> ${internalLevel}`
					);
					chart.levelNum = internalLevel;
				}
				if (chart.data.isLatest !== markLatest) {
					console.log(
						`Marking ${song.title} [${chart.difficulty}]'s isLatest to ${markLatest}`
					);
					chart.data.isLatest = markLatest;
				}
			}
		}
		return charts;
	});
}

const program = new Command();
program.option("-f, --file <filename>", "CSV file to read from");
program.option("-d, --directory <music>", "path to A000/music directory");
program.parse(process.argv);
const options = program.opts();

if (options.directory) {
	const songs = ReadCollection("songs-maimaidx.json");
	const parser = new XMLParser({ ignoreAttributes: false });

	MutateCollection("charts-maimaidx.json", (charts: ChartDocument<"maimaidx:Single">[]) => {
		const items = fs.readdirSync(options.directory);
		items.forEach((item) => {
			const fullPath = path.join(options.directory, item);
			if (
				!fs.lstatSync(fullPath).isDirectory() ||
				!fs.existsSync(path.join(fullPath, "Music.xml"))
			) {
				return;
			}
			const musicData = parser.parse(
				fs.readFileSync(path.join(fullPath, "Music.xml"))
			).MusicData;
			const title = `${musicData.name.str}`; // The song "39" is treated as a number by the XML parser
			const category = musicData.genreName.str;
			const song = findSong(songs, title, category);
			if (!song) {
				console.log(`Could not find song ${title}`);
				return;
			}

			// DX song IDs start from 10000
			const style = Math.floor(musicData.name.id / 10000) === 1 ? "DX " : "";

			for (const [idx, notes] of Object.entries(musicData.notesData.Notes as XmlNotes[])) {
				if (!notes.isEnable) {
					continue;
				}
				const difficulty = `${style}${[...diffMap.values()][Number(idx)]}`;
				const chart = charts.find(
					(c) => c.songID === song.id && c.difficulty === difficulty
				);
				if (!chart) {
					console.log(`Could not find chart ${difficulty} for ${title}`);
					continue;
				}
				const internalLevel = Number((notes.level + notes.levelDecimal / 10).toFixed(1));
				let level = notes.level.toString();
				if (notes.level >= 7 && notes.levelDecimal >= 7) {
					level += "+";
				}

				if (chart.level !== level) {
					console.log(
						`Overwriting level for ${song.title} [${chart.difficulty}]: ${chart.level} -> ${level}`
					);
					chart.level = level;
				}
				if (chart.levelNum !== internalLevel) {
					console.log(
						`Overwriting levelNum for ${song.title} [${chart.difficulty}]: ${chart.levelNum} -> ${internalLevel}`
					);
					chart.levelNum = internalLevel;
				}
			}
		});
		return charts;
	});
} else if (options.file) {
	const csvData = parse(fs.readFileSync(options.file));
	const newSongsSheet = options.file.includes("新曲.csv");
	const tmaiSheet = options.file.includes(" - Tmai.csv");
	const highLevelSheet = / - (14以上|13+|13).csv$/u.test(options.file);

	if (tmaiSheet) {
		addTmaiSheet(csvData);
	} else if (newSongsSheet) {
		addOtherSheet(csvData, false, 7, false, true);
	} else if (highLevelSheet) {
		addOtherSheet(csvData, false, 3, true, false);
	} else {
		addOtherSheet(csvData, true, 2, true, false);
	}
} else {
	console.error("Must specify either a file or a directory");
	process.exit(1);
}
