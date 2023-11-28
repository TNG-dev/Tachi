import { RequestTypes, TachiServerV1Get, TachiServerV1Request } from "./fetchTachi";
import { CreateLayeredLogger } from "./logger";
import { Sleep } from "./misc";
import { LoggerLayers } from "../data/data";
import { BotConfig } from "config";
import type { ImportDeferred, ImportPollStatus, UGPTStats } from "./returnTypes";
import type { CommandInteraction } from "discord.js";
import type {
	ChartDocument,
	Game,
	GoalDocument,
	ImportDocument,
	integer,
	PBScoreDocument,
	Playtype,
	QuestDocument,
	SongDocument,
	UserDocument,
} from "tachi-common";

const logger = CreateLayeredLogger(LoggerLayers.apiRequests);

export async function GetUserInfo(userID: integer | string) {
	const res = await TachiServerV1Get<UserDocument>(`/users/${userID}`, null);

	if (!res.success) {
		throw new Error(`Failed to fetch user with userID ${userID}.`);
	}

	return res.body;
}

export async function GetUGPTStats(userID: integer | string, game: Game, playtype: Playtype) {
	const res = await TachiServerV1Get<UGPTStats>(
		`/users/${userID}/games/${game}/${playtype}`,
		null
	);

	if (!res.success) {
		throw new Error(`Failed to fetch UGPT stats for userID ${userID}, ${game}, ${playtype}.`);
	}

	return res.body;
}

export async function GetGoalWithID(goalID: string, game: Game, playtype: Playtype) {
	const res = await TachiServerV1Get<{ goal: GoalDocument }>(
		`/games/${game}/${playtype}/targets/goals/${goalID}`,
		null
	);

	if (!res.success) {
		throw new Error(`Failed to fetch goal with ID ${goalID}. '${res.description}'.`);
	}

	return res.body.goal;
}

export async function GetQuestWithID(questID: string, game: Game, playtype: Playtype) {
	const res = await TachiServerV1Get<{ quest: QuestDocument }>(
		`/games/${game}/${playtype}/targets/quests/${questID}`,
		null
	);

	if (!res.success) {
		throw new Error(`Failed to fetch quest with ID ${questID}. '${res.description}'.`);
	}

	return res.body.quest;
}

export async function GetChartInfoForUser(
	userID: integer | string,
	chartID: string,
	game: Game,
	playtype: Playtype
) {
	const res = await TachiServerV1Get<{ song: SongDocument; chart: ChartDocument }>(
		`/games/${game}/${playtype}/charts/${chartID}`,
		null
	);

	if (!res.success) {
		throw new Error(`Failed to fetch song/chart with chartID ${chartID}.`);
	}

	const pbRes = await TachiServerV1Get<{ chart: ChartDocument; pb: PBScoreDocument }>(
		`/users/${userID}/games/${game}/${playtype}/pbs/${chartID}`,
		null
	);

	const pb = pbRes.success ? pbRes.body.pb : null;

	if (pb === null && pbRes.statusCode !== 404) {
		throw new Error(`Failed to fetch score info for userID ${userID} on chart ${chartID}.`);
	}

	return { song: res.body.song, chart: res.body.chart, pb };
}

export async function PerformScoreImport(
	url: string,
	authToken: string,
	body: Record<string, unknown>,
	interaction?: CommandInteraction
) {
	const initRes = await TachiServerV1Request<ImportDeferred | ImportDocument>(
		RequestTypes.POST,
		url,
		authToken,
		body
	);

	if (!initRes.success) {
		logger.error(`Failed to perform score import on ${url}.`, { body });
		throw new Error(`Failed to perform import on ${url}.`);
	}

	// this server does not defer imports to a scorequeue
	if (initRes.statusCode === 200) {
		const result = initRes.body as ImportDocument;

		return result;
	} else if (initRes.statusCode === 202) {
		// this server defers imports.

		// eslint-disable-next-line no-constant-condition
		while (true) {
			// eslint-disable-next-line no-await-in-loop
			const pollRes = await TachiServerV1Get<ImportPollStatus>(
				`/imports/${initRes.body.importID}/poll-status`,
				authToken
			);

			if (pollRes.success) {
				if (pollRes.body.importStatus === "completed") {
					// is there even a nice way around this --
					// why *are* we nested so deeply?
					// eslint-disable-next-line max-depth
					if (interaction) {
						void interaction.editReply(`Import finished!`);
					}

					return pollRes.body.import;
				}

				if (interaction) {
					void interaction.editReply(
						`Importing Scores: ${pollRes.body.progress.description}..`
					);
				}

				// eslint-disable-next-line no-await-in-loop
				await Sleep(1000);
			} else {
				// silly kai bug they won't ever fix. hacking around it in the bot here.
				if (/attempting reauthentication/u.exec(pollRes.description)) {
					throw new Error(`Failed to import scores.
Your authentication with this service has expired, and a bug on their end prevents us from automatically renewing it.

Please go to ${BotConfig.HTTP_SERVER.URL}/u/me/integrations/services to un-link and re-link.`);
				}

				throw new Error(`Failed to import scores. ${pollRes.description}.`);
			}
		}
	}

	logger.error(`Unexpected status code ${initRes.statusCode} returned from ${url}.`, { body });

	throw new Error(`Unexpected status code ${initRes.statusCode} returned from ${url}.`);
}
