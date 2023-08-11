import bcrypt from "bcryptjs";
import db from "external/mongo/db";
import CreateLogCtx from "lib/logger/logger";
import { Environment, ServerConfig } from "lib/setup/config";
import { p } from "prudence";
import { UserAuthLevels } from "tachi-common";
import nodeFetch from "utils/fetch";
import { Random20Hex } from "utils/misc";
import { CreateURLWithParams } from "utils/url";
import { FormatUserDoc } from "utils/user";
import type { integer, UserDocument, UserSettingsDocument } from "tachi-common";
import type { PrivateUserInfoDocument } from "utils/types";

const logger = CreateLogCtx(__filename);

const BCRYPT_SALT_ROUNDS = 12;

export const ValidatePassword = (self: unknown) =>
	(typeof self === "string" && self.length >= 8) || "Passwords must be 8 characters or more.";

const LAZY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export const ValidateEmail = p.regex(LAZY_EMAIL_REGEX);

/**
 * Compares a plaintext string of a users password to a hash.
 * @param plaintext The provided user input.
 * @param password The hash to compare against.
 */
export function PasswordCompare(plaintext: string, password: string) {
	return bcrypt.compare(plaintext, password);
}

export function ReinstateInvite(code: string) {
	logger.info(`Reinstated Invite ${code}`);
	return db.invites.update(
		{
			code,
		},
		{
			$set: {
				consumed: false,
				consumedAt: null,
				consumedBy: null,
			},
		}
	);
}

export async function AddNewInvite(user: UserDocument) {
	const code = Random20Hex();

	const result = await db.invites.insert({
		code,
		consumed: false,
		createdBy: user.id,
		createdAt: Date.now(),
		consumedAt: null,
		consumedBy: null,
	});

	logger.info(`User ${FormatUserDoc(user)} created an invite.`);

	return result;
}

export const DEFAULT_USER_SETTINGS: UserSettingsDocument["preferences"] = {
	developerMode: false,
	advancedMode: false,
	invisible: false,
	contentiousContent: false,
	deletableScores: false,
};

export function HashPassword(plaintext: string) {
	return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
}

export async function AddNewUser(
	username: string,
	plaintext: string,
	email: string,
	userID: integer
) {
	const hashedPassword = await HashPassword(plaintext);

	logger.verbose(`Hashed password for ${username}.`);

	const userDoc: UserDocument = {
		id: userID,
		username,
		usernameLowercase: username.toLowerCase(),
		about: "I'm a fairly nondescript person.",
		socialMedia: {},
		status: null,
		customBannerLocation: null,
		customPfpLocation: null,
		joinDate: Date.now(),
		lastSeen: Date.now(),
		authLevel: UserAuthLevels.USER,
		badges: [],
	};

	// all created users on a dev instance should be admins, for convenience.
	if (Environment.nodeEnv === "dev") {
		userDoc.authLevel = UserAuthLevels.ADMIN;
	}

	const res = await db.users.insert(userDoc);

	const settingsRes = await InsertDefaultUserSettings(userID);

	await InsertPrivateUserInfo(userID, hashedPassword, email);

	return { newUser: res, newSettings: settingsRes };
}

export function InsertPrivateUserInfo(userID: integer, hashedPassword: string, email: string) {
	const privateInfo: PrivateUserInfoDocument = {
		userID,
		email,
		password: hashedPassword,
	};

	return db["user-private-information"].insert(privateInfo);
}

export function InsertDefaultUserSettings(userID: integer) {
	logger.verbose(`Inserting default settings for ${userID}.`);
	const UserSettingsDocument: UserSettingsDocument = {
		userID,
		following: [],
		preferences: DEFAULT_USER_SETTINGS,
	};

	return db["user-settings"].insert(UserSettingsDocument);
}

export async function ValidateCaptcha(
	recaptcha: string,
	remoteAddr: string | undefined,
	fetch = nodeFetch
) {
	const url = CreateURLWithParams(`https://www.google.com/recaptcha/api/siteverify`, {
		secret: ServerConfig.CAPTCHA_SECRET_KEY,
		response: recaptcha,
		remoteip: remoteAddr ?? "",
	});

	const googleCaptchaRes: unknown = await fetch(url.href).then((r) => r.json());

	const err = p(
		googleCaptchaRes,
		{
			success: "boolean",
		},
		{},
		{ allowExcessKeys: true }
	);

	if (err) {
		logger.warn(
			`Google ReCaptcha returned something without a success property? Assuming this captcha check failed.`,
			{ googleCaptchaRes, err }
		);
		return false;
	}

	// asserted above
	const gcr = googleCaptchaRes as { success: boolean };

	if (!gcr.success) {
		logger.verbose(`Failed GCaptcha response`, { gcr });
	}

	return gcr.success;
}

export function MountAuthCookie(
	req: Express.Request,
	user: UserDocument,
	settings: UserSettingsDocument
) {
	req.session.tachi = {
		user,
		settings,
	};

	req.session.cookie.maxAge = 3.154e10;
}
