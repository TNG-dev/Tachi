import { ChangeOpacity } from "util/color-opacity";
import { ONE_DAY } from "util/constants/time";
import { CreateChartIDMap, CreateChartLink, CreateSongMap } from "util/data";
import { DistinctArr, UppercaseFirst } from "util/misc";
import { NumericSOV, StrSOV } from "util/sorts";
import { FormatDate } from "util/time";
import FolderInfoHeader from "components/game/folder/FolderInfoHeader";
import QuickTooltip from "components/layout/misc/QuickTooltip";
import Card from "components/layout/page/Card";
import DifficultyCell from "components/tables/cells/DifficultyCell";
import TimestampCell from "components/tables/cells/TimestampCell";
import TitleCell from "components/tables/cells/TitleCell";
import MiniTable from "components/tables/components/MiniTable";
import FolderTable from "components/tables/folders/FolderTable";
import ScoreCoreCells from "components/tables/game-core-cells/ScoreCoreCells";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import ReferToUser from "components/util/ReferToUser";
import SelectLinkButton from "components/util/SelectLinkButton";
import useApiQuery from "components/util/query/useApiQuery";
import useUGPTBase from "components/util/useUGPTBase";
import { GPT_CLIENT_IMPLEMENTATIONS } from "lib/game-implementations";
import { GPTRatingSystem } from "lib/types";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { Link, Route, Switch, useParams } from "react-router-dom";
import {
	COLOUR_SET,
	ChartDocument,
	FormatDifficultyShort,
	GPTString,
	Game,
	GetGamePTConfig,
	GetScoreEnumConfs,
	Playtype,
	ScoreDocument,
	SongDocument,
	UserDocument,
	integer,
} from "tachi-common";
import { ConfEnumScoreMetric } from "tachi-common/types/metrics";
import { UGPTFolderReturns } from "types/api-returns";
import { FolderDataset } from "types/tables";
import SelectButton from "components/util/SelectButton";
import { WindowContext } from "context/WindowContext";
import FolderComparePage from "./FolderComparePage";
import FolderQuestsPage from "./FolderQuestsPage";

interface Props {
	reqUser: UserDocument;
	game: Game;
	playtype: Playtype;
}

export default function SpecificFolderPage({ reqUser, game, playtype }: Props) {
	const { folderID } = useParams<{ folderID: string }>();

	const { data, error } = useApiQuery<UGPTFolderReturns>(
		`/users/${reqUser.id}/games/${game}/${playtype}/folders/${folderID}`
	);

	const folderDataset = useMemo(() => {
		if (!data) {
			return null;
		}

		const songMap = CreateSongMap(data.songs);
		const pbMap = CreateChartIDMap(data.pbs);

		const folderDataset: FolderDataset = [];

		for (const chart of data.charts) {
			folderDataset.push({
				...chart,
				__related: {
					pb: pbMap.get(chart.chartID) ?? null,
					song: songMap.get(chart.songID)!,
					user: reqUser,
				},
			});
		}

		folderDataset.sort(StrSOV((x) => x.__related.song.title));

		return folderDataset;
	}, [data]);

	const folderInfoHeader = useMemo(() => {
		if (!folderDataset || !data) {
			return <Loading />;
		}

		return (
			<FolderInfoHeader
				folderDataset={folderDataset}
				folderTitle={data.folder.title}
				game={game}
				playtype={playtype}
				reqUser={reqUser}
			/>
		);
	}, [folderDataset]);

	const base = `${useUGPTBase({ reqUser, game, playtype })}/folders/${folderID}`;

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data || !folderDataset) {
		return <Loading />;
	}

	const gptImpl = GPT_CLIENT_IMPLEMENTATIONS[`${game}:${playtype}` as GPTString];

	return (
		<div className="row">
			<div className="col-12">{folderInfoHeader}</div>
			<div className="col-12">
				<Divider />
			</div>
			<div className="col-12 d-flex">
				<div className="btn-group d-flex w-100">
					<SelectLinkButton className="text-wrap" to={base}>
						<Icon type="table" /> Normal View
					</SelectLinkButton>
					{gptImpl.ratingSystems.length !== 0 &&
						// temp: tierlist view sucks for BMS and PMS
						game !== "bms" &&
						game !== "pms" && (
							<SelectLinkButton className="text-wrap" to={`${base}/tierlist`}>
								<Icon type="sort-alpha-up" /> Tierlist View
							</SelectLinkButton>
						)}
					<SelectLinkButton className="text-wrap" to={`${base}/timeline`}>
						<Icon type="stream" /> Timeline View
					</SelectLinkButton>
					<SelectLinkButton className="text-wrap" to={`${base}/compare`}>
						<Icon type="users" /> Compare Against User
					</SelectLinkButton>
					<SelectLinkButton className="text-wrap" to={`${base}/targets`}>
						<Icon type="scroll" /> Goals & Quests
					</SelectLinkButton>
				</div>
			</div>
			<div className="col-12">
				<Divider />
			</div>
			<div className="col-12">
				<Switch>
					<Route exact path={base}>
						<FolderTable dataset={folderDataset} game={game} playtype={playtype} />
					</Route>
					<Route exact path={`${base}/tierlist`}>
						<TierlistBreakdown
							game={game}
							playtype={playtype}
							reqUser={reqUser}
							folderDataset={folderDataset}
							data={data}
						/>
					</Route>
					<Route exact path={`${base}/timeline`}>
						<TimelineView
							game={game}
							playtype={playtype}
							reqUser={reqUser}
							folderID={folderID}
						/>
					</Route>
					<Route exact path={`${base}/compare`}>
						<FolderComparePage
							game={game}
							playtype={playtype}
							reqUser={reqUser}
							folder={data.folder}
						/>
					</Route>
					<Route exact path={`${base}/targets`}>
						<FolderQuestsPage
							game={game}
							playtype={playtype}
							reqUser={reqUser}
							folder={data.folder}
						/>
					</Route>
				</Switch>
			</div>
		</div>
	);
}

function TimelineView({ game, playtype, reqUser, folderID }: Props & { folderID: string }) {
	const gptConfig = GetGamePTConfig(game, playtype);
	const enumConfs = GetScoreEnumConfs(gptConfig);

	const [selectedEnum, setSelectedEnum] = useState<string>(gptConfig.preferredDefaultEnum);
	const [enumConf, setEnumConf] = useState<ConfEnumScoreMetric<string>>(enumConfs[selectedEnum]!);

	const [value, setValue] = useState<string>(enumConf.minimumRelevantValue);

	useEffect(() => {
		setValue(enumConfs[selectedEnum]!.minimumRelevantValue);
		setEnumConf(enumConfs[selectedEnum]!);
	}, [selectedEnum]);

	return (
		<>
			<Card header="Timeline View" cardBodyClassName="vstack gap-4">
				<h5 className="text-center">
					The timeline view shows the order in which you achieved something in a folder!
					You can choose the criteria up here.
				</h5>
				<div className="d-flex flex-column flex-lg-row gap-4">
					<Form.Select
						value={selectedEnum}
						onChange={(e) => setSelectedEnum(e.target.value)}
					>
						{Object.keys(enumConfs).map((e) => (
							<option key={e} value={e}>
								{UppercaseFirst(e)}
							</option>
						))}
					</Form.Select>
					<Form.Select value={value} onChange={(e) => setValue(e.target.value)}>
						{enumConf.values
							.slice(enumConf.values.indexOf(enumConf.minimumRelevantValue))
							.map((e) => (
								<option key={e}>{e}</option>
							))}
					</Form.Select>
				</div>
			</Card>
			<hr />
			<TimelineMain
				{...{ reqUser, game, playtype, folderID, enumMetric: selectedEnum, value }}
			/>
		</>
	);
}

function TimelineMain({
	reqUser,
	game,
	playtype,
	folderID,
	enumMetric: enumMetric,
	value,
}: Props & {
	folderID: string;
	enumMetric: string;
	value: string;
}) {
	const { data, error } = useApiQuery<{
		scores: ScoreDocument[];
		songs: SongDocument[];
		charts: ChartDocument[];
	}>(
		`/users/${
			reqUser.id
		}/games/${game}/${playtype}/folders/${folderID}/timeline?criteriaValue=${encodeURIComponent(
			value
		)}&criteriaType=${encodeURIComponent(enumMetric)}`
	);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const scoreDataset = [];

	const songMap = CreateSongMap(data.songs);
	const chartMap = CreateChartIDMap(data.charts);

	for (const score of data.scores) {
		scoreDataset.push({
			...score,
			__related: {
				song: songMap.get(score.songID)!,
				chart: chartMap.get(score.chartID)!,
			},
		});
	}

	scoreDataset.sort(NumericSOV((x) => x.timeAchieved ?? Infinity));

	const elements = [];

	let lastDay = 0;
	let index = 1;
	let hasHitNulls = false;

	for (const scoreData of scoreDataset) {
		if (scoreData.timeAchieved !== null) {
			// Insane hack to floor a date to the beginning of that
			// day.
			const dayNum = new Date(scoreData.timeAchieved).setHours(0, 0, 0, 0);

			if (!lastDay || lastDay !== dayNum) {
				lastDay = dayNum;
				elements.push(
					<TimelineDivider>{FormatDate(scoreData.timeAchieved)}</TimelineDivider>
				);
			}
		} else if (!hasHitNulls) {
			elements.push(<TimelineDivider>Unknown Time</TimelineDivider>);
			hasHitNulls = true;
		}

		elements.push(
			<TimelineElement index={index} scoreData={scoreData} key={scoreData.scoreID} />
		);
		index++;
	}

	return (
		<>
			<div className="text-center">
				<h1 className="display-4">Total Progress</h1>
				<h1 className="display-4">
					{data.scores.length}
					<span className="text-body-secondary" style={{ fontSize: "1.1rem" }}>
						/{data.charts.length}
					</span>
				</h1>
			</div>
			<Divider />
			<div className="timeline timeline-2">
				<div className="timeline-bar"></div>
				{elements}
			</div>
			<Divider />
			<div className="text-center">
				<h1 className="display-4">Total Progress</h1>
				<h1 className="display-4">
					{data.scores.length}
					<span className="text-body-secondary" style={{ fontSize: "1.1rem" }}>
						/{data.charts.length}
					</span>
				</h1>
			</div>
		</>
	);
}

function TimelineDivider({ children }: { children: string }) {
	return (
		<div className="w-100 text-center my-4">
			<h4>{children}</h4>
		</div>
	);
}

function TimelineElement({
	scoreData,
	index,
}: {
	index: integer;
	scoreData: ScoreDocument & {
		__related: {
			song: SongDocument;
			chart: ChartDocument;
		};
	};
}) {
	return (
		<div className="timeline-item">
			<span className="timeline-badge bg-primary"></span>
			<div className="timeline-content d-flex align-items-center justify-content-between overflow-x-auto overflow-x-md-visible">
				<span className="me-3 w-100" style={{ fontSize: "1.15rem" }}>
					<MiniTable>
						<tr>
							<td>
								<b>#{index}</b>
								{Date.now() - scoreData.timeAdded < ONE_DAY && (
									<span className="ms-2 label label-inline label-primary fw-bolder">
										NEW!
									</span>
								)}
							</td>
							<DifficultyCell
								alwaysShort
								game={scoreData.game}
								chart={scoreData.__related.chart}
							/>
							<TitleCell
								game={scoreData.game}
								chart={scoreData.__related.chart}
								song={scoreData.__related.song}
							/>
							<ScoreCoreCells
								game={scoreData.game}
								chart={scoreData.__related.chart}
								score={scoreData}
							/>
							<TimestampCell time={scoreData.timeAchieved} />
						</tr>
					</MiniTable>
				</span>
			</div>
		</div>
	);
}

// here be demons
// i don't remember how this code works
// and i was almost certainly drinking heavily when i wrote it
// so

type InfoProps = Props & {
	folderDataset: FolderDataset;
	data: UGPTFolderReturns;
};

function TierlistBreakdown({ game, folderDataset, playtype, reqUser }: InfoProps) {
	const gptImpl = GPT_CLIENT_IMPLEMENTATIONS[`${game}:${playtype}` as GPTString];

	const [tierlist, setTierlist] = useState<string>(gptImpl.ratingSystems[0].name);

	const playerStats = useMemo(
		() => FolderDatasetAchievedStatus(folderDataset, game, playtype, tierlist),
		[tierlist]
	);

	// @ts-expect-error i don't care to resolve this typeissue and i'm tired
	// of typescript
	const tierlistImpl = gptImpl.ratingSystems.find((rs) => rs.name === tierlist);

	if (!tierlistImpl) {
		return <>(E) no tierlist impl (howd you get here?)</>;
	}

	return (
		<Row>
			{gptImpl.ratingSystems.length > 1 && (
				<Col xs={12}>
					<div className="btn-group d-flex">
						{gptImpl.ratingSystems.map((e) => (
							<SelectButton
								className="btn-lg"
								id={e.name}
								setValue={setTierlist}
								value={tierlist}
							>
								{e.name}
								<br />
								{e.description}
							</SelectButton>
						))}
					</div>
				</Col>
			)}
			<Col xs={12}>
				<Divider />
			</Col>
			<Col xs={12}>
				<TierlistInfoLadder
					playerStats={playerStats}
					game={game}
					playtype={playtype}
					reqUser={reqUser}
					folderDataset={folderDataset}
					tierlistImpl={tierlistImpl}
				/>
			</Col>
		</Row>
	);
}

function TierlistInfoLadder({
	playerStats,
	game,
	playtype,
	reqUser,
	folderDataset,
	tierlistImpl,
}: {
	playerStats: Record<string, { status: AchievedStatuses; score: string | null }>;
	game: Game;
	playtype: Playtype;
	reqUser: UserDocument;
	tierlistImpl: GPTRatingSystem<GPTString>;
	folderDataset: FolderDataset;
}) {
	const buckets: TierlistInfo[][] = useMemo(() => {
		const buckets: TierlistInfo[][] = [];

		const allData: TierlistInfo[] = [];

		for (const d of folderDataset) {
			const { status, score } = playerStats[d.chartID] ?? AchievedStatuses.NOT_PLAYED;

			allData.push({
				status,
				score,
				chart: d,
				text: tierlistImpl.toString(d),
				value: tierlistImpl.toNumber(d),
				idvDiff: tierlistImpl.idvDifference(d),
			});
		}

		allData.sort(NumericSOV((x) => x.value ?? -Infinity, true));

		let bucket: TierlistInfo[] = [];
		const noTierlistInfoBucket: TierlistInfo[] = [];

		let lastNum: number | null = null;
		for (const d of allData) {
			if (typeof d.value !== "number") {
				noTierlistInfoBucket.push(d);
				continue;
			}

			if (lastNum !== d.value) {
				buckets.push(bucket);

				// go again
				bucket = [d];
			} else {
				bucket.push(d);
			}

			lastNum = d.value;
		}

		if (bucket.length > 0) {
			buckets.push(bucket);
		}

		if (noTierlistInfoBucket.length > 0) {
			buckets.push(noTierlistInfoBucket);
		}

		for (const bucket of buckets) {
			bucket.sort(StrSOV((s) => s.text ?? "NO DATA"));
		}

		return buckets;
	}, [playerStats]);

	if (buckets.length === 0) {
		return <Row className="justify-content-center">Got no tierlist data to show you!</Row>;
	}

	return (
		<>
			{buckets
				.filter((e) => e.length > 0)
				.map((bucket, i) => (
					<div className="mb-4" key={i}>
						<div className="fs-3 mb-4 text-center">
							{bucket[0].value} (
							{DistinctArr(bucket.map((e) => e.text ?? "No Tierlist Data")).join(
								", "
							)}
							)
						</div>

						<TierlistBucket {...{ bucket, game, playtype, reqUser }} />
					</div>
				))}
		</>
	);
}

function TierlistBucket({
	bucket,
	game,
	reqUser,
}: {
	game: Game;
	playtype: Playtype;
	reqUser: UserDocument;
	bucket: TierlistInfo[];
}) {
	const {
		breakpoint: { isLg },
	} = useContext(WindowContext);
	// xs view is tabular
	if (!isLg) {
		return (
			<MiniTable>
				{bucket.map((tierlistInfo, i) => (
					<TierlistInfoBucketValues
						tierlistInfo={tierlistInfo}
						key={`${tierlistInfo.chart.chartID}-${tierlistInfo.text}`}
						game={game}
						bucket={bucket}
						i={i}
						reqUser={reqUser}
					/>
				))}
			</MiniTable>
		);
	}

	return (
		<div className="grid text-center gap-2 grid-cols-md-4 grid-cols-lg-5 grid-cols-xl-6">
			{bucket.map((tierlistInfo, i) => (
				<TierlistInfoBucketValues
					tierlistInfo={tierlistInfo}
					key={`${tierlistInfo.chart.chartID}-${tierlistInfo.text}`}
					game={game}
					bucket={bucket}
					i={i}
					reqUser={reqUser}
				/>
			))}
		</div>
	);
}

function TierlistInfoBucketValues({
	tierlistInfo,
	game,
	reqUser,
}: {
	tierlistInfo: TierlistInfo;
	bucket: TierlistInfo[];
	game: Game;
	i: integer;
	reqUser: UserDocument;
}) {
	const { breakpoint } = useContext(WindowContext);

	const statusClasses: Record<AchievedStatuses, string> = {
		[AchievedStatuses.ACHIEVED]: "bg-success",
		[AchievedStatuses.FAILED]: "bg-danger",
		[AchievedStatuses.NOT_PLAYED]: "bg-body-tertiary",
		[AchievedStatuses.SCORE_BASED]: "bg-transparent",
	};

	const data = tierlistInfo.chart;

	// xs view
	if (!breakpoint.isLg) {
		return (
			<tr>
				<DifficultyCell game={game} chart={tierlistInfo.chart} alwaysShort noTierlist />
				<td className="text-start">
					<Link className="text-decoration-none" to={CreateChartLink(data, game)}>
						{tierlistInfo.chart.__related.song.title}
					</Link>{" "}
					<br />
					<div>
						{tierlistInfo.value} ({tierlistInfo.text ?? "No Info"})
						{tierlistInfo.idvDiff && (
							<span className="ms-1">
								<Icon type="balance-scale-left" />
							</span>
						)}
					</div>
				</td>
				<TierlistInfoCell tierlistInfo={tierlistInfo} />
			</tr>
		);
	}

	return (
		<QuickTooltip
			max
			tooltipContent={
				data.__related.pb ? (
					<MiniTable headers={[`${reqUser.username}'s Score`]} colSpan={99}>
						<tr>
							<ScoreCoreCells chart={data} game={game} score={data.__related.pb} />
						</tr>
					</MiniTable>
				) : undefined
			}
		>
			<div className={`${statusClasses[tierlistInfo.status]} bg-opacity-50 rounded p-2`}>
				<Link className="text-decoration-none" to={CreateChartLink(data, game)}>
					{data.__related.song.title}
				</Link>{" "}
				{FormatDifficultyShort(data, game)}
				<Divider className="my-2" />
				{tierlistInfo.value} ({tierlistInfo.text ?? "No Info"})
				{tierlistInfo.idvDiff && (
					<>
						<br />

						<div className="mt-1">
							<QuickTooltip tooltipContent="Individual Difference - The difficulty of this varies massively between people!">
								<span>
									<Icon type="balance-scale-left" />
								</span>
							</QuickTooltip>
						</div>
					</>
				)}
				<Muted>
					<Divider className="my-2" />
					<ReferToUser reqUser={reqUser} />{" "}
					{tierlistInfo.status === AchievedStatuses.NOT_PLAYED
						? "not played this chart."
						: tierlistInfo.score}
				</Muted>
			</div>
		</QuickTooltip>
	);
}

function TierlistInfoCell({ tierlistInfo }: { tierlistInfo: TierlistInfo }) {
	let colour;
	const text = tierlistInfo.score ?? "NOT PLAYED";

	if (tierlistInfo.status === AchievedStatuses.FAILED) {
		colour = COLOUR_SET.red;
	} else if (tierlistInfo.status === AchievedStatuses.NOT_PLAYED) {
		colour = COLOUR_SET.red;
	} else {
		colour = COLOUR_SET.green;
	}

	return (
		<td
			style={{
				backgroundColor: ChangeOpacity(colour, 0.2),
				width: "60px",
				minWidth: "60px",
				maxWidth: "60px",
			}}
		>
			{text}
		</td>
	);
}

interface TierlistInfo {
	chart: FolderDataset[0];
	score: string | null;
	status: AchievedStatuses;
	value: number | null | undefined;
	text: string | null | undefined;
	idvDiff: boolean | null | undefined;
}

enum AchievedStatuses {
	NOT_PLAYED,
	FAILED,
	ACHIEVED,
	SCORE_BASED,
}

function FolderDatasetAchievedStatus(
	folderDataset: FolderDataset,
	game: Game,
	playtype: Playtype,
	tierlist: string
) {
	const tierlistInfo: Record<string, { status: AchievedStatuses; score: string | null }> = {};

	// @ts-expect-error i'm sick of this language and i'm sick of type hacks
	const fn = GPT_CLIENT_IMPLEMENTATIONS[`${game}:${playtype}` as GPTString].ratingSystems.find(
		(e: GPTRatingSystem<GPTString>) => e.name === tierlist
	)?.achievementFn;

	for (const data of folderDataset) {
		let achieved: AchievedStatuses;
		let score: string | null = null;

		if (!data.__related.pb) {
			achieved = AchievedStatuses.NOT_PLAYED;
		} else if (fn) {
			const v = fn(data.__related.pb);

			achieved = v[1] ? AchievedStatuses.ACHIEVED : AchievedStatuses.FAILED;
			score = v[0];
		} else {
			achieved = AchievedStatuses.SCORE_BASED;
		}

		tierlistInfo[data.chartID] = {
			status: achieved,
			score,
		};
	}

	return tierlistInfo;
}
