import { UppercaseFirst } from "util/misc";
import { useProfileRatingAlg } from "components/util/useScoreRatingAlg";
import React from "react";
import { Link } from "react-router-dom";
import { GPTString, integer, ProfileRatingAlgorithms } from "tachi-common";
import { GamePT } from "types/react";

export default function RankingData({
	rankingData,
	game,
	userID,
	playtype,
}: {
	rankingData: Record<ProfileRatingAlgorithms[GPTString], { ranking: number; outOf: integer }>;
	userID: integer;
} & GamePT) {
	const alg = useProfileRatingAlg(game, playtype);

	// weird react edge case where rankingData and alg desynchronise.
	if (!(alg in rankingData)) {
		return <>Loading...</>;
	}

	const extendData = [];

	for (const k in rankingData) {
		const key = k as ProfileRatingAlgorithms[GPTString];

		if (key !== alg) {
			extendData.push(
				<div key={key} className="col-12">
					<small className="text-body-secondary">
						{UppercaseFirst(key)}: #{rankingData[key].ranking}/{rankingData[key].outOf}
					</small>
				</div>
			);
		}
	}

	return (
		<div className="row text-center">
			<div className="col-12">
				<h4>Ranking{extendData.length ? ` (${UppercaseFirst(alg)})` : ""}</h4>
			</div>
			<div className="col-12">
				<Link
					to={`/u/${userID}/games/${game}/${playtype}/leaderboard`}
					className="text-decoration-none"
				>
					<strong className="display-4">#{rankingData[alg].ranking}</strong>
				</Link>
				<span className="text-body-secondary">/{rankingData[alg].outOf}</span>
			</div>
			{extendData}
		</div>
	);
}

export function LazyRankingData({ ranking, outOf }: { ranking: integer; outOf: integer }) {
	return (
		<div className="row text-center">
			<div className="col-12">
				<h4>Ranking</h4>
			</div>
			<div className="col-12">
				<strong className="display-4">#{ranking}</strong>
				<span className="text-body-secondary">/{outOf}</span>
			</div>
		</div>
	);
}
