import { CreateCalculatedData } from "../calculated-data/calculated-data";
import { CalculateESDForGame } from "../common/score-utils";
import { GetGamePTConfig } from "tachi-common";
import type { DryScore } from "../common/types";
import type { KtLogger } from "lib/logger/logger";
import type { ChartDocument, integer, ScoreDocument, SongDocument } from "tachi-common";

/**
 * Takes an "intermediate" score and appends the rest of the data it needs.
 * @param dryScore The intermediate score to make into a real score.
 * @param userID The userID this score is for.
 */
export async function HydrateScore(
	userID: integer,
	dryScore: DryScore,
	chart: ChartDocument,
	song: SongDocument,
	scoreID: string,
	logger: KtLogger
): Promise<ScoreDocument> {
	const esd = CalculateESDForGame(
		dryScore.game,
		chart.playtype,
		dryScore.scoreData.percent / 100
	);

	const calculatedData = await CreateCalculatedData(dryScore, chart, esd, logger);

	const { scoreData: dryScoreData, ...rest } = dryScore;

	const gptConfig = GetGamePTConfig(dryScore.game, chart.playtype);

	// Fill out the rest of the fields we want for scoreData
	const scoreData = {
		lampIndex: gptConfig.lamps.indexOf(dryScore.scoreData.lamp),
		gradeIndex: gptConfig.grades.indexOf(dryScore.scoreData.grade),
		esd,
		...dryScoreData,
	};

	const score: ScoreDocument = {
		// extract all of the non-scoreData props from a dry score and push them here
		...rest,

		// then push our score data.
		scoreData,

		// everything below this point is sane
		highlight: false,
		timeAdded: Date.now(),
		userID,
		calculatedData,
		songID: song.id,
		chartID: chart.chartID,
		scoreID,
		playtype: chart.playtype,
		isPrimary: chart.isPrimary,
	};

	return score;
}
