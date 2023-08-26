import { CreateGoalMap, GetGoalIDsFromQuest } from "util/data";
import { CreateQuestSubMap } from "util/misc";
import { NumericSOV } from "util/sorts";
import Quest from "components/targets/quests/Quest";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import Select from "components/util/Select";
import React, { useMemo, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { GoalDocument, QuestDocument, QuestSubscriptionDocument } from "tachi-common";
import { UGPT } from "types/react";

export default function UGPTQuestsPage({ reqUser, game, playtype }: UGPT) {
	const [show, setShow] = useState<"all" | "unachieved" | "achieved">("all");

	const { data, error } = useApiQuery<{
		questSubs: Array<QuestSubscriptionDocument>;
		quests: Array<QuestDocument>;
		goals: Array<GoalDocument>;
	}>(`/users/${reqUser.id}/games/${game}/${playtype}/targets/quests`);

	const questsToShow = useMemo(() => {
		if (!data || error) {
			return [];
		}

		const questSubMap = CreateQuestSubMap(data.questSubs);

		// slice and sort based on progress
		let base = data.quests.slice(0).sort(
			NumericSOV((quest) => {
				const sub = questSubMap.get(quest.questID);

				if (!sub) {
					return -Infinity; // shouldn't happen
				}

				// sink achieved things below goals in progress
				if (sub.achieved) {
					return -100;
				}

				// since this is always ostensibly positive, the magic numbers -99 and
				// -100 should be fine.
				return sub.progress / GetGoalIDsFromQuest(quest).length;
			}, true)
		);

		// filter on "show" setting
		switch (show) {
			case "all":
				break;
			case "achieved":
				base = base.filter((e) => questSubMap.get(e.questID)?.achieved === true);
				break;
			case "unachieved":
				base = base.filter((e) => questSubMap.get(e.questID)?.achieved === false);
				break;
		}

		return base;
	}, [data, show]);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	const goalMap = CreateGoalMap(data.goals);

	return (
		<Row>
			<Col xs={12}>
				<Divider />
				<div className="ps-6">
					<div className="d-flex w-100 justify-content-start">
						<Select value={show} setValue={setShow} name="What quests should we show?">
							<option value="all">All</option>
							<option value="unachieved">Unachieved</option>
							<option value="achieved">Achieved</option>
						</Select>
					</div>
				</div>
				<Divider />
			</Col>
			{questsToShow.length === 0 && (
				<Col xs={12}>
					<div className="text-center">
						Looks like you have no quests set.
						<br />
						<Link to={`/games/${game}/${playtype}/quests`}>Go set some!</Link>
					</div>
				</Col>
			)}
			{questsToShow.map((quest) => (
				<Col xs={12} lg={6} className="mb-4" key={quest.questID}>
					<Quest goals={goalMap} quest={quest} />
				</Col>
			))}
		</Row>
	);
}
