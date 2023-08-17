import { ChangeAtPosition, CopyToClipboard, DeleteInPosition } from "util/misc";
import Card from "components/layout/page/Card";
import AddNewGoalForQuestModal from "components/targets/AddNewGoalForQuestModal";
import Divider from "components/util/Divider";
import EditableText from "components/util/EditableText";
import Icon from "components/util/Icon";
import Muted from "components/util/Muted";
import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FormatGame } from "tachi-common";
import { GamePT } from "types/react";
import { RawQuestDocument, RawQuestGoal, RawQuestSection } from "types/tachi";
import QuickTooltip from "components/layout/misc/QuickTooltip";

export default function EditableQuest({
	quest,
	onChange,
	onDelete,
}: {
	quest: RawQuestDocument;
	onChange: (rq: RawQuestDocument) => void;
	onDelete: () => void;
}) {
	return (
		<Card
			header={
				<div className="vstack gap-2">
					<EditableText
						as="h1"
						initialText={quest.name}
						placeholderText={quest.name || "Untitled Quest"}
						onSubmit={(name) =>
							onChange({
								...quest,
								name,
							})
						}
						authorised
					/>

					<EditableText
						initialText={quest.desc}
						placeholderText={quest.desc || "Please set a description."}
						onSubmit={(desc) =>
							onChange({
								...quest,
								desc,
							})
						}
						authorised
					/>

					<Muted>Game: {FormatGame(quest.game, quest.playtype)}</Muted>
				</div>
			}
		>
			{quest.rawQuestData.map((e, i) => (
				<React.Fragment key={i}>
					<QuestSection
						game={quest.game}
						playtype={quest.playtype}
						section={e}
						onChange={(newSection) =>
							onChange({
								...quest,
								rawQuestData: ChangeAtPosition(quest.rawQuestData, newSection, i),
							})
						}
						onDelete={() =>
							onChange({
								...quest,
								rawQuestData: DeleteInPosition(quest.rawQuestData, i),
							})
						}
					/>
					<Divider />
				</React.Fragment>
			))}
			<div className="d-flex w-100 justify-content-center">
				<Button
					variant="outline-success"
					onClick={() =>
						onChange({
							...quest,
							rawQuestData: [
								...quest.rawQuestData,
								{
									title: "Untitled Section",
									desc: "",
									rawGoals: [],
								},
							],
						})
					}
				>
					<Icon type="plus" />
					Add New Quest Section
				</Button>
			</div>
			<Divider />
			<div className="d-flex w-100">
				<div className="me-auto">
					<QuickTooltip tooltipContent="Copy this quest to your clipboard in a pretty format.">
						<Button
							variant="outline-info"
							onClick={() => {
								CopyToClipboard(FormatQuest(quest));
							}}
						>
							Copy To Clipboard
						</Button>
					</QuickTooltip>
				</div>
				<div className="ms-auto">
					<Button
						variant="outline-danger"
						onClick={() => {
							if (confirm("Are you absolutely sure you want to delete this quest?")) {
								onDelete();
							}
						}}
					>
						<Icon type="trash" noPad />
					</Button>
				</div>
			</div>
		</Card>
	);
}

function QuestSection({
	section,
	game,
	playtype,
	onChange,
	onDelete,
}: {
	section: RawQuestSection;
	onChange: (newSection: RawQuestSection) => void;
	onDelete: () => void;
} & GamePT) {
	const [show, setShow] = useState(false);

	return (
		<>
			<div className="vstack gap-2">
				<EditableText
					as="h4"
					initialText={section.title}
					placeholderText="Untitled Section"
					onSubmit={(title) =>
						onChange({
							...section,
							title,
						})
					}
					authorised
				/>

				<EditableText
					initialText={section.desc}
					placeholderText="No Description..."
					onSubmit={(desc) =>
						onChange({
							...section,
							desc,
						})
					}
					authorised
				/>
			</div>
			<br />
			{section.rawGoals.length === 0 ? (
				<Muted>No Goals...</Muted>
			) : (
				<ul>
					{section.rawGoals.map((e, i) => (
						<InnerQuestSectionGoal
							rawGoal={e}
							key={i}
							game={game}
							playtype={playtype}
							onInnerGoalChange={(newRawGoal) =>
								onChange({
									...section,
									rawGoals: ChangeAtPosition(section.rawGoals, newRawGoal, i),
								})
							}
							onInnerGoalDelete={() => {
								onChange({
									...section,
									rawGoals: DeleteInPosition(section.rawGoals, i),
								});
							}}
						/>
					))}
				</ul>
			)}
			<br />
			<div className="w-100 d-flex mt-8">
				<Button variant="outline-success" onClick={() => setShow(true)}>
					<Icon type="plus" /> Add Goal
				</Button>
				<Button
					className="ms-auto"
					variant="outline-danger"
					onClick={() => {
						if (confirm("Are you absolutely sure you want to delete this section?")) {
							onDelete();
						}
					}}
				>
					<Icon type="times" /> Delete Section
				</Button>
			</div>
			{show && (
				<AddNewGoalForQuestModal
					show={show}
					setShow={setShow}
					game={game}
					playtype={playtype}
					onCreate={(rawGoal) => {
						onChange({
							...section,
							rawGoals: [...section.rawGoals, rawGoal],
						});
					}}
				/>
			)}
		</>
	);
}

function InnerQuestSectionGoal({
	rawGoal,
	game,
	playtype,
	onInnerGoalChange,
	onInnerGoalDelete,
}: {
	rawGoal: RawQuestGoal;
	onInnerGoalChange: (newRawGoal: RawQuestGoal) => void;
	onInnerGoalDelete: () => void;
} & GamePT) {
	const [show, setShow] = useState(false);

	return (
		<li className="quest-goal">
			<div className="w-100 d-flex">
				<div className="me-auto">{rawGoal.goal.name}</div>

				<div className="ms-auto d-flex flex-nowrap">
					<div className="text-hover-white">
						<Icon type="pencil-alt" onClick={() => setShow(true)} />
					</div>
					<div className="ms-2 text-hover-white">
						<Icon
							type="trash"
							onClick={() => {
								if (
									confirm(
										`Are you sure you want to remove the goal "${rawGoal.goal.name}"?`
									)
								) {
									onInnerGoalDelete();
								}
							}}
						/>
					</div>
				</div>
			</div>
			{rawGoal.note && <Muted>{rawGoal.note}</Muted>}
			{show && (
				<AddNewGoalForQuestModal
					show={show}
					setShow={setShow}
					game={game}
					playtype={playtype}
					initialState={rawGoal}
					onCreate={(newRawGoal) => {
						onInnerGoalChange(newRawGoal);
					}}
				/>
			)}
		</li>
	);
}

function FormatQuest(quest: RawQuestDocument) {
	let str = `# QUEST: ${quest.name}
${quest.desc}
(Game: ${FormatGame(quest.game, quest.playtype)})`;

	for (const section of quest.rawQuestData) {
		str += `\n\n### ${section.title}`;

		if (section.desc) {
			str += `\n${section.desc}`;
		}

		str += "\n";

		for (const goal of section.rawGoals) {
			str += `\n-- ${goal.goal.name}`;

			if (goal.note) {
				str += `\n${goal.note}`;
			}
		}
	}

	return str;
}
