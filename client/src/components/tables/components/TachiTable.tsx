import { CopyToClipboard } from "util/misc";
import { ComposeSearchFunction, SearchFunctions } from "util/ztable/search";
import Icon from "components/util/Icon";
import SmallText from "components/util/SmallText";
import { useZTable, ZTableSortFn } from "components/util/table/useZTable";
import { UserSettingsContext } from "context/UserSettingsContext";
import React, { useContext, useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { integer } from "tachi-common";
import Select from "components/util/Select";
import FilterDirectivesIndicator from "./FilterDirectivesIndicator";
import NoDataWrapper from "./NoDataWrapper";
import PageSelector from "./PageSelector";
import SortableTH from "./SortableTH";

export interface ZTableTHProps {
	changeSort: (str: string) => void;
	currentSortMode: string | null;
	reverseSort: boolean;
}

type NameHeader = [string, string];
type NameSortHeader<D> = [string, string, ZTableSortFn<D> | null];
type ComponentYielderHeader<D> = [
	string,
	string,
	ZTableSortFn<D> | null,
	(thProps: ZTableTHProps) => JSX.Element
];

// 0: name
// 1: sortFn
// 2: componentYielder -- yeah, i realise this format sucks.
export type Header<D> = NameHeader | NameSortHeader<D> | ComponentYielderHeader<D>;

function GetSortFunctions<D>(headers: Header<D>[]) {
	const sortFunctions: Record<string, ZTableSortFn<D>> = {};

	for (const header of headers) {
		const [name, _shortName, sortFn] = header;

		if (sortFn) {
			sortFunctions[name] = sortFn;
		}
	}

	return sortFunctions;
}

function ParseHeaders<D>(headers: Header<D>[], thProps: ZTableTHProps) {
	const headerElements: JSX.Element[] = [];

	for (const header of headers) {
		const [name, shortName, sortFn, componentYielder] = header;

		if (componentYielder) {
			headerElements.push(componentYielder(thProps));
		} else if (sortFn) {
			headerElements.push(
				<SortableTH key={`header-${name}`} name={name} shortName={shortName} {...thProps} />
			);
		} else {
			headerElements.push(
				<th key={`header-${name}`}>
					<span className="d-none d-lg-block">{name}</span>
					<span className="d-block d-lg-none">{shortName}</span>
				</th>
			);
		}
	}

	return <tr>{headerElements}</tr>;
}

export default function TachiTable<D>({
	dataset,
	rowFunction,
	headers,
	entryName,
	pageLen = 10,
	defaultSortMode,
	defaultReverseSort,
	searchFunctions,
	noTopDisplayStr = false,
}: {
	dataset: D[];
	rowFunction: (data: D) => JSX.Element;
	headers: Header<D>[];
	entryName: string;
	pageLen?: integer;
	noTopDisplayStr?: boolean;
	defaultSortMode?: string;
	defaultReverseSort?: boolean;
	searchFunctions?: SearchFunctions<D>;
}) {
	const [search, setSearch] = useState("");

	const searchFunction = searchFunctions ? ComposeSearchFunction(searchFunctions) : undefined;

	const sortFunctions = GetSortFunctions(headers);

	const ztable = useZTable(dataset ?? [], {
		search,
		searchFunction,
		sortFunctions,
		entryName,
		pageLen,
		defaultSortMode,
		defaultReverseSort,
	});

	const {
		window,
		setPage,
		pageState,
		incrementPage,
		decrementPage,
		page,
		maxPage,
		displayStr,
		sortMode,
		reverseSort,
		changeSort,
		filteredDataset,
	} = ztable;

	const headersRow = ParseHeaders(headers, {
		changeSort,
		currentSortMode: sortMode,
		reverseSort,
	});

	const { settings } = useContext(UserSettingsContext);

	return (
		<div className="justify-content-center w-100">
			<div className="row">
				{!noTopDisplayStr && (
					<div className="d-none d-lg-flex col-lg-6 align-self-center">{displayStr}</div>
				)}
				{searchFunctions && (
					<div className="col-12 col-lg-3 ml-auto input-group">
						<input
							className="form-control filter-directives-enabled"
							onChange={(e) => setSearch(e.target.value)}
							type="text"
							placeholder={`Filter ${entryName}`}
							value={search}
						/>
						<FilterDirectivesIndicator
							searchFunctions={searchFunctions}
							doc={dataset[0]}
						/>
					</div>
				)}
			</div>

			<div className="col-12 px-0 mt-4 mb-4">
				<table className="table table-striped table-hover table-vertical-center text-center table-responsive-md">
					<thead>{headersRow}</thead>
					<tbody>
						<NoDataWrapper>{window.map((e) => rowFunction(e))}</NoDataWrapper>
					</tbody>
				</table>
			</div>
			<div className="col-12 px-0">
				<div className="row">
					<div className="col-lg-4 align-self-center">
						<Select
							name={`Show this many ${entryName}:`}
							value={ztable.pageLen.toString()}
							setValue={(e) => ztable.setPageLen(Number(e))}
						>
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</Select>
					</div>
					<div className="d-none d-lg-flex col-lg-4 justify-content-center align-items-center">
						{settings?.preferences.developerMode && (
							<Button
								className="ml-4 w-50"
								onClick={() => {
									let data = dataset;
									if (search !== "") {
										data = filteredDataset;
									}

									CopyToClipboard(data);
								}}
								variant="outline-info"
							>
								<Icon type="table" />
								Export {search !== "" ? "Filtered Data" : "Table"} (JSON)
							</Button>
						)}
					</div>
					<div className="col-lg-4 ml-auto text-right">
						<div className="btn-group">
							<Button
								variant="secondary"
								disabled={pageState === "start" || pageState === "start-end"}
								onClick={decrementPage}
							>
								<SmallText small="<" large="Previous" />
							</Button>
							<PageSelector currentPage={page} maxPage={maxPage} setPage={setPage} />
							<Button
								variant="secondary"
								disabled={pageState === "end" || pageState === "start-end"}
								onClick={incrementPage}
							>
								<SmallText small=">" large="Next" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
