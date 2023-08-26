import Activity from "components/activity/Activity";
import useLUGPTSettings from "components/util/useLUGPTSettings";
import React from "react";
import { Link } from "react-router-dom";
import { UGPT } from "types/react";

export default function RivalsActivityPage({ reqUser, game, playtype }: UGPT) {
	const { settings } = useLUGPTSettings();

	if (!settings) {
		return <>You have no settings. How did you get here?</>;
	}

	if (settings.rivals.length === 0) {
		return (
			<div className="text-center">
				You have no rivals set.{" "}
				<Link to={`/u/${reqUser.id}/games/${game}/${playtype}/rivals/manage`}>
					Go set some!
				</Link>
			</div>
		);
	}

	return <Activity url={`/users/${reqUser.id}/games/${game}/${playtype}/rivals/activity`} />;
}
