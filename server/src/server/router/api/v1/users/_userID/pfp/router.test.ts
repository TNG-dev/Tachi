import db from "external/mongo/db";
import { CDNStoreOrOverwrite } from "lib/cdn/cdn";
import { GetProfilePictureURL } from "lib/cdn/url-format";
import t from "tap";
import mockApi from "test-utils/mock-api";
import ResetDBState from "test-utils/resets";
import { GetKTDataBuffer } from "test-utils/test-data";

t.test("GET /api/v1/users/:userID/pfp", (t) => {
	t.beforeEach(ResetDBState);

	t.test("Should return the default profile picture if user has no custom pfp", async (t) => {
		await CDNStoreOrOverwrite("/users/default/pfp", "test");

		// we have to follow redirs here lol
		const res = await mockApi.get("/api/v1/users/1/pfp").redirects(1);

		t.equal(res.body.toString(), "test");

		t.end();
	});

	t.test("Should work with a .png extension", async (t) => {
		await CDNStoreOrOverwrite("/users/default/pfp", "test");

		// we have to follow redirs here lol
		const res = await mockApi.get("/api/v1/users/1/pfp.png").redirects(1);

		t.equal(res.body.toString(), "test");

		t.end();
	});

	t.test("Should return a custom profile picture if one is set", async (t) => {
		await CDNStoreOrOverwrite(GetProfilePictureURL(1, "checksum"), "foo");
		await db.users.update({ id: 1 }, { $set: { customPfpLocation: "checksum" } });
		const res = await mockApi.get("/api/v1/users/1/pfp").redirects(1);

		t.equal(res.body.toString(), "foo");

		t.end();
	});

	t.end();
});

t.test("PUT /api/v1/users/:userID/pfp", (t) => {
	t.beforeEach(ResetDBState);

	t.test("Should set a profile picture if user has no custom pfp", async (t) => {
		const img = GetKTDataBuffer("/images/acorn.png");

		const res = await mockApi
			.put("/api/v1/users/1/pfp")
			.set("Authorization", "Bearer fake_api_token")
			.attach("pfp", img, "file.jpg");

		t.equal(res.statusCode, 200);

		const get = await mockApi.get(res.body.body.get).redirects(1);

		t.strictSame(img, get.body, "Profile picture should be stored.");

		t.end();
	});

	t.test("Should set a profile picture if user has custom pfp", async (t) => {
		await db.users.update({ id: 1 }, { $set: { customPfpLocation: "checksum" } });

		const img = GetKTDataBuffer("/images/acorn.png");

		const res = await mockApi
			.put("/api/v1/users/1/pfp")
			.set("Authorization", "Bearer fake_api_token")
			.attach("pfp", img, "file.png");

		t.equal(res.statusCode, 200);

		const get = await mockApi.get(res.body.body.get).redirects(1);

		t.strictSame(img, get.body, "Profile picture should be stored.");

		t.end();
	});

	t.end();
});
