import ScoreImportFatalError from "../../../framework/score-importing/score-import-error";
import { GetGamePTConfig, Playtype } from "tachi-common";
import { StringIsGameVersion } from "utils/misc";
import { CSVParseError, NaiveCSVParse } from "utils/naive-csv-parser";
import type { ParserFunctionReturns } from "../types";
import type { EamusementScoreData, IIDXEamusementCSVContext, IIDXEamusementCSVData } from "./types";
import type { KtLogger } from "lib/logger/logger";
import type { integer, Versions, Playtypes } from "tachi-common";

export enum EAM_VERSION_NAMES {
	"1st&substream" = 1,
	"2nd style" = 2,
	"3rd style" = 3,
	"4th style" = 4,
	"5th style" = 5,
	"6th style" = 6,
	"7th style" = 7,
	"8th style" = 8,
	"9th style" = 9,
	"10th style" = 10,
	"IIDX RED" = 11,
	"HAPPY SKY" = 12,
	"DistorteD" = 13,
	"GOLD" = 14,
	"DJ TROOPERS" = 15,
	"EMPRESS" = 16,
	"SIRIUS" = 17,
	"Resort Anthem" = 18,
	"Lincle" = 19,
	"tricoro" = 20,
	"SPADA" = 21,
	"PENDUAL" = 22,
	"copula" = 23,
	"SINOBUZ" = 24,
	"CANNON BALLERS" = 25,
	"Rootage" = 26,
	"HEROIC VERSE" = 27,
	"BISTROVER" = 28,
	"CastHour" = 29,
	"RESIDENT" = 30,
}

const PRE_HV_HEADER_COUNT = 27;
const HV_HEADER_COUNT = 41;

// commented out for reference
// [
//     "version",
//     "title",
//     "genre",
//     "artist",
//     "playcount",
//     (?beginnerdata)
//     "normal-level",
//     "normal-exscore",
//     "normal-pgreat",
//     "normal-great",
//     "normal-bp",
//     "normal-lamp",
//     "normal-grade",
//     "hyper-level",
//     "hyper-exscore",
//     "hyper-pgreat",
//     "hyper-great",
//     "hyper-bp",
//     "hyper-lamp",
//     "hyper-grade",
//     "another-level",
//     "another-exscore",
//     "another-pgreat",
//     "another-great",
//     "another-bp",
//     "another-lamp",
//     "another-grade",
//     (?leggdata)
//     "timestamp",
// ];

export function ResolveHeaders(headers: Array<string>, logger: KtLogger) {
	if (headers.length === PRE_HV_HEADER_COUNT) {
		logger.verbose("PRE_HV csv received.");
		return {
			hasBeginnerAndLegg: false,
		};
	} else if (headers.length === HV_HEADER_COUNT) {
		logger.verbose("HV+ csv received.");
		return {
			hasBeginnerAndLegg: true,
		};
	}

	logger.info(`Invalid CSV header count of ${headers.length} received.`);
	throw new ScoreImportFatalError(
		400,
		"Invalid CSV provided. CSV does not have the correct amount of headers."
	);
}

export function IIDXCSVParse(csvBuffer: Buffer, playtype: Playtypes["iidx"], logger: KtLogger) {
	let rawHeaders: Array<string>;
	let rawRows: Array<Array<string>>;

	try {
		({ rawHeaders, rawRows } = NaiveCSVParse(csvBuffer, logger));
	} catch (e) {
		// this is probably fine
		// eslint-disable-next-line cadence/no-instanceof
		if (e instanceof CSVParseError) {
			throw new ScoreImportFatalError(400, e.message);
		}

		throw e;
	}

	const { hasBeginnerAndLegg } = ResolveHeaders(rawHeaders, logger);

	const diffs = hasBeginnerAndLegg
		? (["beginner", "normal", "hyper", "another", "leggendaria"] as const)
		: (["normal", "hyper", "another"] as const);

	const iterableData = [];

	let gameVersion = 0;

	for (const cells of rawRows) {
		const version = cells[0]!;
		const title = cells[1]!.trim();
		const timestamp = cells[rawHeaders.length - 1]!.trim();

		// @ts-expect-error this indexing is fine. grow up.
		const versionNum = EAM_VERSION_NAMES[version] as number | undefined;

		if (versionNum === undefined) {
			logger.info(`Invalid/Unsupported EAM_VERSION_NAME ${version}.`);
			throw new ScoreImportFatalError(
				400,
				`Invalid/Unsupported Eamusement Version Name ${version}.`
			);
		}

		if (versionNum > gameVersion) {
			gameVersion = versionNum;
		}

		const scores: Array<EamusementScoreData> = [];

		for (let d = 0; d < diffs.length; d++) {
			const diff = diffs[d]!;
			const di = 5 + d * 7;

			// lazy non-null assertions here.
			// @todo refactor this?
			// We know for a fact that all of this stuff is non-null because of the CSV parser.
			scores.push({
				difficulty: diff.toUpperCase() as Uppercase<typeof diff>,
				bp: cells[di + 4]!,
				exscore: cells[di + 1]!,
				pgreat: cells[di + 2]!,
				great: cells[di + 3]!,
				lamp: cells[di + 5]!,
				level: cells[di]!,
			});
		}

		iterableData.push(
			...scores.map((e) => ({
				score: e,
				timestamp,
				title,
			}))
		);
	}

	if (!StringIsGameVersion("iidx", playtype, gameVersion.toString())) {
		throw new ScoreImportFatalError(
			400,
			`Unsupported version '${gameVersion}'. Is your CSV properly filled out?`
		);
	}

	return {
		iterableData,
		version: gameVersion.toString() as Versions["iidx:DP" | "iidx:SP"],
		hasBeginnerAndLegg,
	};
}

/**
 * Parses a buffer of EamusementCSV data.
 * @param fileData - The buffer to parse.
 * @param body - The request body that made this file import request. Used to infer playtype.
 */
function GenericParseEamIIDXCSV(
	fileData: Express.Multer.File,
	body: Record<string, unknown>,
	service: string,
	logger: KtLogger
): ParserFunctionReturns<IIDXEamusementCSVData, IIDXEamusementCSVContext> {
	let playtype: "DP" | "SP";

	if (body.playtype === "SP") {
		playtype = "SP";
	} else if (body.playtype === "DP") {
		playtype = "DP";
	} else {
		logger.info(`Invalid playtype of ${body.playtype} passed to ParseEamusementCSV.`);
		throw new ScoreImportFatalError(400, `Invalid playtype of ${body.playtype} given.`);
	}

	const lowercaseFilename = fileData.originalname.toLowerCase();

	if (
		body.assertPlaytypeCorrect === undefined &&
		((lowercaseFilename.includes("sp") && playtype === "DP") ||
			(lowercaseFilename.includes("dp") && playtype === "SP"))
	) {
		logger.info(
			`File was uploaded with filename ${fileData.originalname}, but this was set as a ${playtype} import. Sanity check refusing.`
		);

		throw new ScoreImportFatalError(
			400,
			`Safety Triggered: Filename contained '${
				playtype === "SP" ? "DP" : "SP"
			}', but was marked as a ${playtype} import. Are you *absolutely* sure this is right?`
		);
	}

	const { hasBeginnerAndLegg, version, iterableData } = IIDXCSVParse(
		fileData.buffer,
		playtype,
		logger
	);

	logger.verbose("Successfully parsed CSV.");

	const context: IIDXEamusementCSVContext = {
		playtype,
		importVersion: version,
		hasBeginnerAndLegg,
		service,
	};

	logger.verbose(`Successfully Parsed with ${iterableData.length} results.`);

	return {
		iterable: iterableData,
		context,
		game: "iidx",
		classProvider: null,
	};
}

export default GenericParseEamIIDXCSV;
