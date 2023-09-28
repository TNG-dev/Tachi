import { Contributors } from "util/constants/contributors";
import { RFA } from "util/misc";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Divider from "components/util/Divider";
import ExternalLink from "components/util/ExternalLink";
import { UserContext } from "context/UserContext";
import { TachiConfig } from "lib/config";
import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";

export default function CreditsPage() {
	useSetSubheader("Credits");

	const [alt, setAlt] = useState(false);
	const [whatTheHell, setWhatTheHell] = useState(0);

	const { user } = useContext(UserContext);

	function a(normal: JSX.Element | string, ...altStr: (JSX.Element | string)[]) {
		if (!alt) {
			return normal;
		} else if (whatTheHell < 0) {
			return normal;
		}

		return RFA(altStr);
	}

	return (
		<div style={{ fontSize: "1.15rem" }}>
			<p>
				{a(
					<>
						{TachiConfig.name} has been the work of many people, and many more
						contributors. None of this would be possible without these people.
					</>,
					"Funding for this program was made possible by by by by by-",
					`${TachiConfig.name} actually just appeared here one day, and we're not sure how.`,
					`Actually, we just ran npm install ${TachiConfig.name}.`,
					"To be honest, we had a surplus of monkeys and typewriters."
				)}
			</p>
			<Divider />
			<p>
				If you want to support {TachiConfig.name} development, see{" "}
				<Link to="/support">Support</Link>.
			</p>
			<Divider />

			<div className="mt-4">
				<h1 className="user-select-none">
					De
					<span
						className="credits-easter-egg"
						onClick={() => {
							if (alt) {
								// Force a different RFA
								// by incrementing a random
								// variable
								setWhatTheHell(whatTheHell + 1);
							} else {
								setAlt(true);
							}
						}}
					>
						v
					</span>{" "}
					Team
				</h1>

				<ul>
					<li>
						{a(
							"Lead Dev",
							"Rules Of Hooks Violator",
							"PNPM Evangelist",
							"ABBA Enthusiast",
							"Nutcase",
							"IIDX 'player'"
						)}
						: <strong>zkldi</strong>
					</li>
					<li>
						{a(
							"Infrastructure & Dev/Ops",
							"Professional YAML Editor",
							"Professional nginx.conf Editor",
							"'What do you mean you rm -rf'd that folder?'",
							"WintOr",
							"Frog Lover"
						)}
						: <strong>winter</strong>
						<br />
						<small>Also the reason I even started learning how to program.</small>
					</li>
					<li>
						{a(
							"Graphic Design",
							"Adobe Suite Purchaser",
							"Squiggly Line Drawer",
							"Straight Line Drawer",
							"Ratboy Genius",
							"Large Headded Individual",
							"The Ace Of Craigs"
						)}
						: <strong>Craig</strong>
					</li>
					<li>
						{a(
							"Dev, Maths Consultation",
							"Functional Programming Evangelist",
							"Born On The Cob",
							"Crunchy Nut Enjoyer",
							"Has An Afro"
						)}
						: <strong>Percyqaz</strong>
					</li>
					<li>
						{a(
							"Tachi Discord Bot Work",
							"oooOoooo you want to use redux oooo",
							"Java Skirt Boy",
							"Urbit Enjoyer"
						)}
						: <strong>pfych</strong>
					</li>
				</ul>
			</div>
			<div className="mt-6">
				<h1>Significant Contributors</h1>

				<p>
					These people have contributed a significant sub-project to {TachiConfig.name}.
				</p>

				<ul>
					<li>
						{a("Fervidex", "IIDX Black Magic")}: <strong>aixxe</strong>
					</li>
					<li>
						{a("Barbatos", "SDVX Black Magic")}: <strong>Arm1stice</strong>
					</li>
					<li>
						{a(
							"Database Management, Various features, generally just a hell of a lot of work",
							"This guy put emojis in my codebase",
							"Emacs Evangelist"
						)}
						: <strong>cg505</strong>
					</li>
					<li>
						{a("KsHook", "Konaste Black Magic")}: <strong>Emma</strong>
					</li>
					<li>
						{a("APIs, Databasing", "All Black Magic")}: <strong>Felix</strong>
					</li>
					<li>
						{a("APIs, Massive Dev Support", "Have you tried Elixir?")}:{" "}
						<strong>haste</strong>
					</li>
					<li>
						{a("Chunitachi", "CHUNITHM Black Magic")}: <strong>tomatosoup</strong>
					</li>
					<li>
						{a("Mikado", "SDVX Pocky")}: <strong>adamaq01</strong>
					</li>
					<li>
						{a("Server", "Ethereum Mining Solutions")}: <strong>viddy</strong>
						<br />
						<small>Yes, the entire server, networking costs, everything.</small>
					</li>
				</ul>
			</div>
			<div className="mt-6">
				<h1>Contributors</h1>

				<p>These people have contributed to {TachiConfig.name}.</p>

				<ul>
					{Contributors.slice(0)
						.sort((a, b) => a.localeCompare(b))
						.map((e) => (
							<li key={e}>{e}</li>
						))}
				</ul>
			</div>
			<div className="mt-6">
				<h1>External Contributors</h1>

				<p>
					These people (or teams) have created programs that have been massively
					beneficial.
					<br />
					Note: I'm leaving out huge teams here (like MongoDB and TypeScript), and
					focusing more on the smaller guys.
				</p>

				<ul>
					<li>
						<ExternalLink href="https://pnpm.io">PNPM</ExternalLink>
						<br />
						<small>
							PNPM is a monumental improvement over NPM. I cannot recommend it highly
							enough.
						</small>
					</li>
					<li>
						<ExternalLink href="https://mkdocs.org">MkDocs</ExternalLink>
						<br />
						<small>
							MkDocs is a simple Markdown-based documentation generator. It is
							lightweight, easy to use, and less hassle than things like Sphinx.
						</small>
					</li>
					<li>
						<ExternalLink href="https://squidfunk.github.io/mkdocs-material">
							MkDocs Material
						</ExternalLink>
						<br />
						<small>MkDocs Material is a beautiful theme for MkDocs.</small>
					</li>
					<li>
						<ExternalLink href="https://node-tap.org">Node TAP</ExternalLink>
						<br />
						<small>Node TAP is a testing framework that is.not.a("mess")</small>
					</li>
					<li>
						<ExternalLink href="https://automattic.github.io/monk/docs/GETTING_STARTED.html">
							Monk
						</ExternalLink>
						<br />
						<small>
							Monk is a no-nonsense driver wrapper for MongoDB wrote and maintained by
							one guy.
						</small>
					</li>
					<li>
						<ExternalLink href="https://nivo.rocks">Nivo</ExternalLink>
						<br />
						<small>Nivo is the best graphing library ever made. That's it.</small>
					</li>
				</ul>
			</div>
			<div className="mt-6">
				<h1>And...</h1>

				<p>
					Everyone who was part of the beta.
					{user?.badges.some((x) => x === "beta" || x === "alpha")
						? " (That's you!)"
						: ""}
				</p>

				<p>
					Everyone in the <code>#dev</code> chat for the constant advice and comedy gold.
				</p>
			</div>
			<span className="text-body-secondary" style={{ fontSize: "0.2rem" }}>
				Click the V in Dev Team.
			</span>
		</div>
	);
}
