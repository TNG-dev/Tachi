import SelectNav from "components/util/SelectNav";
import React, { useRef, useEffect, useState } from "react";
import { Nav } from "react-bootstrap";
import { ChartDocument, PBScoreDocument, ScoreDocument, COLOUR_SET } from "tachi-common";

export function JubeatGraphsComponent({
	score,
	chart,
}: {
	score: ScoreDocument<"jubeat:Single"> | PBScoreDocument<"jubeat:Single">;
	chart: ChartDocument<"jubeat:Single">;
}) {
	const [graph, setGraph] = useState("DENSITY");

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;

		if (!score.scoreData.optional.musicBar) {
			return;
		}

		if (!canvas) {
			return;
		}

		const context = canvas.getContext("2d");

		if (!context) {
			return;
		}

		const size = 5;
		const space = 2;

		context.canvas.height = 60;
		context.canvas.width = 840;

		const colors = [];
		colors[0] = COLOUR_SET.white;
		colors[1] = COLOUR_SET.gray;
		colors[2] = COLOUR_SET.vibrantBlue;
		colors[3] = COLOUR_SET.gold;

		for (let i = 0; i < chart.data.musicBar.length; i++) {
			//X
			context.fillStyle = colors[score.scoreData.optional.musicBar[i]];
			for (let j = 0; j < chart.data.musicBar[i]; j++) {
				//Y
				context.beginPath();
				context.rect(
					space + i * size + i * space,
					context.canvas.height - size * 2 - j * size - j * space,
					size,
					size
				);
				context.fill();
			}
		}
	}, [score]);

	if (score.scoreData.optional.musicBar) {
		return (
			<>
				<div className="d-flex align-items-center justify-content-center">
					<canvas ref={canvasRef} />
				</div>
			</>
		);
	}

	return (
		<div
			className="d-flex align-items-center justify-content-center"
			style={{ height: "200px" }}
		>
			<span className="text-body-secondary">No gauge data :(</span>
		</div>
	);
}
