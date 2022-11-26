import TimestampCell from "components/tables/cells/TimestampCell";
import Icon from "components/util/Icon";
import React from "react";
import { Link } from "react-router-dom";
import { NotificationDocument } from "tachi-common";

export default function NotificationRow({ notif }: { notif: NotificationDocument }) {
	return (
		<tr>
			<td>
				{notif.read ? (
					<Icon type="envelope" regular colour="muted" />
				) : (
					<Icon type="envelope-open" />
				)}
			</td>
			<td>
				<strong>
					<Link className="gentle-link" to={NotifToURL(notif)}>
						{notif.title}
					</Link>
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

			return `/dashboard/games/${game}/${playtype}/quests/${questID}`;
		}
		case "RIVALED_BY":
			return `/dashboard/users/${notif.body.content.userID}/games/${notif.body.content.game}/${notif.body.content.playtype}`;
		case "SITE_ANNOUNCEMENT":
			return `#`;
	}
}
