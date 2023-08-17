import QuickDropdown from "components/ui/QuickDropdown";
import DropdownNavLink from "components/ui/DropdownNavLink";
import { TachiConfig } from "lib/config";
import React from "react";
import { FormatGame, GetGameConfig, UserDocument, UserGameStats } from "tachi-common";
import { SetState } from "types/react";

export default function UGPTDropdown({
	user,
	ugs,
	className,
	menuClassName,
	style,
	setState,
}: {
	user: UserDocument;
	ugs: UserGameStats[];
	className?: string;
	menuClassName?: string;
	style?: React.CSSProperties;
	setState?: SetState<boolean>;
}) {
	const userProfileLinks = [];

	if (user && ugs && ugs.length !== 0) {
		const ugsMap = new Map();
		for (const s of ugs) {
			ugsMap.set(`${s.game}:${s.playtype}`, s);
		}

		for (const game of TachiConfig.games) {
			for (const playtype of GetGameConfig(game).playtypes) {
				const e = ugsMap.get(`${game}:${playtype}`);

				if (!e) {
					continue;
				}

				userProfileLinks.push(
					<DropdownNavLink
						key={`${e.game}:${e.playtype}`}
						to={`/u/${user.username}/games/${e.game}/${e.playtype}`}
						onClick={() => {
							setState?.(false);
						}}
					>
						{FormatGame(e.game, e.playtype)}
					</DropdownNavLink>
				);
			}
		}
	}

	return (
		<QuickDropdown
			variant="clear"
			toggle="Your Profiles"
			className={`h-14 ${className}`}
			menuStyle={style}
			menuClassName={menuClassName}
			caret
		>
			{userProfileLinks}
		</QuickDropdown>
	);
}
