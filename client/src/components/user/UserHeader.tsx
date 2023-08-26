import { APIFetchV1 } from "util/api";
import { FormatDate } from "util/time";
import Navbar from "components/nav/Navbar";
import NavItem from "components/nav/NavItem";
import Divider from "components/util/Divider";
import ExternalLink from "components/util/ExternalLink";
import Icon from "components/util/Icon";
import Muted from "components/util/Muted";
import { UserContext } from "context/UserContext";
import { ClientConfig } from "lib/config";
import React, { useContext, useState } from "react";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import { UserAuthLevels, UserDocument } from "tachi-common";
import { SetState } from "types/react";
import FollowUserButton from "components/util/FollowUserButton";
import ProfileBadges from "./ProfileBadges";
import ProfilePicture from "./ProfilePicture";

export function UserHeaderBody({ reqUser }: { reqUser: UserDocument }) {
	function ConditionalSocialMediaRender({
		mode,
		href,
	}: {
		mode: "discord" | "twitter" | "github" | "steam" | "youtube" | "twitch";
		href?: string;
	}) {
		if (!reqUser.socialMedia[mode]) {
			return null;
		}

		return (
			<li>
				<Icon brand type={mode} />{" "}
				<ExternalLink
					className="text-decoration-none"
					href={href ? href + reqUser.socialMedia[mode] : undefined}
				>
					{reqUser.socialMedia[mode]}
				</ExternalLink>
			</li>
		);
	}

	const { user: loggedInUser } = useContext(UserContext);

	return (
		<>
			<div className="col-12 col-lg-3">
				<div className="d-flex justify-content-center mb-3">
					<ProfilePicture user={reqUser} />
				</div>
				<div className="d-flex align-items-center" style={{ flexDirection: "column" }}>
					<ProfileBadges user={reqUser} />
				</div>
				<div className="d-block d-lg-none">
					<Divider className="mt-4 mb-4" />
				</div>
			</div>
			<div className="col-12 col-lg-6 d-flex justify-content-center flex-column align-items-center">
				<StatusComponent reqUser={reqUser} />
				{loggedInUser?.authLevel === UserAuthLevels.ADMIN && (
					<>
						<Divider />
						{reqUser.isSupporter ? (
							<Button
								onClick={() =>
									APIFetchV1(
										`/admin/supporter/${reqUser.id}`,
										{ method: "DELETE" },
										true,
										true
									).then(() => window.location.reload())
								}
								variant="danger"
							>
								Remove Supporter Rank?
							</Button>
						) : (
							<Button
								onClick={() =>
									APIFetchV1(
										`/admin/supporter/${reqUser.id}`,
										{ method: "POST" },
										true,
										true
									).then(() => window.location.reload())
								}
								variant="primary"
							>
								Make Supporter?
							</Button>
						)}
					</>
				)}
			</div>
			<div className="col-12 col-lg-3 d-flex justify-content-center">
				<ul>
					<ConditionalSocialMediaRender mode="discord" />
					<ConditionalSocialMediaRender href="https://github.com/" mode="github" />
					<ConditionalSocialMediaRender
						href="https://steamcommunity.com/id/"
						mode="steam"
					/>
					<ConditionalSocialMediaRender href="https://twitch.tv/" mode="twitch" />
					<ConditionalSocialMediaRender href="https://twitter.com/" mode="twitter" />
					<ConditionalSocialMediaRender
						href="https://youtube.com/channel/"
						mode="youtube"
					/>
					<li>
						<Muted>UserID: {reqUser.id}</Muted>
					</li>
					<li>
						<Muted>Joined: {FormatDate(reqUser.joinDate)}</Muted>
					</li>
				</ul>
			</div>
			{loggedInUser && reqUser.id !== loggedInUser.id && (
				<div className="col-12 mt-8">
					<Divider />
					<div className="d-flex w-100 justify-content-center ">
						<FollowUserButton userToFollow={reqUser} />
					</div>
				</div>
			)}
		</>
	);
}

export function UserBottomNav({ baseUrl, reqUser }: { baseUrl: string; reqUser: UserDocument }) {
	const { user } = useContext(UserContext);

	const isRequestedUser = !!(user && user.id === reqUser.id);

	const navItems = [
		<NavItem key="about" to={`${baseUrl}/`}>
			Overview
		</NavItem>,
		<NavItem key="games" to={`${baseUrl}/games`}>
			Games
		</NavItem>,
	];

	if (isRequestedUser) {
		navItems.push(
			<NavItem key="integrations" to={`${baseUrl}/integrations`}>
				Service Integrations
			</NavItem>
		);
		navItems.push(
			<NavItem key="imports" to={`${baseUrl}/imports`}>
				Imports
			</NavItem>
		);

		// If mandates login, assume that we also use invite codes.
		// I'm sure we could set up an elaborate way of doing this by
		// querying the server, but I just don't care.
		if (ClientConfig.MANDATE_LOGIN) {
			navItems.push(
				<NavItem key="invites" to={`${baseUrl}/invites`}>
					Invites
				</NavItem>
			);
		}

		navItems.push(
			<NavItem key="settings" to={`${baseUrl}/settings`}>
				Profile Settings
			</NavItem>
		);
	}

	return (
		<div className="mx-n9 align-items-center mb-0">
			<Navbar>{navItems}</Navbar>
		</div>
	);
}

function StatusComponent({ reqUser }: { reqUser: UserDocument }) {
	const { user } = useContext(UserContext);

	const isRequestedUser = user?.id === reqUser.id;

	const [modalShow, setModalShow] = useState(false);

	return (
		<div className="row text-center">
			<div className="col-12">
				{reqUser.status ? (
					<span>{reqUser.status}</span>
				) : (
					<Muted>
						{isRequestedUser ? "You have" : `${reqUser.username} has`} no status...
					</Muted>
				)}
			</div>
			<div className="col-12">
				{isRequestedUser && (
					<a
						href="#"
						className="link-opacity-75 link-opacity-100-hover text-decoration-none transition-color"
						onClick={() => setModalShow(true)}
					>
						Change Status
					</a>
				)}
			</div>
			{/* <div className="col-12">
				<Muted>Last Seen: {MillisToSince(reqUser.lastSeen)}</Muted>
			</div> */}
			<ChangeStatusModal
				reqUser={reqUser}
				modalShow={modalShow}
				setModalShow={setModalShow}
			/>
		</div>
	);
}

function ChangeStatusModal({
	modalShow,
	setModalShow,
	reqUser,
}: {
	modalShow: boolean;
	setModalShow: SetState<boolean>;
	reqUser: UserDocument;
}) {
	const [status, setStatus] = useState(reqUser.status);
	const [innerStatus, setInnerStatus] = useState(reqUser.status ?? "");

	return (
		<Modal show={modalShow} onHide={() => setModalShow(false)}>
			<Modal.Header closeButton>
				<Modal.Title>Change Status</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form
					onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
						e.preventDefault();

						APIFetchV1(
							"/users/me",
							{
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									status: innerStatus || null,
								}),
							},
							true,
							true
						).then((r) => {
							if (r.success) {
								setStatus(innerStatus);
								reqUser.status = innerStatus;
								setModalShow(false);
							}
						});
					}}
				>
					<Form.Group>
						<InputGroup size="lg">
							<Form.Control
								type="text"
								placeholder={status ?? "I'm gaming..."}
								value={innerStatus}
								onChange={(e) => setInnerStatus(e.target.value)}
							/>
							<Button variant="primary" type="submit">
								Submit
							</Button>
						</InputGroup>
					</Form.Group>
				</Form>
			</Modal.Body>
		</Modal>
	);
}
