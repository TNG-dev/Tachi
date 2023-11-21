import { IsScore } from "util/asserts";
import IIDXLampChart from "components/charts/IIDXLampChart";
import SelectNav from "components/util/SelectNav";
import React, { useEffect, useState } from "react";
import { Nav } from "react-bootstrap";
import { ChartDocument, PBScoreDocument, ScoreDocument } from "tachi-common";

type LampTypes = "Normal" | "Easy" | "Hard" | "EXHard";

export function BMSGraphsComponent({
	score,
}: {
	score: ScoreDocument<"bms:7K" | "bms:14K"> | PBScoreDocument<"bms:7K" | "bms:14K">;
	chart: ChartDocument<"bms:7K" | "bms:14K">;
}) {
	const gaugeHistory = score.scoreData.optional.gaugeHistory;

	const [lamp, setLamp] = useState<LampTypes>(LampToKey(score));

	const shouldDisable = (r: LampTypes) => {
		if (gaugeHistory) {
			return r !== LampToKey(score);
		}

		return true;
	};

	useEffect(() => {
		setLamp(LampToKey(score));
	}, [score]);

	return (
		<>
			<div className="col-12 d-flex justify-content-center">
				<Nav variant="pills">
					<SelectNav
						id="Easy"
						value={lamp}
						setValue={setLamp}
						disabled={shouldDisable("Easy")}
					>
						Easy
					</SelectNav>
					<SelectNav
						id="Normal"
						value={lamp}
						setValue={setLamp}
						disabled={shouldDisable("Normal")}
					>
						Groove
					</SelectNav>
					<SelectNav
						id="Hard"
						value={lamp}
						setValue={setLamp}
						disabled={shouldDisable("Hard")}
					>
						Hard
					</SelectNav>
					<SelectNav
						id="EXHard"
						value={lamp}
						setValue={setLamp}
						disabled={shouldDisable("EXHard")}
					>
						Ex Hard
					</SelectNav>
				</Nav>
			</div>
			<div className="col-12">
				{gaugeHistory ? (
					<GraphComponent type={lamp} values={gaugeHistory} />
				) : (
					<div
						className="d-flex align-items-center justify-content-center"
						style={{ height: "200px" }}
					>
						<span className="text-body-secondary">No gauge data :(</span>
					</div>
				)}
			</div>
		</>
	);
}

function GraphComponent({ type, values }: { type: LampTypes; values: (number | null)[] }) {
	return (
		<IIDXLampChart
			height="200px"
			mobileHeight="175px"
			type={type}
			usePercentXAxis
			data={[
				{
					id: type,
					// x is from 0 -> 1_000; the percentXAxis function divides by 100
					// so we want this to be out of 10_000.
					data: values.map((e, i) => ({ x: i * 10, y: e ?? 0 })),
				},
			]}
		/>
	);
}

function LampToKey(
	score: ScoreDocument<"bms:7K" | "bms:14K"> | PBScoreDocument<"bms:7K" | "bms:14K">
): LampTypes {
	const lamp = score.scoreData.lamp;

	if (IsScore(score) && score.scoreMeta.gauge) {
		switch (score.scoreMeta.gauge) {
			case "EASY":
				return "Easy";
			case "NORMAL":
				return "Normal";
			case "HARD":
				return "Hard";
			case "EX-HARD":
				return "EXHard";
		}
	}

	if (lamp === "CLEAR") {
		return "Normal";
	} else if (lamp === "EASY CLEAR") {
		return "Easy";
	} else if (lamp === "HARD CLEAR") {
		return "Hard";
	} else if (lamp === "EX HARD CLEAR") {
		return "EXHard";
	} else if (lamp === "FULL COMBO") {
		// @hack - attempt to guess what gauge they used?
		if ((score.scoreData.optional.gaugeHistory?.[0] ?? 0) > 22) {
			return "EXHard";
		}
		return "Normal";
	} else if (lamp === "NO PLAY") {
		// dan gauge looks like this
		return "Hard";
	}

	return "Normal";
}
