import { APIFetchV1 } from "util/api";
import { CreateChartMap, CreateSongMap } from "util/data";
import { NumericSOV } from "util/sorts";
import { FormatDuration } from "util/time";
import Card from "components/layout/page/Card";
import ScoreTable from "components/tables/scores/ScoreTable";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import LinkButton from "components/util/LinkButton";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import useApiQuery from "components/util/query/useApiQuery";
import { UserContext } from "context/UserContext";
import React, { useContext, useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import toast from "react-hot-toast";
import { SessionDocument } from "tachi-common";
import { SessionReturns } from "types/api-returns";
import { ScoreDataset } from "types/tables";

export default function SessionCard({ sessionID }: { sessionID: string }) {
	const { user } = useContext(UserContext);

	const { data, error } = useApiQuery<SessionReturns>(`/sessions/${sessionID}`);

	const [highlight, setHighlight] = useState(false);

	useMemo(() => {
		setHighlight(data?.session.highlight ?? false);
	}, [data]);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const { session, charts, scores, songs, user: sessionUser } = data;

	const songMap = CreateSongMap(songs);
	const chartMap = CreateChartMap(charts);

	const scoreDataset: ScoreDataset = [];

	for (const score of scores) {
		scoreDataset.push({
			...score,
			__related: {
				chart: chartMap.get(score.chartID)!,
				song: songMap.get(score.songID)!,
				index: 0,
				user: sessionUser,
			},
		});
	}

	scoreDataset.sort(NumericSOV((x) => x.timeAchieved ?? 0, true));

	return (
		<Card header={session.name}>
			<SessionOverview session={session} username={sessionUser.username} />
			<Divider />
			<ScoreTable
				pageLen={5}
				game={session.game}
				playtype={session.playtype}
				dataset={scoreDataset}
			/>
			<Divider />
			{sessionUser.id === user?.id && (
				<div className="d-flex w-100 gap-4 justify-content-center">
					<Button
						onClick={async () => {
							const res = await APIFetchV1(
								`/sessions/${session.sessionID}`,
								{
									method: "PATCH",
									headers: {
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										highlight: !highlight,
									}),
								},
								false,
								true
							);

							if (res.success) {
								if (!highlight) {
									toast.success("Highlighted Session!");
								} else {
									toast.success("Unhighlighted Session.");
								}

								setHighlight(!highlight);
							}
						}}
						variant={highlight ? "outline-danger" : "outline-warning"}
					>
						<Icon type="star" regular={!highlight} />{" "}
						{highlight ? "Remove as Highlight" : "Highlight this session!"}
					</Button>
					<LinkButton
						to={`/u/${sessionUser.username}/games/${session.game}/${session.playtype}/sessions/${session.sessionID}`}
						className="btn-primary"
					>
						View Session
					</LinkButton>
				</div>
			)}
		</Card>
	);
}

function SessionOverview({ session, username }: { session: SessionDocument; username: string }) {
	return (
		<Row xs={{ cols: 1 }} lg={{ cols: 2 }}>
			<StatIcon name="Scores" value={session.scoreIDs.length} />
			<StatIcon
				name="Duration"
				value={FormatDuration(session.timeEnded - session.timeStarted)}
			/>
		</Row>
	);
}

function StatIcon({ name, value }: { name: string; value: React.ReactChild }) {
	return (
		<div className="col text-center">
			<h4>
				<Muted>{name}</Muted>
			</h4>
			<h1>{value}</h1>
		</div>
	);
}
