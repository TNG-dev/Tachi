import useSetSubheader from "components/layout/header/useSetSubheader";
import ExternalLink from "components/util/ExternalLink";
import { TachiConfig } from "lib/config";
import React from "react";
import { Link } from "react-router-dom";

export default function SupportMePage() {
	useSetSubheader("Support / Patreon");

	return (
		<div style={{ fontSize: "1.15rem" }}>
			<p>
				{TachiConfig.name} is a passion project, and developed by{" "}
				<Link to="/credits">people like you</Link>.
			</p>
			<p>
				If you want to support {TachiConfig.name} development, you can donate to my{" "}
				<ExternalLink href="https://ko-fi.com/zkldi">Ko-Fi</ExternalLink>.
			</p>
			<p>
				Alternatively, you can star the{" "}
				<ExternalLink href="https://github.com/TNG-Dev/Tachi">GitHub Repo</ExternalLink>.
				This makes me look cool to employers!
			</p>
		</div>
	);
}
