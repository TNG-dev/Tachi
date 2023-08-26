import { APIFetchV1 } from "util/api";
import { CreateChartMap, CreateSongMap } from "util/data";
import MiniTable from "components/tables/components/MiniTable";
import TachiTable from "components/tables/components/TachiTable";
import ScoreTable from "components/tables/scores/ScoreTable";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import SelectButton from "components/util/SelectButton";
import { UserContext } from "context/UserContext";
import { AllLUGPTStatsContext } from "context/AllLUGPTStatsContext";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
	ChartDocument,
	Game,
	ImportDocument,
	UserDocument,
	ScoreDocument,
	SessionDocument,
	SongDocument,
	UserGameStats,
	Playtype,
} from "tachi-common";
import { ScoreDataset } from "types/tables";
import { Alert, ButtonGroup } from "react-bootstrap";

interface Data {
	import: ImportDocument;
	scores: ScoreDocument[];
	charts: ChartDocument[];
	songs: SongDocument[];
	sessions: SessionDocument[];
	user: UserDocument;
}

export default function ImportInfo({
	importID,
	noTopTable,
}: {
	importID: string;
	noTopTable?: boolean;
}) {
	const { data, error } = useApiQuery<Data>(`/imports/${importID}`);

	const { setUGS } = useContext(AllLUGPTStatsContext);
	const { user } = useContext(UserContext);
	const [hasUpdatedStats, setHasUpdatedStats] = useState(false);

	useEffect(() => {
		if (!data || hasUpdatedStats || !user) {
			return;
		}

		APIFetchV1<UserGameStats[]>(`/users/${user!.id}/game-stats`).then((r) => {
			if (!r.success) {
				console.warn(`Can't update user stats post-import. ${r.description}`);
				return;
			}
			setUGS(r.body);
			setHasUpdatedStats(true);
		});
	}, [data]);

	const [tab, setTab] = useState<"scores" | "sessions" | "errors">("scores");

	if (error) {
		return (
			<>
				We've hit an error fetching info about this import. The import has still succeeded,
				though!
				<ApiError error={error} />
			</>
		);
	}

	if (!data) {
		return (
			<>
				<Loading />
				We're fetching stats about this import...
			</>
		);
	}

	const importDoc = data.import;

	return (
		<>
			{!noTopTable && (
				<>
					<div className="col-12">
						<MiniTable headers={["Import Info"]} colSpan={2}>
							<tr>
								<td>Imported Scores</td>
								<td>{importDoc.scoreIDs.length}</td>
							</tr>
							<tr>
								<td>Created Sessions</td>
								<td>{importDoc.createdSessions.length}</td>
							</tr>
							<tr>
								<td>Errors</td>
								<td>{importDoc.errors.length}</td>
							</tr>
						</MiniTable>
					</div>
					<div className="col-12">
						<Divider />
					</div>
				</>
			)}
			<div className="col-12 vstack gap-4">
				<ButtonGroup>
					<SelectButton value={tab} setValue={setTab} id="scores">
						<Icon type="table" /> Scores
					</SelectButton>
					<SelectButton value={tab} setValue={setTab} id="sessions">
						<Icon type="calendar-week" /> Sessions
					</SelectButton>
					<SelectButton value={tab} setValue={setTab} id="errors">
						<Icon type="exclamation-triangle" /> Errors
					</SelectButton>
				</ButtonGroup>
				{tab === "errors" ? (
					<>
						<Alert variant="warning">
							Some of these errors might not be very useful. Depending on how scores
							are matched with data, all we have to display might be a hash.
						</Alert>
						<TachiTable
							entryName="Errors"
							dataset={data.import.errors}
							headers={[
								["Error Name", "Error Name"],
								["Info", "Info"],
							]}
							rowFunction={(r) => (
								<tr>
									<td>{r.type}</td>
									<td>{r.message}</td>
								</tr>
							)}
						/>
					</>
				) : tab === "scores" ? (
					<ScoreTab data={data} />
				) : (
					<SessionTab data={data} />
				)}
			</div>
		</>
	);
}

function SessionTab({ data }: { data: Data }) {
	const importDoc = data.import;

	const dataset = [];

	const sessionMap: Map<string, SessionDocument> = new Map();

	for (const session of data.sessions) {
		sessionMap.set(session.sessionID, session);
	}

	for (const sesInfo of importDoc.createdSessions) {
		dataset.push({
			info: sesInfo,
			session: sessionMap.get(sesInfo.sessionID)!,
		});
	}

	return (
		<TachiTable
			dataset={dataset}
			entryName="Sessions"
			headers={[
				["Session Name", "Session Name"],
				["Change Info", "Change Info"],
				["Scores", "Scores"],
			]}
			rowFunction={(r) => (
				<tr>
					<td>
						<Link
							to={`/u/${r.session.userID}/games/${r.session.game}/${r.session.playtype}/sessions/${r.session.sessionID}`}
							className="text-decoration-none"
						>
							{r.session.name}
						</Link>
					</td>
					<td>{r.info.type}</td>
					<td>{r.session.scoreIDs.length}</td>
				</tr>
			)}
		/>
	);
}

function ScoreTab({ data }: { data: Data }) {
	const importDoc = data.import;

	if (importDoc.playtypes.length === 0) {
		return (
			<div className="row mt-4">
				<span className="w-100 text-center">No scores...</span>
			</div>
		);
	} else if (importDoc.playtypes.length > 1) {
		const datasets = [];

		for (const playtype of importDoc.playtypes) {
			const scoreDataset: ScoreDataset = [];

			const songMap = CreateSongMap(data.songs);
			const chartMap = CreateChartMap(data.charts);

			for (const [i, score] of data.scores.filter((e) => e.playtype === playtype).entries()) {
				scoreDataset.push({
					...score,
					__related: {
						song: songMap.get(score.songID)!,
						chart: chartMap.get(score.chartID)!,
						index: i,
						user: data.user,
					},
				});
			}

			datasets.push({ playtype, data: scoreDataset });
		}

		return <MultiPlaytypeScoreTable datasets={datasets} game={importDoc.game} />;
	}

	const scoreDataset: ScoreDataset = [];

	const songMap = CreateSongMap(data.songs);
	const chartMap = CreateChartMap(data.charts);

	for (const [i, score] of data.scores.entries()) {
		scoreDataset.push({
			...score,
			__related: {
				song: songMap.get(score.songID)!,
				chart: chartMap.get(score.chartID)!,
				index: i,
				user: data.user,
			},
		});
	}

	return (
		<ScoreTable
			game={importDoc.game}
			playtype={importDoc.playtypes[0]}
			dataset={scoreDataset}
		/>
	);
}

type ScoreDatasets = { playtype: Playtype; data: ScoreDataset }[];

function MultiPlaytypeScoreTable({ datasets, game }: { datasets: ScoreDatasets; game: Game }) {
	const [playtype, setPlaytype] = useState<Playtype>(datasets[0].playtype);

	const content = useMemo(() => datasets.find((e) => e.playtype === playtype)!, [playtype]);

	return (
		<div className="row">
			<div className="col-12">
				<div className="btn-group">
					{datasets.map((e) => (
						<SelectButton
							key={e.playtype}
							value={playtype}
							setValue={setPlaytype}
							id={e.playtype}
						>
							{e.playtype}
						</SelectButton>
					))}
				</div>
			</div>

			<ScoreTable game={game} dataset={content.data} playtype={content.playtype} />
		</div>
	);
}
