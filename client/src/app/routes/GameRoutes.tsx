import PlaytypeSelect from "app/pages/dashboard/games/_game/PlaytypeSelect";
import GPTChartPage from "app/pages/dashboard/games/_game/_playtype/GPTChartPage";
import GPTDevInfo from "app/pages/dashboard/games/_game/_playtype/GPTDevInfo";
import GPTLeaderboardsPage from "app/pages/dashboard/games/_game/_playtype/GPTLeaderboardsPage";
import GPTMainPage from "app/pages/dashboard/games/_game/_playtype/GPTMainPage";
import GPTSongPage from "app/pages/dashboard/games/_game/_playtype/GPTSongPage";
import GPTSongsPage from "app/pages/dashboard/games/_game/_playtype/GPTSongsPage";
import { ErrorPage } from "app/pages/ErrorPage";
import ChartInfoFormat from "components/game/charts/ChartInfoFormat";
import { GPTBottomNav } from "components/game/GPTHeader";
import SongInfoFormat from "components/game/songs/SongInfoFormat";
import Card from "components/layout/page/Card";
import DebugContent from "components/util/DebugContent";
import Divider from "components/util/Divider";
import LinkButton from "components/util/LinkButton";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import { UserSettingsContext } from "context/UserSettingsContext";
import React, { useContext, useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { Redirect, Route, Switch, useParams } from "react-router-dom";
import {
	ChartDocument,
	FormatDifficulty,
	Game,
	GetGameConfig,
	GetGamePTConfig,
} from "tachi-common";
import { SongsReturn } from "types/api-returns";
import { GamePT, SetState } from "types/react";
import { IsSupportedGame, IsSupportedPlaytype } from "util/asserts";
import { ChangeOpacity } from "util/color-opacity";
import { NumericSOV } from "util/sorts";

export default function GameRoutes() {
	const { game } = useParams<{ game: string }>();

	if (!IsSupportedGame(game)) {
		return <ErrorPage statusCode={404} customMessage={`The game ${game} is not supported.`} />;
	}

	const gameConfig = GetGameConfig(game);

	return (
		<Switch>
			<Route exact path="/dashboard/games/:game">
				{gameConfig.validPlaytypes.length === 1 ? (
					<Redirect to={`/dashboard/games/${game}/${gameConfig.validPlaytypes[0]}`} />
				) : (
					<PlaytypeSelect
						subheaderCrumbs={["Games", gameConfig.name]}
						subheaderTitle={`${gameConfig.name} Playtype Select`}
						base={`/dashboard/games/${game}`}
						game={game}
					/>
				)}
			</Route>

			<Route path="/dashboard/games/:game/:playtype">
				<GamePlaytypeRoutes game={game} />
			</Route>

			<Route path="*">
				<ErrorPage statusCode={404} />
			</Route>
		</Switch>
	);
}

function GamePlaytypeRoutes({ game }: { game: Game }) {
	const { playtype } = useParams<{ playtype: string }>();

	if (!IsSupportedPlaytype(game, playtype)) {
		return (
			<ErrorPage
				statusCode={400}
				customMessage={`The playtype ${playtype} is not supported.`}
			/>
		);
	}

	return (
		<>
			<div className="card">
				<GPTBottomNav baseUrl={`/dashboard/games/${game}/${playtype}`} />
			</div>
			<Divider />
			<Switch>
				<Route exact path="/dashboard/games/:game/:playtype">
					<GPTMainPage game={game} playtype={playtype} />
				</Route>

				<Route exact path="/dashboard/games/:game/:playtype/songs">
					<GPTSongsPage game={game} playtype={playtype} />
				</Route>

				<Route path="/dashboard/games/:game/:playtype/songs/:songID">
					<SongChartRoutes game={game} playtype={playtype} />
				</Route>

				<Route exact path="/dashboard/games/:game/:playtype/leaderboards">
					<GPTLeaderboardsPage game={game} playtype={playtype} />
				</Route>
				<Route exact path="/dashboard/games/:game/:playtype/dev-info">
					<GPTDevInfo game={game} playtype={playtype} />
				</Route>

				<Route path="*">
					<ErrorPage statusCode={404} />
				</Route>
			</Switch>
		</>
	);
}

function SongChartRoutes({ game, playtype }: GamePT) {
	const { songID } = useParams<{ songID: string }>();

	const { data, isLoading, error } = useApiQuery<SongsReturn>(
		`/games/${game}/${playtype}/songs/${songID}`
	);

	const { settings } = useContext(UserSettingsContext);

	const [activeChart, setActiveChart] = useState<ChartDocument | null>(null);

	useEffect(() => {
		setActiveChart(null);
	}, [game, playtype]);

	if (error) {
		return <ErrorPage statusCode={error.statusCode} customMessage={error.description} />;
	}

	if (!data || isLoading) {
		return <Loading />;
	}

	return (
		<>
			<SongInfoHeader
				game={game}
				playtype={playtype}
				{...data}
				activeChart={activeChart}
				setActiveChart={setActiveChart}
			/>
			<Divider />
			<Switch>
				<Route exact path="/dashboard/games/:game/:playtype/songs/:songID">
					<GPTSongPage
						game={game}
						playtype={playtype}
						song={data.song}
						charts={data.charts}
						setActiveChart={setActiveChart}
					/>
				</Route>

				<Route exact path="/dashboard/games/:game/:playtype/songs/:songID/:difficulty">
					<GPTChartPage
						game={game}
						playtype={playtype}
						song={data.song}
						chart={activeChart}
						setActiveChart={setActiveChart}
						allCharts={data.charts}
					/>
				</Route>

				<Route path="*">
					<ErrorPage statusCode={404} />
				</Route>
			</Switch>
			{settings?.preferences.developerMode && (
				<>
					<Divider />
					<Card header="Dev Info">
						<DebugContent data={data} />
					</Card>
				</>
			)}
		</>
	);
}

function SongInfoHeader({
	game,
	playtype,
	song,
	charts,
	activeChart,
	setActiveChart,
}: { activeChart: ChartDocument | null; setActiveChart: SetState<ChartDocument | null> } & GamePT &
	SongsReturn) {
	// @TODO: Custom game song formatting functions, since for some games
	// (like popn) players use the genres to discuss them.
	const formatSongTitle = `${song.artist} - ${song.title}`;

	const [imgShow, setImgShow] = useState(true);

	const gptConfig = GetGamePTConfig(game, playtype);

	// accidentally O(n^2) but this is a short list so who cares
	const sortedCharts = charts
		.slice(0)
		.sort(NumericSOV(x => gptConfig.difficulties.indexOf(x.difficulty)));

	return (
		<Card header="Song Info">
			<Row
				className="align-items-center"
				style={{
					justifyContent: "space-evenly",
				}}
			>
				{imgShow && (
					<Col xs={12} lg={3} className="text-center">
						<img
							src="https://kamaitachi.xyz/static/images/gameicons/iidx/18z.png"
							onError={() => setImgShow(false)}
							className="w-100"
						/>
					</Col>
				)}
				<Col xs={12} lg={4} className="text-center">
					<SongInfoFormat {...{ game, song, chart: activeChart }} />
				</Col>
				{game !== "bms" && (
					<Col xs={12} lg={3} className="text-center">
						<h5>Charts</h5>
						<hr />
						<div className="btn-group-vertical d-flex justify-content-center">
							{sortedCharts.map(e => (
								<LinkButton
									onClick={() => setActiveChart(e)}
									className="btn-secondary"
									key={e.chartID}
									to={`/dashboard/games/${game}/${playtype}/songs/${song.id}/${e.difficulty}`}
									style={{
										backgroundColor: gptConfig.difficultyColours[e.difficulty]
											? ChangeOpacity(
													gptConfig.difficultyColours[e.difficulty]!,
													activeChart?.chartID === e.chartID ? 0.4 : 0.2
											  )
											: undefined,
									}}
								>
									{activeChart?.chartID === e.chartID ? (
										<strong>{FormatDifficulty(e, game)}</strong>
									) : (
										FormatDifficulty(e, game)
									)}
								</LinkButton>
							))}
						</div>
					</Col>
				)}
				{activeChart && (
					<Col xs={12}>
						<Divider />
						<ChartInfoFormat playtype={playtype} chart={activeChart} game={game} />
					</Col>
				)}
			</Row>
		</Card>
	);
}
