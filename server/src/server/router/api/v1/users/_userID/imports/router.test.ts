import db from "external/mongo/db";
import t from "tap";
import { mkFakeImport } from "test-utils/misc";
import mockApi from "test-utils/mock-api";
import ResetDBState from "test-utils/resets";
import { ApplyNTimes } from "utils/misc";
import type { ImportDocument } from "tachi-common";

t.test("GET /api/v1/users/:userID/imports", (t) => {
	t.beforeEach(ResetDBState);
	t.beforeEach(async () => {
		const testingImports = ApplyNTimes(600, (i) =>
			mkFakeImport({
				importID: `import_${i}`,
				timeFinished: 1000 - i,
				timeStarted: 999 - i,
			})
		);

		await db.imports.insert(testingImports);
		await db.imports.insert(
			mkFakeImport({ userID: 2, importID: "other_user_import", timeFinished: 998 })
		);
	});

	t.test("Should return all of this users imports.", async (t) => {
		const res = await mockApi.get("/api/v1/users/1/imports");

		t.equal(res.statusCode, 200);

		t.strictSame(
			res.body.body.map((e: ImportDocument) => e.importID),
			ApplyNTimes(500, (i) => `import_${i}`),
			"Should contain exactly the imports we were expecting, and no more."
		);

		t.end();
	});

	t.test("Should honour the timeFinished parameter.", async (t) => {
		const res = await mockApi.get("/api/v1/users/1/imports?timeFinished=500");

		t.equal(res.statusCode, 200);

		t.strictSame(
			res.body.body.map((e: ImportDocument) => e.importID),
			ApplyNTimes(100, (i) => `import_${i + 500}`),
			"Should contain exactly the imports we were expecting, and no more."
		);

		t.end();
	});

	t.test("Should return 400 if timeFinished is not parsable.", async (t) => {
		const res = await mockApi.get("/api/v1/users/1/imports?timeFinished=INVALID");

		t.equal(res.statusCode, 400);

		t.end();
	});

	t.end();
});

t.test("GET /api/v1/users/:userID/imports/with-user-intent", (t) => {
	t.beforeEach(ResetDBState);
	t.beforeEach(() => {
		db.imports.insert([
			mkFakeImport({ userID: 2, importID: "other_user_import" }),
			mkFakeImport({ userID: 1, importID: "with_intent", userIntent: true }),
			mkFakeImport({ userID: 1, importID: "without_intent", userIntent: false }),
		]);
	});

	t.test("Should return all of the imports this user has with user intent.", async (t) => {
		const res = await mockApi.get("/api/v1/users/1/imports/with-user-intent");

		t.equal(res.statusCode, 200, "Should return 200");

		t.strictSame(
			res.body.body.map((e: ImportDocument) => e.importID),
			["with_intent"],
			"Should return the exact imports we expected and no more."
		);

		t.end();
	});

	t.end();
});
