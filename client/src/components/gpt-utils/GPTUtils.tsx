import { Game, GPTString, Playtype } from "tachi-common";
import { GPTUtility } from "types/ugpt";
import { BMSCustomTablesTool } from "./tools/BMSCustomTablesTool";
import { IIDXEamusementExportTool } from "./tools/IIDXEamusementExportTool";
import { IIDXPlaylistsTool } from "./tools/IIDXPlaylistsTool";
import { JubilityBreakdownInsight } from "./insights/JubilityBreakdownInsight";
import { BMSSieglindeInfoTool } from "./tools/BMSSieglindeInfoTool";

// What utils does each game support?
const GPT_UTILS: Record<GPTString, Array<GPTUtility>> = {
	"bms:7K": [BMSCustomTablesTool, BMSSieglindeInfoTool],
	"bms:14K": [BMSCustomTablesTool, BMSSieglindeInfoTool],
	"chunithm:Single": [],
	"gitadora:Dora": [],
	"gitadora:Gita": [],
	"iidx:DP": [IIDXEamusementExportTool, IIDXPlaylistsTool],
	"iidx:SP": [IIDXEamusementExportTool, IIDXPlaylistsTool],
	"itg:Stamina": [],
	"jubeat:Single": [JubilityBreakdownInsight],
	"museca:Single": [],
	"pms:Controller": [],
	"pms:Keyboard": [],
	"popn:9B": [],
	"sdvx:Single": [],
	"usc:Controller": [],
	"usc:Keyboard": [],
	"wacca:Single": [],
	"maimaidx:Single": [],
	"maimai:Single": [],
};

export function GetGPTUtils(game: Game, playtype: Playtype) {
	const idString = `${game}:${playtype}` as GPTString;

	return GPT_UTILS[idString];
}

export function GetGPTUtilsName(game: Game, playtype: Playtype, isViewingOwnProfile: boolean) {
	const utils = GetGPTUtils(game, playtype);

	// things for personal use only are called "tools"
	// things everyone might want to view about a person are called "insights".
	// an example of an insight would be a jubility breakdown
	// an example of a tool would be a eamusement csv export thing.
	const tools = utils.filter((e) => e.personalUseOnly);
	const insights = utils.filter((e) => e.personalUseOnly !== true);

	if (isViewingOwnProfile) {
		if (tools.length > 0 && insights.length > 0) {
			return "Tools & Insights";
		} else if (insights.length > 0) {
			return "Insights";
		} else if (tools.length > 0) {
			return "Tools";
		}

		return null;
	}

	if (insights.length > 0) {
		return "Insights";
	}

	return null;
}
