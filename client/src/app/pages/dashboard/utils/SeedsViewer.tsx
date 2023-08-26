import { LoadCommit } from "util/seeds";
import useSetSubheader from "components/layout/header/useSetSubheader";
import SeedsPicker from "components/seeds/SeedsPicker";
import SeedsStateViewer from "components/seeds/SeedsStateViewer";
import Divider from "components/util/Divider";
import ExternalLink from "components/util/ExternalLink";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import SelectButton from "components/util/SelectButton";
import { TachiConfig } from "lib/config";
import React, { useEffect, useState } from "react";
import { Alert, Col, Row } from "react-bootstrap";
import { Revision } from "types/git";
import LinkButton from "components/util/LinkButton";

export default function SeedsViewer() {
	useSetSubheader(["Developer Utils", "Database Seeds Management"]);

	const { data, error: failedToGetLocalAPI } = useApiQuery<Record<string, never>>("/seeds");

	const { data: hasUncommittedRes } = useApiQuery<boolean>("/seeds/has-uncommitted-changes");

	if (!data && !failedToGetLocalAPI) {
		return <Loading />;
	}

	return (
		<>
			<h1>{TachiConfig.name} Database Management</h1>
			<Divider />
			<span>
				This tool is for viewing the database that powers {TachiConfig.name} in a more
				efficient manner.
				<br />
				To view the state of a given commit or repository, use the select boxes below.
				<br />
				For more information what all of this is about and how it works, see{" "}
				<ExternalLink href="https://docs.bokutachi.xyz/contributing/components/seeds">
					the documentation
				</ExternalLink>
				.
				{!failedToGetLocalAPI && (
					<>
						<br />
						<br />
						<b>
							Also, it seems like you're running {TachiConfig.name} in local
							development!
						</b>{" "}
						<br />
						You can use this UI to view your current changes on-your-disk before you
						commit them!
					</>
				)}
			</span>
			<Divider />
			{hasUncommittedRes && (
				<>
					<Alert
						variant="warning"
						className="d-flex w-100 justify-content-center"
						style={{
							flexDirection: "column",
							alignItems: "center",
							gap: "20px",
						}}
					>
						<div>You have uncommitted changes on your local disk.</div>
						<div>
							{/* this deliberately reloads the page. */}
							<a
								className="btn btn-secondary"
								href="/utils/seeds?repo=local&sha=WORKING_DIRECTORY"
							>
								Click to view what you've changed.
							</a>
						</div>
					</Alert>{" "}
					<Divider />
				</>
			)}
			<InnerSeedsViewer hasLocalAPI={!failedToGetLocalAPI} />
		</>
	);
}

function InnerSeedsViewer({ hasLocalAPI }: { hasLocalAPI: boolean }) {
	// base, rev a-la traditional git comparisons. Head is expected to be 'after'
	// the base, but no order is enforced.
	const [baseRev, setBaseRev] = useState<Revision | null>(null);
	const [headRev, setHeadRev] = useState<Revision | null>(null);
	const [urlLoading, setURLLoading] = useState(false);
	const [isFirstLoad, setIsFirstLoad] = useState(true);

	const params = new URLSearchParams(window.location.search);
	const sha = params.get("sha");
	const repo = params.get("repo");
	const compareRepo = params.get("compareRepo");
	const compareSHA = params.get("compareSHA");

	const [view, setView] = useState<"DIFF" | "FULL">("DIFF");

	useEffect(() => {
		if (!isFirstLoad) {
			return;
		}

		// if we've been given stuff in the URL and don't already have a baseRev
		if (sha && repo && !baseRev) {
			setURLLoading(true);

			(async () => {
				const baseCommit = await LoadCommit(repo, sha);

				if (baseCommit) {
					setBaseRev({ c: baseCommit, repo });
				} else {
					setBaseRev(null);
				}

				if (compareRepo && compareSHA) {
					const headCommit = await LoadCommit(compareRepo, compareSHA);

					if (headCommit) {
						setHeadRev({ c: headCommit, repo: compareRepo });
					} else {
						setHeadRev(null);
					}
				}

				setURLLoading(false);

				setIsFirstLoad(false);
			})();
		}
	}, [isFirstLoad]);

	useEffect(() => {
		if (baseRev) {
			const params = new URLSearchParams({
				repo: baseRev.repo,
				sha: baseRev.c.sha,
			});

			if (headRev) {
				params.set("compareRepo", headRev.repo);
				params.set("compareSHA", headRev.c.sha);
			}

			window.history.replaceState(null, "", `?${params.toString()}`);
		} else {
			window.history.replaceState(null, "", "");
		}
	}, [baseRev, headRev]);

	// if sha XOR repo, this should not be allowed.
	if (!!sha !== !!repo) {
		return <div>Invalid reference, both a repo and a sha must be provided in the URL.</div>;
	}

	if (urlLoading) {
		return (
			<div className="w-100 d-flex flex-column justify-content-center">
				<Loading />
				<div className="mt-2 text-center">
					Fetching information for{" "}
					<code>
						{repo}/{sha}
					</code>
					...
				</div>
			</div>
		);
	}

	return (
		<>
			<Row>
				<Col xs={12} lg={baseRev ? 6 : 12} className="text-center">
					<SeedsPicker
						hasLocalAPI={hasLocalAPI}
						header="Base Commit"
						setRev={setBaseRev}
						rev={baseRev}
					/>
				</Col>
				{baseRev && (
					<Col xs={12} lg={6} className="text-center">
						<SeedsPicker
							hasLocalAPI={hasLocalAPI}
							header="Compare Commit"
							message="Optionally, pick another arbitary commit to show all the changes between.
This commit should be newer than the base commit!"
							setRev={setHeadRev}
							rev={headRev}
						/>
					</Col>
				)}
			</Row>
			{baseRev && (
				<Row>
					<Col xs={12}>
						<Divider />
						{!headRev && (
							<div className="w-100 d-flex justify-content-center">
								<SelectButton
									className="mx-2"
									value={view}
									setValue={setView}
									id="DIFF"
								>
									View Changes
								</SelectButton>
								<SelectButton value={view} setValue={setView} id="FULL">
									View Full State
								</SelectButton>
							</div>
						)}

						<Divider />
					</Col>
					<SeedsStateViewer baseRev={baseRev} headRev={headRev} view={view} />
				</Row>
			)}
		</>
	);
}
