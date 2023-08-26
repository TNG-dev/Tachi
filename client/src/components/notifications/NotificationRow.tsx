import TimestampCell from "components/tables/cells/TimestampCell";
import Icon from "components/util/Icon";
import React from "react";
import { Link } from "react-router-dom";
import { NotificationDocument } from "tachi-common";

export default function NotificationRow({ notif }: { notif: NotificationDocument }) {
	const url = NotifToURL(notif);

	return (
		<tr>
			<td>
				{notif.read ? (
					<Icon type="envelope" regular colour="body-secondary" />
				) : (
					<Icon type="envelope-open" />
				)}
			</td>
			<td>
				<strong>
					{url ? (
						<Link className="text-decoration-none" to={url}>
							{notif.title}
						</Link>
					) : (
						notif.title
					)}
				</strong>
			</td>
			<TimestampCell time={notif.sentAt} />
		</tr>
	);
}

function NotifToURL(notif: NotificationDocument) {
	switch (notif.body.type) {
		case "QUEST_CHANGED": {
			const { game, playtype, questID } = notif.body.content;

			return `/games/${game}/${playtype}/quests/${questID}`;
		}
		case "RIVALED_BY":
			return `/u/${notif.body.content.userID}/games/${notif.body.content.game}/${notif.body.content.playtype}`;
		case "SITE_ANNOUNCEMENT":
			return null;
	}
}
