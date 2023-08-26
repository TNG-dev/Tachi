import React from "react";
import { Link } from "react-router-dom";
import { GoalDocument } from "tachi-common";
import useLUGPTSettings from "./useLUGPTSettings";

export default function GoalLink({ goal, noPad }: { goal: GoalDocument; noPad?: boolean }) {
	const { settings } = useLUGPTSettings();

	const pad = noPad ? "" : "ms-2";

	switch (goal.charts.type) {
		case "multi":
			return <span className={pad}>{goal.name}</span>;
		case "single":
			return (
				<Link
					className={`text-decoration-none ${pad}`}
					to={`/games/${goal.game}/${goal.playtype}/charts/${goal.charts.data}`}
				>
					{goal.name}
				</Link>
			);

		case "folder":
			if (!settings) {
				return <span className={pad}>{goal.name}</span>;
			}
			return (
				<Link
					className={`text-decoration-none ${pad}`}
					to={`/u/${settings.userID}/games/${goal.game}/${goal.playtype}/folders/${goal.charts.data}`}
				>
					{goal.name}
				</Link>
			);
	}
}
