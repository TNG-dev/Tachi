import useLUGPTSettings from "components/util/useLUGPTSettings";
import React from "react";
import { SetState } from "types/react";
import Icon from "components/util/Icon";
import { RankingViewMode } from "../cells/RankingCell";
import SortableTH from "./SortableTH";
import { ZTableTHProps } from "./TachiTable";

export default function SelectableRanking({
	rankingViewMode,
	setRankingViewMode,
	changeSort,
	currentSortMode,
	reverseSort,
}: {
	rankingViewMode: RankingViewMode;
	setRankingViewMode: SetState<RankingViewMode>;
} & ZTableTHProps) {
	const { settings } = useLUGPTSettings();

	if (
		rankingViewMode === "both-if-self" ||
		rankingViewMode === "global-no-switch" ||
		!settings ||
		settings.rivals.length === 0
	) {
		return (
			<SortableTH
				changeSort={changeSort}
				currentSortMode={currentSortMode}
				name="Ranking"
				reverseSort={reverseSort}
				shortName="Ranking"
			/>
		);
	}

	return (
		<th className="align-items-center justify-content-center">
			<select
				onChange={(v) => setRankingViewMode(v.target.value as RankingViewMode)}
				value={rankingViewMode}
				className="border-0 p-0.5 text-body fw-bolder rounded focus-ring focus-ring-light bg-transparent"
			>
				<option value="global">Global Ranking</option>
				<option value="rival">Rival Ranking</option>
			</select>
			<div onClick={() => changeSort("Site Ranking")}>
				<div className="d-flex justify-content-center gap-1">
					<Icon
						type="arrow-up"
						className={
							currentSortMode === "Rating" && reverseSort
								? "opacity-100"
								: "opacity-25"
						}
					/>
					<Icon
						type="arrow-down"
						className={
							currentSortMode === "Rating" && !reverseSort
								? "opacity-100"
								: "opacity-25"
						}
					/>
				</div>
			</div>
		</th>
	);
}
