import { ONE_DAY } from "util/constants/time";
import useApiQuery from "components/util/query/useApiQuery";
import { ColourConfig, TachiConfig } from "lib/config";
import React, { useEffect, useState } from "react";
import { Alert } from "react-bootstrap";
import { UserDocument, integer } from "tachi-common";
import { Link } from "react-router-dom";
import ExternalLink from "components/util/ExternalLink";
import Card from "components/layout/page/Card";
import Icon from "components/util/Icon";

export default function SupportBanner({ user }: { user: UserDocument }) {
	const { data, error } = useApiQuery<{ scores: integer; sessions: integer }>(
		`/users/${user.id}/stats`
	);

	const [show, setShow] = useState(localStorage.getItem("SHOW_SUPPORT_TACHI") === "true");

	useEffect(() => {
		localStorage.setItem("SHOW_SUPPORT_TACHI", `${show}`);
	}, [show]);

	// thank you
	if (user.isSupporter) {
		return (
			<div className="d-flex w-100 justify-content-center flex-column align-items-center">
				<div>❤️❤️❤️ Thank you for supporting {TachiConfig.name}. ❤️❤️❤️</div>
			</div>
		);
	}

	if (!data) {
		return <></>;
	}

	if (error) {
		return <></>;
	}

	if (data.scores < 1_000) {
		return <></>;
	}

	// too soon to bother
	if (Date.now() - user.joinDate < ONE_DAY * 7) {
		return <></>;
	}

	if (!show) {
		return (
			<div
				onClick={() => setShow(true)}
				className="d-flex w-100 justify-content-center flex-column align-items-center"
			>
				<div>Support us? ❤️</div>
				<div>
					<Icon type="chevron-down" />
				</div>
			</div>
		);
	}

	return (
		<Card
			className="mb-8"
			header={
				<span style={{ fontSize: "1.55rem" }}>
					You've set {data.scores} scores and had {data.sessions} sessions, wew!
				</span>
			}
			footer={
				<div onClick={() => setShow(false)} className="d-flex w-100 justify-content-center">
					<Icon type="chevron-up" />
				</div>
			}
		>
			<span style={{ fontSize: "1.15rem" }}>
				{TachiConfig.name} is a passion project, and is primarily developed by one person.
				<br />
				Since you're enjoying the site so much, maybe you'd want to support me? :3
				<br />
				<br />
				If you want to support development, you can donate to my{" "}
				<ExternalLink href="https://ko-fi.com/zkldi">Ko-Fi</ExternalLink>
				, if you indicate your account name in the donation, you'll get a shiny name on the
				site!
				<br />
				I'm working on some new projects in secret. Maybe I'll post some updates on there :P
				<br />
				<br />
				Alternatively, you can star or contribute to the fully-open-source{" "}
				<ExternalLink href="https://github.com/TNG-Dev/Tachi">GitHub Repo</ExternalLink>.
				This makes me look cool to employers!
			</span>
		</Card>
	);
}
