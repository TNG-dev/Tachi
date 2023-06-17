import { APIFetchV1 } from "util/api";
import { ToFixedFloor, UppercaseFirst } from "util/misc";
import { ErrorPage } from "app/pages/ErrorPage";
import useSetSubheader from "components/layout/header/useSetSubheader";
import Card from "components/layout/page/Card";
import UGPTStatContainer from "components/user/UGPTStatContainer";
import UGPTStatCreator from "components/user/UGPTStatCreator";
import ApiError from "components/util/ApiError";
import Divider from "components/util/Divider";
import Icon from "components/util/Icon";
import Loading from "components/util/Loading";
import Muted from "components/util/Muted";
import SelectButton from "components/util/SelectButton";
import useApiQuery from "components/util/query/useApiQuery";
import useQueryString from "components/util/useQueryString";
import { UGPTContext } from "context/UGPTContext";
import deepmerge from "deepmerge";
import { useFormik } from "formik";
import { TachiConfig } from "lib/config";
import React, { useContext, useEffect, useState } from "react";
import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
	BMS_TABLES,
	FormatGame,
	GetGameConfig,
	GetGamePTConfig,
	GetScoreMetrics,
	ShowcaseStatDetails,
	TableDocument,
	UGPTSettingsDocument,
	UserDocument,
} from "tachi-common";
import { SetState, UGPT } from "types/react";

export default function UGPTSettingsPage({ reqUser, game, playtype }: UGPT) {
	const query = useQueryString();

	const [page, setPage] = useState<"preferences" | "showcase" | "manage">(
		query.get("showcase") ? "showcase" : "preferences"
	);
	const gameConfig = GetGameConfig(game);

	useSetSubheader(
		["Users", reqUser.username, "Games", gameConfig.name, playtype, "Settings"],
		[reqUser],
		`${reqUser.username}'s ${FormatGame(game, playtype)} Settings`
	);

	const UGPT = { reqUser, game, playtype };

	return (
		<Card header="Settings" className="col-12 offset-lg-2 col-lg-8">
			<div className="row">
				<div className="col-12 d-flex justify-content-center">
					<div className="btn-group">
						<SelectButton value={page} setValue={setPage} id="preferences">
							<Icon type="cogs" />
							Preferences
						</SelectButton>
						<SelectButton value={page} setValue={setPage} id="showcase">
							<Icon type="bars" />
							Showcase Stats
						</SelectButton>
						<SelectButton value={page} setValue={setPage} id="manage">
							<Icon type="eraser" />
							Manage Account
						</SelectButton>
					</div>
				</div>
				<div className="col-12">
					<Divider className="mt-4 mb-4" />
					{page === "preferences" ? (
						<PreferencesForm {...UGPT} />
					) : page === "showcase" ? (
						<ShowcaseForm {...UGPT} />
					) : (
						<ManageAccount {...UGPT} />
					)}
				</div>
			</div>
		</Card>
	);
}

function PreferencesForm({ reqUser, game, playtype }: UGPT) {
	const { loggedInData, setLoggedInData } = useContext(UGPTContext);

	if (!loggedInData) {
		return (
			<ErrorPage
				statusCode={400}
				customMessage="You don't appear to have any settings for this game; have you played it?"
			/>
		);
	}

	const settings = loggedInData.settings;

	const gptConfig = GetGamePTConfig(game, playtype);

	const formik = useFormik({
		initialValues: {
			preferredScoreAlg:
				settings!.preferences.preferredScoreAlg || gptConfig.defaultScoreRatingAlg,
			preferredProfileAlg:
				settings!.preferences.preferredProfileAlg || gptConfig.defaultProfileRatingAlg,
			preferredSessionAlg:
				settings!.preferences.preferredSessionAlg || gptConfig.defaultSessionRatingAlg,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			gameSpecific: settings!.preferences.gameSpecific as any,
			defaultTable: settings!.preferences.defaultTable,
			preferredDefaultEnum:
				settings!.preferences.preferredDefaultEnum ?? gptConfig.preferredDefaultEnum,
			preferredRanking: settings!.preferences.preferredRanking ?? "global",
		},
		onSubmit: async (values) => {
			const rj = await APIFetchV1<UserDocument>(
				`/users/${reqUser.id}/games/${game}/${playtype}/settings`,
				{
					method: "PATCH",
					body: JSON.stringify(values),
					headers: {
						"Content-Type": "application/json",
					},
				},
				true,
				true
			);

			if (rj.success) {
				setLoggedInData({
					...loggedInData,
					settings: deepmerge(settings as UGPTSettingsDocument, { preferences: values }),
				});
			}
		},
	});

	const { data: tables, error } = useApiQuery<TableDocument[]>(
		`/games/${game}/${playtype}/tables?showInactive=true`
	);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!tables) {
		return <Loading />;
	}

	const displayableTables = tables.filter(
		(e) => !e.inactive || settings?.preferences.defaultTable === e.tableID
	);

	return (
		<Form onSubmit={formik.handleSubmit}>
			{Object.keys(gptConfig.scoreRatingAlgs).length > 1 && (
				<Form.Group>
					<Form.Label>Preferred Score Algorithm</Form.Label>
					<Form.Control
						as="select"
						id="preferredScoreAlg"
						value={formik.values.preferredScoreAlg}
						onChange={formik.handleChange}
					>
						{Object.keys(gptConfig.scoreRatingAlgs).map((e) => (
							<option key={e}>{e}</option>
						))}
					</Form.Control>
					<Form.Text className="text-muted">
						This configures the default rating algorithm to display for scores. This is
						used for things like score tables and PB tables.
					</Form.Text>
				</Form.Group>
			)}
			{Object.keys(gptConfig.sessionRatingAlgs).length > 1 && (
				<Form.Group>
					<Form.Label>Preferred Session Algorithm</Form.Label>
					<Form.Control
						as="select"
						id="preferredSessionAlg"
						value={formik.values.preferredSessionAlg}
						onChange={formik.handleChange}
					>
						{Object.keys(gptConfig.sessionRatingAlgs).map((e) => (
							<option key={e}>{e}</option>
						))}
					</Form.Control>
					<Form.Text className="text-muted">
						This configures the default rating algorithm to display for sessions. This
						is used for things like session tables.
					</Form.Text>
				</Form.Group>
			)}
			{Object.keys(gptConfig.profileRatingAlgs).length > 1 && (
				<Form.Group>
					<Form.Label>Preferred Profile Algorithm</Form.Label>
					<Form.Control
						as="select"
						id="preferredProfileAlg"
						value={formik.values.preferredProfileAlg}
						onChange={formik.handleChange}
					>
						{Object.keys(gptConfig.profileRatingAlgs).map((e) => (
							<option key={e}>{e}</option>
						))}
					</Form.Control>
					<Form.Text className="text-muted">
						This configures the default rating algorithm to display for profiles. This
						is used for things like leaderboards.
					</Form.Text>
				</Form.Group>
			)}
			<Form.Group>
				<Form.Label>Preferred Folder Info</Form.Label>
				<Form.Control
					as="select"
					id="preferredDefaultEnum"
					value={formik.values.preferredDefaultEnum}
					onChange={formik.handleChange}
				>
					{GetScoreMetrics(gptConfig, "ENUM").map((e) => (
						<option value={e}>{UppercaseFirst(e)}</option>
					))}
				</Form.Control>
				<Form.Text className="text-muted">
					What should {TachiConfig.name} default to showing you about folders?
				</Form.Text>
			</Form.Group>
			{settings.rivals.length !== 0 && (
				<Form.Group>
					<Form.Label>Preferred Ranking</Form.Label>
					<Form.Control
						as="select"
						id="preferredRanking"
						value={formik.values.preferredRanking}
						onChange={formik.handleChange}
					>
						<option value="global">Global Rankings</option>
						<option value="rival">Rival Rankings</option>
					</Form.Control>
					<Form.Text className="text-muted">
						What should {TachiConfig.name} default to when showing your score rankings?
					</Form.Text>
				</Form.Group>
			)}
			<Form.Group>
				<Form.Label>Preferred Table</Form.Label>
				<Form.Control
					as="select"
					id="defaultTable"
					value={
						formik.values.defaultTable ??
						tables.find((x) => x.default)?.tableID ??
						displayableTables[0].tableID
					}
					onChange={formik.handleChange}
				>
					{displayableTables.map((table) => (
						<option key={table.tableID} value={table.tableID}>
							{table.title}
						</option>
					))}
				</Form.Control>
				<Form.Text className="text-muted">
					What folders would you like to see by default?
				</Form.Text>
			</Form.Group>
			{game === "iidx" && (
				<>
					<Form.Group>
						<Form.Check
							type="checkbox"
							id="gameSpecific.display2DXTra"
							name="gameSpecific.display2DXTra"
							checked={formik.values.gameSpecific.display2DXTra}
							onChange={formik.handleChange}
							label="Display 2DX-tra Charts"
						/>
						<Form.Text className="text-muted">
							Display 2DX-tra charts on the song page.
						</Form.Text>
					</Form.Group>
					<Form.Group>
						<Form.Label>BPI Target</Form.Label>
						<Form.Control
							type="number"
							id="gameSpecific.bpiTarget"
							name="gameSpecific.bpiTarget"
							value={formik.values.gameSpecific.bpiTarget}
							min={0}
							max={100}
							step={5}
							onChange={formik.handleChange}
						/>
						<Form.Text className="text-muted">
							Set yourself a BPI target. {TachiConfig.name} will show how far away you
							are from it in the UI!
						</Form.Text>
					</Form.Group>
				</>
			)}
			{(game === "sdvx" || game === "usc") && (
				<Form.Group>
					<Form.Label>VF6 Target</Form.Label>
					<Row>
						<Col xs={12} lg={9}>
							<Form.Control
								type="number"
								id="gameSpecific.vf6Target"
								name="gameSpecific.vf6Target"
								value={formik.values.gameSpecific.vf6Target}
								min={0}
								max={0.5}
								step={0.001}
								onChange={formik.handleChange}
							/>
						</Col>
						<Col xs={12} lg={3} className="my-auto">
							Expected Profile VF6{" "}
							{ToFixedFloor((formik.values.gameSpecific.vf6Target ?? 0) * 50, 2)}
						</Col>
					</Row>

					<Form.Text className="text-muted">
						Set yourself a VF6 target. {TachiConfig.name} will show how far away you are
						from it in the UI!
						<br />
						Set this to 0 to disable the target.
					</Form.Text>
				</Form.Group>
			)}
			{game === "bms" && (
				<Form.Group>
					<Form.Label>Preferred Tables</Form.Label>
					<Row>
						<Col xs={12}>
							{BMS_TABLES.filter((e) => e.playtype === playtype).map((e) => (
								<Form.Check
									key={e.prefix}
									checked={
										formik.values.gameSpecific.displayTables?.includes(
											e.prefix
										) ?? !e.notDefault
									}
									label={`(${e.prefix}) ${e.name}`}
									onChange={(event) => {
										const base: Array<string> =
											formik.values.gameSpecific.displayTables ??
											BMS_TABLES.filter(
												(e) => e.playtype === playtype && !e.notDefault
											).map((e) => e.prefix);

										if (event.target.checked) {
											formik.setFieldValue("gameSpecific.displayTables", [
												...base,
												e.prefix,
											]);
										} else {
											formik.setFieldValue(
												"gameSpecific.displayTables",
												base.filter((a) => a !== e.prefix)
											);
										}
									}}
								/>
							))}
						</Col>
					</Row>

					<Form.Text className="text-muted">
						What tables do you want to display in the UI? Use this to disable tables you
						don't really care for.
					</Form.Text>
				</Form.Group>
			)}
			<div className="row justify-content-center">
				<Button type="submit" variant="success">
					Save Changes
				</Button>
			</div>
		</Form>
	);
}

function ShowcaseForm({ reqUser, game, playtype }: UGPT) {
	const { loggedInData, setLoggedInData } = useContext(UGPTContext);

	if (!loggedInData) {
		return (
			<ErrorPage
				statusCode={400}
				customMessage="You don't appear to have any settings for this game; have you played it?"
			/>
		);
	}

	const settings = loggedInData.settings;

	const [stats, setStats] = useState(settings!.preferences.stats);
	const [show, setShow] = useState(false);

	const SaveChanges = async () => {
		const r = await APIFetchV1<UGPTSettingsDocument>(
			`/users/${reqUser.id}/games/${game}/${playtype}/showcase`,
			{
				method: "PUT",
				body: JSON.stringify(stats),
				headers: { "Content-Type": "application/json" },
			},
			true,
			true
		);

		if (r.success) {
			setLoggedInData({
				...loggedInData,
				settings: r.body,
			});
		}
	};

	const [isFirstPaint, setIsFirstPaint] = useState(true);

	useEffect(() => {
		if (isFirstPaint) {
			setIsFirstPaint(false);
		} else {
			SaveChanges();
		}
	}, [stats]);

	return (
		<div className="row">
			{stats.length < 6 && (
				<div className="col-12">
					<div className="row justify-content-center align-items-center mt-4">
						<Button variant="info" onClick={() => setShow(true)}>
							Add Statistic
						</Button>
					</div>
				</div>
			)}
			<RenderCurrentStats {...{ reqUser, game, playtype, stats, setStats }} />
			<UGPTStatCreator
				game={game}
				playtype={playtype}
				show={show}
				setShow={setShow}
				reqUser={reqUser}
				onCreate={(stat) => {
					setStats([...stats, stat]);
				}}
			/>
		</div>
	);
}

function RenderCurrentStats({
	stats,
	setStats,
	reqUser,
	game,
	playtype,
}: {
	stats: ShowcaseStatDetails[];
	setStats: SetState<ShowcaseStatDetails[]>;
} & UGPT) {
	function RemoveStatAtIndex(index: number) {
		setStats(stats.filter((e, i) => i !== index));
	}

	if (stats.length === 0) {
		return (
			<div className="w-100 text-center">
				<Muted>You have no stats set, Why not set some?</Muted>
			</div>
		);
	}

	return (
		<>
			{stats.map((e, i) => (
				<div key={i} className="col-12 col-lg-6">
					<UGPTStatContainer stat={e} reqUser={reqUser} game={game} playtype={playtype} />
					<div className="row justify-content-center mt-4">
						<Button variant="danger" onClick={() => RemoveStatAtIndex(i)}>
							Delete
						</Button>
					</div>
				</div>
			))}
		</>
	);
}

function ManageAccount({ reqUser, game, playtype }: UGPT) {
	const [password, setPassword] = useState("");
	const [deleting, setDeleting] = useState(false);

	return (
		<Row>
			<Col xs={12}>
				<h4>Delete Score</h4>
				If you have an invalid score, you can delete it by going to that score and clicking
				"Delete Score".
			</Col>
			<Col xs={12} className="mt-8">
				<h4>Undo Import</h4>
				If you messed up an import, you can undo it by going to{" "}
				<Link to={`/u/${reqUser.username}/imports`}>your imports page</Link> and click
				"Revert Import".
			</Col>
			<Col xs={12} className="mt-8">
				<h3>Completely Wipe Profile</h3>
				If you've <i>really</i> messed up, you can wipe your entire profile for{" "}
				{FormatGame(game, playtype)}.
				<br />
				<Alert variant="warning" style={{ fontSize: "1.5rem" }} className="mt-4">
					It is very important to know that this is <b>NOT REVERSIBLE.</b> Wiping your
					profile will <b>COMPLETELY DELETE</b> all of your {FormatGame(game, playtype)}{" "}
					scores from our server. We will not be able to retrieve them.
				</Alert>
				<br />
				<Form.Group>
					<Form.Label>Confirm Password</Form.Label>
					<Form.Control
						type="password"
						autoComplete="off"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</Form.Group>
				<Button
					disabled={deleting}
					variant="outline-danger"
					onClick={async () => {
						if (
							confirm(
								`You are really about to delete all of your ${FormatGame(
									game,
									playtype
								)} scores. This is your last chance to turn back.`
							)
						) {
							setDeleting(true);

							const res = await APIFetchV1(
								`/users/${reqUser.id}/games/${game}/${playtype}`,
								{
									method: "DELETE",
									body: JSON.stringify({ "!password": password }),
									headers: {
										"Content-Type": "application/json",
									},
								},
								true,
								true
							);

							setDeleting(false);

							if (res.success) {
								// bye!
								window.location.href = "/";
							}
						}
					}}
				>
					Yes, I want to delete my {FormatGame(game, playtype)} account.
				</Button>
				{deleting && (
					<>
						<Divider />
						<Loading />
						<div className="mt-4 text-center">
							This operation can take up to 5 minutes. The UI may time out. Please be
							patient.
						</div>
					</>
				)}
			</Col>
		</Row>
	);
}
