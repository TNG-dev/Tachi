import React from "react";
import { Link } from "react-router-dom";
import { JustChildren } from "types/react";

export default function GentleLink({
	to,
	children,
}: {
	to: string;
	className?: string;
} & JustChildren) {
	return (
		<Link to={to} className="text-decoration-none">
			{children}
		</Link>
	);
}
