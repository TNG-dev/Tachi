import { APIFetchV1 } from "util/api";
import { ShortDelayify } from "util/misc";
import CenterPage from "components/util/CenterPage";
import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import SiteWordmark from "components/util/SiteWordmark";
import { ErrorPage } from "./ErrorPage";

export default function ResetPasswordPage() {
	const code = new URLSearchParams(window.location.search).get("code");
	const [password, setPassword] = useState("");
	const [confirmPass, setConfirmPass] = useState("");

	if (!code) {
		return <ErrorPage statusCode={400} />;
	}

	return (
		<CenterPage>
			<SiteWordmark />
			<h3>Reset Password</h3>
			<span className="fw-bold">Pick something you'll remember this time :)</span>
			<Form
				className="w-100 px-4 mt-8"
				style={{ maxWidth: "620px" }}
				onSubmit={async (e) => {
					e.preventDefault();

					const res = await APIFetchV1(
						"/auth/reset-password",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({ code, "!password": password }),
						},
						true,
						true
					);

					if (res.success) {
						ShortDelayify(() => (window.location.href = "/"));
					}
				}}
			>
				<Form.Group className="mb-6">
					<Form.Label>New Password</Form.Label>
					<Form.Control
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						isValid={password.length >= 8}
						type="password"
					/>
				</Form.Group>
				<Form.Group className="mb-6">
					<Form.Label>Confirm</Form.Label>
					<Form.Control
						value={confirmPass}
						onChange={(e) => setConfirmPass(e.target.value)}
						isValid={password === confirmPass && password.length >= 8}
						type="password"
					/>
				</Form.Group>
				<Form.Group className="justify-content-center d-flex">
					<Button
						tabIndex={3}
						type="submit"
						disabled={!(password === confirmPass && password.length >= 8)}
						className="mt-6"
					>
						Reset Password
					</Button>
				</Form.Group>
			</Form>
		</CenterPage>
	);
}
