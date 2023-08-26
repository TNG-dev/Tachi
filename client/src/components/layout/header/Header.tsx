import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { Navbar, Offcanvas, OffcanvasHeader } from "react-bootstrap";
import SiteWordmark from "components/util/SiteWordmark";
import SignOut from "components/util/SignOut";
import { UserContext } from "context/UserContext";
import { WindowContext } from "context/WindowContext";
import { LayoutStyles } from "../Layout";
import { HeaderMenu } from "./HeaderMenu";
import UserArea from "./UserArea";
import MobileMenuToggle from "./MobileMenuToggle";
import Logo from "./Logo";

export default function Header({ styles }: { styles: LayoutStyles }) {
	const { user } = useContext(UserContext);
	const {
		breakpoint: { isLg },
	} = useContext(WindowContext);
	const [showMobileMenu, setShowMobileMenu] = useState(false);

	const dropdownMenuStyle = isLg ? { transform: "translateY(1.05rem)" } : undefined;

	const setState = isLg ? undefined : setShowMobileMenu;

	useEffect(() => {
		if (isLg) {
			setShowMobileMenu(false);
		}
	}, [isLg]);
	return (
		<header
			id="main-header"
			className="bg-body bg-opacity-75 backdrop-blur-xl border-bottom fixed-top border-body-tertiary border-opacity-50"
			style={{ height: `${styles.headerHeight}px` }}
		>
			<Navbar expand={"lg"} variant="" className="h-100 p-0">
				<Container className="d-flex align-items-center">
					<Logo />
					<MobileMenuToggle state={showMobileMenu} setState={setShowMobileMenu} />
					<Navbar.Offcanvas
						id="navbar"
						aria-labelledby="navbar-label"
						show={showMobileMenu}
						onHide={() => setShowMobileMenu(false)}
					>
						<OffcanvasHeader className="p-4 border-bottom border-body-tertiary">
							<Link
								id="home"
								to="/"
								className="mx-auto p-2 focus-visible-ring rounded"
							>
								<SiteWordmark id="navbar-label" width="192px" />
							</Link>
						</OffcanvasHeader>
						<Offcanvas.Body className="position-relative">
							<HeaderMenu
								user={user}
								dropdownMenuStyle={dropdownMenuStyle}
								setState={setState}
							/>
							<div className="position-absolute bottom-0 w-100 pb-4 px-4 d-md-none">
								<SignOut className="w-100 bg-body-secondary bg-opacity-75 backdrop-blur-xl" />
							</div>
						</Offcanvas.Body>
					</Navbar.Offcanvas>
					<UserArea user={user} dropdownMenuStyle={dropdownMenuStyle} />
				</Container>
			</Navbar>
		</header>
	);
}
