import { APIFetchV1 } from "util/api";
import { NumericSOV } from "util/sorts";
import useSetSubheader from "components/layout/header/useSetSubheader";
import GenericSessionTable, {
	SessionDataset,
} from "components/tables/sessions/GenericSessionTable";
import DebounceSearch from "components/util/DebounceSearch";
import Icon from "components/util/Icon";
import LoadingWrapper from "components/util/LoadingWrapper";
import SelectButton from "components/util/SelectButton";
import { useSessionRatingAlg } from "components/util/useScoreRatingAlg";
import React, { useState } from "react";
import { useQuery } from "react-query";
import {
	FormatGame,
	GetGameConfig,
	UserDocument,
	SessionDocument,
	UnsuccessfulAPIResponse,
	SessionScoreInfo,
} from "tachi-common";
import { GamePT, UGPT } from "types/react";
import SessionCalendar from "components/sessions/SessionCalendar";
import Divider from "components/util/Divider";

export default function SessionsPage({ reqUser, game, playtype }: UGPT) {
	const [sessionSet, setSessionSet] = useState<"recent" | "best" | "highlighted">("best");
	const [search, setSearch] = useState("");

	const gameConfig = GetGameConfig(game);

	useSetSubheader(
		["Users", reqUser.username, "Games", gameConfig.name, playtype, "Sessions"],
		[reqUser],
		`${reqUser.username}'s ${FormatGame(game, playtype)} Sessions`
	);

	const baseUrl = `/users/${reqUser.id}/games/${game}/${playtype}/sessions`;

	const rating = useSessionRatingAlg(game, playtype);

	const { data, error } = useQuery<SessionDataset, UnsuccessfulAPIResponse>(
		`${baseUrl}/${sessionSet}`,
		async () => {
			const res = await APIFetchV1<
				(SessionDocument & { __scoreInfo: Array<SessionScoreInfo> })[]
			>(`${baseUrl}/${sessionSet}`);

			if (!res.success) {
				throw res;
			}

			return res.body
				.sort(
					sessionSet === "best"
						? NumericSOV((x) => x.calculatedData[rating] ?? 0, true)
						: NumericSOV((x) => x.timeEnded ?? 0, true)
				)
				.map((e, i) => ({
					...e,
					__related: {
						index: i,
						scoreInfo: e.__scoreInfo,
					},
				}));
		}
	);

	return (
		<div className="row">
			<div className="col-12">
				<SessionCalendar
					user={reqUser}
					url={`/users/${reqUser.id}/games/${game}/${playtype}/sessions/calendar`}
				/>
				<Divider />
			</div>
			<div className="col-12 text-center">
				<div className="btn-group d-flex justify-content-center mb-4">
					<SelectButton
						className="text-wrap"
						id="best"
						setValue={setSessionSet}
						value={sessionSet}
					>
						<Icon type="trophy" /> Best Sessions
					</SelectButton>
					<SelectButton
						className="text-wrap"
						id="recent"
						setValue={setSessionSet}
						value={sessionSet}
					>
						<Icon type="history" /> Recent Sessions
					</SelectButton>
					<SelectButton
						className="text-wrap"
						id="highlighted"
						setValue={setSessionSet}
						value={sessionSet}
					>
						<Icon type="star" /> Highlighted Sessions
					</SelectButton>
				</div>
			</div>
			<div className="col-12 mt-4">
				<DebounceSearch placeholder="Search all sessions..." setSearch={setSearch} />
			</div>
			<div className="col-12 mt-4">
				{search === "" ? (
					<LoadingWrapper {...{ error, dataset: data }}>
						<GenericSessionTable
							indexCol={sessionSet === "best"}
							dataset={data!}
							reqUser={reqUser}
							game={game}
							playtype={playtype}
						/>
					</LoadingWrapper>
				) : (
					<SearchSessionsTable {...{ game, playtype, reqUser, baseUrl, search }} />
				)}
			</div>
		</div>
	);
}

function SearchSessionsTable({
	search,
	game,
	playtype,
	reqUser,
	baseUrl,
}: { search: string; baseUrl: string; reqUser: UserDocument } & GamePT) {
	const { data, error } = useQuery<SessionDataset, UnsuccessfulAPIResponse>(
		`${baseUrl}?search=${search}`,
		async () => {
			const res = await APIFetchV1<SessionDocument[]>(`${baseUrl}?search=${search}`);

			if (!res.success) {
				throw res;
			}

			return res.body.map((e, i) => ({
				...e,
				__related: {
					index: i,
				},
			})) as SessionDataset;
		}
	);

	return (
		<LoadingWrapper {...{ error, dataset: data }}>
			<GenericSessionTable
				reqUser={reqUser}
				dataset={data!}
				game={game}
				playtype={playtype}
			/>
		</LoadingWrapper>
	);
}
