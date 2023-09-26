import { APIFetchV1 } from "util/api";
import ProfilePicture from "components/user/ProfilePicture";
import React, { useEffect, useState } from "react";
import { Button, Col, Modal, Row } from "react-bootstrap";
import { integer, UserDocument } from "tachi-common";
import { SetState } from "types/react";
import DebounceSearch from "../DebounceSearch";
import Divider from "../Divider";

export default function UserSelectModal({
	callback,
	show,
	setShow,
	url = `/users`,
	excludeSet = [],
	excludeMsg = "N/A",
}: {
	show: boolean;
	setShow: SetState<boolean>;
	callback: (user: UserDocument) => void;
	url?: string;
	excludeSet?: Array<integer>;
	excludeMsg?: string;
}) {
	const [search, setSearch] = useState("");
	const [users, setUsers] = useState<Array<UserDocument> | null>(null);
	const [errMsg, setErrMsg] = useState<string | null>(null);

	useEffect(() => {
		if (!search) {
			return;
		}

		const searchParams = new URLSearchParams();
		searchParams.set("search", search);

		APIFetchV1<UserDocument[]>(`${url}?${searchParams.toString()}`).then((res) => {
			if (res.success) {
				setErrMsg(null);

				setUsers(res.body);
			} else {
				setErrMsg(res.description);
			}
		});
	}, [search]);

	return (
		<Modal size="xl" show={show} onHide={() => setShow(false)}>
			<Modal.Header closeButton>
				<Modal.Title>Search Users</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Row>
					<Col xs={12}>
						<DebounceSearch setSearch={setSearch} placeholder="Search users..." />
						<Divider />
						<span className="text-danger">{errMsg}</span>
						<div className="d-flex justify-content-center flex-wrap">
							{users &&
								users.map((user) => (
									<div className="text-center p-8" key={user.id}>
										<ProfilePicture user={user} />
										<h4 className="mt-2">{user.username}</h4>
										{excludeSet.includes(user.id) ? (
											<Button variant="outline-secondary" disabled>
												{excludeMsg}
											</Button>
										) : (
											<Button
												variant="outline-success"
												onClick={() => callback(user)}
											>
												Select
											</Button>
										)}
									</div>
								))}
						</div>
					</Col>
				</Row>
			</Modal.Body>
		</Modal>
	);
}
