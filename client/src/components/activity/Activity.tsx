import { ClumpActivity, GetUsers } from "util/activity";
import { APIFetchV1 } from "util/api";
import { ONE_HOUR } from "util/constants/time";
import { CreateScoreIDMap, CreateUserMap } from "util/data";
import { NO_OP, TruncateString } from "util/misc";
import { FormatTime, MillisToSince } from "util/time";
import ClassBadge from "components/game/ClassBadge";
import SessionRaiseBreakdown from "components/sessions/SessionRaiseBreakdown";
import ScoreTable from "components/tables/scores/ScoreTable";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import LinkButton from "components/util/LinkButton";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import useApiQuery from "components/util/query/useApiQuery";
import { UserContext } from "context/UserContext";
import React, { useContext, useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
	FormatChart,
	FormatGame,
	GetGamePTConfig,
	GetScoreEnumConfs,
	UserDocument,
} from "tachi-common";
import { ActivityReturn, RecordActivityReturn, SessionReturns } from "types/api-returns";
import { UGPT } from "types/react";
import { ScoreDataset } from "types/tables";
import {
	ClumpedActivity,
	ClumpedActivityClassAchievement,
	ClumpedActivityGoalAchievement,
	ClumpedActivityQuestAchievement,
	ClumpedActivityScores,
	ClumpedActivitySession,
} from "types/tachi";
import { InnerQuestSectionGoal } from "components/targets/quests/Quest";
import ProfilePicture from "components/user/ProfilePicture";
import SupporterIcon from "components/util/SupporterIcon";

// Records activity for a group of users on a GPT. Also used for single users.
export default function Activity({
	url,
	handleNoActivity = (
		<Col xs={12} className="text-center">
			We found no activity!
		</Col>
	),
}: {
	url: string;
	handleNoActivity?: React.ReactNode;
}) {
	const [clumped, setClumped] = useState<ClumpedActivity>([]);
	const [users, setUsers] = useState<Array<UserDocument>>([]);
	const [shouldShowGame, setShouldShowGame] = useState(false);
	const [exhausted, setExhausted] = useState(false);

	const { data, error } = useApiQuery<ActivityReturn | RecordActivityReturn>(url);

	useEffect(() => {
		if (!data) {
			setClumped([]);
			setUsers([]);
		} else {
			const newActivity = ClumpActivity(data);

			if (newActivity.filter((e) => e.type === "SESSION").length < 30) {
				setExhausted(true);
			}

			setClumped(newActivity);
			setUsers(GetUsers(data));

			// show game if this is { "iidx:SP": [], "iidx:DP": [] }...
			// to disambiguate
			setShouldShowGame(!("users" in data));
		}
	}, [data]);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	if (clumped.length === 0) {
		return <>{handleNoActivity}</>;
	}

	return (
		<ActivityInner
			shouldShowGame={shouldShowGame}
			data={clumped}
			users={users}
			exhausted={exhausted}
			fetchMoreFrom={(start) => {
				APIFetchV1<ActivityReturn | RecordActivityReturn>(`${url}?startTime=${start}`).then(
					(r) => {
						if (r.success) {
							const newActivity = ClumpActivity(r.body);

							if (newActivity.filter((e) => e.type === "SESSION").length < 30) {
								setExhausted(true);
							}

							setClumped([...clumped, ...newActivity]);
							setUsers([...users, ...GetUsers(r.body)]);
						}
					}
				);
			}}
		/>
	);
}

function ActivityInner({
	data,
	users,
	fetchMoreFrom,
	shouldShowGame,
	exhausted,
}: {
	data: ClumpedActivity;
	users: Array<UserDocument>;
	fetchMoreFrom: (start: number) => void;
	shouldShowGame: boolean;
	exhausted: boolean;
}) {
	const userMap = CreateUserMap(users);

	return (
		<Col xs={12} className="text-center">
			Tip: You can click on an event to learn more about it.
			<div className="timeline activity-timeline timeline-2 mt-4">
				<div className="timeline-bar"></div>
				{data.map((e) => {
					const user = userMap.get(e.type === "SCORES" ? e.scores[0]?.userID : e.userID);

					if (!user) {
						return <div>This user doesn't exist? Whoops.</div>;
					}

					switch (e.type) {
						case "SCORES":
							return (
								<ScoresActivity
									shouldShowGame={shouldShowGame}
									data={e}
									user={user}
								/>
							);
						case "SESSION":
							return (
								<SessionActivity
									shouldShowGame={shouldShowGame}
									data={e}
									user={user}
								/>
							);
						case "CLASS_ACHIEVEMENT":
							return (
								<ClassAchievementActivity
									shouldShowGame={shouldShowGame}
									data={e}
									user={user}
								/>
							);
						case "GOAL_ACHIEVEMENTS":
							return (
								<GoalActivity
									shouldShowGame={shouldShowGame}
									data={e}
									user={user}
								/>
							);
						case "QUEST_ACHIEVEMENT":
							return (
								<QuestActivity
									shouldShowGame={shouldShowGame}
									data={e}
									user={user}
								/>
							);
					}
				})}
				<div className="timeline-item">
					<div className="timeline-badge bg-success"></div>
					<div className="timeline-content">
						{exhausted ? (
							<>No more activity. This is the end of the road!</>
						) : (
							<Button
								variant="outline-primary"
								onClick={() => {
									let lastTimestamp;
									const lastThing = data.at(-1)!;

									switch (lastThing.type) {
										case "SCORES":
											lastTimestamp = lastThing.scores[0]?.timeAchieved;
											break;
										case "CLASS_ACHIEVEMENT":
											lastTimestamp = lastThing.timeAchieved;
											break;
										case "SESSION":
											lastTimestamp = lastThing.timeStarted;
											break;
										case "GOAL_ACHIEVEMENTS":
											lastTimestamp = lastThing.goals[0]?.timeAchieved;
											break;
										case "QUEST_ACHIEVEMENT":
											lastTimestamp = lastThing.sub.timeAchieved;
									}

									if (!lastTimestamp) {
										alert("Failed. What?");
										return;
									}

									fetchMoreFrom(lastTimestamp);
								}}
							>
								Load More...
							</Button>
						)}
					</div>
				</div>
			</div>
		</Col>
	);
}

function ScoresActivity({
	data,
	user,
	shouldShowGame,
}: {
	data: ClumpedActivityScores;
	user: UserDocument;
	shouldShowGame: boolean;
}) {
	const { game, playtype } = data.scores[0];

	const prettyGame = shouldShowGame ? `${FormatGame(game, playtype)} ` : "";

	const [show, setShow] = useState(false);

	let subMessage;
	let mutedText: string | null | undefined;

	if (data.scores.length === 1) {
		const score0 = data.scores[0];

		subMessage = `a ${prettyGame}score on ${FormatChart(
			score0.game,
			score0.__related.song,
			score0.__related.chart,
			true
		)}`;

		if (score0.comment) {
			mutedText = `"${score0.comment}"`;
		}
	} else {
		subMessage = `${data.scores.length} ${prettyGame}scores`;

		mutedText = TruncateString(
			data.scores
				.map((e) => FormatChart(e.game, e.__related.song, e.__related.chart, true))
				.join(", "),
			100
		);
	}

	const dataset: ScoreDataset = data.scores.map((e, i) => ({
		...e,
		__related: {
			...e.__related,
			index: i,
			user,
		},
	}));

	return (
		<div className="timeline-item timeline-hover my-4">
			<div className="timeline-badge bg-warning"></div>
			<div className="timeline-content flex-nowrap">
				<div className="timeline-content-inner" onClick={() => setShow(!show)}>
					<div className="timeline-content-title">
						<span className="me-2">
							<ProfilePicture size="sm" user={user} toGPT={{ game, playtype }} />
						</span>
						<Icon
							type={`chevron-${show ? "down" : "right"}`}
							style={{
								fontSize: "0.75rem",
							}}
						/>
						<span style={{ fontSize: "1.15rem" }} className="ms-2">
							<UGPTLink reqUser={user} game={game} playtype={playtype} /> highlighted{" "}
							{subMessage}!
						</span>
						{mutedText && (
							<>
								<br />
								<Muted>{mutedText}</Muted>
							</>
						)}
					</div>

					<div className="timeline-content-timestamp">
						{MillisToSince(data.scores[0].timeAchieved ?? 0)}
						<br />
						<span className="text-body-secondary fst-italic text-end">
							{FormatTime(data.scores[0].timeAchieved ?? 0)}
						</span>
					</div>
				</div>

				{show && (
					<>
						<Divider />
						<ScoreTable
							noTopDisplayStr
							dataset={dataset}
							game={game}
							playtype={playtype}
						/>
					</>
				)}
			</div>
		</div>
	);
}

function GoalActivity({
	data,
	user,
	shouldShowGame,
}: {
	data: ClumpedActivityGoalAchievement;
	user: UserDocument;
	shouldShowGame: boolean;
}) {
	const { game, playtype } = data.goals[0];

	const prettyGame = shouldShowGame ? `${FormatGame(game, playtype)} ` : "";

	const [show, setShow] = useState(false);

	let subMessage;
	let mutedText: string | null | undefined;

	if (data.goals.length === 1) {
		const goal0 = data.goals[0];

		subMessage = `${goal0.__related.goal.name}${
			shouldShowGame ? ` in ${FormatGame(game, playtype)}` : ""
		}!`;
	} else {
		subMessage = `${data.goals.length} ${prettyGame}goals`;

		mutedText = TruncateString(data.goals.map((e) => e.__related.goal.name).join(", "), 100);
	}

	return (
		<div className="timeline-item timeline-hover my-4">
			<div className="timeline-badge bg-warning"></div>
			<div className="timeline-content">
				<div className="timeline-content-inner" onClick={() => setShow(!show)}>
					<div className="timeline-content-title">
						<span className="me-2">
							<ProfilePicture size="sm" user={user} toGPT={{ game, playtype }} />
						</span>
						<Icon
							type={`chevron-${show ? "down" : "right"}`}
							style={{
								fontSize: "0.75rem",
							}}
						/>
						<span style={{ fontSize: "1.15rem" }} className="ms-2">
							<UGPTLink reqUser={user} game={game} playtype={playtype} /> achieved{" "}
							{subMessage}!
						</span>
						{mutedText && (
							<>
								<br />
								<Muted>{mutedText}</Muted>
							</>
						)}
					</div>

					<div className="timeline-content-timestamp">
						{MillisToSince(data.goals[0]?.timeAchieved ?? 0)}
						<br />
						<span className="text-body-secondary fst-italic text-end">
							{FormatTime(data.goals[0]?.timeAchieved ?? 0)}
						</span>
					</div>
				</div>

				{show && (
					<>
						<Divider />
						<div className="ps-4">
							{data.goals.map((e) => (
								<InnerQuestSectionGoal
									goal={e.__related.goal}
									goalSubOverride={e}
									key={e.goalID}
								/>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function QuestActivity({
	data,
	user,
	shouldShowGame,
}: {
	data: ClumpedActivityQuestAchievement;
	user: UserDocument;
	shouldShowGame: boolean;
}) {
	const { game, playtype } = data.quest;

	const prettyGame = shouldShowGame ? FormatGame(game, playtype) : "";

	return (
		<div className="timeline-item timeline-hover my-4">
			<div className="timeline-badge bg-warning"></div>
			<div className="timeline-content">
				<div className="timeline-content-inner">
					<div className="timeline-content-title">
						<span style={{ fontSize: "1.15rem" }}>
							<span className="me-2">
								<ProfilePicture size="sm" user={user} toGPT={{ game, playtype }} />
							</span>
							<UGPTLink reqUser={user} game={game} playtype={playtype} /> completed
							the{" "}
							<Link
								className="text-decoration-none"
								to={`/games/${game}/${playtype}/quests/${data.quest.questID}`}
							>
								{data.quest.name}
							</Link>{" "}
							quest{prettyGame && ` in ${prettyGame}`}!
						</span>
					</div>

					<div className="timeline-content-timestamp">
						{MillisToSince(data.sub.timeAchieved ?? 0)}
						<br />
						<span className="text-body-secondary fst-italic text-end">
							{FormatTime(data.sub.timeAchieved ?? 0)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function SessionActivity({
	data,
	user,
	shouldShowGame,
}: {
	data: ClumpedActivitySession;
	user: UserDocument;
	shouldShowGame: boolean;
}) {
	const [show, setShow] = useState(false);
	const { user: loggedInUser } = useContext(UserContext);

	const prettyGame = shouldShowGame ? `${FormatGame(data.game, data.playtype)} ` : "";

	const isProbablyActive = Date.now() - data.timeEnded < ONE_HOUR;

	const { game, playtype } = data;

	return (
		<div className="timeline-item timeline-hover">
			<div className={`timeline-badge bg-${data.highlight ? "warning" : "secondary"}`}></div>
			<div className="timeline-content">
				<div className="timeline-content-inner" onClick={() => setShow(!show)}>
					<div className="timeline-content-title">
						<span className="me-2">
							<ProfilePicture size="sm" user={user} toGPT={{ game, playtype }} />
						</span>
						<Icon
							type={`chevron-${show ? "down" : "right"}`}
							style={{
								fontSize: "0.75rem",
							}}
						/>
						<span
							className="ms-2"
							style={{
								fontWeight: isProbablyActive ? "bold" : undefined,
								fontSize: isProbablyActive ? "1.2rem" : undefined,
							}}
						>
							{/* worst string formatting ever */}
							<UGPTLink
								reqUser={user}
								game={data.game}
								playtype={data.playtype}
							/>{" "}
							{isProbablyActive
								? user.id === loggedInUser?.id
									? "are having"
									: "is having"
								: "had"}{" "}
							a {prettyGame}
							session '{data.name}' with {data.scoreIDs.length}{" "}
							{data.scoreIDs.length === 1 ? "score" : "scores"}
							{data.highlight ? "!" : "."}
						</span>
						<br />
						{data.desc && data.desc !== "This session has no description." && (
							<span className="text-body-secondary">{data.desc}</span>
						)}
					</div>

					<div className="timeline-content-timestamp">
						{MillisToSince(data.timeStarted ?? 0)}
						<br />
						<span className="text-body-secondary fst-italic text-end">
							{FormatTime(data.timeStarted ?? 0)}
						</span>
					</div>
				</div>
				{show && <SessionShower sessionID={data.sessionID} />}
			</div>
		</div>
	);
}

function SessionShower({ sessionID }: { sessionID: string }) {
	const { data, error } = useApiQuery<SessionReturns>(`/sessions/${sessionID}`);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const scoreMap = CreateScoreIDMap(data.scores);

	const gptConfig = GetGamePTConfig(data.session.game, data.session.playtype);

	const raises = data.scoreInfo.filter((e) => {
		const score = scoreMap.get(e.scoreID);

		// shouldnt happen, but whatever
		if (!score) {
			return false;
		}

		const enumMetrics = GetScoreEnumConfs(gptConfig);

		// for all enum metrics, check if this score beats the minimum relevant enum
		// and is a raise.
		for (const [metric, conf] of Object.entries(enumMetrics)) {
			if (!e.isNewScore && e.deltas[metric] <= 0) {
				continue;
			}

			if (
				// @ts-expect-error its gonna exist buddy
				score.scoreData.enumIndexes[metric] > conf.values.indexOf(conf.minimumRelevantValue)
			) {
				return true;
			}
		}

		return false;
	});

	if (raises.length === 0) {
		return (
			<Row className="mt-4">
				<div className="d-flex w-100 justify-content-center flex-column">
					<div className="mb-4">This session had no raises.</div>
					<div>
						<LinkButton
							variant="outline-primary"
							to={`/u/${data.user.username}/games/${data.session.game}/${data.session.playtype}/sessions/${sessionID}`}
						>
							View Full Session
						</LinkButton>
					</div>
				</div>
			</Row>
		);
	}

	return (
		<Row className="mt-4">
			<SessionRaiseBreakdown sessionData={data} setScores={NO_OP} />
			<Col xs={12}>
				<Divider />
			</Col>
			<div className="d-flex w-100 justify-content-center">
				<LinkButton
					variant="outline-primary"
					to={`/u/${data.user.username}/games/${data.session.game}/${data.session.playtype}/sessions/${sessionID}`}
				>
					View Full Session
				</LinkButton>
			</div>
		</Row>
	);
}

function ClassAchievementActivity({
	data,
	user,
	shouldShowGame,
}: {
	data: ClumpedActivityClassAchievement;
	user: UserDocument;
	shouldShowGame: boolean;
}) {
	return (
		<div className="timeline-item timeline-hover">
			<div className="timeline-badge bg-success"></div>
			<div className="timeline-content">
				<div className="timeline-content-inner">
					<div className="timeline-content-title">
						<span className="me-2">
							<ProfilePicture
								size="sm"
								user={user}
								toGPT={{ game: data.game, playtype: data.playtype }}
							/>
						</span>
						<UGPTLink reqUser={user} game={data.game} playtype={data.playtype} />{" "}
						achieved{" "}
						<ClassBadge
							classSet={data.classSet}
							game={data.game}
							playtype={data.playtype}
							classValue={data.classValue}
						/>
						{shouldShowGame && ` in ${FormatGame(data.game, data.playtype)}`}!
						{data.classOldValue !== null && (
							<>
								{" "}
								(Raised from{" "}
								<ClassBadge
									classSet={data.classSet}
									game={data.game}
									playtype={data.playtype}
									classValue={data.classOldValue}
								/>
								)
							</>
						)}
					</div>

					<div className="timeline-content-timestamp">
						{MillisToSince(data.timeAchieved)}
						<br />
						<span className="text-body-secondary fst-italic text-end">
							{FormatTime(data.timeAchieved)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function UGPTLink({ reqUser, game, playtype }: UGPT) {
	// currently
	const { user } = useContext(UserContext);

	return (
		<Link
			to={`/u/${reqUser.username}/games/${game}/${playtype}`}
			className="text-decoration-none fw-bold"
		>
			{user?.id === reqUser.id ? "You" : reqUser.username}
			{reqUser?.isSupporter ? (
				<>
					{" "}
					<SupporterIcon />
				</>
			) : (
				<></>
			)}
		</Link>
	);
}
