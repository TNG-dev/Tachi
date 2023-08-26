import TISInfo from "components/imports/TISInfo";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Divider from "components/util/Divider";
import Muted from "components/util/Muted";
import { TachiConfig } from "lib/config";
import React from "react";
import Alert from "react-bootstrap/Alert";
import { Link } from "react-router-dom";

export default function USCDBPage() {
	useSetSubheader(["Import Scores", "USC Database File"]);
	return (
		<>
			<TISInfo name="USC Database" />
			<Divider />
			<Alert variant="info">
				This method is intended for syncing up with existing scores. For new scores, you
				should set up the <Link to="/import/usc-ir">USC IR</Link>, for automatic score
				uploading.
			</Alert>
			<Muted>
				Note: If you submit a score on a chart that {TachiConfig.name} doesn't recognise,
				you'll need to wait until atleast 2 other players submit scores for that chart
				before it'll show up. This is to combat accidental IR spam.
			</Muted>
		</>
	);
}
