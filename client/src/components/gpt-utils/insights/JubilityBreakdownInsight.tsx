import { CreateChartMap } from "util/data";
import { NumericSOV } from "util/sorts";
import { ToFixedFloor } from "util/misc";
import Card from "components/layout/page/Card";
import PBTable from "components/tables/pbs/PBTable";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import usePreferredRanking from "components/util/usePreferredRanking";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { ChartDocument, CreateSongMap, PBScoreDocument, SongDocument } from "tachi-common";
import { UGPT } from "types/react";
import { PBDataset } from "types/tables";
import { GPTUtility } from "types/ugpt";

function Component({ game, playtype, reqUser }: UGPT) {
	const { data, error } = useApiQuery<{
		songs: Array<SongDocument>;
		charts: Array<ChartDocument>;
		pickUp: Array<PBScoreDocument>;
		other: Array<PBScoreDocument>;
	}>(`/users/${reqUser.id}/games/${game}/${playtype}/jubility`);

	const preferredRanking = usePreferredRanking();

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const songMap = CreateSongMap(data.songs);
	const chartMap = CreateChartMap(data.charts);

	const pickUpDataset: PBDataset = [];
	const normalDataset: PBDataset = [];

	const sortedJubilities = [...data.pickUp, ...data.other]
		.map((e) => e.calculatedData.jubility)
		.sort(NumericSOV((x) => x ?? -Infinity, true));

	for (const pb of data.pickUp) {
		const song = songMap.get(pb.songID);
		const chart = chartMap.get(pb.chartID);

		if (!song) {
			continue;
		}

		if (!chart) {
			continue;
		}

		pickUpDataset.push({
			...pb,
			__related: {
				chart,
				song,
				index: sortedJubilities.indexOf(pb.calculatedData.jubility),
			},
		});
	}

	for (const pb of data.other) {
		const song = songMap.get(pb.songID);
		const chart = chartMap.get(pb.chartID);

		if (!song) {
			continue;
		}

		if (!chart) {
			continue;
		}

		normalDataset.push({
			...pb,
			__related: {
				chart,
				song,
				index: sortedJubilities.indexOf(pb.calculatedData.jubility),
			},
		});
	}

	return (
		<Row>
			<Col xs={12}>
				<Card
					header={`Pick-Up (${ToFixedFloor(
						pickUpDataset.reduce((a, e) => a + (e.calculatedData.jubility ?? 0), 0),
						1
					)})`}
				>
					<PBTable
						game={game}
						playtype={playtype}
						dataset={pickUpDataset}
						defaultRankingViewMode={preferredRanking}
						indexCol
						alg="jubility"
					/>
				</Card>
				<Divider />
				<Card
					header={`Common (${ToFixedFloor(
						normalDataset.reduce((a, e) => a + (e.calculatedData.jubility ?? 0), 0),
						1
					)})`}
				>
					<PBTable
						game={game}
						playtype={playtype}
						dataset={normalDataset}
						defaultRankingViewMode={preferredRanking}
						indexCol
						alg="jubility"
					/>
				</Card>
			</Col>
		</Row>
	);
}

export const JubilityBreakdownInsight: GPTUtility = {
	name: "Jubility Breakdown",
	urlPath: "jubility",
	description: `See what PBs are going into profile jubility!`,
	component: Component,
};
