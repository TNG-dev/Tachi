/* eslint-disable no-await-in-loop */
import db from "external/mongo/db";
import { DatabaseSchemas } from "external/mongo/schemas";
import fjsh from "fast-json-stable-hash";
import CreateLogCtx from "lib/logger/logger";
import { ServerConfig, TachiConfig } from "lib/setup/config";
import { UserAuthLevels } from "tachi-common";
import { Random20Hex } from "utils/misc";
import { FormatPrError } from "utils/prudence";
import type { PrudenceError } from "prudence";
import type { TachiAPIClientDocument } from "tachi-common";

const logger = CreateLogCtx(__filename);

type DefaultClients = Array<Omit<TachiAPIClientDocument, "author" | "clientSecret">>;

// Defines some Tachi API Clients that should come default with a Tachi
// environment.
// These use the special Client ID prefix "CX" instead of "CI", which
// means they cannot possibly be collided.1
const KtchiDefaultClients: DefaultClients = [
	{
		name: "Fervidex",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXFervidex",
		apiKeyFilename: "kamaitachi.fervidex.json",
		apiKeyTemplate: JSON.stringify(
			{
				url: `${ServerConfig.OUR_URL}/ir/fervidex`,
				token: "%%TACHI_KEY%%",
			},
			null,
			"\t"
		),
	},
	{
		name: "Barbatos",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXBarbatos",
		apiKeyFilename: "barbatos.json",
		apiKeyTemplate: JSON.stringify(
			{
				api_key: "%%TACHI_KEY%%",
			},
			null,
			"\t"
		),
	},
	{
		name: "Konaste Hook",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXKsHook",
		apiKeyFilename: "kamaitachi.kshook.json",
		apiKeyTemplate: JSON.stringify(
			{
				url: `${ServerConfig.OUR_URL}/ir/kshook`,
				token: "%%TACHI_KEY%%",
				games: ["sv6c"],
			},
			null,
			"\t"
		),
	},
	{
		clientID: "CXChunitachi",
		requestedPermissions: ["submit_score"],
		name: "ChunItachi",
		redirectUri: null,
		webhookUri: null,
		apiKeyFilename: "ChunItachi.ini",
		apiKeyTemplate: `[general]
; Show information for debugging. Useful incase things go wrong.
showDebug = true

; Set this to an extID if multiple people play on your setup
; and you only want to import scores from a specific user.
; You can find your extID inside your database...
; ...or you can set it to junk like 123 and check the debug logs.
extID = 0

; The current version of the game you're playing on.
; This should be any of the following:
; game = amazon
; game = amazonplus
; game = crystal
; game = paradise
; game = paradiselost

game = PUT_YOUR_GAME_HERE

; If true, Fails will take more priority than things like FULL COMBOs.
failOverLamp = false

[kamaitachi]
; What to use to check whether we're online or not.
apiStatus = ${ServerConfig.OUR_URL}/api/v1/status

; Where to POST scores to.
apiEndpoint = ${ServerConfig.OUR_URL}/ir/direct-manual/import

; This thing is secret! Keep it so. You can manage your API Keys at
; ${ServerConfig.OUR_URL}/users/me -> Integrations -> API Keys!
apikey = %%TACHI_KEY%%`,
	},
	{
		name: "SilentHook",
		apiKeyFilename: "silent-config.json",
		apiKeyTemplate: JSON.stringify(
			{
				key: "%%TACHI_KEY%%",
				url: `${ServerConfig.OUR_URL}/ir/direct-manual/import`,
			},
			null,
			"\t"
		),
		clientID: "CXSilentHook",
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		webhookUri: null,
	},
	{
		name: "Mikado",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXMikado",
		apiKeyFilename: "mikado.toml",
		apiKeyTemplate: `[general]
# Set to 'false' to disable the hook
enable = true
# Whether the hook should export your class (skill level) or not
export_class = true
# Whether the hook should should inject your Tachi PBs in place of Cloud PBs
inject_cloud_pbs = true
# Timeout for web requests, in milliseconds
timeout = 3000

[cards]
# Card numbers that should be whitelisted
# If this is empty, all cards will be whitelisted
# E000 format, should be in single quotes and separated by commas
# Example: whitelist = ['E000000000', 'E000000001']
whitelist = []

[tachi]
# Tachi instance base URL
base_url = '${ServerConfig.OUR_URL}'
# Tachi status endpoint
status = '/api/v1/status'
# Tachi score import endpoint
import = '/ir/direct-manual/import'
# Tachi pbs endpoint
pbs = '/api/v1/users/{}/games/sdvx/Single/pbs/all'
# Your Tachi API key
api_key = '%%TACHI_KEY%%'
`,
	},
];

const BtchiDefaultClients: DefaultClients = [
	{
		name: "Beatoraja IR",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXBeatorajaIR",
		apiKeyTemplate: null,
		apiKeyFilename: null,
	},
	{
		name: "USC IR",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXUSCIR",
		apiKeyTemplate: null,
		apiKeyFilename: null,
	},
	{
		name: "LR2 Hook",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXLR2Hook",
		apiKeyFilename: "BokutachiAuth.json",
		apiKeyTemplate: JSON.stringify(
			{
				url: `${ServerConfig.OUR_URL}/ir/lr2hook/import`,
				apiKey: "%%TACHI_KEY%%",
			},
			null,
			"\t"
		),
	},
	{
		name: "ITG Hook",
		webhookUri: null,
		redirectUri: null,
		requestedPermissions: ["submit_score"],
		clientID: "CXITGHook",
		apiKeyFilename: "Tachi.json",
		apiKeyTemplate: JSON.stringify([
			{
				url: `${ServerConfig.OUR_URL}/ir/direct-manual/import`,
				token: "%%TACHI_KEY%%",
			},
		]),
	},
];

export async function LoadDefaultClients() {
	if (TachiConfig.TYPE === "ktchi") {
		await LoadClients(KtchiDefaultClients);
	} else if (TachiConfig.TYPE === "btchi") {
		await LoadClients(BtchiDefaultClients);
	} else {
		await LoadClients(KtchiDefaultClients);
		await LoadClients(BtchiDefaultClients);
	}
}

async function LoadClients(clients: DefaultClients) {
	const firstAdmin = await db.users.findOne({
		authLevel: UserAuthLevels.ADMIN,
	});

	if (!firstAdmin) {
		logger.warn(
			`There are no admins on this instance of tachi-server. We cannot create default API Clients!
Chances are, you're seeing this message because you just bootstrapped Tachi.
You'll need to set a user's authLevel to ${UserAuthLevels.ADMIN}.
If you have no users, go create an account using the frontend, then run pnpm make-user-admin 1.`
		);
		return;
	}

	for (const client of clients) {
		const exists = await db["api-clients"].findOne(
			{
				clientID: client.clientID,
			},
			{
				projection: {
					clientSecret: 0,
					author: 0,
				},
			}
		);

		// Skip if nothing has changed.
		if (fjsh.hash(exists, "sha256") === fjsh.hash(client, "sha256")) {
			continue;
		}

		const realClient: TachiAPIClientDocument = {
			...client,
			clientSecret: `CS${Random20Hex()}`,
			author: 1,
		};

		try {
			DatabaseSchemas["api-clients"](realClient);
		} catch (err) {
			logger.error(
				`Invalid API Client ${client.name}: ${FormatPrError(err as PrudenceError)}.`
			);
			continue;
		}

		// No replaceOne support in monk -- have to do this.
		await db["api-clients"].remove({
			clientID: client.clientID,
		});

		await db["api-clients"].insert(realClient);

		logger.info(`Loaded/Modified new built-in client ${client.name}.`);
	}
}
