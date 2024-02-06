import { APIFetchV1 } from "util/api";
import { ChangeOpacity } from "util/color-opacity";
import { CreateChartMap, CreateScoreIDMap, CreateSongMap } from "util/data";
import { Reverse, UppercaseFirst } from "util/misc";
import DifficultyCell from "components/tables/cells/DifficultyCell";
import TitleCell from "components/tables/cells/TitleCell";
import MiniTable from "components/tables/components/MiniTable";
import { CommentModal, ModifyScore } from "components/tables/dropdowns/components/ScoreEditButtons";
import ScoreCoreCells from "components/tables/game-core-cells/ScoreCoreCells";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import Loading from "components/util/Loading";
import SelectButton from "components/util/SelectButton";
import { UserContext } from "context/UserContext";
import deepmerge from "deepmerge";
import { GPT_CLIENT_IMPLEMENTATIONS } from "lib/game-implementations";
import { GPTClientImplementation } from "lib/types";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import {
	ChartDocument,
	GPTString,
	Game,
	GamePTConfig,
	GetGPTString,
	GetGamePTConfig,
	GetScoreMetricConf,
	GetScoreMetrics,
	ScoreDocument,
	SessionScoreInfo,
	SongDocument,
	TableDocument,
	integer,
} from "tachi-common";
import { ConfEnumScoreMetric } from "tachi-common/types/metrics";
import { SessionReturns } from "types/api-returns";
import { cloneDeep } from "lodash";

type SetScores = (scores: ScoreDocument[]) => void;

export default function SessionRaiseBreakdown({
	sessionData,
	setScores,
	noHeader,
}: {
	sessionData: SessionReturns;
	setScores?: SetScores;
	noHeader?: boolean;
}) {
	const game = sessionData.session.game;
	const playtype = sessionData.session.playtype;

	const { user } = useContext(UserContext);

	const { data, error } = useQuery(`/games/${game}/${playtype}/tables`, async () => {
		const res = await APIFetchV1<TableDocument[]>(`/games/${game}/${playtype}/tables`);

		if (!res.success) {
			throw new Error(res.description);
		}

		return res.body;
	});

	// null -> view all in small format
	// string -> view this specific metric.
	const [view, setView] = useState<string | null>(null);

	if (error) {
		return <>{(error as Error).message}</>;
	}

	if (!data) {
		return <Loading />;
	}

	return (
		<>
			{!noHeader && (
				<div className="col-12">
					<div className="row">
						<div className="col-12 col-lg-6 offset-lg-3">
							<div className="d-none d-lg-flex justify-content-center">
								<div className="btn-group">
									<SelectButton value={view} setValue={setView} id="lamp">
										<Icon type="lightbulb" /> Lamps Only
									</SelectButton>

									<SelectButton value={view} setValue={setView} id={null}>
										<Icon type="bolt" /> All
									</SelectButton>

									<SelectButton value={view} setValue={setView} id="grade">
										<Icon type="sort-alpha-up" /> Grades Only
									</SelectButton>
								</div>
							</div>
						</div>
					</div>

					<Divider className="mt-4 mb-4" />

					{user?.id === sessionData.user.id && (
						<div className="d-lg-block d-none mb-4">
							Tip: You can click on scores to highlight/add comments!
						</div>
					)}
				</div>
			)}
			<SessionScoreStatBreakdown {...{ sessionData, view, setScores }} />
		</>
	);
}

function SessionScoreStatBreakdown({
	sessionData,
	view,
	setScores,
}: {
	sessionData: SessionReturns;
	setScores?: SetScores;
	view: string | null;
}) {
	const songMap = CreateSongMap(sessionData.songs);
	const chartMap = CreateChartMap(sessionData.charts);
	const scoreMap = CreateScoreIDMap(sessionData.scores);
	const gptConfig = GetGamePTConfig(sessionData.session.game, sessionData.session.playtype);

	const enumMetrics = GetScoreMetrics(gptConfig, "ENUM");

	const newEnums = useMemo(() => {
		const newEnums: Record<
			string,
			Record<string, { score: ScoreDocument; scoreInfo: SessionScoreInfo }[]>
		> = {};

		for (const metric of enumMetrics) {
			newEnums[metric] = {};

			for (const scoreInfo of sessionData.scoreInfo) {
				const score = scoreMap.get(scoreInfo.scoreID);

				if (!score) {
					console.error(
						`Session score info contains scoreID ${scoreInfo.scoreID}, but no score exists?`
					);
					continue;
				}

				if (scoreInfo.isNewScore || scoreInfo.deltas[metric] > 0) {
					// @ts-expect-error yeah this is fine pls
					const enumValue = score.scoreData[metric] as string;
					// @ts-expect-error yeah this is fine pls
					const enumIndex = score.scoreData.enumIndexes[metric] as integer;

					if (newEnums[metric][enumValue]) {
						const alreadyInArray = newEnums[metric][enumValue].find(
							(e) => e.score.scoreID === score.scoreID
						);

						if (
							alreadyInArray &&
							// @ts-expect-error not justifying this
							alreadyInArray.score.scoreData.enumIndexes[enumValue] < enumIndex
						) {
							alreadyInArray.score = score;
							alreadyInArray.scoreInfo = scoreInfo;
						} else {
							newEnums[metric][enumValue].push({
								score,
								scoreInfo,
							});
						}
					} else {
						newEnums[metric][enumValue] = [
							{
								score,
								scoreInfo,
							},
						];
					}
				}
			}
		}

		return newEnums;
	}, [view]);

	const gptImpl =
		GPT_CLIENT_IMPLEMENTATIONS[
			GetGPTString(sessionData.session.game, sessionData.session.playtype)
		];

	return (
		<>
			{view === null ? (
				<div
					className="session-raise-container"
					style={{
						gap: "20px",
					}}
				>
					{enumMetrics.map((metric) => (
						<div style={{ flex: 1 }}>
							<MiniTable
								headers={[
									`${UppercaseFirst(metric)}s`,
									`New ${UppercaseFirst(metric)}s`,
								]}
								colSpan={[1, 100]}
							>
								<ElementStatTable
									scores={sessionData.scores}
									setScores={setScores}
									chartMap={chartMap}
									songMap={songMap}
									counts={newEnums[metric]!}
									game={sessionData.session.game}
									metric={metric}
									gptConfig={gptConfig}
									gptImpl={gptImpl}
								/>
							</MiniTable>
						</div>
					))}
				</div>
			) : (
				<div className="col-12">
					<MiniTable
						headers={[`${UppercaseFirst(view)}s`, `New ${UppercaseFirst(view)}s`]}
						colSpan={[1, 100]}
					>
						<ElementStatTable
							scores={sessionData.scores}
							setScores={setScores}
							fullSize
							chartMap={chartMap}
							songMap={songMap}
							counts={newEnums[view]!}
							game={sessionData.session.game}
							gptConfig={gptConfig}
							gptImpl={gptImpl}
							metric={view}
						/>
					</MiniTable>
				</div>
			)}
		</>
	);
}

function ElementStatTable({
	metric: metric,
	counts,
	gptConfig,
	songMap,
	chartMap,
	game,
	fullSize = false,
	scores,
	setScores,
	gptImpl,
}: {
	metric: string;
	setScores?: SetScores;
	scores: ScoreDocument[];
	counts: Record<string, { score: ScoreDocument; scoreInfo: SessionScoreInfo }[]>;
	gptConfig: GamePTConfig;
	gptImpl: GPTClientImplementation<any>;
	songMap: Map<integer, SongDocument<Game>>;
	chartMap: Map<string, ChartDocument<GPTString>>;
	game: Game;
	fullSize?: boolean;
}) {
	const tableContents = useMemo(() => {
		const conf = GetScoreMetricConf(gptConfig, metric) as ConfEnumScoreMetric<string>;

		// relements.. haha
		const relevantElements = conf.values.slice(conf.values.indexOf(conf.minimumRelevantValue));

		const colours = gptImpl.enumColours[metric];

		const tableContents = [];
		for (const element of Reverse(relevantElements)) {
			if (!counts[element] || !counts[element].length) {
				continue;
			}

			const firstData = counts[element][0];

			tableContents.push(
				<tr key={element} className="breakdown-hover-row">
					<td
						style={{
							backgroundColor: ChangeOpacity(colours[element], 0.1),
						}}
						rowSpan={counts[element]!.length}
					>
						{element}
					</td>
					<BreakdownChartContents
						{...firstData}
						{...{
							chartMap,
							songMap,
							fullSize,
							game,
							gptConfig,
							metric: metric,
							scores,
							setScores,
						}}
					/>
				</tr>
			);

			for (const data of counts[element]!.slice(1)) {
				tableContents.push(
					<tr key={data.score.scoreID} className="breakdown-hover-row">
						<BreakdownChartContents
							{...data}
							{...{
								chartMap,
								songMap,
								fullSize,
								game,
								gptConfig,
								metric: metric,
								scores,
								setScores,
							}}
						/>
					</tr>
				);
			}
		}

		return tableContents;
	}, [metric, counts, fullSize, game, scores]);

	if (tableContents.length === 0) {
		return (
			<tr>
				<td colSpan={3}>No Raises...</td>
			</tr>
		);
	}

	return <>{tableContents}</>;
}

function BreakdownChartContents({
	score,
	scoreInfo,
	game,
	songMap,
	chartMap,
	fullSize,
	gptConfig,
	metric,
	scores,
	setScores,
}: {
	score: ScoreDocument;
	scoreInfo: SessionScoreInfo;
	fullSize: boolean;
	game: Game;
	songMap: Map<integer, SongDocument>;
	chartMap: Map<string, ChartDocument>;
	gptConfig: GamePTConfig;
	metric: string;
	scores: Array<ScoreDocument>;
	setScores?: SetScores;
}) {
	const modifyScore = useMemo(
		() =>
			(
				{ highlight, comment }: { highlight?: boolean; comment?: string | null },
				scores: ScoreDocument[],
				setScores: SetScores
			) => {
				console.log(scores.filter((e) => e.highlight).length);

				const scoreID = score.scoreID;

				ModifyScore(scoreID, { highlight, comment }).then((r) => {
					if (r) {
						const filtered = scores.filter((e) => e.scoreID !== scoreID);
						const newScore = { ...score };

						if (highlight !== undefined) {
							newScore.highlight = highlight;
						}
						if (comment !== undefined) {
							newScore.comment = comment;
						}

						setScores([...filtered, newScore]);
					}
				});
			},
		[score, scores, setScores]
	);

	const chart = chartMap.get(score.chartID)!;
	const song = songMap.get(score.songID)!;

	const { user } = useContext(UserContext);

	const [highlight, setHighlight] = useState(score.highlight);
	const [comment, setComment] = useState(score.comment);
	const [firstRun, setFirstRun] = useState(true);

	useEffect(() => {
		if (firstRun) {
			setFirstRun(false);
			return;
		}

		if (!setScores) {
			return;
		}

		modifyScore({ highlight, comment }, scores, setScores);
	}, [highlight, comment]);

	if (!chart || !song) {
		console.error(`No chart for ${score.chartID}/${score.songID}???`);
		return null;
	}

	if (fullSize) {
		let preScoreCell = <td colSpan={3}>No Play</td>;

		if (!scoreInfo.isNewScore) {
			const newScoreData = cloneDeep(score.scoreData);

			for (const [k, d] of Object.entries(scoreInfo.deltas)) {
				// @ts-expect-error it'll be an enum
				if (typeof score.scoreData[k] === "string") {
					const enumConf = GetScoreMetricConf(
						gptConfig,
						k
					) as ConfEnumScoreMetric<string>;

					// @ts-expect-error alter the enum
					const newIndex = score.scoreData.enumIndexes[k] - d;

					// @ts-expect-error alter the enum
					newScoreData.enumIndexes[k] = newIndex;
					// @ts-expect-error alter the enum
					newScoreData[k] = enumConf.values[newIndex] ?? "UNKNOWN ENUM ??";
				} else {
					// @ts-expect-error ugh
					newScoreData[k] = score.scoreData[k] - d;
				}
			}

			const mockScore = deepmerge(score, {
				scoreData: newScoreData,
			}) as ScoreDocument;

			// We don't actually know what the user's previous score was, we can only walk
			// back the raise information we have. As such, we don't keep track of
			// judgements, and must nix them here.
			mockScore.scoreData.judgements = {};

			preScoreCell = <ScoreCoreCells short chart={chart} game={game} score={mockScore} />;
		}

		if (score) {
			return (
				<>
					<TitleCell chart={chart} game={game} song={song} />
					<DifficultyCell alwaysShort chart={chart} game={game} />
					{preScoreCell}
					<td>⟶</td>
					<ScoreCoreCells short chart={chart} game={game} score={score} />
				</>
			);
		}
	}

	return (
		<>
			<TitleCell noArtist chart={chart} game={game} song={song} comment={comment} />
			<CommentHighlightManager
				highlight={highlight}
				setHighlight={setHighlight}
				comment={comment}
				setComment={setComment}
				// is the user looking at this session
				// and scores are settable
				isEditable={score.userID === user?.id && !!setScores}
			/>
			<DifficultyCell alwaysShort chart={chart} game={game} />
		</>
	);
}

/**
 * It manages the comment and highlight stuff.
 *
 * I don't know what else to call this function.
 */
function CommentHighlightManager({
	highlight,
	setHighlight,
	comment,
	setComment,
	isEditable,
}: {
	highlight: boolean;
	setHighlight: (hl: boolean) => void;
	comment: string | null;
	setComment: (cm: string | null) => void;
	isEditable: boolean;
}) {
	const [showCommentModal, setShowCommentModal] = useState(false);

	return (
		<td style={{ verticalAlign: "center" }}>
			<CommentModal
				show={showCommentModal}
				setShow={setShowCommentModal}
				initialComment={comment}
				onUpdate={(comment) => {
					setComment(comment);
					setShowCommentModal(false);
				}}
			/>
			{isEditable && (
				<span className="breakdown-hover-highlight-button">
					<Icon
						onClick={() => setShowCommentModal(true)}
						type="comment"
						regular
						style={{ paddingTop: "0.1rem", paddingRight: "0.33rem" }}
					/>
				</span>
			)}

			{isEditable ? (
				// editable, highlighted
				highlight ? (
					<Icon
						onClick={() => setHighlight(false)}
						colour="warning"
						type="star"
						style={{ paddingTop: "0.1rem", paddingRight: "0.33rem" }}
					/>
				) : (
					// editable, not highlighted
					<span className="breakdown-hover-highlight-button">
						<Icon
							onClick={() => setHighlight(true)}
							type="star"
							regular
							style={{ paddingTop: "0.1rem" }}
						/>
					</span>
				)
			) : (
				// non-editable, highlighted
				highlight && (
					<Icon
						colour="warning"
						type="star"
						style={{ paddingTop: "0.1rem", paddingRight: "0.33rem" }}
					/>
				)
			)}
		</td>
	);
}
