import { IsString } from "./misc";
import { GetGamePTConfig } from "tachi-common";
import type { Game, GamePTConfig, Playtype } from "tachi-common";

const isIntegerRegex = /^-?\d+$/u;

export function ParseStrPositiveInt(val: unknown) {
	if (!IsString(val)) {
		return null;
	}

	const isInt = isIntegerRegex.test(val);

	if (!isInt) {
		return null;
	}

	const v = Number(val);

	if (!Number.isSafeInteger(v) || v < 0) {
		return null;
	}

	return v;
}

export function ParseStrPositiveNonZeroInt(val: unknown) {
	if (!IsString(val)) {
		return null;
	}

	const isInt = isIntegerRegex.test(val);

	if (!isInt) {
		return null;
	}

	const v = Number(val);

	if (!Number.isSafeInteger(v) || v <= 0) {
		return null;
	}

	return v;
}

export type ProfileRatingAlgs = GamePTConfig["defaultProfileRatingAlg"];
export type ScoreRatingAlgs = GamePTConfig["defaultScoreRatingAlg"];
export type SessionRatingAlgs = GamePTConfig["defaultSessionRatingAlg"];

export function CheckStrProfileAlg(game: Game, playtype: Playtype, strVal: string) {
	const gptConfig = GetGamePTConfig(game, playtype);

	// @hack
	if (!gptConfig.profileRatingAlgs.includes(strVal as ProfileRatingAlgs)) {
		return null;
	}

	return strVal as ProfileRatingAlgs;
}

export function CheckStrScoreAlg(game: Game, playtype: Playtype, strVal: string) {
	const gptConfig = GetGamePTConfig(game, playtype);

	// @hack
	if (!gptConfig.scoreRatingAlgs.includes(strVal as ScoreRatingAlgs)) {
		return null;
	}

	return strVal as ScoreRatingAlgs;
}

export function CheckStrSessionAlg(game: Game, playtype: Playtype, strVal: string) {
	const gptConfig = GetGamePTConfig(game, playtype);

	// @hack
	if (!gptConfig.sessionRatingAlgs.includes(strVal as SessionRatingAlgs)) {
		return null;
	}

	return strVal as SessionRatingAlgs;
}
