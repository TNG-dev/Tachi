import { CreateUserMap } from "util/data";
import { ToFixedFloor, UppercaseFirst } from "util/misc";
import { NumericSOV, StrSOV } from "util/sorts";
import ClassBadge from "components/game/ClassBadge";
import ScoreLeaderboard from "components/game/ScoreLeaderboard";
import useSetSubheader from "components/layout/header/useSetSubheader";
import IndexCell from "components/tables/cells/IndexCell";
import UserCell from "components/tables/cells/UserCell";
import TachiTable, { Header } from "components/tables/components/TachiTable";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import useApiQuery from "components/util/query/useApiQuery";
import SelectButton from "components/util/SelectButton";
import { useProfileRatingAlg } from "components/util/useScoreRatingAlg";
import React, { useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { AnyProfileRatingAlg, FormatGame, GetGameConfig, GetGamePTConfig } from "tachi-common";
import { UserLeaderboardReturns } from "types/api-returns";
import { GamePT } from "types/react";
import { UGSDataset } from "types/tables";

export default function GPTLeaderboardsPage({ game, playtype }: GamePT) {
	useSetSubheader(
		["Games", GetGameConfig(game).name, playtype, "Leaderboards"],
		[game, playtype],
		`${FormatGame(game, playtype)} Leaderboards`
	);

	const [mode, setMode] = useState<"profile" | "score">("profile");

	return (
		<Row>
			<Col xs={12} className="d-flex justify-content-center">
				<div className="btn-group">
					<SelectButton id="profile" value={mode} setValue={setMode}>
						<Icon type="user" />
						User Leaderboards
					</SelectButton>
					<SelectButton id="score" value={mode} setValue={setMode}>
						<Icon type="sort-numeric-up-alt" />
						PB Leaderboards
					</SelectButton>
				</div>
			</Col>
			<Col xs={12}>
				<Divider />
				{mode === "profile" ? (
					<ProfileLeaderboard game={game} playtype={playtype} />
				) : (
					<ScoreLeaderboard
						game={game}
						playtype={playtype}
						url={`/games/${game}/${playtype}/pb-leaderboard`}
					/>
				)}
			</Col>
		</Row>
	);
}

function ProfileLeaderboard({ game, playtype }: GamePT) {
	const gptConfig = GetGamePTConfig(game, playtype);

	const defaultAlg = useProfileRatingAlg(game, playtype);

	const [alg, setAlg] = useState(defaultAlg);

	const SelectComponent =
		Object.keys(gptConfig.profileRatingAlgs).length > 1 ? (
			<Form.Control as="select" value={alg} onChange={(e) => setAlg(e.target.value as any)}>
				{Object.keys(gptConfig.profileRatingAlgs).map((e) => (
					<option key={e} value={e}>
						{UppercaseFirst(e)}
					</option>
				))}
			</Form.Control>
		) : null;

	const { data, error } = useApiQuery<UserLeaderboardReturns>(
		`/games/${game}/${playtype}/leaderboard?alg=${alg}&limit=500`
	);

	if (error) {
		return (
			<>
				{SelectComponent}
				<ApiError error={error} />
			</>
		);
	}

	if (!data) {
		return (
			<>
				{SelectComponent}
				<Loading />
			</>
		);
	}

	const userMap = CreateUserMap(data.users);

	const userDataset: UGSDataset = [];

	for (const [index, gs] of data.gameStats.entries()) {
		userDataset.push({
			...gs,
			__related: {
				user: userMap.get(gs.userID)!,
				index,
			},
		});
	}

	return (
		<>
			{SelectComponent}
			<Divider />
			<TachiTable
				dataset={userDataset}
				entryName="Rankers"
				headers={[
					["Ranking", "Rank", NumericSOV((x) => x.__related.index)],
					["User", "User", StrSOV((x) => x.__related.user.username)],
					...(Object.keys(gptConfig.profileRatingAlgs) as Array<AnyProfileRatingAlg>).map(
						(e) =>
							[
								UppercaseFirst(e),
								UppercaseFirst(e),
								NumericSOV((x) => x.ratings[e] ?? -Infinity),
							] as Header<UGSDataset[0]>
					),
					["Classes", "Classes"],
				]}
				rowFunction={(r) => (
					<tr>
						<IndexCell index={r.__related.index} />
						<UserCell game={game} playtype={playtype} user={r.__related.user} />
						{(
							Object.keys(gptConfig.profileRatingAlgs) as Array<AnyProfileRatingAlg>
						).map((e) => (
							<td key={e}>
								{r.ratings[e]
									? gptConfig.profileRatingAlgs[e].formatter
										? gptConfig.profileRatingAlgs[e].formatter!(r.ratings[e]!)
										: ToFixedFloor(r.ratings[e]!, 2)
									: "No Data."}
							</td>
						))}
						<td>
							{Object.keys(r.classes).length === 0 ? (
								<Muted>None</Muted>
							) : (
								Object.entries(r.classes).map(
									([k, v]) =>
										v && (
											<ClassBadge
												key={k}
												classSet={k as keyof typeof r.classes}
												game={game}
												playtype={playtype}
												classValue={v}
											/>
										)
								)
							)}
						</td>
					</tr>
				)}
			/>
		</>
	);
}
