import { ChangeOpacity } from "util/color-opacity";
import { CreateChartLink, CreateChartMap, CreateSongMap } from "util/data";
import { JoinJSX } from "util/misc";
import { NumericSOV } from "util/sorts";
import Card from "components/layout/page/Card";
import DropdownIndicatorCell from "components/tables/cells/DropdownIndicatorCell";
import DropdownRow from "components/tables/components/DropdownRow";
import MiniTable from "components/tables/components/MiniTable";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import useApiQuery from "components/util/query/useApiQuery";
import Select from "components/util/Select";
import useLUGPTSettings from "components/util/useLUGPTSettings";
import _ from "lodash";
import NaturalCompare from "natural-compare";
import React, { useEffect, useMemo, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
	ChartDocument,
	FormatChart,
	Game,
	GamePTConfig,
	GetGamePTConfig,
	GetGPTString,
	GetScoreMetricConf,
	GPTString,
	integer,
	SongDocument,
	TableDocument,
} from "tachi-common";
import { SessionFolderRaises, SessionReturns } from "types/api-returns";
import { ConfEnumScoreMetric } from "tachi-common/types/metrics";
import { GPT_CLIENT_IMPLEMENTATIONS } from "lib/game-implementations";

export default function SessionFolderRaiseBreakdown({
	sessionData,
}: {
	sessionData: SessionReturns;
}) {
	const reqUser = sessionData.user;
	const { settings } = useLUGPTSettings();

	const game = sessionData.session.game;
	const playtype = sessionData.session.playtype;
	const gptConfig = GetGamePTConfig(game, playtype);

	const [selectedTable, setSelectedTable] = useState<"LOADING" | null | TableDocument>("LOADING");
	const [shouldLimit, setShouldLimit] = useState(true);

	const { data, error } = useApiQuery<Array<SessionFolderRaises>>(
		`/sessions/${sessionData.session.sessionID}/folder-raises`
	);

	const { data: tableData, error: tableError } = useApiQuery<Array<TableDocument>>(
		`/games/${game}/${playtype}/tables`
	);

	useEffect(() => {
		if (!tableData) {
			return;
		}

		let defaultTable;
		if (settings?.preferences.defaultTable) {
			defaultTable = tableData.find((e) => e.tableID === settings.preferences.defaultTable);
		} else {
			defaultTable = tableData.find((e) => e.default);
		}

		if (!defaultTable) {
			console.error(`Failed to find default table. Allowing all folders.`);
			setSelectedTable(null);
			return;
		}

		setSelectedTable(defaultTable);
	}, [tableData, settings]);

	const folders = useMemo(() => {
		if (!data) {
			return [];
		}

		// get all unique folders
		let folders = _.uniqBy(
			data.map((e) => e.folder),
			(x) => x.folderID
		);

		// sort alphabetically
		folders.sort((a, b) => NaturalCompare(b.title, a.title));

		// hide certain folders
		if (selectedTable && selectedTable !== "LOADING") {
			folders = folders.filter((e) => selectedTable.folders.includes(e.folderID));
		}

		return folders;
	}, [data, selectedTable]);

	if (error) {
		return <ApiError error={error} />;
	}

	if (tableError) {
		return <ApiError error={tableError} />;
	}

	if (!data) {
		return <Loading />;
	}

	if (!tableData) {
		return <Loading />;
	}

	const chartMap = CreateChartMap(sessionData.charts);
	const songMap = CreateSongMap(sessionData.songs);

	const preferredScoreBucket =
		settings?.preferences.preferredDefaultEnum ?? gptConfig.preferredDefaultEnum;

	if (selectedTable === "LOADING") {
		return <Loading />;
	}

	const allFolders = data.map((e) => e.folder);

	const filteredTables = tableData
		// disgusting filter: check if this table has any overlap with any
		// relevant folders. If not, don't show it.
		.filter((t) => allFolders.find((e) => t.folders.includes(e.folderID)));

	if (filteredTables.length === 0) {
		return null;
	}

	return (
		<Col xs={12}>
			<Divider />

			<h1 className="w-100 text-center">Folder Raises</h1>

			{filteredTables.length > 1 && (
				<div className="w-100">
					<Select
						name="Table"
						value={selectedTable?.tableID ?? null}
						setValue={(t) => setSelectedTable(tableData.find((e) => e.tableID === t)!)}
					>
						{filteredTables.map((e) => (
							<option key={e.tableID} value={e.tableID}>
								{e.title}
							</option>
						))}
					</Select>
				</div>
			)}

			<Row>
				{folders.slice(0, shouldLimit ? 6 : Infinity).map((folder, i) => (
					<Col key={i} xs={12} lg={6} xl={4}>
						<Card
							className="my-4"
							header={
								<h3 className="text-center w-100">
									<Link
										className="text-decoration-none"
										to={`/u/${reqUser.username}/games/${game}/${playtype}/folders/${folder.folderID}`}
									>
										{folder.title}
									</Link>
								</h3>
							}
						>
							<MiniTable headers={["New Grades/Lamps (Cumulative)"]} colSpan={100}>
								{data
									.filter((e) => e.folder.folderID === folder.folderID)
									.sort(SortRaisesNicely(gptConfig, preferredScoreBucket))
									.map((folderRaiseInfo, i) => (
										<FolderRaiseRender
											key={i}
											songMap={songMap}
											chartMap={chartMap}
											game={game}
											folderRaiseInfo={folderRaiseInfo}
											gptString={GetGPTString(game, playtype)}
										/>
									))}
							</MiniTable>
						</Card>
					</Col>
				))}
			</Row>
			{shouldLimit && folders.length > 6 && (
				<Row>
					<div
						className="w-100 text-center text-hover-primary"
						onClick={() => setShouldLimit(false)}
					>
						{folders.length - 6} {folders.length > 6 + 1 ? "folders" : "folder"} hidden.
						View more?
					</div>
				</Row>
			)}
		</Col>
	);
}

const SortRaisesNicely = (gptConfig: GamePTConfig, preferredEnum: string) =>
	NumericSOV<SessionFolderRaises>((x) => {
		const conf = GetScoreMetricConf(gptConfig, x.type) as ConfEnumScoreMetric<string>;

		const baseValue = conf.values.indexOf(x.value);

		// if this is what the user prefers to see, push it to the top
		if (x.type === preferredEnum) {
			return baseValue + 1_000_000;
		}

		return baseValue;
	}, true);

function FolderRaiseRender({
	folderRaiseInfo,
	game,
	songMap,
	chartMap,
	gptString,
}: {
	folderRaiseInfo: SessionFolderRaises;
	chartMap: Map<string, ChartDocument>;
	songMap: Map<integer, SongDocument>;
	game: Game;
	gptString: GPTString;
}) {
	const colour =
		// @ts-expect-error lazy
		GPT_CLIENT_IMPLEMENTATIONS[gptString].enumColours[folderRaiseInfo.type][
			folderRaiseInfo.value
		];

	const newTotal = folderRaiseInfo.previousCount + folderRaiseInfo.raisedCharts.length;

	return (
		<DropdownRow
			dropdown={
				<div style={{ padding: "unset" }}>
					<ChartRaises
						chartMap={chartMap}
						game={game}
						songMap={songMap}
						raisedCharts={folderRaiseInfo.raisedCharts}
					/>
				</div>
			}
		>
			<td
				style={{
					backgroundColor: ChangeOpacity(colour, 0.2),
				}}
			>
				{folderRaiseInfo.value}
			</td>
			<td>
				<div>
					<Muted>{folderRaiseInfo.previousCount}</Muted>
					<span className="px-4">⟶</span>
					<strong style={{ fontSize: "1.25rem" }}>{newTotal}</strong>
					<Muted>/{folderRaiseInfo.totalCharts}</Muted>
				</div>
				{folderRaiseInfo.totalCharts - newTotal === 0 ? (
					<div className="w-100 mt-1 text-success">Folder Complete!</div>
				) : (
					folderRaiseInfo.totalCharts - newTotal < 10 && (
						<div className="w-100 mt-1 text-warning">
							{folderRaiseInfo.totalCharts - newTotal} to go!
						</div>
					)
				)}
			</td>
			<td>
				<span
					className="text-success"
					style={{
						fontSize: folderRaiseInfo.raisedCharts.length > 5 ? "1.25rem" : "1rem",
					}}
				>
					+{folderRaiseInfo.raisedCharts.length}
				</span>
			</td>
			<DropdownIndicatorCell />
		</DropdownRow>
	);
}

function ChartRaises({
	chartMap,
	songMap,
	game,
	raisedCharts,
}: {
	raisedCharts: Array<string>;
	chartMap: Map<string, ChartDocument>;
	songMap: Map<integer, SongDocument>;
	game: Game;
}) {
	const els = [];

	for (const chartID of raisedCharts) {
		const chart = chartMap.get(chartID);

		if (!chart) {
			console.warn(`No chart '${chartID}' exists? continuing.`);
			continue;
		}
		const song = songMap.get(chart.songID);

		if (!song) {
			console.warn(`No song '${chart.songID}' exists, but the chart does?`);
			continue;
		}

		els.push(
			<span>
				<Link className="text-success" to={CreateChartLink(chart, game)}>
					+ {FormatChart(game, song, chart, true)}
				</Link>
			</span>
		);
	}

	return (
		<div className="my-2" style={{ textAlign: "left", paddingLeft: "1rem" }}>
			{JoinJSX(els, <br />)}
		</div>
	);
}
