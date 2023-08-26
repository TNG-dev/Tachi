import { ToServerURL } from "util/api";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Divider from "components/util/Divider";
import ExternalLink from "components/util/ExternalLink";
import Muted from "components/util/Muted";
import { TachiConfig } from "lib/config";
import React from "react";
import { Alert } from "react-bootstrap";

export default function USCIRPage() {
	useSetSubheader(["Import Scores", "USC IR"]);

	return (
		<div>
			<h2 className="text-center mb-4">USC IR Setup Instructions</h2>
			<ol className="instructions-list">
				<li>Open USC.</li>
				<li>Open Settings, and go to Online.</li>
				<Divider />
				<h3>
					<b>If you play on an Arcade Size Controller</b>
				</h3>
				<li>
					Fill out IR Base URL with <code>{ToServerURL("/ir/usc/Controller")}</code>.
				</li>
				<h3 className="mt-4">
					<b>If you play on Keyboard or Pocket Voltex</b>
				</h3>
				<li>
					Fill out IR Base URL with <code>{ToServerURL("/ir/usc/Keyboard")}</code>.
				</li>
				<Alert variant="danger" className="mt-4">
					You <b>MUST</b> select the right IR! These leaderboards are separated because it
					is unfair to compare the two input devices.
					<br />
					<b>DELIBERATELY SELECTING THE WRONG IR WILL RESULT IN A PERMANENT BAN!</b>
				</Alert>
				<Divider />
				<li>
					Grab an API Token from{" "}
					<ExternalLink href="/client-file-flow/CXUSCIR">here</ExternalLink>, and place it
					in the API Token field.
				</li>
				<li>That's it! Your scores will now automatically upload to the server.</li>
			</ol>
			<Divider />
			<Muted>
				Note: If you submit a score on a chart that {TachiConfig.name} doesn't recognise,
				you'll need to wait until atleast 2 other players submit scores for that chart
				before it'll show up. This is to combat accidental IR spam.
			</Muted>
		</div>
	);
}
