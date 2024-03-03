import fs, { mkdirSync } from "fs";
import path from "path";
import iconv from "iconv-lite";
import { execSync } from "child_process";
import { ParseDotOneFile } from "./dot-one-parser/parser";
import logger from "../../../logger";
import { IIDXConvertOutput } from "./dot-one-parser/types";
import { integer } from "tachi-common";

function sjisHack(b: Buffer, i: number) {
	return iconv.decode(b.slice(i, i + 64).filter((e) => e !== 0) as Buffer, "shift_jis");
}

// where to store extracted IFS output
const ifsOUT = path.join(__dirname, "./ifs-output");
mkdirSync(ifsOUT, { recursive: true });

/**
 * Extracts an IFS file into the ./ifs-output cache directory.
 */
function ifsExtract(ifsPath: string) {
	logger.info(`Extracting ${ifsPath}...`);
	execSync(`ifstools "${ifsPath}" -o "${ifsOUT}" -y --super-disable`, { stdio: "ignore" });
}

// @optimisable
// this can be processed in parallel
// but like. this basically only has to be done once a year.
// https://xkcd.com/1205/
export async function ParseIIDXData(
	basedir: string,
	index: "0" | "1",
	omni: boolean,
	alwaysExtract: boolean
) {
	logger.info(`Parsing from ${basedir}.`);

	const mdbPath = path.join(
		basedir,
		"data/info",
		index,
		omni ? "music_omni.bin" : "music_data.bin"
	);

	logger.info(`Parsing MDB ${mdbPath}.`);

	const buffer = fs.readFileSync(mdbPath);

	if (buffer.slice(0, 4).toString() !== "IIDX") {
		throw new Error("Invalid MDB File.");
	}

	const start = buffer.readInt16LE(0xa) * 2 + 0x10;

	let structSize: integer;

	switch (buffer[4]) {
		case 27:
		case 28:
		case 29:
		case 30:
		case 31:
			structSize = 0x52c;
			break;
		default:
			throw new Error("Unknown version of MDB.");
	}

	let moreData = true;

	let curLoc = start;

	const parsedData: Array<IIDXConvertOutput> = [];

	while (moreData) {
		const struct = buffer.slice(curLoc, curLoc + structSize);

		// laziest hack
		const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((e) => struct.readUInt8(288 + e));

		// remember that i get paid real money to program in this language
		const [spb, spn, sph, spa, spl, _dpb, dpn, dph, dpa, dpl] = levels as [
			number,
			number,
			number,
			number,
			number,
			number, // dpb has nothing defined, or maybe it does, nobody knows, or cares
			number,
			number,
			number,
			number
		];

		const songID = struct.readUInt16LE(944);

		const title = sjisHack(struct, 0);
		const marquee = sjisHack(struct, 64);
		const genre = sjisHack(struct, 128);
		const artist = sjisHack(struct, 192);
		const folder = struct.readUInt8(280);

		const notecounts: Record<string, number> = {};

		// internal SongID - songIDs are not really an int, and are sometimes prefixed with a 0
		// to fit as a 5 digit string.
		const iSongID = songID < 10_000 ? `0${songID}` : songID.toString();

		// where the IFS for this song might be located
		const ifsPath = path.join(basedir, `data/sound/${iSongID}.ifs`);
		const ifsLeggPath = path.join(basedir, `data/sound/${iSongID}-p0.ifs`);

		// where the dotOne for this file might be located.
		let dotOnePath = path.join(basedir, `data/sound/${iSongID}/${iSongID}.1`);

		// where the dotone file will be after extraction (if necessary)
		const extractedIFSLoc = path.join(ifsOUT, `${iSongID}_ifs/${iSongID}/${iSongID}.1`);

		const extractedIFSLeggLoc = path.join(ifsOUT, `${iSongID}-p0_ifs/${iSongID}/${iSongID}.1`);

		if (fs.existsSync(ifsLeggPath)) {
			if (!fs.existsSync(extractedIFSLeggLoc)) {
				ifsExtract(ifsLeggPath);
			}

			const charts = await ParseDotOneFile(extractedIFSLeggLoc, {
				genre,
				marquee,
				songArtist: artist,
				songTitle: title,
			});

			for (const chart of charts) {
				notecounts[`${chart.playtype}-${chart.difficulty}`] = chart.notecount;
			}
		}

		// if we've already extracted this, and --always-extract isn't set
		if (fs.existsSync(extractedIFSLoc) && !alwaysExtract) {
			dotOnePath = extractedIFSLoc;
		} else if (fs.existsSync(ifsPath)) {
			ifsExtract(ifsPath);

			dotOnePath = extractedIFSLoc;
		}

		if (!fs.existsSync(dotOnePath)) {
			curLoc += structSize;
			logger.error(`${dotOnePath} cannot find file. neither exist.`);
			continue;
		}

		logger.verbose(`Parsing data/sound/${songID}/${songID}.1`);
		try {
			const charts = await ParseDotOneFile(dotOnePath, {
				genre,
				marquee,
				songArtist: artist,
				songTitle: title,
			});

			for (const chart of charts) {
				const notecount = chart.notecount;

				if (chart.difficulty === "LEGGENDARIA") {
					if (notecount !== 0 && notecounts[`${chart.playtype}-LEGGENDARIA`]) {
						logger.warn(
							`${chart.artist} - ${chart.title} has conflicting ${
								chart.playtype
							} LEGGENDARIAs.
INLINE: ${notecount} notes, p0: ${notecounts[`${chart.playtype}-LEGGENDARIA`]} notes.
Picking the INLINE version, as it's likely to be the correct one, but confirm this manually.`
						);
					}
				}

				notecounts[`${chart.playtype}-${chart.difficulty}`] = notecount;
			}
		} catch (err) {
			logger.error(err);
			curLoc += structSize;

			if (buffer.length <= curLoc) {
				moreData = false;
			}

			continue;
		}

		parsedData.push({
			title,
			artist,
			marquee,
			folder,
			genre,
			levels: {
				"SP-BEGINNER": spb,
				"SP-NORMAL": spn,
				"SP-HYPER": sph,
				"SP-ANOTHER": spa,
				"SP-LEGGENDARIA": spl,
				"DP-NORMAL": dpn,
				"DP-HYPER": dph,
				"DP-ANOTHER": dpa,
				"DP-LEGGENDARIA": dpl,
			},
			notecounts,
			songID,
		});

		curLoc += structSize;

		if (buffer.length <= curLoc) {
			moreData = false;
		}
	}

	logger.info(`Done parsing.`);

	return parsedData;
}
