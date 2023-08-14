import { UppercaseFirst } from "util/misc";
import React from "react";
import { Game, GetGamePTConfig, GPTString, Playtypes } from "tachi-common";
import { SetState } from "types/react";
import Icon from "components/util/Icon";
import { ZTableTHProps } from "./TachiTable";

// hack to get everything to work
type AllRatings<I> = any;

export default function SelectableRating<GPT extends GPTString>({
	game,
	playtype,
	rating,
	setRating,
	changeSort,
	currentSortMode,
	reverseSort,
	mode = "score",
}: {
	game: Game;
	playtype: Playtypes[Game];
	rating: AllRatings<GPT>;
	setRating: SetState<AllRatings<GPT>>;
	mode?: "score" | "session" | "profile";
} & ZTableTHProps) {
	const gptConfig = GetGamePTConfig(game, playtype);

	let key: "scoreRatingAlgs" | "sessionRatingAlgs" | "profileRatingAlgs";
	if (mode === "score") {
		key = "scoreRatingAlgs";
	} else if (mode === "profile") {
		key = "profileRatingAlgs";
	} else {
		key = "sessionRatingAlgs";
	}

	return (
		<th className="align-items-center justify-content-center">
			<select
				onChange={(v) => setRating(v.target.value as AllRatings<GPT>)}
				value={rating}
				className="border-0 text-body fw-bolder bg-transparent rounded focus-ring focus-ring-light"
			>
				{Object.keys(gptConfig[key]).map((s) => (
					<option key={s} value={s}>
						{UppercaseFirst(s)}
					</option>
				))}
			</select>
			<div onClick={() => changeSort("Rating")}>
				<span className="d-flex justify-content-center gap-1">
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
				</span>
			</div>
		</th>
	);
}
