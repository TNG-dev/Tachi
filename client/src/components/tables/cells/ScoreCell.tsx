import { ChangeOpacity } from "util/color-opacity";
import { ToFixedFloor } from "util/misc";
import React from "react";
import { integer } from "tachi-common";

export default function ScoreCell({
	score,
	colour,
	grade,
	percent,
	scoreRenderFn,
}: {
	score?: integer;
	percent: number;
	grade: string;
	colour: string;
	showScore?: boolean;
	scoreRenderFn?: (s: number) => string;
}) {
	return (
		<td
			style={{
				backgroundColor: ChangeOpacity(colour, 0.2),
			}}
		>
			<strong>{grade}</strong>
			<br />
			{`${ToFixedFloor(percent, 2)}%`},
			{score !== undefined && (
				<>
					<br />
					<small className="text-muted">
						[{scoreRenderFn ? scoreRenderFn(score) : score}]
					</small>
				</>
			)}
		</td>
	);
}
