import useSetSubheader from "components/layout/header/useSetSubheader";
import Card from "components/layout/page/Card";
import ApiError from "components/util/ApiError";
import DiscordLink from "components/util/DiscordLink";
import Divider from "components/util/Divider";
import ExternalLink from "components/util/ExternalLink";
import LinkButton from "components/util/LinkButton";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import { UserContext } from "context/UserContext";
import { TachiConfig } from "lib/config";
import React, { useContext, useEffect, useState } from "react";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import { Link } from "react-router-dom";
import {
	APIImportTypes,
	FileUploadImportTypes,
	Game,
	GetGameConfig,
	ImportTypes,
	integer,
	UserDocument,
} from "tachi-common";
import Col from "react-bootstrap/Col";

export default function ImportPage({ user }: { user: UserDocument }) {
	useSetSubheader(["Import Scores"]);

	const [game, setGame] = useState<Game | null>(null);

	const queryGame = new URLSearchParams(window.location.search).get("game");

	useEffect(() => {
		if (queryGame) {
			setGame(queryGame as Game);
		}
	}, [queryGame]);

	return (
		<>
			<div>
				<h4>
					Here, you can import score files, Synchronise with existing services, or set up
					in-game automatic score uploading!
				</h4>
				Don't see what you want here? Make a <a>Feature Request</a>, or ask around on the{" "}
				<DiscordLink>Discord</DiscordLink>.
				<br />
				Know how to program, and want to write a script yourself? Check out{" "}
				<ExternalLink href="https://docs.bokutachi.xyz/codebase/batch-manual">
					Batch Manual
				</ExternalLink>
				.
				<br />
				Want to manage or revert an import? Go to{" "}
				<Link to={`/u/${user.username}/imports`}>Import Management</Link>.
			</div>
			<hr />
			<Form.Select
				onChange={(e) => setGame(e.target.value === "" ? null : (e.target.value as Game))}
				value={game ?? ""}
			>
				<option value="">Please select a game.</option>
				{TachiConfig.games.map((e) => (
					<option value={e} key={e}>
						{GetGameConfig(e).name}
					</option>
				))}
			</Form.Select>
			<hr />

			{game ? <ImportInfoDisplayer game={game} /> : <ShowRecentImports />}
		</>
	);
}

function ShowRecentImports() {
	const { user } = useContext(UserContext);

	if (!user) {
		return <>You're not signed in.</>;
	}

	return <InnerShowRecentImports user={user} />;
}

function InnerShowRecentImports({ user }: { user: UserDocument }) {
	const { data, error } = useApiQuery<{ importType: ImportTypes; count: integer }[]>(
		`/users/${user.id}/recent-imports`
	);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const filteredData = data.filter(
		(e) => e.importType.startsWith("file/") || e.importType.startsWith("api/")
	);

	if (filteredData.length === 0) {
		return null;
	}

	return (
		<>
			<h4>Recently Used Import Methods</h4>
			<Divider />
			<Row>
				{filteredData.map((e) => (
					<ImportTypeInfoCard
						key={e.importType}
						importType={e.importType as FileUploadImportTypes | APIImportTypes}
					/>
				))}
			</Row>
		</>
	);
}

function ImportInfoDisplayer({ game }: { game: Game }) {
	const gameConfig = GetGameConfig(game);

	const Content = [<ImportTypeInfoCard key="file/batch-manual" importType="file/batch-manual" />];

	if (game === "iidx") {
		Content.unshift(
			<ImportInfoCard
				name="Fervidex"
				href="fervidex"
				desc="Automatically import scores, whenever you get them!"
				moreInfo="This works with both Infinitas and other clients and is the recommended way to import scores, as it provides quality data in real-time."
				key="Fervidex"
			/>,
			<ImportTypeInfoCard
				key="file/eamusement-iidx-csv"
				importType="file/eamusement-iidx-csv"
			/>,
			<ImportTypeInfoCard key="api/flo-iidx" importType="api/flo-iidx" />,
			<ImportTypeInfoCard key="api/eag-iidx" importType="api/eag-iidx" />,
			<ImportTypeInfoCard key="file/solid-state-squad" importType="file/solid-state-squad" />,
			<ImportTypeInfoCard key="file/pli-iidx-csv" importType="file/pli-iidx-csv" />
		);
	} else if (game === "sdvx") {
		Content.unshift(
			<ImportInfoCard
				name="Barbatos"
				href="barbatos"
				desc="Automatically import scores, whenever you get them!"
				moreInfo="This is the recommended way to import SDVX scores, as it provides high quality data in real-time."
				key="Barbatos"
			/>,
			<ImportInfoCard
				name="Konaste Hook"
				href="ks-hook"
				desc="Automatically import scores from SDVX Konaste!"
				moreInfo="Yep, it's that simple."
				key="Konaste Hook"
			/>,
			<ImportTypeInfoCard
				key="file/eamusement-sdvx-csv"
				importType="file/eamusement-sdvx-csv"
			/>,
			<ImportTypeInfoCard key="api/flo-sdvx" importType="api/flo-sdvx" />,
			<ImportTypeInfoCard key="api/eag-sdvx" importType="api/eag-sdvx" />,
			<ImportTypeInfoCard key="api/cg-dev-sdvx" importType="api/cg-dev-sdvx" />,
			<ImportTypeInfoCard key="api/cg-gan-sdvx" importType="api/cg-gan-sdvx" />,
			<ImportTypeInfoCard key="api/cg-nag-sdvx" importType="api/cg-nag-sdvx" />,
			<ImportTypeInfoCard key="api/min-sdvx" importType="api/min-sdvx" />
		);
	} else if (game === "chunithm") {
		Content.unshift(
			<ImportInfoCard
				name="Chunitachi"
				href="chunitachi"
				desc="Automatically import scores, whenever you get them!"
				moreInfo="This is the recommended way to import CHUNITHM scores, as it provides high quality data in real-time."
				key="Chunitachi"
			/>,
			<ImportInfoCard
				name="CHUNITHM Site Importer"
				href="kt-chunithm-site-importer"
				desc="Use your data from CHUNITHM NET."
				moreInfo="If you are currently playing on CHUNITHM International, you can import play data from it here."
				key="CHUNITHM Site Importer"
			/>
		);
	} else if (game === "bms") {
		Content.unshift(
			<ImportInfoCard
				name="LR2oraja IR"
				href="lr2oraja-ir"
				desc="Automatically import scores, whenever you get them!"
				moreInfo="This is the recommended way to import BMS scores, as it provides high quality data in real-time."
				key="LR2oraja IR"
			/>,
			<ImportInfoCard
				name="LR2 Hook"
				href="lr2hook"
				desc="Automatically import scores, whenever you get them (in LR2)!"
				moreInfo="This is the recommended way to import LR2 BMS scores, as it provides high quality data in real-time."
				key="LR2 IR"
			/>,
			<ImportInfoCard
				name="LR2oraja Database Import"
				href="lr2oraja-db"
				desc="Import scores from a LR2oraja score database file."
				moreInfo="This should be done once initially to sync scores up, but not all the time, as it provides worse quality data."
				key="LR2oraja Database Import"
			/>,
			<ImportInfoCard
				name="LR2 Database Import"
				href="lr2-db"
				desc="Import scores from a LR2 score database file."
				moreInfo="This should be done once initially to sync scores up, but not all the time, as it provides worse quality data."
				key="LR2 Database Import"
			/>
		);
	} else if (game === "usc") {
		Content.unshift(
			<ImportInfoCard
				name="USC IR"
				href="usc-ir"
				desc="Automatically import scores, whenever you get them!"
				moreInfo="This is the recommended way to import USC scores, as it provides high quality data in real-time."
				key="USC IR"
			/>,
			<ImportInfoCard
				name="USC Database Import"
				href="usc-db"
				desc="Import scores from a USC score database file."
				moreInfo="This should be done once initially to sync scores up, but not all the time, as it provides worse quality data."
				key="USC Database Import"
			/>
		);
	} else if (game === "popn") {
		Content.unshift(
			<ImportInfoCard
				name="Silent Hook"
				href="silent-hook"
				desc={`Automatically upload Pop'n scores to ${TachiConfig.name}!`}
				moreInfo="Yep, it's that simple."
				key="Silent Hook"
			/>,
			<ImportTypeInfoCard key="api/cg-dev-popn" importType="api/cg-dev-popn" />,
			<ImportTypeInfoCard key="api/cg-gan-popn" importType="api/cg-gan-popn" />,
			<ImportTypeInfoCard key="api/cg-nag-popn" importType="api/cg-nag-popn" />
		);
	} else if (game === "pms") {
		Content.unshift(
			<ImportInfoCard
				name="Beatoraja IR"
				href="beatoraja-ir-pms"
				desc="Automatically import scores, whenever you get them!"
				moreInfo="This is the recommended way to import PMS scores, as it provides high quality data in real-time."
				key="Beatoraja IR"
			/>
		);
	} else if (game === "wacca") {
		Content.unshift(
			<ImportInfoCard
				name="WaccaMyPageScraper"
				href="wacca-mypage-scraper"
				desc="Use your data from WaccaMyPageScraper."
				moreInfo="If you saved your play data from MyPage using XezolesS's WaccaMyPageScraper project, you can import it here."
				key="WACCA MyPage Scraper"
			/>
		);
	} else if (game === "maimaidx") {
		Content.unshift(
			<ImportInfoCard
				name="maimai DX Site Importer"
				href="kt-maimaidx-site-importer"
				desc="Use your data from maimai DX NET."
				moreInfo="If you are currently playing on maimai DX International, you can import play data from it here."
				key="maimai DX NET Importer"
			/>
		);
	} else if (game === "museca") {
		Content.unshift(
			<ImportTypeInfoCard key="api/cg-dev-museca" importType="api/cg-dev-museca" />,
			<ImportTypeInfoCard key="api/cg-gan-museca" importType="api/cg-gan-museca" />,
			<ImportTypeInfoCard key="api/cg-nag-museca" importType="api/cg-nag-museca" />
		);
	} else if (game === "itg") {
		Content.unshift(
			<ImportInfoCard
				name="Simply Love ITGMania Module"
				href="itghook"
				desc="Automatically import scores, whenever you get them (in ITGMania)!"
				key="SL-ITG"
			/>
		);
	} // else if (game === "jubeat") {
	// 	Content.unshift(
	// 		<ImportTypeInfoCard key="api/cg-dev-jubeat" importType="api/cg-dev-jubeat" />,
	// 		<ImportTypeInfoCard key="api/cg-prod-jubeat" importType="api/cg-prod-jubeat" />
	// 	);
	// }

	return (
		<>
			<div className="text-center mb-4">
				<h1>{gameConfig.name}</h1>
			</div>
			<Row xs={{ cols: 1 }} lg={{ cols: 2 }}>
				{Content}
			</Row>
		</>
	);
}

function ImportTypeInfoCard({
	importType,
}: {
	importType: FileUploadImportTypes | APIImportTypes;
}): JSX.Element | null {
	if (!TachiConfig.importTypes.includes(importType)) {
		return null;
	}

	switch (importType) {
		case "api/eag-iidx":
			return (
				<ImportInfoCard
					name="EAG Integration"
					href="iidx-eag"
					desc="Pull your IIDX scores from the EAG Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="iidx-eag"
				/>
			);
		case "api/flo-iidx":
			return (
				<ImportInfoCard
					name="FLO Integration"
					href="iidx-flo"
					desc="Pull your IIDX scores from the FLO Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="iidx-flo"
				/>
			);
		case "api/flo-sdvx":
			return (
				<ImportInfoCard
					name="FLO Integration"
					href="sdvx-flo"
					desc="Pull your SDVX scores from the FLO Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="sdvx-flo"
				/>
			);
		case "api/eag-sdvx":
			return (
				<ImportInfoCard
					name="EAG Integration"
					href="sdvx-eag"
					desc="Pull your SDVX scores from the EAG Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="sdvx-eag"
				/>
			);
		case "api/min-sdvx":
			return (
				<ImportInfoCard
					name="MIN Integration"
					href="sdvx-min"
					desc="Pull your SDVX scores from the MIN Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="sdvx-min"
				/>
			);
		case "api/cg-dev-sdvx":
			return (
				<ImportInfoCard
					name="CG Dev Integration"
					href="cg-dev-sdvx"
					desc="Pull your SDVX scores from the CG Dev Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-dev-sdvx"
				/>
			);
		case "api/cg-nag-sdvx":
			return (
				<ImportInfoCard
					name="CG NAG Integration"
					href="cg-nag-sdvx"
					desc="Pull your SDVX scores from the NAG Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-nag-sdvx"
				/>
			);
		case "api/cg-gan-sdvx":
			return (
				<ImportInfoCard
					name="CG GAN Integration"
					href="cg-gan-sdvx"
					desc="Pull your SDVX scores from the GAN Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-gan-sdvx"
				/>
			);
		case "api/cg-dev-popn":
			return (
				<ImportInfoCard
					name="CG Dev Integration"
					href="cg-dev-popn"
					desc="Pull your pop'n music scores from the CG Dev Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-dev-popn"
				/>
			);
		case "api/cg-nag-popn":
			return (
				<ImportInfoCard
					name="CG NAG Integration"
					href="cg-nag-popn"
					desc="Pull your pop'n music scores from the NAG Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-nag-popn"
				/>
			);
		case "api/cg-gan-popn":
			return (
				<ImportInfoCard
					name="CG GAN Integration"
					href="cg-gan-popn"
					desc="Pull your pop'n music scores from the GAN Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-gan-popn"
				/>
			);
		case "api/cg-dev-museca":
			return (
				<ImportInfoCard
					name="CG Dev Integration"
					href="cg-dev-museca"
					desc="Pull your MUSECA scores from the CG Dev Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-dev-museca"
				/>
			);
		case "api/cg-gan-museca":
			return (
				<ImportInfoCard
					name="CG GAN Integration"
					href="cg-gan-museca"
					desc="Pull your MUSECA scores from the GAN Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-gan-museca"
				/>
			);
		case "api/cg-nag-museca":
			return (
				<ImportInfoCard
					name="CG NAG Integration"
					href="cg-nag-museca"
					desc="Pull your MUSECA scores from the NAG Network."
					moreInfo="Note: All networks are reduced to their first three letters for anonymity reasons."
					key="cg-nag-museca"
				/>
			);
		case "file/eamusement-iidx-csv":
			return (
				<ImportInfoCard
					name="E-Amusement CSV"
					href="iidx-eam-csv"
					desc="Use the official E-Amusement CSV to import scores."
					moreInfo="Note: This format has issues with timestamps, since it stores only one timestamp per song. Playing the same song on different difficulties in a session will result in broken timestamps on your account."
					key="E-Amusement CSV"
				/>
			);
		case "file/solid-state-squad":
			return (
				<ImportInfoCard
					name="SOLID STATE SQUAD .xml"
					href="sss-xml"
					desc="Use a SOLID STATE SQUAD XML file to import scores."
					moreInfo={
						<>
							This service is rather old, and was originally for manually tracking CS
							scores. However, it still exports data, and we still support it! <br />
							<br />
							Also, these guys provide pretty good quality data, especially for the
							time.
						</>
					}
					key="SOLID STATE SQUAD .xml"
				/>
			);
		case "file/eamusement-sdvx-csv":
			return (
				<ImportInfoCard
					name="E-Amusement CSV"
					href="sdvx-eam-csv"
					desc="Use the official E-Amusement CSV to import scores."
					moreInfo="Note: This format doesn't support timestamps, which means sessions cannot be generated from it."
					key="SDVX E-Amusement CSV"
				/>
			);
		case "file/batch-manual":
			return (
				<ImportInfoCard
					name="Batch Manual"
					href="batch-manual"
					desc={`A JSON format ${TachiConfig.name} recognises and can import scores from.`}
					moreInfo={
						<>
							This is for programmers to create their own import scripts. <br /> Check
							the{" "}
							<ExternalLink href="https://docs.bokutachi.xyz/codebase/batch-manual">
								documentation
							</ExternalLink>
							.
						</>
					}
					key="Batch Manual"
				/>
			);
		case "file/mer-iidx":
			return (
				<ImportInfoCard
					name="MER .json"
					href="iidx-mer"
					desc="Use a MER-exported .json file to synchronise scores."
					moreInfo="Note: Scores that do not match an existing song on the site will be orphaned, and anyone can see your orphaned scores. Don't be an idiot. I highly recommend using Fervidex instead."
					key="MER .json"
				/>
			);
		case "file/pli-iidx-csv":
			return (
				<ImportInfoCard
					name="PLI .csv"
					href="iidx-pli-csv"
					desc="Use a PLI .csv file to import scores."
					moreInfo="Note: This network is currently not being developed on. I highly recommend switching to anything else. I highly recommend using Fervidex instead, and just using this once to sync things up."
					key="PLI .csv"
				/>
			);
		case "file/mypagescraper-records-csv":
		case "file/mypagescraper-player-csv":
			// We only expect people to use these import types once ever, so don't recommend them.
			return <></>;
		default:
			// For some reason, the webpack tschecker thinks
			// that the above switch isn't exhaustive. However, it is.
			return (
				<>
					Err: Unknown importType <code>{importType}</code>
				</>
			);
	}
}

function ImportInfoCard({
	name,
	href,
	desc,
	moreInfo,
}: {
	name: string;
	href: string;
	desc: string;
	moreInfo?: React.ReactChild;
}) {
	return (
		<Col className="p-2 flex-grow-1">
			<Card
				className="h-100"
				header={name}
				footer={
					<LinkButton className="float-end" to={`/import/${href}`}>
						Use this!
					</LinkButton>
				}
			>
				<div style={{ fontSize: "1.5rem" }}>{desc}</div>
				{moreInfo && (
					<>
						<Divider />
						<div>{moreInfo}</div>
					</>
				)}
			</Card>
		</Col>
	);
}
