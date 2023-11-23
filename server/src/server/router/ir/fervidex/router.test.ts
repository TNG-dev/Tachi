import deepmerge from "deepmerge";
import db from "external/mongo/db";
import t from "tap";
import { InsertFakeTokenWithAllPerms } from "test-utils/fake-auth";
import mockApi from "test-utils/mock-api";
import ResetDBState from "test-utils/resets";
import {
	FervidexBaseGSMScore,
	FervidexBaseScore,
	FervidexStaticBase,
	GetKTDataJSON,
} from "test-utils/test-data";
import { Random20Hex, Sleep } from "utils/misc";
import type { ChartDocument, GPTStrings, SongDocument } from "tachi-common";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TestHeaders(url: string, data: any) {
	t.test("Should validate against card filters", async (t) => {
		await db["fer-settings"].remove({});
		await db["fer-settings"].insert({
			userID: 1,
			cards: ["foo"],
			forceStaticImport: false,
		});

		const res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// rootage
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.set("X-Account-Id", "bar")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		t.equal(res.body.success, false, "Should reject invalid card.");

		const res2 = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// rootage
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		t.equal(res2.body.success, false, "Should reject no card.");

		t.end();
	});

	t.test("Should allow certain models", async (t) => {
		await db["fer-settings"].remove({});
		await db["fer-settings"].insert({
			userID: 1,
			cards: null,
			forceStaticImport: false,
		});

		for (const [ext, name] of [
			["2022082400", "CastHour"],
			["2021091500", "Bistrover"],
			["2020092900", "HEROIC VERSE"],
		]) {
			// unfathomably stupid race-condition protection
			// tap *really* doesn't like tests being invoked dynamically
			// like this (TestHeaders)
			// so it runs them kind of in parallel
			// even though we don't want them to do that
			const token = `mock_token_${Random20Hex()}`;

			await InsertFakeTokenWithAllPerms(token)();

			const res = await mockApi
				.post(url)
				.set("Authorization", `Bearer ${token}`)

				// CastHour
				.set("X-Software-Model", `LDJ:J:B:A:${ext}`)
				.set("User-Agent", "fervidex/1.3.0")
				.send(data);

			t.equal(res.body.success, true, `Should allow ${name} clients`);

			await db["api-tokens"].remove({ key: token });
		}

		t.end();
	});

	t.only("Should allow 30-omni", async (t) => {
		await db["fer-settings"].remove({});
		await db["fer-settings"].insert({
			userID: 1,
			cards: null,
			forceStaticImport: false,
		});

		const token = `mock_token_${Random20Hex()}`;

		await InsertFakeTokenWithAllPerms(token)();

		const res = await mockApi
			.post(url)
			.set("Authorization", `Bearer ${token}`)
			.set("X-Software-Model", "LDJ:J:B:X:2023090500")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		console.dir(res.body);

		t.equal(res.body.success, true, "Should allow 30-omni");

		t.end();
	});

	t.test("Should reject invalid X-Software-Models", async (t) => {
		let res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// rootage
			.set("X-Software-Model", "LDJ:J:B:A:2019090200")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		t.equal(res.body.success, false, "Should reject rootage clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// rootage old
			.set("X-Software-Model", "LDJ:J:B:A:2019100700")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		t.equal(res.body.success, false, "Should reject rootage clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// cannonballers
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2018091900")
			.send(data);

		t.equal(res.body.success, false, "Should reject cannonballers clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:NONSENSE")
			.send(data);

		t.equal(res.body.success, false, "Should reject nonsense versions");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// BMS-iidx
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:Z:2020092900")
			.send(data);

		t.equal(res.body.success, false, "Should reject BMS-iidx clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// BMS-iidx
			.set("User-Agent", "fervidex/1.2.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(data);

		t.equal(res.body.success, false, "Should reject outdated fervidex clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// BMS-iidx
			.set("User-Agent", "fervidex/.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(data);

		t.equal(res.body.success, false, "Should reject invalid fervidex clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// BMS-iidx
			.set("User-Agent", "")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(data);

		t.equal(res.body.success, false, "Should reject invalid fervidex clients");

		res = await mockApi
			.post(url)
			.set("Authorization", "Bearer mock_token")

			// BMS-iidx
			.set("User-Agent", "invalid")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(data);

		t.equal(res.body.success, false, "Should reject invalid fervidex clients");

		t.end();
	});

	t.test("Should require authorization.", async (t) => {
		const res = await mockApi
			.post(url)
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		t.equal(res.status, 401, "Should return 401.");
		t.type(res.body.error, "string", "Should have an error message.");

		const res2 = await mockApi
			.post(url)
			.set("Authorization", "Bearer invalid_token")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.set("User-Agent", "fervidex/1.3.0")
			.send(data);

		t.equal(res2.status, 401, "Should return 401.");
		t.type(res2.body.error, "string", "Should have an error message.");

		t.end();
	});
}

t.test("POST /ir/fervidex/class/submit", (t) => {
	t.beforeEach(ResetDBState);
	t.beforeEach(InsertFakeTokenWithAllPerms("mock_token"));

	TestHeaders("/ir/fervidex/class/submit", { cleared: true, course_id: 18, play_style: 0 });

	t.test("Should update a users class.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: true, course_id: 18, play_style: 0 });

		t.equal(res.status, 200);
		t.equal(res.body.success, true);
		t.equal(res.body.description, "Dan changed!");

		const ugs = await db["game-stats"].findOne({ userID: 1, game: "iidx", playtype: "SP" });

		t.equal(ugs?.classes.dan, "KAIDEN");

		const recentAchievement = await db["class-achievements"].findOne({
			userID: 1,
			game: "iidx",
			playtype: "SP",
		});

		t.hasStrict(recentAchievement, {
			userID: 1,
			game: "iidx",
			playtype: "SP",
			classValue: "KAIDEN",
			classSet: "dan",
			classOldValue: null,
		});

		t.end();
	});

	t.test("Should update a users class for DP.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: true, course_id: 17, play_style: 1 });

		t.equal(res.status, 200);
		t.equal(res.body.success, true);
		t.equal(res.body.description, "Dan changed!");

		const ugs = await db["game-stats"].findOne({ userID: 1, game: "iidx", playtype: "DP" });

		t.equal(ugs?.classes.dan, "CHUUDEN");

		t.end();
	});

	t.test("Should ignore dans that weren't cleared.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: false, course_id: 17, play_style: 1 });

		t.equal(res.status, 200);
		t.equal(res.body.description, "No Update Made.");

		t.end();
	});

	t.test("Should reject invalid dans.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: true, course_id: null, play_style: 1 });

		t.equal(res.status, 400);
		t.match(
			res.body.error,
			"[course_id] Expected an integer between 0 and 18. (Received null)"
		);

		t.end();
	});

	t.test("Should reject invalid numerical dans.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: true, course_id: 20, play_style: 1 });

		t.equal(res.status, 400);
		t.match(res.body.error, "[course_id] Expected an integer between 0 and 18. (Received 20)");

		t.end();
	});

	t.test("Should reject invalid negative dans.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: true, course_id: -1, play_style: 1 });

		t.equal(res.status, 400);
		t.match(res.body.error, "[course_id] Expected an integer between 0 and 18. (Received -1)");

		t.end();
	});

	t.test("Should reject invalid play_styles.", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/class/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({ cleared: true, course_id: 16, play_style: null });

		t.equal(res.status, 400);
		t.match(res.body.error, "[play_style] Expected any of 0, 1. (Received null)");

		t.end();
	});

	t.end();
});

t.test("POST /ir/fervidex/score/submit", (t) => {
	t.beforeEach(ResetDBState);
	t.beforeEach(InsertFakeTokenWithAllPerms("mock_token"));

	TestHeaders("/ir/fervidex/score/submit", FervidexBaseScore);

	t.test("Should import a valid score", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/score/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(FervidexBaseScore);

		t.equal(res.body.success, true, "Should be successful");

		t.equal(res.body.body.errors.length, 0, "Should have 0 failed scores.");

		const scores = await db.scores.count({
			service: "Fervidex",
		});

		t.equal(scores, 1, "Should import 1 score.");
		t.equal(res.body.body.userIntent, false, "Should not have user intent.");

		t.end();
	});

	t.test("Should import a valid score with undefined options", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/score/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(deepmerge(FervidexBaseScore, { option: undefined }));

		t.equal(res.body.success, true, "Should be successful");

		t.equal(res.body.body.errors.length, 0, "Should have 0 failed scores.");

		const scores = await db.scores.count({
			service: "Fervidex",
		});

		t.equal(scores, 1, "Should import 1 score.");

		t.end();
	});

	t.test("Should import a valid score with 2dx-gsm", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/score/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(FervidexBaseGSMScore);

		t.equal(res.body.success, true, "Should be successful");

		t.equal(res.body.body.errors.length, 0, "Should have 0 failed scores.");

		const scores = await db.scores.count({
			service: "Fervidex",
		});

		t.equal(scores, 1, "Should import 1 score.");

		t.end();
	});

	t.test("Should reject an invalid body", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/score/submit")
			.set("User-Agent", "fervidex/1.3.0")
			.set("Authorization", "Bearer mock_token")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send({});

		t.equal(res.body.success, false, "Should not be successful");

		t.type(res.body.error, "string", "Should have an error prop that is a string.");

		t.end();
	});

	t.test("Should reject an invalid exscore", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/score/submit")
			.set("User-Agent", "fervidex/1.3.0")
			.set("Authorization", "Bearer mock_token")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(
				deepmerge(FervidexBaseScore, {
					ex_score: 9999,
				})
			);

		t.equal(res.statusCode, 200, "Should pass validation.");

		await Sleep(2000);

		const imp = await db.imports.findOne({
			importID: res.body.body.importID,
		});

		t.strictSame(imp?.errors, [
			{
				type: "InvalidDatapoint",
				message: `Got 3 errors when validating score:
Invalid value for score, EX Score cannot be greater than 1572 for this chart. Got 9999.
Invalid value for percent, Expected a number between 0 and 100. Got 636.0687022900763.
Expected PGreat*2 + Great to equal EX score. Got 34*2 + 0 but that wasn't equal to the EX score of 9999.`,
			},
		]);

		t.end();
	});

	t.test("Should reject an invalid gauge", async (t) => {
		const res = await mockApi
			.post("/ir/fervidex/score/submit")
			.set("User-Agent", "fervidex/1.3.0")
			.set("Authorization", "Bearer mock_token")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(deepmerge(FervidexBaseScore, { gauge: [150] }));

		t.equal(res.statusCode, 200, "Should pass validation.");

		await Sleep(2000);

		const imp = await db.imports.findOne({
			importID: res.body.body.importID,
		});

		t.strictSame(imp?.errors, [
			{
				type: "InvalidDatapoint",
				message: "Invalid value of gauge 150.",
			},
		]);

		t.end();
	});

	t.end();
});

t.test("POST /ir/fervidex/profile/submit", (t) => {
	t.beforeEach(ResetDBState);
	t.beforeEach(InsertFakeTokenWithAllPerms("mock_token"));

	TestHeaders("/ir/fervidex/profile/submit", FervidexStaticBase);

	t.test("Should accept a fervidex-static body", async (t) => {
		await db.songs.iidx.remove({});
		await db.songs.iidx.insert(
			GetKTDataJSON("./tachi/tachi-songs-iidx.json") as Array<SongDocument<"iidx">>
		);
		await db.charts.iidx.remove({});
		await db.charts.iidx.insert(
			GetKTDataJSON("./tachi/tachi-charts-iidx.json") as Array<
				ChartDocument<GPTStrings["iidx"]>
			>
		);

		const res = await mockApi
			.post("/ir/fervidex/profile/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "P2D:J:B:A:2020092900")
			.send(FervidexStaticBase);

		t.equal(res.statusCode, 202, "Should be deferred for later processing.");

		// Not sure how long this import should take, but sleeping for 5 seconds
		// seems like a very conservative estimate.
		// Then we can check whether the database has properly updated.
		await Sleep(5_000);

		const scores = await db.scores.count({
			service: "Fervidex Static",
		});

		t.equal(scores, 3, "Should import 3 scores.");

		const ugs = await db["game-stats"].findOne({
			userID: 1,
			game: "iidx",
			playtype: "SP",
		});

		t.equal(ugs!.classes.dan, "DAN_9", "Should successfully update dan to 9th.");

		t.end();
	});

	t.test("Should allow requests from non INF2 if forceStaticImport is true.", async (t) => {
		await db.songs.iidx.remove({});
		await db.songs.iidx.insert(
			GetKTDataJSON("./tachi/tachi-songs-iidx.json") as Array<SongDocument<"iidx">>
		);
		await db.charts.iidx.remove({});
		await db.charts.iidx.insert(
			GetKTDataJSON("./tachi/tachi-charts-iidx.json") as Array<
				ChartDocument<GPTStrings["iidx"]>
			>
		);

		await db["fer-settings"].update(
			{ userID: 1 },
			{
				$set: { forceStaticImport: true },
			}
		);

		const res = await mockApi
			.post("/ir/fervidex/profile/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(FervidexStaticBase);

		t.equal(res.statusCode, 202, "Should be deferred for later processing.");

		// See above.
		await Sleep(5_000);

		const scores = await db.scores.count({
			service: "Fervidex Static",
		});

		t.equal(scores, 3, "Should import 3 scores.");

		const ugs = await db["game-stats"].findOne({
			userID: 1,
			game: "iidx",
			playtype: "SP",
		});

		t.equal(ugs!.classes.dan, "DAN_9", "Should successfully update dan to 9th.");

		const dbRes = await db["fer-settings"].findOne({ userID: 1 });

		t.equal(
			dbRes?.forceStaticImport,
			false,
			"forceStaticImport should be set to false after the request."
		);

		t.end();
	});

	t.test("Should allow requests from non INF2 if forceStaticImport is false.", async (t) => {
		await db["fer-settings"].update({ userID: 1 }, { $set: { forceStaticImport: false } });

		const res = await mockApi
			.post("/ir/fervidex/profile/submit")
			.set("Authorization", "Bearer mock_token")
			.set("User-Agent", "fervidex/1.3.0")
			.set("X-Software-Model", "LDJ:J:B:A:2020092900")
			.send(FervidexStaticBase);

		t.equal(res.statusCode, 202, "Should be allowed, but no scores should be imported");

		const scoresNow = await db.scores.count({
			service: "Fervidex Static",
		});

		t.strictSame(scoresNow, 0, "Should have imported no scores");

		t.end();
	});

	t.end();
});
