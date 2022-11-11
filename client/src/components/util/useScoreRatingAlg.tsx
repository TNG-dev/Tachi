import {
	Game,
	GetGamePTConfig,
	IDStrings,
	ScoreCalculatedDataLookup,
	SessionCalculatedDataLookup,
	UGSRatingsLookup,
	Playtype,
} from "tachi-common";
import useLUGPTSettings from "./useLUGPTSettings";

export default function useScoreRatingAlg<I extends IDStrings = IDStrings>(
	game: Game,
	playtype: Playtype
): ScoreCalculatedDataLookup[I] {
	const { settings } = useLUGPTSettings();

	if (!settings?.preferences.preferredScoreAlg) {
		const gptConfig = GetGamePTConfig(game, playtype);

		return gptConfig.defaultScoreRatingAlg as ScoreCalculatedDataLookup[I];
	}

	return settings.preferences.preferredScoreAlg as ScoreCalculatedDataLookup[I];
}

export function useSessionRatingAlg<I extends IDStrings = IDStrings>(
	game: Game,
	playtype: Playtype
): SessionCalculatedDataLookup[I] {
	const { settings } = useLUGPTSettings();

	if (!settings?.preferences.preferredSessionAlg) {
		const gptConfig = GetGamePTConfig(game, playtype);

		return gptConfig.defaultSessionRatingAlg as SessionCalculatedDataLookup[I];
	}

	return settings.preferences.preferredSessionAlg as SessionCalculatedDataLookup[I];
}

export function useProfileRatingAlg<I extends IDStrings = IDStrings>(
	game: Game,
	playtype: Playtype
): UGSRatingsLookup[I] {
	const { settings } = useLUGPTSettings();

	if (!settings?.preferences.preferredProfileAlg) {
		const gptConfig = GetGamePTConfig(game, playtype);

		return gptConfig.defaultProfileRatingAlg as UGSRatingsLookup[I];
	}

	return settings.preferences.preferredProfileAlg as UGSRatingsLookup[I];
}
