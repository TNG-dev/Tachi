import { APIFetchV1 } from "util/api";
import Divider from "components/util/Divider";
import ExternalLink from "components/util/ExternalLink";
import { BannedContext } from "context/BannedContext";
import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ServerStatus } from "types/api-returns";

export function Footer() {
	const [serverVersion, setServerVersion] = useState("Loading...");
	const { setBanned } = useContext(BannedContext);

	useEffect(() => {
		APIFetchV1<ServerStatus>("/status").then((r) => {
			if (r.statusCode === 403) {
				setBanned(true);
			}

			if (!r.success) {
				setServerVersion("Error Fetching data!");
			} else {
				setServerVersion(r.body.version);
			}
		});
	}, []);

	return (
		<>
			<Divider className="mt-8" />

			<div className="footer py-4 d-flex flex-lg-column" id="kt_footer">
				<div className="container d-flex flex-column flex-md-row align-items-center justify-content-between">
					<div className="order-2 order-md-1">
						{/* is there a better way to do this? mt-md-3 is the intent */}
						<ExternalLink
							href="https://en.wikipedia.org/wiki/Dummy_(album)"
							className="gentle-link"
						>
							{serverVersion}
						</ExternalLink>
					</div>

					<div className="nav nav-dark order-1 order-md-2 justify-content-center">
						<Link
							to="/support"
							className="nav-link px-3"
							onClick={() => window.scrollTo(0, 0)}
						>
							Support
						</Link>
						<ExternalLink
							href="https://docs.bokutachi.xyz/wiki/rules"
							className="nav-link px-3"
						>
							Rules
						</ExternalLink>
						<Link
							to="/privacy"
							className="nav-link px-3"
							onClick={() => window.scrollTo(0, 0)}
						>
							GDPR
						</Link>
						<Link
							to="/credits"
							className="nav-link px-3"
							onClick={() => window.scrollTo(0, 0)}
						>
							Credits
						</Link>
						{process.env.VITE_DISCORD && (
							<a
								href={process.env.VITE_DISCORD}
								target="_blank"
								rel="noopener noreferrer"
								className="nav-link px-3"
							>
								Discord
							</a>
						)}
						<a
							href="https://github.com/tng-dev/tachi"
							target="_blank"
							rel="noopener noreferrer"
							className="nav-link px-3"
						>
							Source Code
						</a>
						<a
							href="https://docs.bokutachi.xyz/"
							target="_blank"
							rel="noopener noreferrer"
							className="nav-link px-3"
						>
							Developer Documentation
						</a>
					</div>
				</div>
			</div>
		</>
	);
}
