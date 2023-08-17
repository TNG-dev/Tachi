import React, { useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import Icon from "./Icon";
import Muted from "./Muted";

export default function EditableText({
	as = "p",
	onSubmit,
	initialText,
	placeholderText,
	className,
	authorised,
}: {
	as?: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
	onSubmit: (value: string) => void;
	initialText: string;
	placeholderText: string;
	className?: string;
	authorised: boolean;
}) {
	const [text, setText] = useState(initialText);
	const [editing, setEditing] = useState(false);

	if (editing) {
		return (
			<InputGroup>
				<Form.Control
					value={text}
					placeholder={placeholderText}
					onChange={(e) => setText(e.target.value)}
				/>
				<Button
					variant="success"
					type="submit"
					onClick={() => {
						setEditing(false);
						onSubmit(text);
					}}
				>
					Change
				</Button>
			</InputGroup>
		);
	}

	return (
		<div
			onClick={() => authorised && setEditing(true)}
			className={`d-flex gap-2 ${authorised ? "cursor-pointer" : ""}`}
		>
			{React.createElement(as, { className }, text ? text : <Muted>{placeholderText}</Muted>)}
			{authorised && <Icon type="pencil-alt" />}
		</div>
	);
}
