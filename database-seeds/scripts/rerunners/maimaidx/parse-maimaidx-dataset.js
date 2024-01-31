const fetch = require("node-fetch");
const { CreateChartID, ReadCollection, WriteCollection } = require("../../util");

const CURRENT_VERSION = "buddies";
const CURRENT_VERSION_NUM = 240;
const DATA_URL = "https://maimai.sega.jp/data/maimai_songs.json";
const ALIAS_URL =
	"https://raw.githubusercontent.com/lomotos10/GCM-bot/main/data/aliases/en/maimai.tsv";

const versionMap = new Map([
	[0, null],
	[100, "maimai"],
	[110, "maimai PLUS"],
	[120, "GreeN"],
	[130, "GreeN PLUS"],
	[140, "ORANGE"],
	[150, "ORANGE PLUS"],
	[160, "PiNK"],
	[170, "PiNK PLUS"],
	[180, "MURASAKi"],
	[185, "MURASAKi PLUS"],
	[190, "MiLK"],
	[195, "MiLK PLUS"],
	[199, "FiNALE"],
	[200, "maimaiでらっくす"],
	[205, "maimaiでらっくす PLUS"],
	[210, "Splash"],
	[215, "Splash PLUS"],
	[220, "UNiVERSE"],
	[225, "UNiVERSE PLUS"],
	[230, "FESTiVAL"],
	[235, "FESTiVAL PLUS"],
	[240, "BUDDiES"],
]);

const diffNames = ["bas", "adv", "exp", "mas", "remas"];

const diffMap = new Map([
	["bas", "Basic"],
	["adv", "Advanced"],
	["exp", "Expert"],
	["mas", "Master"],
	["remas", "Re:Master"],
]);

// Songs that are released in different versions in international and Japanese regions.
// The key is the title in the dataset, and the value is the version to use (refer to versionMap).
const versionOverrides = {
	"INTERNET OVERDOSE": 230,
	"Knight Rider": 230,
	"Let you DIVE!": 230,
	"Trrricksters!!": 230,
};

(async () => {
	const songs = ReadCollection("songs-maimaidx.json");
	const charts = ReadCollection("charts-maimaidx.json");

	const existingSongs = new Map(songs.map((e) => [e.title, e.id]));
	const existingCharts = new Map(charts.map((e) => [`${e.songID} ${e.difficulty}`, e.chartID]));

	const datum = await fetch(DATA_URL).then((r) => r.json());
	const aliases = new Map();
	const aliasesRaw = await fetch(ALIAS_URL).then((r) => r.text());
	for (const line of aliasesRaw.split("\n")) {
		const [title, ...alias] = line.split("\t");
		aliases.set(title, alias);
	}

	// not properly implemented yet as i can't find romaji titles for
	// japanese titled songs
	const altTitles = [];

	let songID = Math.max(Math.max(...existingSongs.values()), 0) + 1;

	for (const data of datum) {
		let thisSongID = songID;

		const version = versionOverrides[data.title] ?? Number(data.version.substring(0, 3));
		if (version > CURRENT_VERSION_NUM && !Object.keys(versionOverrides).includes(data.title)) {
			// Skipping songs that are newer than currently supported version (FESTiVAL PLUS).
			continue;
		}
		if (data.title === "　" && data.artist === "x0o0x_") {
			// Manual override since the song's title is "" (empty) in the dataset.
			continue;
		}

		if (existingSongs.has(data.title)) {
			thisSongID = existingSongs.get(data.title);
			const song = songs.find((e) => e.id === thisSongID);
			song.searchTerms = aliases.get(data.title.trim()) ?? [];
		} else {
			songID++;
			songs.push({
				id: thisSongID,
				title: data.title.trim(),
				artist: data.artist.trim(),
				searchTerms: aliases.get(data.title.trim()) ?? [],
				altTitles,
				data: {
					displayVersion: versionMap.get(version),
					genre: data.catcode.trim(),
				},
			});
			console.log(`New song: ${data.artist.trim()} - ${data.title.trim()}`);
		}

		diffNames.forEach((diff) => {
			// check for existence of difficulty
			if (!data[`dx_lev_${diff}`]) {
				return;
			}

			const chartID = existingCharts.get(`${thisSongID} DX ${diffMap.get(diff)}`);
			const chart = charts.find((e) => e.chartID === chartID);
			if (chartID) {
				if (!chart.versions.includes(CURRENT_VERSION)) {
					chart.versions.push(CURRENT_VERSION);
				}
				return;
			}

			const isLatest = version >= CURRENT_VERSION_NUM;

			const lvNum = Number(data[`dx_lev_${diff}`].replace(/\+/u, ".7"));

			charts.push({
				songID: thisSongID,
				chartID: CreateChartID(),
				level: data[`dx_lev_${diff}`],
				levelNum: lvNum,
				isPrimary: true,
				difficulty: `DX ${diffMap.get(diff)}`,
				playtype: "Single",
				data: {
					isLatest,
				},
				versions: [CURRENT_VERSION],
			});
		});

		diffNames.forEach((diff) => {
			// check for existence of difficulty
			if (!data[`lev_${diff}`]) {
				return;
			}

			const chartID = existingCharts.get(`${thisSongID} ${diffMap.get(diff)}`);
			const chart = charts.find((e) => e.chartID === chartID);
			if (chartID) {
				if (!chart.versions.includes(CURRENT_VERSION)) {
					chart.versions.push(CURRENT_VERSION);
				}
				return;
			}

			const isLatest = version >= CURRENT_VERSION_NUM;

			const lvNum = Number(data[`lev_${diff}`].replace(/\+/u, ".7"));

			charts.push({
				songID: thisSongID,
				chartID: CreateChartID(),
				level: data[`lev_${diff}`],
				levelNum: lvNum,
				isPrimary: true,
				difficulty: diffMap.get(diff),
				playtype: "Single",
				data: {
					isLatest,
				},
				versions: [CURRENT_VERSION],
			});
		});
	}

	WriteCollection("charts-maimaidx.json", charts);
	WriteCollection("songs-maimaidx.json", songs);
})();
