import { APIFetchV1, UnsuccessfulAPIFetchResponse } from "util/api";
import { CreateChartLink, CreateUserMap } from "util/data";
import { SelectRightChart } from "util/misc";
import { MillisToSince } from "util/time";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Card from "components/layout/page/Card";
import MiniTable from "components/tables/components/MiniTable";
import TargetInfo from "components/tables/dropdowns/components/TargetInfo";
import ScoreCoreCells from "components/tables/game-core-cells/ScoreCoreCells";
import PBTable from "components/tables/pbs/PBTable";
import ProfilePicture from "components/user/ProfilePicture";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import SelectLinkButton from "components/util/SelectLinkButton";
import useApiQuery from "components/util/query/useApiQuery";
import useLUGPTSettings from "components/util/useLUGPTSettings";
import { TargetsContext } from "context/TargetsContext";
import { UserContext } from "context/UserContext";
import React, { useContext, useMemo, useState } from "react";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Stack from "react-bootstrap/Stack";
import { useQuery } from "react-query";
import { Link, Route, Switch, useParams } from "react-router-dom";
import {
	ChartDocument,
	FormatDifficulty,
	GetGameConfig,
	GetGamePTConfig,
	PBScoreDocument,
	SongDocument,
	UserDocument,
	integer,
} from "tachi-common";
import {
	ChartPBLeaderboardReturn,
	ChartRivalsReturn,
	GoalsOnChartReturn,
	UGPTChartLeaderboardAdjacent,
} from "types/api-returns";
import { GamePT, SetState } from "types/react";
import { PBDataset } from "types/tables";
import { WindowContext } from "context/WindowContext";

// This component forms a wrapper around the Real GPT Chart Page
// which handles the case where activeChart == null.
export default function GPTChartPage({
	chart,
	setActiveChart,
	game,
	song,
	playtype,
	allCharts,
}: {
	song: SongDocument;
	chart: ChartDocument | null;
	setActiveChart: SetState<ChartDocument | null>;
	allCharts: ChartDocument[];
} & GamePT) {
	const { difficulty: d } = useParams<{ difficulty: string }>();
	const difficulty = decodeURIComponent(d);

	const gptConfig = GetGamePTConfig(game, playtype);

	const formatSongTitle = `${song.artist} - ${song.title}`;
	const formatDiff = chart ? FormatDifficulty(chart, game) : "Loading...";

	useSetSubheader(
		["Games", GetGameConfig(game).name, playtype, "Songs", formatSongTitle, formatDiff],
		[game, playtype, chart],
		`${formatSongTitle} (${formatDiff})`
	);

	setActiveChart(SelectRightChart(gptConfig, difficulty, allCharts));

	if (!chart) {
		return <Loading />;
	}

	return <InternalGPTChartPage chart={chart} game={game} song={song} playtype={playtype} />;
}

interface ChartPBData {
	leaderboard: ChartPBLeaderboardReturn;
	adjacent?: UGPTChartLeaderboardAdjacent;
	rivals?: ChartRivalsReturn;
	playcount: integer;
}

function InternalGPTChartPage({
	chart,
	game,
	song,
	playtype,
}: {
	song: SongDocument;
	chart: ChartDocument;
} & GamePT) {
	const { user } = useContext(UserContext);

	const { data, error } = useQuery<ChartPBData, UnsuccessfulAPIFetchResponse>(
		["PBInfo", `${chart.chartID}`],
		async () => {
			const lRes = await APIFetchV1<ChartPBLeaderboardReturn>(
				`/games/${game}/${playtype}/charts/${chart.chartID}/pbs`
			);

			if (!lRes.success) {
				throw lRes;
			}

			const pRes = await APIFetchV1<{ count: integer }>(
				`/games/${game}/${playtype}/charts/${chart.chartID}/playcount`
			);

			if (!pRes.success) {
				throw pRes;
			}

			if (user) {
				const nRes = await APIFetchV1<UGPTChartLeaderboardAdjacent>(
					`/users/${user.id}/games/${game}/${playtype}/pbs/${chart.chartID}/leaderboard-adjacent`
				);

				const rRes = await APIFetchV1<ChartRivalsReturn>(
					`/users/${user.id}/games/${game}/${playtype}/pbs/${chart.chartID}/rivals`
				);

				const returnValue: ChartPBData = {
					leaderboard: lRes.body,
					playcount: pRes.body.count,
				};

				if (nRes.success) {
					returnValue.adjacent = nRes.body;
				}

				if (rRes.success) {
					returnValue.rivals = rRes.body;
				}

				return returnValue;
			}

			return { leaderboard: lRes.body, playcount: pRes.body.count };
		}
	);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	if (data.leaderboard.pbs.length === 0) {
		return <div className="text-center my-8">Nobody has played this chart!</div>;
	}

	const userMap = CreateUserMap(data.leaderboard.users);

	if (data.adjacent) {
		for (const user of data.adjacent.users) {
			userMap.set(user.id, user);
		}
	}

	if (data.rivals) {
		for (const user of data.rivals.rivals) {
			userMap.set(user.id, user);
		}
	}

	if (user) {
		// Add current user, since there's no guarantee they are returned from either API.
		userMap.set(user.id, user);
	}

	const base = CreateChartLink(chart, game);

	return (
		<>
			<Row xs={{ cols: 1 }} lg={{ cols: 2 }} className="row-gap-4">
				<ButtonGroup className="d-flex w-100">
					<SelectLinkButton className="text-wrap" to={base}>
						<Icon type="trophy" /> Best 100
					</SelectLinkButton>
					<SelectLinkButton
						className="text-wrap"
						to={`${base}/me`}
						disabled={!data.adjacent}
					>
						<Icon type="user" /> Your Position
					</SelectLinkButton>
					{user && (
						<>
							<SelectLinkButton
								className="text-wrap"
								to={`${base}/rivals`}
								disabled={!data.adjacent}
							>
								<Icon type="users" /> Vs. Rivals
							</SelectLinkButton>
							<SelectLinkButton className="text-wrap" to={`${base}/targets`}>
								<Icon type="scroll" /> Goals & Quests
							</SelectLinkButton>
						</>
					)}
				</ButtonGroup>

				<TopShowcase data={data} user={user} userMap={userMap} chart={chart} />
			</Row>
			<div className="mt-4">
				<Switch>
					<Route exact path="/games/:game/:playtype/songs/:songID/:difficulty/targets">
						<ChartTargetInfo {...{ chart, game, playtype, song, user: user! }} />
					</Route>

					<Route exact path="/games/:game/:playtype/songs/:songID/:difficulty">
						<ChartLeaderboardTable
							{...{
								data,
								game,
								playtype,
								user,
								userMap,
								chart,
								song,
								mode: "leaderboard",
							}}
						/>
					</Route>

					<Route exact path="/games/:game/:playtype/songs/:songID/:difficulty/me">
						<ChartLeaderboardTable
							{...{
								data,
								game,
								playtype,
								user,
								userMap,
								chart,
								song,
								mode: "adjacent",
							}}
						/>
					</Route>

					<Route exact path="/games/:game/:playtype/songs/:songID/:difficulty/rivals">
						<ChartLeaderboardTable
							{...{
								data,
								game,
								playtype,
								user,
								userMap,
								chart,
								song,
								mode: "rivals",
							}}
						/>
					</Route>
				</Switch>
			</div>
		</>
	);
}

function ChartTargetInfo({
	user,
	game,
	playtype,
	chart,
	song,
}: {
	user: UserDocument;
	chart: ChartDocument;
	song: SongDocument;
} & GamePT) {
	const { reloadTargets } = useContext(TargetsContext);
	const [shouldReload, setShouldReload] = useState(0);

	const { error, data } = useApiQuery<GoalsOnChartReturn>(
		`/users/${user.id ?? ""}/games/${game}/${playtype}/targets/on-chart/${chart.chartID}`,
		undefined,
		// force a reload of this data when the user adds a new goal
		[shouldReload.toString()]
	);

	return (
		<div className="w-100 text-center">
			<Divider />
			<TargetInfo
				{...{
					chart,
					data,
					error,
					game,
					playtype,
					reqUser: user,
					song,
					onGoalSet: () => {
						// reload local query, then reload global targets.
						setShouldReload(shouldReload + 1);
						reloadTargets();
					},
				}}
			/>
		</div>
	);
}

function ChartLeaderboardTable({
	data,
	userMap,
	user,
	game,
	playtype,
	mode,
	chart,
	song,
}: {
	data: ChartPBData;
	user: UserDocument | null;
	userMap: Map<integer, UserDocument>;
	mode: "leaderboard" | "adjacent" | "rivals";
	chart: ChartDocument;
	song: SongDocument;
} & GamePT) {
	const { settings } = useLUGPTSettings();

	const dataset: PBDataset = useMemo(() => {
		const ds: PBDataset = [];

		let pbs: Array<PBScoreDocument> = [];
		if (mode === "leaderboard") {
			pbs = data.leaderboard.pbs;
		} else if (mode === "adjacent") {
			pbs = [
				...data.adjacent!.adjacentAbove,
				data.adjacent!.pb,
				...data.adjacent!.adjacentBelow,
			];
		} else if (mode === "rivals") {
			pbs = data.rivals!.pbs;
		}

		for (const pb of pbs) {
			ds.push({
				...pb,
				__related: {
					chart,
					song,
					index: pb.rankingData.rank - 1,
					user: userMap.get(pb.userID)!,
				},
			});
		}

		return ds;
	}, [data, mode, user]);

	return (
		<PBTable
			defaultRankingViewMode={mode === "rivals" ? "global-no-switch" : "both-if-self"}
			key={mode}
			dataset={dataset}
			game={game}
			playtype={playtype}
			showChart={false}
			alg={settings?.preferences.preferredScoreAlg ?? undefined}
			showUser
		/>
	);
}

function TopShowcase({
	data,
	user,
	userMap,
	chart,
}: {
	data: ChartPBData;
	user: UserDocument | null;
	userMap: Map<integer, UserDocument>;
	chart: ChartDocument;
}) {
	// We have a couple of conditions.
	// User is #1: col-12 #1,
	// User has played: col-6 col-6,
	// User has not played: col-12 #1,

	const bestPlay = data.leaderboard.pbs[0];
	const bestUser = userMap.get(bestPlay.userID)!;

	// User hasn't played, or isn't logged in or something.
	if (user?.id === bestPlay.userID) {
		return (
			<Col xs={12}>
				<PlayCard name="Best PB" pb={bestPlay} user={bestUser} chart={chart} />
			</Col>
		);
	}

	if (!data.adjacent) {
		return (
			<>
				<Col className="d-grid">
					<PlayCard name="Best PB" pb={bestPlay} user={bestUser} chart={chart} />
				</Col>
				<Col className="d-grid">
					<Card header="Your PB" className="text-center">
						<Muted>You've not played this chart.</Muted>
					</Card>
				</Col>
			</>
		);
	}

	const thisUsersPlay = data.adjacent.pb;

	return (
		<>
			<Col className="d-grid">
				<PlayCard name="Best Play" pb={bestPlay} user={bestUser} chart={chart} />
			</Col>
			<Col className="d-grid">
				<PlayCard name="Your PB" pb={thisUsersPlay} user={user!} chart={chart} />
			</Col>
		</>
	);
}

function PlayCard({
	pb,
	user,
	name,
	chart,
}: {
	pb: PBScoreDocument;
	user: UserDocument;
	name: string;
	chart: ChartDocument;
}) {
	const {
		breakpoint: { isLg },
	} = useContext(WindowContext);
	return (
		<Card header={name} cardBodyClassName="vstack gap-4">
			<Stack
				direction={isLg ? "horizontal" : "vertical"}
				className="flex-grow-1 align-items-lg-start align-items-center  justify-content-around"
			>
				<ProfilePicture user={user} toGPT={`${pb.game}/${pb.playtype}`} />
				<div
					className="d-flex flex-column align-self-stretch justify-content-between align-items-center"
					style={{ maxHeight: 128, minWidth: 256 }}
				>
					<Link
						className="text-decoration-none fs-4 fw-bold text-break text-center"
						to={`/u/${user.username}/games/${pb.game}/${pb.playtype}`}
					>
						{user.username}
					</Link>
					<div>
						<strong className="display-3">#{pb.rankingData.rank}</strong>
						<span className="text-body-secondary display-6">
							/{pb.rankingData.outOf}
						</span>
					</div>
				</div>
			</Stack>

			<Col>
				<MiniTable headers={["PB Info"]} colSpan={100}>
					<tr>
						<ScoreCoreCells short game={pb.game} chart={chart} score={pb} />
					</tr>
				</MiniTable>
				<div className="text-center">
					<Muted>
						{pb.timeAchieved
							? MillisToSince(pb.timeAchieved) ?? ""
							: "No Timestamp Info"}
					</Muted>
				</div>
			</Col>
		</Card>
	);
}
