const fs = require("fs");
const path = require("path");

const collections = fs.readdirSync(path.join(__dirname, "../collections"));

function ChartSort(a, b) {
	// sink all 2dxtra charts to the bottom
	if (b.data?.["2dxtraSet"] !== null && a.data?.["2dxtraSet"] === null) {
		return -1;
	}

	if (a.songID !== b.songID) {
		return a.songID - b.songID;
	}

	if (a.playtype !== b.playtype) {
		return a.playtype.localeCompare(b.playtype);
	}

	if (a.difficulty !== b.difficulty) {
		return a.difficulty.localeCompare(b.difficulty);
	}

	return 0;
}

function FolderSort(a, b) {
	if (a.game !== b.game) {
		return a.game.localeCompare(b.game);
	}

	if (a.playtype !== b.playtype) {
		return a.playtype.localeCompare(b.playtype);
	}

	return a.title.localeCompare(b.title);
}

function TableSort(a, b) {
	if (a.game !== b.game) {
		return a.game.localeCompare(b.game);
	}

	if (a.playtype !== b.playtype) {
		return a.playtype.localeCompare(b.playtype);
	}

	return a.title.localeCompare(b.title);
}

function BMSCourseSort(a, b) {
	if (a.playtype !== b.playtype) {
		return a.playtype.localeCompare(b.playtype);
	}

	if (a.set !== b.set) {
		return a.set.localeCompare(b.set);
	}

	if (a.value !== b.value) {
		return a.value - b.value;
	}

	return a.md5sums.localeCompare(b.md5sums);
}

function DeterministicCollectionSort() {
	for (const collection of collections) {
		const collPath = path.join(__dirname, "../collections", collection);
		let content = JSON.parse(fs.readFileSync(collPath));

		if (collection.startsWith("charts-")) {
			content.sort(ChartSort);
		} else if (collection.startsWith("songs-")) {
			content.sort((a, b) => a.id - b.id);
		} else if (collection.startsWith("folders")) {
			content.sort(FolderSort);
		} else if (collection.startsWith("tables")) {
			content.sort(TableSort);
		} else if (collection.startsWith("bms-course-lookup.json")) {
			content.sort(BMSCourseSort);
		}

		content = content.map(SortObjectKeys);

		fs.writeFileSync(collPath, JSON.stringify(content, null, "\t"));
	}
}

function SortObjectKeys(object) {
	const newObject = {};

	for (const key of Object.keys(object).sort()) {
		let v = object[key];

		if (typeof v === "object" && v && !Array.isArray(v)) {
			v = SortObjectKeys(v);
		}

		newObject[key] = v;
	}

	return newObject;
}

if (require.main === module) {
	DeterministicCollectionSort();
}

module.exports = DeterministicCollectionSort;
