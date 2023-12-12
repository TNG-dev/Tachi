import { Command } from "commander";
import { XMLParser } from "fast-xml-parser";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { CreateChartID, MutateCollection, ReadCollection, WriteCollection } from "../../util";
import { ChartDocument, Difficulties, SongDocument } from "tachi-common";

const VERSIONS = [
	"chuni",
	"chuniplus",
	"air",
	"airplus",
	"star",
	"starplus",
	"amazon",
	"amazonplus",
	"crystal",
	"crystalplus",
	"paradise",
	"paradiselost",
	"new",
	"newplus",
	"sun",
	"sunplus",
];

interface IDWithDisplayName {
	id: number;
	str: string;
	data: string;
}

interface MusicFumenData {
	type: IDWithDisplayName;
	enable: boolean;
	level: number;
	levelDecimal: number;
	notesDesigner: string;
	defaultBpm: number;
}

interface MusicXML {
	MusicData: {
		name: IDWithDisplayName;
		artistName: IDWithDisplayName;
		releaseTagName: IDWithDisplayName;

		// I know it's supposed to be a list, but CHUNITHM has never had multi-genre songs
		// and also the XML parser returns it as an object.
		genreNames: {
			list: {
				StringID: IDWithDisplayName;
			};
		};

		fumens: {
			MusicFumenData: MusicFumenData[];
		};
	};
}

function calculateLevel(data: Pick<MusicFumenData, "level" | "levelDecimal">) {
	return `${data.level}${data.levelDecimal >= 50 ? "+" : ""}`;
}

function calculateLevelNum(data: Pick<MusicFumenData, "level" | "levelDecimal">) {
	return Number(`${data.level}.${data.levelDecimal}`);
}

const program = new Command();
program.requiredOption("-i, --input <OPTION FOLDERS...>");
program.requiredOption("-v, --version <VERSION>");

program.parse(process.argv);
const options = program.opts();

const isLatestVersion =
	VERSIONS.indexOf(options.version.replace(/(-intl|-omni)$/u, "")) === VERSIONS.length - 1;

const existingChartDocs = ReadCollection("charts-chunithm.json");

const inGameIDToSongIDMap = new Map<number, number>();
const existingCharts = new Map<string, ChartDocument<"chunithm:Single">>();

for (const chart of existingChartDocs) {
	inGameIDToSongIDMap.set(chart.data.inGameID, chart.songID);
	existingCharts.set(`${chart.data.inGameID}-${chart.difficulty}`, chart);
}

const parser = new XMLParser();

const newSongs: Array<SongDocument<"chunithm">> = [];
const newCharts: Array<ChartDocument<"chunithm:Single">> = [];

for (const optionFolder of options.input) {
	const musicFolder = path.join(optionFolder, "music");

	if (!existsSync(musicFolder)) {
		console.warn(`Option at ${optionFolder} does not have a "music" folder.`);
		continue;
	}

	for (const song of readdirSync(musicFolder)) {
		if (!song.startsWith("music")) {
			continue;
		}

		const songFolder = path.join(musicFolder, song);

		if (!statSync(songFolder).isDirectory()) {
			continue;
		}

		const musicXmlLocation = path.join(songFolder, "Music.xml");

		if (!existsSync(musicXmlLocation)) {
			console.warn(`Music folder at ${songFolder} does not have a Music.xml file.`);
			continue;
		}

		const data = parser.parse(readFileSync(musicXmlLocation)) as MusicXML;
		const musicData = data.MusicData;

		const inGameID = musicData.name.id;

		if (inGameID >= 8000) {
			// 8000 and above is reserved for WORLD'S END songs, don't care.
			continue;
		}

		let songID = inGameIDToSongIDMap.get(inGameID);

		if (songID === undefined) {
			songID = musicData.name.id;

			const displayVersion = VERSIONS[musicData.releaseTagName.id];
			if (!displayVersion) {
				throw new Error(
					`Unknown version ID ${musicData.releaseTagName.id}. Update merge-options.ts.`
				);
			}

			const songDoc: SongDocument<"chunithm"> = {
				title: musicData.name.str,
				altTitles: [],
				searchTerms: [],
				artist: musicData.artistName.str,
				id: songID,
				data: {
					displayVersion,
					genre: musicData.genreNames.list.StringID.str,
				},
			};

			newSongs.push(songDoc);
			inGameIDToSongIDMap.set(inGameID, songID);
		}

		for (const difficulty of musicData.fumens.MusicFumenData) {
			const difficultyName = difficulty.type.data;

			const exists = existingCharts.get(`${inGameID}-${difficultyName}`);
			const level = calculateLevel(difficulty);
			const levelNum = calculateLevelNum(difficulty);
			if (exists) {
				if (!exists.versions.includes(options.version)) {
					exists.versions.push(options.version);
				}

				if (isLatestVersion) {
					exists.level = level;
					exists.levelNum = levelNum;
				}

				continue;
			}

			if (!difficulty.enable) {
				continue;
			}

			if (difficulty.type.data === "WORLD'S END") {
				// This shouldn't happen, because songs under ID 8000 should **not** have
				// WORLD'S END charts. Just in case though.
				continue;
			}

			const chartDoc: ChartDocument<"chunithm:Single"> = {
				chartID: CreateChartID(),
				songID,
				difficulty: difficultyName as Difficulties["chunithm:Single"],
				isPrimary: true,
				level,
				levelNum,
				versions: [options.version],
				playtype: "Single",
				data: {
					inGameID,
				},
			};
			newCharts.push(chartDoc);
		}
	}
}

MutateCollection("songs-chunithm.json", (songs: Array<SongDocument<"chunithm">>) => [
	...songs,
	...newSongs,
]);

// overwrite this collection instead of mutating it
// we already know the existing chart docs and might have mutated them to
// declare the new versions, or update chart constants.
WriteCollection("charts-chunithm.json", [...existingChartDocs, ...newCharts]);
