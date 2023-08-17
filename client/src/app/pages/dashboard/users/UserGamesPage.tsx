import { APIFetchV1 } from "util/api";
import { GetSortedGPTs } from "util/site";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Card from "components/layout/page/Card";
import RankingData from "components/user/UGPTRankingData";
import UGPTRatingsTable from "components/user/UGPTStatsOverview";
import AsyncLoader from "components/util/AsyncLoader";
import LinkButton from "components/util/LinkButton";
import Muted from "components/util/Muted";
import ReferToUser from "components/util/ReferToUser";
import React from "react";
import { FormatGame, UserDocument, UserGameStats } from "tachi-common";
import { UGSWithRankingData } from "types/api-returns";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

interface Props {
	reqUser: UserDocument;
}

export default function UserGamesPage({ reqUser }: Props) {
	useSetSubheader(
		["Users", reqUser.username, "Games"],
		[reqUser],
		`${reqUser.username}'s Game Profiles`
	);

	return (
		<Row xs={{ cols: 1 }} lg={{ cols: 2 }}>
			<AsyncLoader
				promiseFn={async () => {
					const res = await APIFetchV1<UGSWithRankingData[]>(
						`/users/${reqUser.id}/game-stats`
					);

					if (!res.success) {
						throw new Error(res.description);
					}

					return res.body;
				}}
			>
				{(ugs) =>
					ugs.length ? (
						<GamesInfo ugs={ugs} reqUser={reqUser} />
					) : (
						<div className="col-12 text-center">
							<Muted>
								<ReferToUser reqUser={reqUser} /> not played anything.
							</Muted>
						</div>
					)
				}
			</AsyncLoader>
		</Row>
	);
}

function GamesInfo({ ugs, reqUser }: { ugs: UserGameStats[]; reqUser: UserDocument }) {
	const gpts = GetSortedGPTs();

	const ugsMap = new Map();

	for (const u of ugs) {
		ugsMap.set(`${u.game}:${u.playtype}`, u);
	}

	return (
		<>
			{gpts.map(({ game, playtype }, i) => {
				const e = ugsMap.get(`${game}:${playtype}`);

				if (!e) {
					return <></>;
				}

				return <GameStatContainer key={`${game}:${playtype}`} ugs={e} reqUser={reqUser} />;
			})}
		</>
	);
}

export function GameStatContainer({ ugs, reqUser }: { ugs: UGSWithRankingData } & Props) {
	return (
		<Col className="p-2 flex-grow-1">
			<Card
				className="h-100"
				footer={
					<div className="d-flex justify-content-end">
						<LinkButton to={`/u/${reqUser.username}/games/${ugs.game}/${ugs.playtype}`}>
							View Game Profile
						</LinkButton>
					</div>
				}
				header={FormatGame(ugs.game, ugs.playtype)}
			>
				<UGPTRatingsTable ugs={ugs} />
				<RankingData
					game={ugs.game}
					playtype={ugs.playtype}
					rankingData={ugs.__rankingData}
					userID={ugs.userID}
				/>
			</Card>
		</Col>
	);
}
