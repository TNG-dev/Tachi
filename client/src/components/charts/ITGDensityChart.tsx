import { TACHI_LINE_THEME } from "util/constants/chart-theme";
import { ResponsiveLine, Serie } from "@nivo/line";
import React, { useContext } from "react";
import { COLOUR_SET } from "tachi-common";
import { WindowContext } from "context/WindowContext";
import ChartTooltip from "./ChartTooltip";

export default function ITGDensityChart({
	width = "100%",
	height = "100%",
	mobileHeight = "100%",
	mobileWidth = width,
	data,
}: {
	mobileHeight?: number | string;
	mobileWidth?: number | string;
	width?: number | string;
	height?: number | string;
	data: Serie[];
} & ResponsiveLine["props"]) {
	const {
		breakpoint: { isMd },
	} = useContext(WindowContext);
	return (
		<div style={{ height: isMd ? height : mobileHeight, width: isMd ? width : mobileWidth }}>
			<ResponsiveLine
				data={data}
				margin={{ top: 30, bottom: 50, left: 90, right: 50 }}
				xScale={{ type: "linear" }}
				motionConfig="stiff"
				crosshairType="x"
				yScale={{ type: "linear" }}
				axisLeft={{ format: (y) => `${npsToBPM(y)}BPM` }}
				enablePoints={false}
				useMesh={true}
				enableGridX={false}
				colors={COLOUR_SET.purple}
				theme={TACHI_LINE_THEME}
				curve="stepAfter"
				tooltip={(d) => (
					<ChartTooltip>
						Measure {d.point.data.xFormatted}:{" "}
						{npsToBPM(Number(d.point.data.yFormatted)).toFixed()}
						BPM
					</ChartTooltip>
				)}
				legends={[]}
				enableArea
			/>
		</div>
	);
}

// Always assume 4/4 time. I know it sucks, but stepmania does the same.
function npsToBPM(nps: number) {
	return (nps * 60) / 4;
}

function bpmToNPS(bpm: number) {
	return (bpm * 4) / 60;
}
