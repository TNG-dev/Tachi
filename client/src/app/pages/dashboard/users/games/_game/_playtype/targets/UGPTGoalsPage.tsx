import { CreateGoalSubDataset } from "util/data";
import { APIFetchV1 } from "util/api";
import GoalSubInfo from "components/targets/GoalSubInfo";
import ApiError from "components/util/ApiError";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import React, { useContext, useReducer, useState } from "react";
import { Button, Col } from "react-bootstrap";
import { AllUGPTGoalsReturn } from "types/api-returns";
import { UGPT } from "types/react";
import { FormatGame } from "tachi-common";
import { Link } from "react-router-dom";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import AddNewGoalForQuestModal from "components/targets/AddNewGoalForQuestModal";
import { TargetsContext } from "context/TargetsContext";
import DeleteGoalsModal from "components/targets/DeleteGoalsModal";

export default function UGPTGoalsPage({ reqUser, game, playtype }: UGPT) {
	const [show, setShow] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const { reloadTargets } = useContext(TargetsContext);
	const [refresh, refetchGoals] = useReducer((x) => x + 1, 0);

	const { data, error } = useApiQuery<AllUGPTGoalsReturn>(
		`/users/${reqUser.id}/games/${game}/${playtype}/targets/goals`,
		undefined,
		[refresh.toString()]
	);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const userMap = new Map([[reqUser.id, reqUser]]);

	const dataset = CreateGoalSubDataset(data, userMap);

	return (
		<div>
			<Col xs={12}>
				<Button
					variant="outline-success"
					size="lg"
					className="mb-4 w-100"
					onClick={() => setShow(true)}
				>
					<Icon type="bullseye" /> Add New Goal
				</Button>
				<Button
					variant="outline-danger"
					size="lg"
					className="mb-4 w-100"
					onClick={() => setShowDelete(true)}
				>
					<Icon type="trash" /> Delete Goals
				</Button>
				<div>
					Looking for goal recommendations?{" "}
					<Link to={`/games/${game}/${playtype}/quests`}>
						Check out {FormatGame(game, playtype)}'s Quests
					</Link>
					.
				</div>
				<Divider />
				<GoalSubInfo dataset={dataset} game={game} playtype={playtype} />
			</Col>
			{show && (
				<AddNewGoalForQuestModal
					game={game}
					playtype={playtype}
					show={show}
					setShow={setShow}
					noNote
					onCreate={async (rawGoal) => {
						await APIFetchV1(
							`/users/${reqUser.id}/games/${game}/${playtype}/targets/goals/add-goal`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									criteria: rawGoal.goal.criteria,
									charts: rawGoal.goal.charts,
								}),
							},
							true,
							true
						);

						refetchGoals();
						reloadTargets();
					}}
				/>
			)}
			{showDelete && (
				<DeleteGoalsModal
					show={showDelete}
					setShow={setShowDelete}
					dataset={dataset}
					onDelete={async (goalID) => {
						await APIFetchV1(
							`/users/${reqUser.id}/games/${game}/${playtype}/targets/goals/${goalID}`,
							{
								method: "DELETE",
							},
							true,
							true
						);

						refetchGoals();

						reloadTargets();
					}}
				/>
			)}
		</div>
	);
}
