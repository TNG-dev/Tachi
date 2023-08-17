import { TachiConfig } from "lib/config";
import React from "react";
import { FormatGame, GetGameConfig } from "tachi-common";
import QuickDropdown from "components/ui/QuickDropdown";
import DropdownNavLink from "components/ui/DropdownNavLink";
import { SetState } from "types/react";

export default function GlobalInfoDropdown({
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

		for (const playtype of gameConfig.playtypes) {
			links.push(
				<DropdownNavLink
					key={`${game}:${playtype}`}
					to={`/games/${game}/${playtype}`}
					onClick={() => setState?.(false)}
				>
					{FormatGame(game, playtype)}
				</DropdownNavLink>
			);
		}
	}

	return (
		<QuickDropdown
			variant="clear"
			toggle="Global Info"
			className={`h-14 ${className}`}
			menuStyle={style}
			menuClassName={menuClassName}
			caret
		>
			{links}
		</QuickDropdown>
	);
}
