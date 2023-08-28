import { NumericSOV, StrSOV } from "util/sorts";
import { MillisToSince } from "util/time";
import React from "react";
import { Link } from "react-router-dom";
import { FailedImportDataset } from "types/tables";
import DropdownRow from "../components/DropdownRow";
import TachiTable, { Header } from "../components/TachiTable";
import FailedImportDropdown from "../dropdowns/FailedImportDropdown";

export default function FailedImportsTable({ dataset }: { dataset: FailedImportDataset }) {
	const headers: Header<FailedImportDataset[0]>[] = [
		["User", "User", StrSOV((x) => x.__related.user.username)],
		["Type", "Type", StrSOV((x) => x.importType)],
		["Intent", "Intent", StrSOV((x) => x.userIntent.toString())],
		["Error", "Error"],
		["Timestamp", "Timestamp", NumericSOV((x) => x.timeStarted)],
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
				user: (k) => k.__related.user.username,
			}}
			defaultSortMode="Timestamp"
			defaultReverseSort
			rowFunction={(data) => <Row data={data} />}
		/>
	);
}

function Row({ data }: { data: FailedImportDataset[0] }) {
	return (
		<DropdownRow dropdown={<FailedImportDropdown data={data} />}>
			<td>
				<Link className="text-decoration-none" to={`/u/${data.__related.user.username}`}>
					{data.__related.user.username}
				</Link>
			</td>
			<td>{data.importType}</td>
			<td>{data.userIntent.toString()}</td>
			<td>{data.error.message}</td>
			<td>Started: {MillisToSince(data.timeStarted)}</td>
		</DropdownRow>
	);
}
