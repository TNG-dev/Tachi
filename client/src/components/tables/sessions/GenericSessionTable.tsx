import { GetPBs } from "util/data";
import { FormatGPTSessionRating, UppercaseFirst } from "util/misc";
import { NumericSOV, StrSOV } from "util/sorts";
import { FormatDuration, FormatTime, MillisToSince } from "util/time";
import { useSessionRatingAlg } from "components/util/useScoreRatingAlg";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
	Game,
	GetGamePTConfig,
	GPTString,
	integer,
	UserDocument,
	SessionRatingAlgorithms,
	SessionDocument,
	Playtype,
	SessionScoreInfo,
} from "tachi-common";
import IndexCell from "../cells/IndexCell";
import SelectableRating from "../components/SelectableRating";
import TachiTable, { Header, ZTableTHProps } from "../components/TachiTable";

export type SessionDataset = (SessionDocument & {
	__related: { index: integer; scoreInfo: Array<SessionScoreInfo> };
})[];

export default function GenericSessionTable({
	dataset,
	indexCol = false,
	reqUser,
	game,
	playtype,
}: {
	dataset: SessionDataset;
	indexCol?: boolean;
	reqUser: UserDocument;
	game: Game;
	playtype: Playtype;
}) {
	const gptConfig = GetGamePTConfig(game, playtype);

	const defaultRating = useSessionRatingAlg(game, playtype);

	const [alg, setAlg] = useState<SessionRatingAlgorithms[GPTString]>(defaultRating);

	const headers: Header<SessionDataset[0]>[] = [
		["Name", "Name", StrSOV((x) => x.name)],
		["Scores", "Scores", NumericSOV((x) => x.scoreIDs.length)],
		[UppercaseFirst(alg), UppercaseFirst(alg), NumericSOV((x) => x.calculatedData[alg] ?? 0)],
		["Duration", "Dur.", NumericSOV((x) => x.timeEnded - x.timeStarted)],
		["Timestamp", "Timestamp", NumericSOV((x) => x.timeStarted)],
	];

	if (Object.keys(gptConfig.sessionRatingAlgs).length > 1) {
		headers[2] = [
			"Rating",
			"Rating",
			NumericSOV((x) => x.calculatedData[alg] ?? 0),
			(thProps: ZTableTHProps) => (
				<SelectableRating
					key={`${game}-${playtype}`}
					game={game}
					playtype={playtype}
					rating={alg}
					setRating={setAlg}
					mode="session"
					{...thProps}
				/>
			),
		];
	}

	if (indexCol) {
		headers.unshift(["#", "#", NumericSOV((x) => x.__related.index)]);
	}

	return (
		<TachiTable
			dataset={dataset}
			headers={headers}
			entryName="Sessions"
			searchFunctions={{
				name: (x) => x.name,
				scores: (x) => x.scoreIDs.length,
				duration: (x) => (x.timeEnded - x.timeStarted) / (1000 * 60),
				timestamp: (x) => x.timeStarted,
				[alg]: (x) => x.calculatedData[alg] ?? 0,
			}}
			rowFunction={(s) => (
				<Row
					reqUser={reqUser}
					data={s}
					key={s.sessionID}
					ratingAlg={alg}
					indexCol={indexCol}
				/>
			)}
		/>
	);
}

function Row({
	data,
	ratingAlg,
	reqUser,
	indexCol = false,
}: // reqUser,
{
	data: SessionDataset[0];
	// reqUser: PublicUserDocument;
	ratingAlg: SessionRatingAlgorithms[GPTString];
	reqUser: UserDocument;
	indexCol?: boolean;
}) {
	return (
		<tr className={data.highlight ? "highlighted-row" : ""}>
			{indexCol && <IndexCell index={data.__related.index} />}
			<td style={{ minWidth: "140px" }}>
				<Link
					to={`/u/${reqUser.username}/games/${data.game}/${data.playtype}/sessions/${data.sessionID}`}
					className="text-decoration-none"
				>
					{data.name}
				</Link>
				<br />
				<small className="text-body-secondary">{data.desc}</small>
			</td>
			<td>
				{data.scoreIDs.length}
				<br />
				<small className="text-body-secondary">
					PBs: {GetPBs(data.__related.scoreInfo).length}
				</small>
			</td>
			<td>
				{FormatGPTSessionRating(
					data.game,
					data.playtype,
					ratingAlg,
					data.calculatedData[ratingAlg]
				)}
			</td>
			<td>{FormatDuration(data.timeEnded - data.timeStarted)}</td>
			<td>
				{MillisToSince(data.timeStarted)}
				<br />
				<small className="text-body-secondary">{FormatTime(data.timeStarted)}</small>
			</td>
		</tr>
	);
}
