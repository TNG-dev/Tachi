import { ChangeOpacity } from "util/color-opacity";
import { FormatMillions } from "util/misc";
import React from "react";
import { GetGamePTConfig, PBScoreDocument, ScoreDocument } from "tachi-common";

export default function MillionsScoreCell({ score }: { score: PBScoreDocument | ScoreDocument }) {
	const gptConfig = GetGamePTConfig(score.game, score.playtype);

	return (
		<td
			style={{
				backgroundColor: ChangeOpacity(gptConfig.gradeColours[score.scoreData.grade], 0.2),
			}}
		>
			<strong>{score.scoreData.grade}</strong>
			<br />
			{FormatMillions(score.scoreData.score)}
		</td>
	);
}
