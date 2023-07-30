const { MutateCollection } = require("../../util");

// This is the numerical ID of the song we want to add to the Infinitas table
// Make sure to doublnpnodee check if it's using legacy charts for some stupid reason
// CTRL-F the title in songs-iidx, grab the songID and CTRL-F 'ID": xxx' to find the inGameID
// Or use Reflux or another tool
// Infinitas exclusives must be added with add-new-primary-IIDX-chart

const inGameID = 3018;

MutateCollection("charts-iidx.json", (charts) => {
	for (const chart of charts) {
		if (
			chart.data.inGameID === inGameID &&
			!chart.versions.includes("inf") &&
			chart.data["2dxtraSet"] === null &&
			chart.difficulty !== "LEGGENDARIA" &&
			chart.difficulty !== "BEGINNER"
			) {
				chart.versions.push("inf");
			}
		}

		return charts;
	});
