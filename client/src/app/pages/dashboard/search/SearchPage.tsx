import { NumericSOV, StrSOV } from "util/sorts";
import { ONE_MINUTE } from "util/constants/time";
import useSetSubheader from "components/layout/header/useSetSubheader";
import ApiError from "components/util/ApiError";
import DebounceSearch from "components/util/DebounceSearch";
import Divider from "components/util/Divider";
import Loading from "components/util/Loading";
import SelectButton from "components/util/SelectButton";
import { useTachiSearch } from "components/util/search/useTachiSearch";
import React, { useContext, useEffect, useState } from "react";
import { Badge, Col, Form, Row } from "react-bootstrap";
import {
	ChartDocument,
	FormatGame,
	GPTString,
	SongDocument,
	SplitGPT,
	UserDocument,
	integer,
} from "tachi-common";
import TachiTable from "components/tables/components/TachiTable";
import { CascadingRatingValue } from "components/tables/headers/ChartHeader";
import DifficultyCell from "components/tables/cells/DifficultyCell";
import TitleCell from "components/tables/cells/TitleCell";
import { UserContext } from "context/UserContext";
import Card from "components/layout/page/Card";
import ProfilePicture from "components/user/ProfilePicture";
import Muted from "components/util/Muted";
import { Link } from "react-router-dom";

export default function SearchPage() {
	useSetSubheader("Search");

	const { user } = useContext(UserContext);

	const [search, setSearch] = useState("");
	const [hasPlayedGame, setHasPlayedGame] = useState(true);

	return (
		<Row>
			<Col xs={12}>
				<DebounceSearch
					autoFocus
					setSearch={setSearch}
					placeholder="Search songs, users..."
				/>
				{user && (
					<div className="w-100 mt-4 ms-1">
						<Form.Check
							checked={hasPlayedGame}
							onChange={(e) => setHasPlayedGame(e.target.checked)}
							label="Hide games you haven't played?"
						/>
					</div>
				)}
				<Divider />
			</Col>
			<Col xs={12}>
				<SearchResults search={search} hasPlayedGame={hasPlayedGame} />
			</Col>
		</Row>
	);
}

function SearchResults({ search, hasPlayedGame }: { search: string; hasPlayedGame: boolean }) {
	const { data, error } = useTachiSearch(search, hasPlayedGame);
	const [mode, setMode] = useState<"users" | GPTString | null>(null);

	useEffect(() => {
		if (data) {
			const thingsWithCharts = Object.entries(data.charts)
				.sort(StrSOV((x) => x[0]))
				.filter((k) => k[1].length > 0);

			if (thingsWithCharts.length > 0) {
				setMode(thingsWithCharts[0][0] as GPTString);
			} else if (data.users.length > 0) {
				setMode("users");
			} else {
				setMode(null);
			}
		} else {
			setMode(null);
		}
	}, [data, hasPlayedGame]);

	if (search === "") {
		return <></>;
	}

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const hasCharts = Object.values(data.charts).some((k) => k.length > 0);
	const hasUsers = data.users.length > 0;
	if (!hasCharts && !hasUsers) {
		return (
			<Row>
				<Col xs={12}>Found nothing. Sorry!</Col>
			</Row>
		);
	}

	return (
		<Row>
			<Col
				lg={3}
				xs={12}
				className="d-flex"
				style={{
					flexWrap: "wrap",
					flexDirection: "column",
					gap: "2px",
				}}
			>
				{Object.entries(data.charts)
					.sort(StrSOV((x) => x[0]))
					.map(([g, charts]) => {
						if (charts.length === 0) {
							return null;
						}

						const gpt = g as GPTString;

						const [game, playtype] = SplitGPT(gpt);

						return (
							<SelectButton id={gpt} value={mode} setValue={setMode}>
								{FormatGame(game, playtype)}
								<Badge bg="secondary" className="ms-2 text-light">
									{charts.length}
								</Badge>
							</SelectButton>
						);
					})}

				{data.users.length > 0 && (
					<SelectButton
						id="users"
						disabled={data.users.length === 0}
						value={mode}
						setValue={setMode}
					>
						Users
						<Badge bg="secondary" className="ms-2">
							{data.users.length}
						</Badge>
					</SelectButton>
				)}

				<div className="d-block d-lg-none">
					<Divider />
				</div>
			</Col>
			{mode !== null && (
				<Col lg={9} xs={12}>
					{mode === "users" ? (
						<UsersView users={data.users} />
					) : (
						<ChartView charts={data.charts[mode]!} gpt={mode} />
					)}
				</Col>
			)}
		</Row>
	);
}

function ChartView({
	charts,
	gpt,
}: {
	charts: Array<{
		song: SongDocument;
		chart: ChartDocument;
		playcount: integer;
	}>;
	gpt: GPTString;
}) {
	const [game, playtype] = SplitGPT(gpt);

	return (
		<TachiTable
			entryName="Charts"
			dataset={charts}
			headers={[
				["Chart", "Chart", (a, b) => CascadingRatingValue(game, a.chart, b.chart)],
				["Song Title", "Song", StrSOV((x) => x.song.title)],
				["Site Playcount", "Playcount", NumericSOV((x) => x.playcount)],
			]}
			searchFunctions={{
				title: (x) => x.song.title,
				artist: (x) => x.song.artist,
				playcount: (x) => x.playcount,
				difficulty: (x) => x.chart.difficulty,
				level: (x) => x.chart.levelNum,
			}}
			defaultSortMode="Site Playcount"
			defaultReverseSort
			rowFunction={(d) => (
				<tr>
					<DifficultyCell game={game} chart={d.chart} />
					<TitleCell chart={d.chart} game={game} song={d.song} />
					<td>{d.playcount}</td>
				</tr>
			)}
		/>
	);
}

function UsersView({ users }: { users: Array<UserDocument> }) {
	return (
		<Row>
			<div
				className="w-100 d-flex"
				style={{
					flexWrap: "wrap",
				}}
			></div>
			{users.map((user) => (
				<Col xs={12} lg={6}>
					<Card className="mb-4">
						<div className="d-flex h-100">
							<div>
								<ProfilePicture user={user} />
							</div>
							<div
								className="ms-4 d-flex w-100 h-100"
								style={{
									flexWrap: "wrap",
									flexDirection: "column",
								}}
							>
								<div>
									<h4>
										<Link
											className="text-decoration-none"
											to={`/u/${user.username}`}
										>
											{user.username}
										</Link>
									</h4>
								</div>
								<div>
									<Muted>{user.status ?? "I haven't set my status."}</Muted>
								</div>
								{Date.now() - user.lastSeen < ONE_MINUTE * 5 && (
									<div className="mt-2">
										<Badge bg="success">ONLINE</Badge>
									</div>
								)}
							</div>
						</div>
					</Card>
				</Col>
			))}
		</Row>
	);
}
