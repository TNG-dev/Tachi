import { SDVX_IMPL } from "./sdvx";
import db from "external/mongo/db";
import CreateLogCtx from "lib/logger/logger";
import { CreatePBDoc } from "lib/score-import/framework/pb/create-pb-doc";
import { SDVX_GRADES, SDVX_LAMPS } from "tachi-common";
import t from "tap";
import { dmf, mkMockPB, mkMockScore } from "test-utils/misc";
import ResetDBState from "test-utils/resets";
import { TestSnapshot } from "test-utils/single-process-snapshot";
import { TestingSDVXAlbidaChart } from "test-utils/test-data";
import type { ProvidedMetrics, ScoreData } from "tachi-common";

const logger = CreateLogCtx(__filename);

const baseMetrics: ProvidedMetrics["sdvx:Single"] = {
	lamp: "CLEAR",
	score: 9_003_000,
};

const scoreData: ScoreData<"sdvx:Single"> = {
	lamp: "CLEAR",
	score: 9_700_000,
	grade: "AAA",
	judgements: {},
	optional: { enumIndexes: {}, exScore: 10 },
	enumIndexes: {
		grade: SDVX_GRADES.AAA,
		lamp: SDVX_LAMPS.CLEAR,
	},
};

const mockScore = mkMockScore("sdvx", "Single", TestingSDVXAlbidaChart, scoreData);
const mockPB = mkMockPB("sdvx", "Single", TestingSDVXAlbidaChart, scoreData);

t.test("SDVX Implementation", (t) => {
	t.test("EX Score Validator", (t) => {
		t.equal(SDVX_IMPL.chartSpecificValidators.exScore(1000, TestingSDVXAlbidaChart), true);
		t.equal(SDVX_IMPL.chartSpecificValidators.exScore(0, TestingSDVXAlbidaChart), true);

		TestSnapshot(
			t,
			SDVX_IMPL.chartSpecificValidators.exScore(-1, TestingSDVXAlbidaChart),
			`EX Score Validator SDVX: negative`
		);

		// not supported yet
		t.skip("SDVX EXScore should be upperbounded on maximum EX Score");

		t.end();
	});
	t.test("Grade Deriver", (t) => {
		const f = (score: number, expected: any) =>
			t.equal(
				SDVX_IMPL.derivers.grade(dmf(baseMetrics, { score }), TestingSDVXAlbidaChart),
				expected,
				`A score of ${score.toLocaleString()} should result in grade=${expected}.`
			);

		f(0, "D");
		f(7_000_000, "C");
		f(8_000_000, "B");
		f(8_700_000, "A");
		f(9_000_000, "A+");
		f(9_300_000, "AA");
		f(9_500_000, "AA+");
		f(9_700_000, "AAA");
		f(9_800_000, "AAA+");
		f(9_900_000, "S");
		f(10_000_000, "PUC");

		t.end();
	});

	t.test("VF Class Deriver", (t) => {
		const f = (v: number | null, expected: any) =>
			t.equal(
				SDVX_IMPL.classDerivers.vfClass({ VF6: v }),
				expected,
				`A profile VF6 of ${v} should result in ${expected}.`
			);

		f(null, null);
		f(0, "SIENNA_I");

		f(23, "IMPERIAL_IV");
		f(22, "IMPERIAL_III");
		f(21, "IMPERIAL_II");
		f(20, "IMPERIAL_I");
		f(19.75, "CRIMSON_IV");
		f(19.5, "CRIMSON_III");
		f(19.25, "CRIMSON_II");
		f(19, "CRIMSON_I");
		f(18.75, "ELDORA_IV");
		f(18.5, "ELDORA_III");
		f(18.25, "ELDORA_II");
		f(18, "ELDORA_I");
		f(17.75, "ARGENTO_IV");
		f(17.5, "ARGENTO_III");
		f(17.25, "ARGENTO_II");
		f(17, "ARGENTO_I");
		f(16.75, "CORAL_IV");
		f(16.5, "CORAL_III");
		f(16.25, "CORAL_II");
		f(16, "CORAL_I");
		f(15.75, "SCARLET_IV");
		f(15.5, "SCARLET_III");
		f(15.25, "SCARLET_II");
		f(15, "SCARLET_I");
		f(14.75, "CYAN_IV");
		f(14.5, "CYAN_III");
		f(14.25, "CYAN_II");
		f(14, "CYAN_I");
		f(13.5, "DANDELION_IV");
		f(13, "DANDELION_III");
		f(12.5, "DANDELION_II");
		f(12, "DANDELION_I");
		f(11.5, "COBALT_IV");
		f(11, "COBALT_III");
		f(10.5, "COBALT_II");
		f(10, "COBALT_I");
		f(7.5, "SIENNA_IV");
		f(5, "SIENNA_III");
		f(2.5, "SIENNA_II");

		t.end();
	});

	t.todo("Score Calcs");
	t.todo("Session Calcs");
	t.todo("Profile Calcs");

	t.test("Goal Formatters", (t) => {
		t.test("Criteria", (t) => {
			t.equal(SDVX_IMPL.goalCriteriaFormatters.score(908_182), "Get a score of 908,182 on");

			t.end();
		});

		t.test("Progress", (t) => {
			const f = (
				k: keyof typeof SDVX_IMPL.goalProgressFormatters,
				modifant: Partial<ScoreData<"sdvx:Single">>,
				goalValue: any,
				expected: any
			) =>
				t.equal(
					SDVX_IMPL.goalProgressFormatters[k](
						dmf(mockPB, {
							scoreData: modifant,
						}),
						goalValue
					),
					expected
				);

			f("grade", { grade: "AAA+", score: 9_817_342 }, SDVX_GRADES.S, "S-83K");
			f("score", { score: 9_820_123 }, 1_000_000, "9,820,123");
			f("lamp", { lamp: "CLEAR" }, SDVX_LAMPS.CLEAR, "CLEAR");

			t.end();
		});

		t.test("Out Of", (t) => {
			t.equal(SDVX_IMPL.goalOutOfFormatters.score(901_003), "901,003");
			t.equal(SDVX_IMPL.goalOutOfFormatters.score(983_132), "983,132");

			t.end();
		});

		t.end();
	});

	t.test("PB Merging", (t) => {
		t.beforeEach(ResetDBState);

		t.test("Should join best lamp", async (t) => {
			await db.scores.insert(mockScore);
			await db.scores.insert(
				dmf(mockScore, {
					scoreID: "bestLamp",
					scoreData: {
						score: 0,
						lamp: "ULTIMATE CHAIN",
						enumIndexes: { lamp: SDVX_LAMPS.ULTIMATE_CHAIN },
					},
				})
			);

			t.hasStrict(await CreatePBDoc("sdvx:Single", 1, TestingSDVXAlbidaChart, logger), {
				composedFrom: [{ name: "Best Score" }, { name: "Best Lamp", scoreID: "bestLamp" }],
				scoreData: {
					score: mockScore.scoreData.score,
					lamp: "ULTIMATE CHAIN",
					enumIndexes: { lamp: SDVX_LAMPS.ULTIMATE_CHAIN },
				},
			});

			t.end();
		});

		t.test("Should join best EX SCore", async (t) => {
			await db.scores.insert(mockScore);
			await db.scores.insert(
				dmf(mockScore, {
					scoreID: "bestLamp",
					scoreData: {
						score: 0,
						lamp: "ULTIMATE CHAIN",
						enumIndexes: { lamp: SDVX_LAMPS.ULTIMATE_CHAIN },
						optional: {
							exScore: 9000,
						},
					},
				})
			);

			t.hasStrict(await CreatePBDoc("sdvx:Single", 1, TestingSDVXAlbidaChart, logger), {
				composedFrom: [{ name: "Best Score" }, { name: "Best Lamp", scoreID: "bestLamp" }],
				scoreData: {
					score: mockScore.scoreData.score,
					lamp: "ULTIMATE CHAIN",
					enumIndexes: { lamp: SDVX_LAMPS.ULTIMATE_CHAIN },
					optional: {
						exScore: 9000,
					},
				},
			});

			t.end();
		});

		t.end();
	});

	t.end();
});
