import { ToCDNURL } from "util/api";
import { TachiConfig } from "lib/config";
import React from "react";

export default function SiteWordmark({ width = "256px" }) {
	return (
		<div className="text-center mb-8">
			<img src={ToCDNURL("/logos/logo-wordmark.png")} alt={TachiConfig.name} width={width} />
		</div>
	);
}
