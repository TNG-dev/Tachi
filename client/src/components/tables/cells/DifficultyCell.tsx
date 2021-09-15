import QuickTooltip from "components/layout/misc/QuickTooltip";
import Icon from "components/util/Icon";
import Muted from "components/util/Muted";
import React from "react";
import {
	ChartDocument,
	FormatDifficulty,
	FormatDifficultyShort,
	Game,
	GetGamePTConfig,
} from "tachi-common";
import { ChangeOpacity } from "util/color-opacity";
import TierlistInfoPart from "./TierlistInfoPart";

export default function DifficultyCell({
	game,
	chart,
	alwaysShort,
}: {
	game: Game;
	chart: ChartDocument;
	alwaysShort?: boolean;
}) {
	const gptConfig = GetGamePTConfig(game, chart.playtype);

	return (
		<td
			style={{
				backgroundColor: ChangeOpacity(gptConfig.difficultyColours[chart.difficulty]!, 0.2),
			}}
		>
			{!alwaysShort && (
				<>
					<span className="d-none d-lg-block">{FormatDifficulty(chart, game)}</span>
					{Object.keys(chart.tierlistInfo).length > 0 && (
						<TierlistInfoPart chart={chart} />
					)}
				</>
			)}
			<span className={!alwaysShort ? "d-lg-none" : ""}>
				{FormatDifficultyShort(chart, game)}
			</span>
			{!chart.isPrimary && (
				<QuickTooltip tooltipContent="This chart is an alternate, old chart.">
					<div>
						<Icon type="exclamation-triangle" />
					</div>
				</QuickTooltip>
			)}
		</td>
	);
}
