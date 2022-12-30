/* eslint-disable lines-around-comment */
import type { ClassInfo } from "../config/game-classes";
import type { MatchTypes } from "./batch-manual";
import type { ScoreMetric } from "./metrics";

interface RatingAlgorithmConfig {
	/**
	 * Write a short descrption for this rating algorithm.
	 */
	description: string;
	/**
	 * Normally, Tachi will format the result of all rating algorithms in the UI
	 * to two decimal places. However, you may wish to override that functionality
	 * for this algorithm.
	 */
	formatter?: (value: number) => string;
}

interface TierlistConfig {
	/**
	 * Write a short description explaining what this tierlist is and what the values
	 * generally mean.
	 */
	description: string;
}

interface ClassConfig {
	/**
	 * If a worse thing comes in for this, should this metric go down?
	 * I.e. if a user is 4th dan and they submit 3rd dan, should it go
	 * down to 3rd dan? (Hopefully not). This makes the most sense for
	 * metrics like "colour" in games, which are a function of some profile
	 * skill. If said profile skill goes down, it should reflect in that
	 * colour.
	 */
	downgradable: boolean;

	/**
	 * Can this class be sent in `batchManual.classes`? This only makes sense
	 * for classes that aren't a function of existing state, so things like
	 * submitting dan rank makes sense, but submitting things like "Colour"
	 * makes no sense (as it's a function of profile skill).
	 */
	canBeBatchManualSubmitted: boolean;

	/**
	 * What are the possible values for this class field? This should be in
	 * ascending order.
	 */
	values: Array<ClassInfo>;
}

interface DynamicDifficulties {
	/**
	 * This game's difficulty names are arbitrary (unique) strings. This makes sense
	 * for a lot of home games, where a song may have any number of difficulties
	 * attached onto it that we want to care for (think osu!).
	 */
	type: "DYNAMIC";
}

interface FixedDifficulties<Difficulty extends string> {
	/**
	 * The amount of difficulties that may belong to a song is a fixed possible set.
	 *
	 * For example, if the game only ever supports Easy, Normal and Hard difficulties
	 * this would be static.
	 *
	 * If the game was more like osu!, where a song can have arbitrary unique strings
	 * as difficulty names, you want "DYNAMIC" instead.
	 */
	type: "FIXED";

	/**
	 * What order should these difficulties appear in?
	 */
	difficultyOrder: ReadonlyArray<Difficulty>;

	/**
	 * For mobile view (and certain pages where things are generally smaller)
	 * how should we shorten these difficulty names?
	 *
	 * For example, in IIDX "ANOTHER" is generally shortened to "A".
	 */
	difficultyShorthand: Partial<Record<Difficulty, string>>;

	/**
	 * What colour should each difficulty have in the UI?
	 */
	difficultyColours: Record<Difficulty, string>;

	/**
	 * When you click on a song with no difficulty, what should it default to?
	 *
	 * @note If the song doesn't have this difficulty, it will pick in an
	 * undefined order.
	 *
	 * i.e. the default difficulty is "ANOTHER" and the song has no "ANOTHER" available,
	 * then it will just pick something at random that still belongs to that chart.
	 */
	defaultDifficulty: Difficulty;
}

export type DifficultyConfig<D extends string = string> =
	| DynamicDifficulties
	| FixedDifficulties<D>;

export type INTERNAL_GPT_CONFIG = Readonly<{
	/**
	 * What metrics **must** be provided in order for this score to be usable by
	 * Tachi?
	 *
	 * This is intended for things like Score, Lamp, etc. Things that quite fundamentally
	 * *are* the metrics of the score.
	 */
	mandatoryMetrics: Record<string, ScoreMetric>;

	/**
	 * What metrics do we want to exist on score documents, but don't need to be
	 * provided?
	 *
	 * In simple terms, all of these metrics **MUST** be derivable by a DETERMINISTIC
	 * function of f(mandatoryMetrics, chartThisScoreWasOn).
	 *
	 * This is for convenience/efficiency mainly. A good example would be "percent" for
	 * IIDX. Technically, we could recalculate it every single time we want to display
	 * it by dividing score by chart.data.notecount * 2, but that's horrendously
	 * inefficient.
	 *
	 * Furthermore, since these things are derived deterministically, they only ever
	 * need to be recalculated in extreme circumstances (an IIDX chart has changed its
	 * notecounts!!!). If mandatory metrics were to change, it's just now a different
	 * score.
	 *
	 * Another good example would be "Grade" for most games, as a grade is often just
	 * cutoffs applied on score values.
	 */
	derivedMetrics: Record<string, ScoreMetric>;

	/**
	 * What's the primary/default metric for this game?
	 *
	 * This will be used to order leaderboard rankings.
	 *
	 * @note This **MUST** be one of the mandatory or derived keys
	 * (This is tested by the test suite.)
	 */
	primaryMetric: string;

	/**
	 * What metrics *can* we store about scores, but don't necessarily *need*?
	 *
	 * Of course, in a perfect world we'd store all the metrics always all the time!
	 * But a lot of import methods (eamusement CSV, etc) would be filtered out by
	 * mandating the existence of a lot of these metrics
	 */
	additionalMetrics: Record<string, ScoreMetric>;

	/**
	 * What rating algorithms may a score have attached onto it for this GPT?
	 *
	 * @note The implementations for these rating algorithms are handled in the
	 * server config. By defining them here, the typesystem will enforce that you
	 * implement them elsewhere.
	 */
	scoreRatingAlgs: Record<string, RatingAlgorithmConfig>;

	/**
	 * What rating algorithms may a session have attached onto it for this GPT?
	 *
	 * @note The implementations for these rating algorithms are handled in the
	 * server config. By defining them here, the typesystem will enforce that you
	 * implement them elsewhere.
	 */
	sessionRatingAlgs: Record<string, RatingAlgorithmConfig>;

	/**
	 * What rating algorithms may a profile have attached onto it for this GPT?
	 *
	 * @note This is **SPECIFICALLY** for numeric, calculatable metrics. This means
	 * that the metric *must* be calculatable *at all times* from the set of all
	 * scores this user has on this GPT.
	 *
	 * This is intended for numeric, continous data.
	 * If you want to store something with a fixed set of values, such as a user's
	 * "rating colour", use `supportedClasses`.
	 *
	 * If you want to store something that cannot be derived from the user's scores,
	 * such as their "Dan", use `supportedClasses`.
	 *
	 * @note The implementations for these rating algorithms are handled in the
	 * server config. By defining them here, the typesystem will enforce that you
	 * implement them elsewhere.
	 */
	profileRatingAlgs: Record<string, RatingAlgorithmConfig>;

	/**
	 * What classes may a profile have attached onto it for this GPT?
	 *
	 * Classes are a *fixed*, *ordered* set of values.
	 * They may be a function of existing state (like "rating colours", where a user
	 * gets a new discrete colour when they go up certain ratings),
	 * or they may be provided by score imports, such as "dans", which cannot be
	 * derived from a player's scores or profile ratings.
	 */
	supportedClasses: Record<string, ClassConfig>;

	/**
	 * What's the default score rating algorithm for this GPT?
	 *
	 * @note This should be one of the keys in scoreRatingAlgs.
	 */
	defaultScoreRatingAlg: string;

	/**
	 * What's the default session rating algorithm for this GPT?
	 *
	 * @note This should be one of the keys in sessionRatingAlgs.
	 */
	defaultSessionRatingAlg: string;

	/**
	 * What's the default profile rating algorithm for this GPT1?
	 *
	 * @note This should be one of the keys in sessionRatingAlgs.
	 */
	defaultProfileRatingAlg: string;

	/**
	 * How does this GPT handle difficulties?
	 *
	 * "Difficulties" are used to allow one song to have multiple charts. Some games
	 * may have a known set of possible difficulties, such as "Easy", "Normal" and
	 * "Hard".
	 *
	 * Other games may have an unknown set of possible difficulties, such as osu!
	 * allowing any string (as long as its unique.)
	 *
	 */
	difficultyConfig: DifficultyConfig;

	/**
	 * What judgements does this GPT have? These are typically timing-window names.
	 *
	 * These should be ordered from **best to worst**.
	 */
	orderedJudgements: ReadonlyArray<string>;

	/**
	 * Do players typically care more about their grades or their lamps in this GPT?
	 * This is used as the default for certain UI features, but users may override
	 * their preferred scoreBucket.
	 */
	scoreBucket: "grade" | "lamp";

	/**
	 * What versions do we support for this GPT?
	 *
	 * Versions are the way tachi disambiguates cases (typically in arcade games) where
	 * a chart is modified.
	 * For example, Rising in the Sun
	 * (https://remywiki.com/Rising_in_the_Sun(original_mix))
	 * was removed in IIDX 21 ("spada"), and revived in IIDX 27 with entirely different
	 * charts. Although these charts are completely different,
	 * they use the same song and difficulty
	 * so Rising in the Sun SP ANOTHER could mean two things!.
	 *
	 * We need to handle these cases, so we disambiguate by attaching "versions" onto
	 * every chart. These "versions" indicate what sets of chart states they appeared in
	 * for this GPT. Then, when a score is coming in, it can indicate what version this
	 * score was from. That way, we can make sure they resolve to the right chart.
	 */
	supportedVersions: ReadonlyArray<string>;

	/**
	 * What tierlists does this GPT have?
	 *
	 * Tierlists are a way of attaching custom rating values onto a chart.
	 * Unlike "chart.data", which may be overloaded with anything, defined tierlists
	 * *must* fit a known schema, allowing the UI to visually render any tierlists
	 * defined here.
	 *
	 * This feature is a bit redundant given "chart.data", and should be further
	 * investigated. My bad.
	 */
	supportedTierlists: Record<string, TierlistConfig>;

	/**
	 * What "matchTypes" should this game support for batch-manual imports? This
	 * allows us to disable things like "songTitle" resolutions for games like BMS,
	 * where song titles are absolutely not guaranteed to be unique.
	 */
	supportedMatchTypes: ReadonlyArray<MatchTypes>;
}>;

/**
 * A game config *must* satisfy this, but we don't export this kind of game config.
 *
 * Think of this like a "mold" for a game config, it's gotta be shaped like this,
 * but interacting with the mold is a little too malleable for the rest of the
 * codebase. { @see GameConfig } for the exported version.
 */
export interface INTERNAL_GAME_CONFIG<PT extends string = string> {
	readonly name: string;
	readonly validPlaytypes: ReadonlyArray<PT>;
	readonly defaultPlaytype: PT;
}