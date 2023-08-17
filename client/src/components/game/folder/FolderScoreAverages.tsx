import { NumericSOV } from "util/sorts";
import { ToFixedFloor, UppercaseFirst } from "util/misc";
import React, { useMemo } from "react";
import { GetGamePTConfig, integer } from "tachi-common";
import { ConfDecimalScoreMetric, ConfIntegerScoreMetric } from "tachi-common/types/metrics";
import { UGPT } from "types/react";
import { FolderDataset } from "types/tables";
import DebugContent from "components/util/DebugContent";
import MiniTable from "components/tables/components/MiniTable";
import Muted from "components/util/Muted";
import DifficultyCell from "components/tables/cells/DifficultyCell";
import TitleCell from "components/tables/cells/TitleCell";
import ScoreCoreCells from "components/tables/game-core-cells/ScoreCoreCells";
import SongChartInfoFormat from "../songs/SongInfoFormat";

export default function FolderScoreAverages({
	folderDataset,
	game,
	playtype,
	reqUser,
}: UGPT & { folderDataset: FolderDataset }) {
	const gptConfig = GetGamePTConfig(game, playtype);

	const metrics = {
		...gptConfig.providedMetrics,
		...gptConfig.derivedMetrics,
	};

	const entries = Object.entries(metrics);

	const relevantScoreMetrics = entries
		.filter(([k, v]) => {
			if (v.type !== "DECIMAL" && v.type !== "INTEGER") {
				return false;
			}

			const v2 = v as ConfIntegerScoreMetric | ConfDecimalScoreMetric;

			if (v2.chartDependentMax) {
				return false;
			}

			return true;
		})
		.map((e) => e[0]);

	const { unplayed, played, data } = useMemo(() => {
		const data: Record<string, any> = {};

		const played = folderDataset.filter((e) => e.__related.pb);

		const unplayed = folderDataset.length - played.length;

		for (const metric of relevantScoreMetrics) {
			const total = played.reduce(
				// @ts-expect-error accessing property unchecked oh nooo
				(acc, e) => acc + e.__related.pb?.scoreData[metric] ?? 0,
				0
			);

			const sorted = played.sort(
				// @ts-expect-error accessing property unchecked oh nooo
				NumericSOV((k) => k.__related.pb?.scoreData[metric] ?? -Infinity)
			);

			const worst = sorted[0];
			const best = sorted[sorted.length - 1];

			let avgAll = total / folderDataset.length;
			let avgPlayed = total / played.length;

			if (metrics[metric].type === "INTEGER") {
				avgAll = Math.floor(avgAll);
				avgPlayed = Math.floor(avgPlayed);
			}

			data[metric] = {
				avgAll,
				avgPlayed,
				worst,
				best,
			};
		}

		return {
			played,
			unplayed,
			data,
		};
	}, [folderDataset, relevantScoreMetrics]);

	if (relevantScoreMetrics.length === 0) {
		return <div>This game has nothing to show you!</div>;
	}

	if (played.length === 0) {
		return <div>You haven't played anything in this folder!</div>;
	}

	const playRate = (100 * played.length) / folderDataset.length;

	return (
		<div className="overflow-auto">
			<MiniTable headers={["Score Stats"]} colSpan={100}>
				<tr>
					<td>Played</td>
					<td
						colSpan={6}
						className={`text-${
							playRate === 100 ? "success" : playRate > 50 ? "warning" : "danger"
						}`}
					>
						{ToFixedFloor(playRate, 2)}%
						{unplayed > 0 && (
							<>
								<br />
								<Muted>
									({played.length} played, {unplayed} unplayed)
								</Muted>
							</>
						)}
					</td>
				</tr>
				{Object.entries(data).map(([k, v]) => (
					<>
						<tr>
							<td>{UppercaseFirst(k)} Average (Played Charts)</td>
							{/* @ts-expect-error this won't fail */}
							<td colSpan={6}>{metrics[k].formatter(v.avgPlayed)}</td>
						</tr>
						<tr>
							<td>{UppercaseFirst(k)} Average (All Charts)</td>
							{/* @ts-expect-error this won't fail */}
							<td colSpan={6}>{metrics[k].formatter(v.avgAll)}</td>
						</tr>
						<tr>
							<td>Best {UppercaseFirst(k)}</td>
							<DifficultyCell alwaysShort chart={v.best} game={game} />
							<TitleCell
								game={game}
								song={v.best.__related.song}
								chart={v.best}
								comment={v.best.__related.pb.comment}
							/>
							<ScoreCoreCells
								game={game}
								score={v.best.__related.pb}
								short
								chart={v.best}
							/>
						</tr>
						<tr>
							<td>Worst {UppercaseFirst(k)}</td>
							<DifficultyCell alwaysShort chart={v.worst} game={game} />
							<TitleCell
								game={game}
								song={v.worst.__related.song}
								chart={v.worst}
								comment={v.worst.__related.pb.comment}
							/>
							<ScoreCoreCells
								game={game}
								score={v.worst.__related.pb}
								short
								chart={v.worst}
							/>
						</tr>
					</>
				))}
			</MiniTable>
		</div>
	);
}
