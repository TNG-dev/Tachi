import { NumericSOV } from "util/sorts";
import RivalChartTable from "components/tables/rivals/RivalChartTable";
import ApiError from "components/util/ApiError";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import useUGPTBase from "components/util/useUGPTBase";
import { UserContext } from "context/UserContext";
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { ChartDocument, Game, GetGamePTConfig } from "tachi-common";
import { ChartRivalsReturn } from "types/api-returns";
import { RivalChartDataset } from "types/tables";
import { Col } from "react-bootstrap";

export default function RivalCompare({ chart, game }: { chart: ChartDocument; game: Game }) {
	const { user: currentUser } = useContext(UserContext);

	const playtype = chart.playtype;

	if (!currentUser) {
		return <div>You're not signed in. How did you even get to this page?</div>;
	}

	const base = useUGPTBase({ reqUser: currentUser, game, playtype });

	const { data, error } = useApiQuery<ChartRivalsReturn>(
		`/users/${currentUser.id}/games/${game}/${playtype}/pbs/${chart.chartID}/rivals`
	);

	if (!data) {
		return <Loading />;
	}

	if (error) {
		return <ApiError error={error} />;
	}

	if (data.rivals.length === 0) {
		return (
			<div className="w-100 text-center">
				You have no rivals set!
				<br />
				Why not <Link to={`${base}/rivals/manage`}>set some?</Link>
			</div>
		);
	}

	const gptConfig = GetGamePTConfig(game, playtype);

	const rivalDataset: RivalChartDataset = [...data.rivals, currentUser]
		.map((u) => ({
			...u,
			__related: {
				pb: data.pbs.find((p) => p.userID === u.id) ?? null,
			},
		}))
		.sort(
			// @ts-expect-error this access is obviously legal
			NumericSOV((x) => x.__related.pb?.scoreData[gptConfig.defaultMetric] ?? -Infinity, true)
		)
		.map((e, index) => ({
			...e,
			__related: {
				...e.__related,
				index,
			},
		}));

	return (
		<Col xs={12}>
			<RivalChartTable chart={chart} game={game} dataset={rivalDataset} />
		</Col>
	);
}
