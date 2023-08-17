import { ToCDNURL } from "util/api";
import React from "react";
import { Link } from "react-router-dom";
import { TachiConfig } from "lib/config";

export default function Logo() {
	return (
		<Link
			id="top"
			to="/"
			className="p-2 d-none d-lg-block focus-visible-ring focus-ring-primary transition-color transition-box-shadow rounded"
		>
			<img
				id="logo"
				height={35}
				alt={TachiConfig.name}
				src={ToCDNURL("/logos/logo-mark.png")}
			/>
		</Link>
	);
}
