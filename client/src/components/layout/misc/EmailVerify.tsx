import { APIFetchV1 } from "util/api";
import { ONE_MINUTE } from "util/constants/time";
import Divider from "components/util/Divider";
import Muted from "components/util/Muted";
import { UserContext } from "context/UserContext";
import React, { useContext, useEffect } from "react";
import { Button } from "react-bootstrap";
import toast from "react-hot-toast";
import { SetState } from "types/react";
import useSetSubheader from "../header/useSetSubheader";

export default function EmailVerify({
	setHasVerifiedEmail,
}: {
	setHasVerifiedEmail: SetState<boolean | null>;
}) {
	useSetSubheader("Email Verification...");

	const { user } = useContext(UserContext);

	async function CheckEmail() {
		const r = await APIFetchV1(`/users/${user!.id}/is-email-verified`);

		if (r.success && r.body) {
			setHasVerifiedEmail(true);
		}

		return r.success ? r.body : false;
	}

	useEffect(() => {
		const interval = setInterval(CheckEmail, ONE_MINUTE);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="col-12 col-lg-6 offset-lg-3 text-center" style={{ fontSize: "1.4rem" }}>
			One last thing! You need to verify your email before you can use the site.
			<br />
			An email has been sent to the address you signed up with. (<code>{email}</code>)
			<br />
			It might've ended up in your spam, so check there too!
			<br />
			<b>
				Our domain ends with <code>.xyz</code>! As such, most email services will throw our
				email in spam, or hold it in limbo for a couple minutes. Please be patient. Sending
				email from an <code>.xyz</code> domain SUCKS!
			</b>
			<Divider />
			<Button
				onClick={async () => {
					const res = await CheckEmail();

					if (!res) {
						toast.error(
							"Looks like your email isn't verified. If you're having issues, contact us in the discord."
						);
					}
				}}
			>
				Yup, verified my email.
			</Button>
			<Divider />
			<a
				style={{ fontSize: "1.1rem" }}
				href="#"
				onClick={async () => {
					await APIFetchV1("/auth/resend-verify-email", {
						method: "POST",
					});

					toast.success("Sent a new email to your address.");
				}}
			>
				I haven't got it. Re-send the email!
			</a>
			<br />
			<span style={{ fontSize: "1rem" }}>
				<Muted>
					Can't get the email? Signed up with a fake email like an idiot? You'll have to
					contact us at the discord below.
				</Muted>
			</span>
		</div>
	);
}
