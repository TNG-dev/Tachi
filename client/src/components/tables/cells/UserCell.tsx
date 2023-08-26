import { ToAPIURL } from "util/api";
import React from "react";
import { Link } from "react-router-dom";
import { UserDocument } from "tachi-common";
import { GamePT } from "types/react";
import SupporterIcon from "components/util/SupporterIcon";

export default function UserCell({ user, game, playtype }: { user: UserDocument } & GamePT) {
	return (
		<td
			style={{
				backgroundRepeat: "no-repeat",
				backgroundSize: "cover",
				backgroundPosition: "center",
				["--image-url" as string]: `url(${ToAPIURL(`/users/${user.id}/pfp`)})`,
			}}
			className="fading-image-td-right"
		>
			<Link
				className="text-decoration-none"
				to={`/u/${user.username}/games/${game}/${playtype}`}
			>
				{user.username}
				{user.isSupporter && (
					<>
						{" "}
						<SupporterIcon />
					</>
				)}
			</Link>
		</td>
	);
}
