import { APIFetchV1 } from "util/api";
import QuickTooltip from "components/layout/misc/QuickTooltip";
import Icon from "components/util/Icon";
import { UserContext } from "context/UserContext";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import { ScoreDocument } from "tachi-common";
import { SetState } from "types/react";

export default function ScoreEditButtons({
	score,
	scoreState,
	onScoreUpdate,
}: {
	score: ScoreDocument;
	onScoreUpdate?: (sc: ScoreDocument) => void;
	scoreState: {
		highlight: boolean;
		comment: string | null;
		setHighlight: SetState<boolean>;
		setComment: SetState<string | null>;
	};
}) {
	const { user } = useContext(UserContext);

	const { highlight, setHighlight, comment, setComment } = scoreState;

	const [show, setShow] = useState(false);

	return (
		<div className="mt-4 d-flex w-100 justify-content-center">
			<div className="btn-group">
				{user?.id === score.userID && (
					<>
						{comment ? (
							<>
								<QuickTooltip tooltipContent="Edit your comment on this score.">
									<Button
										variant="outline-secondary text-light-hover"
										className="text-body"
										onClick={() => setShow(true)}
									>
										<Icon type="file-signature" /> Edit Comment
									</Button>
								</QuickTooltip>
							</>
						) : (
							<QuickTooltip tooltipContent="Comment on this score.">
								<Button
									variant="outline-secondary text-light-hover"
									className="text-body"
									onClick={() => setShow(true)}
								>
									<Icon type="file-signature" /> Comment
								</Button>
							</QuickTooltip>
						)}

						{highlight ? (
							<QuickTooltip tooltipContent="Unhighlight this score.">
								<Button
									variant="outline-danger"
									onClick={() =>
										ModifyScore(score.scoreID, { highlight: false }).then(
											(r) => {
												if (r) {
													setHighlight(false);
													score.highlight = false;
													onScoreUpdate?.(score);
												}
											}
										)
									}
								>
									<Icon type="star" /> Un-Highlight
								</Button>
							</QuickTooltip>
						) : (
							<QuickTooltip tooltipContent="Highlight this score.">
								<Button
									variant="outline-secondary"
									className="text-body text-light-hover"
									onClick={() =>
										ModifyScore(score.scoreID, { highlight: true }).then(
											(r) => {
												if (r) {
													setHighlight(true);
													score.highlight = true;
													onScoreUpdate?.(score);
												}
											}
										)
									}
								>
									<Icon type="star" /> Highlight
								</Button>
							</QuickTooltip>
						)}
					</>
				)}
			</div>
			<CommentModal
				show={show}
				setShow={setShow}
				initialComment={comment}
				onUpdate={(comment) => {
					ModifyScore(score.scoreID, { comment }).then((r) => {
						if (r) {
							setComment(comment);
							score.comment = comment;
							setShow(false);
							onScoreUpdate?.(score);
						}
					});
				}}
			/>
		</div>
	);
}

export async function ModifyScore(
	scoreID: string,
	content: { comment?: string | null; highlight?: boolean }
) {
	const res = await APIFetchV1(
		`/scores/${scoreID}`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(content),
		},
		true,
		true
	);

	return res.success;
}

export function CommentModal({
	show,
	setShow,
	initialComment,
	onUpdate,
}: {
	show: boolean;
	setShow: SetState<boolean>;
	initialComment: string | null;
	onUpdate: (newComment: string | null) => void;
}) {
	const [innerComment, setInnerComment] = useState(initialComment ?? "");

	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (show && ref.current) {
			ref.current.focus();
		}
	}, [show]);

	return (
		<Modal show={show} onHide={() => setShow(false)}>
			<Modal.Header closeButton>
				<Modal.Title>Edit Comment</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form
					onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
						e.preventDefault();

						if (innerComment === "") {
							onUpdate(null);
						} else {
							onUpdate(innerComment);
						}
					}}
				>
					<Form.Group>
						<InputGroup size="lg">
							<Form.Control
								ref={ref}
								autoFocus
								type="text"
								placeholder={initialComment ?? "This score was great!"}
								value={innerComment}
								onChange={(e) => setInnerComment(e.target.value)}
							/>

							<Button variant="primary" type="submit">
								Submit
							</Button>
						</InputGroup>
					</Form.Group>

					{initialComment !== null && (
						<QuickTooltip tooltipContent="Remove your comment on this score.">
							<Button
								variant="outline-danger"
								onClick={() => {
									onUpdate(null);

									setInnerComment("");
								}}
							>
								<Icon noPad type="trash" />
							</Button>
						</QuickTooltip>
					)}
				</Form>
			</Modal.Body>
		</Modal>
	);
}
