import { MillisToSince, FormatTime, FormatDuration } from "util/time";
import { NumericSOV, StrSOV } from "util/sorts";
import React from "react";
import { ImportDataset } from "types/tables";
import { Link } from "react-router-dom";
import DropdownRow from "../components/DropdownRow";
import TachiTable, { Header } from "../components/TachiTable";
import ImportDropdown from "../dropdowns/ImportDropdown";

export default function ImportsTable({ dataset }: { dataset: ImportDataset }) {
	const headers: Header<ImportDataset[0]>[] = [
		["User", "User", StrSOV((x) => x.__related.user.username)],
		["Type", "Type", StrSOV((x) => x.importType)],
		["Intent", "Intent", StrSOV((x) => x.userIntent.toString())],
		["Stats", "Stats"],
		["Timestamp", "Timestamp", NumericSOV((x) => x.timeFinished)],
	];

	return (
		<TachiTable
			dataset={dataset}
			headers={headers}
			entryName="Imports"
			searchFunctions={{
				id: (k) => k.importID,
				type: (k) => k.importType,
				intent: (k) => k.userIntent,
				errors: (k) => k.errors.length,
				scores: (k) => k.scoreIDs.length,
				sessions: (k) => k.createdSessions.length,
				user: (k) => k.__related.user.username,
			}}
			defaultSortMode="Timestamp"
			defaultReverseSort
			rowFunction={(data) => <Row data={data} />}
		/>
	);
}

function Row({ data }: { data: ImportDataset[0] }) {
	return (
		<DropdownRow dropdown={<ImportDropdown data={data} />}>
			<td>
				<Link className="gentle-link" to={`/u/${data.__related.user.username}`}>
					{data.__related.user.username}
				</Link>
			</td>
			<td>{data.importType}</td>
			<td>{data.userIntent.toString()}</td>
			<td>
				Scores: {data.scoreIDs.length}
				<br />
				Sessions: {data.createdSessions.length}
				<br />
				Errors: {data.errors.length}
			</td>
			<td>
				Started: {MillisToSince(data.timeStarted)}
				<br />
				Finished: {MillisToSince(data.timeFinished)}
				<br />
				(Duration: {FormatDuration(data.timeFinished - data.timeStarted)})
				<br />
				<small className="text-body-secondary">{FormatTime(data.timeFinished)}</small>
			</td>
		</DropdownRow>
	);
}
