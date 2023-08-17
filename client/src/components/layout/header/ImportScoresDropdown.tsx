import React from "react";
import { GetGameConfig } from "tachi-common";
import { TachiConfig } from "lib/config";
import QuickDropdown from "components/ui/QuickDropdown";
import DropdownNavLink from "components/ui/DropdownNavLink";
import { SetState } from "types/react";

export default function ImportScoresLink({
	className,
	menuClassName,
	style,
	setState,
}: {
	className?: string;
	menuClassName?: string;
	style?: React.CSSProperties;
	setState?: SetState<boolean>;
}) {
	const links = [];

	for (const game of TachiConfig.games) {
		const gameConfig = GetGameConfig(game);

		links.push(
			<DropdownNavLink
				isActive={() => {
					const queryGame = new URLSearchParams(window.location.search).get("game");
					return queryGame === game;
				}}
				key={game}
				to={`/import?game=${game}`}
				onClick={() => setState?.(false)}
			>
				{gameConfig.name}
			</DropdownNavLink>
		);
	}

	return (
		<QuickDropdown
			variant="clear"
			toggle="Import Scores"
			className={`h-14 ${className}`}
			menuStyle={style}
			menuClassName={menuClassName}
			caret
		>
			{links}
		</QuickDropdown>
	);
}
