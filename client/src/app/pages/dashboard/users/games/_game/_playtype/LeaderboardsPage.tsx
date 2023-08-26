import { APIFetchV1, UnsuccessfulAPIFetchResponse } from "util/api";
import { ChangeOpacity } from "util/color-opacity";
import { FormatGPTProfileRating, IsNotNullish, UppercaseFirst } from "util/misc";
import { StrSOV } from "util/sorts";
import ClassBadge from "components/game/ClassBadge";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Card from "components/layout/page/Card";
import MiniTable from "components/tables/components/MiniTable";
import GentleLink from "components/util/GentleLink";
import LoadingWrapper from "components/util/LoadingWrapper";
import { useProfileRatingAlg } from "components/util/useScoreRatingAlg";
import React, { useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import {
	COLOUR_SET,
	FormatGame,
	GetGameConfig,
	GetGamePTConfig,
	GPTString,
	integer,
	UserDocument,
	ProfileRatingAlgorithms,
	UserGameStats,
	Classes,
} from "tachi-common";
import { GPTLeaderboard, UGPTLeaderboardAdjacent } from "types/api-returns";
import { GamePT, SetState, UGPT } from "types/react";
import LinkButton from "components/util/LinkButton";

interface LeaderboardsData {
	stats: UGPTLeaderboardAdjacent;
	leaderboard: GPTLeaderboard;
}

export default function LeaderboardsPage({ reqUser, game, playtype }: UGPT) {
	const gameConfig = GetGameConfig(game);
	useSetSubheader(
		["Users", reqUser.username, "Games", gameConfig.name, playtype, "Leaderboard"],
		[reqUser, game, playtype],
		`${reqUser.username}'s ${FormatGame(game, playtype)} Leaderboard`
	);

	const defaultRating = useProfileRatingAlg(game, playtype);
	const [alg, setAlg] = useState(defaultRating);

	const url = `/users/${reqUser.id}/games/${game}/${playtype}/leaderboard-adjacent?alg=${alg}`;

	const { data, error } = useQuery<LeaderboardsData, UnsuccessfulAPIFetchResponse>(
		url,
		async () => {
			const res = await APIFetchV1<UGPTLeaderboardAdjacent>(url);

			if (!res.success) {
				throw res;
			}

			const lRes = await APIFetchV1<GPTLeaderboard>(
				`/games/${game}/${playtype}/leaderboard?limit=3&alg=${alg}`
			);

			if (!lRes.success) {
				throw lRes;
			}

			return {
				stats: res.body,
				leaderboard: lRes.body,
			};
		}
	);

	return (
		<LoadingWrapper {...{ dataset: data, error }}>
			<LeaderboardsPageContent {...{ reqUser, game, playtype, data: data!, alg, setAlg }} />
		</LoadingWrapper>
	);
}

function LeaderboardsPageContent({
	reqUser,
	game,
	playtype,
	data,
	alg,
}: {
	reqUser: UserDocument;
	data: LeaderboardsData;
	alg: ProfileRatingAlgorithms[GPTString];
	setAlg: SetState<ProfileRatingAlgorithms[GPTString]>;
} & GamePT) {
	const { stats, leaderboard } = data;

	const gptConfig = GetGamePTConfig(game, playtype);

	const userMap = new Map<integer, UserDocument>();

	for (const u of stats.users) {
		userMap.set(u.id, u);
	}

	for (const u of leaderboard.users) {
		userMap.set(u.id, u);
	}

	// hack - we aren't returned from this api call for some reason.
	userMap.set(reqUser.id, reqUser);

	const bestNearbyUser = stats.thisUsersRanking.ranking - stats.above.length - 1;

	function LeaderboardRow({ s, i }: { s: UserGameStats; i: integer }) {
		return (
			<tr
				style={{
					backgroundColor:
						reqUser.id === s.userID ? ChangeOpacity(COLOUR_SET.gold, 0.15) : undefined,
					height: reqUser.id === s.userID ? "50px" : undefined,
				}}
			>
				<td>
					<strong>#{i}</strong>
					{reqUser.id === s.userID && (
						<small className="text-body-secondary">
							/{stats.thisUsersRanking.outOf}
						</small>
					)}
				</td>
				<td>
					<GentleLink
						to={`/u/${userMap.get(s.userID)!.username}/games/${game}/${playtype}`}
					>
						{userMap.get(s.userID)?.username}
					</GentleLink>
				</td>
				<td>
					{IsNotNullish(s.ratings[alg])
						? FormatGPTProfileRating(game, playtype, alg, s.ratings[alg]!)
						: "No Data."}
				</td>
				{/* temp */}
				<td>
					{Object.entries(s.classes).length
						? Object.entries(s.classes)
								.sort(StrSOV((x) => x[0]))
								.map(
									([k, v]) =>
										v && (
											<ClassBadge
												key={`${k}:${v}`}
												classValue={v}
												classSet={k as Classes[GPTString]}
												game={game}
												playtype={playtype}
											/>
										)
								)
						: "No Classes"}
				</td>
			</tr>
		);
	}

	return (
		<Card
			header={"Leaderboard"}
			footer={
				<LinkButton to={`/games/${game}/${playtype}/leaderboards`} className="float-end">
					View Global Leaderboards
				</LinkButton>
			}
			cardBodyClassName="overflow-x-auto d-flex flex-column justify-content-center p-4"
		>
			<MiniTable
				className="text-center"
				headers={["Position", "User", UppercaseFirst(alg), "Classes"]}
			>
				<>
					{bestNearbyUser >= 1 &&
						leaderboard.gameStats
							.slice(0, bestNearbyUser)
							.map((s, i) => <LeaderboardRow key={s.userID} s={s} i={i + 1} />)}
					{bestNearbyUser > 4 && (
						<tr style={{ lineHeight: "0.5rem" }}>
							<td colSpan={4}>...</td>
						</tr>
					)}
					{[...stats.above, stats.thisUsersStats, ...stats.below].map((s, i) => (
						<LeaderboardRow
							key={s.userID}
							s={s}
							i={stats.thisUsersRanking.ranking - stats.above.length + i}
						/>
					))}
				</>
			</MiniTable>
		</Card>
	);
}
