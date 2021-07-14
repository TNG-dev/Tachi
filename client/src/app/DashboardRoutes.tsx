import React from "react";
import { Route, Switch } from "react-router-dom";
import { Layout } from "../_metronic/layout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import RequireAuthAsUserParam from "components/auth/RequireAuthAsUserParam";
import UserPage from "./pages/dashboard/users/UserPage";
import CreditsPage from "./pages/dashboard/misc/CreditsPage";
import IIDXScoreTable from "components/tables/IIDXPBTable";
import PBsPage from "./pages/dashboard/users/games/game/playtype/PBsPage";

export default function DashboardRoutes() {
	return (
		<Layout>
			<Switch>
				<Route exact path="/dashboard">
					<DashboardPage />
				</Route>

				<Route exact path="/dashboard/credits">
					<CreditsPage />
				</Route>

				<Route exact path="/dashboard/users/:userID">
					<UserPage />
				</Route>

				<Route exact path="/dashboard/users/:userID/settings">
					<RequireAuthAsUserParam>Settings Page</RequireAuthAsUserParam>
				</Route>

				<Route exact path="/dashboard/users/:userID/games/:game/:playtype">
					<PBsPage />
				</Route>
			</Switch>
		</Layout>
	);
}
