import {
	AddNewUser,
	HashPassword,
	InsertDefaultUserSettings,
	MountAuthCookie,
	PasswordCompare,
	ReinstateInvite,
	ValidateCaptcha,
	ValidateEmail,
	ValidatePassword,
} from "./auth";
import { Router } from "express";
import db from "external/mongo/db";
import { SendEmail } from "lib/email/client";
import { EmailFormatResetPassword, EmailFormatVerifyEmail } from "lib/email/formats";
import CreateLogCtx from "lib/logger/logger";
import { Environment, ServerConfig } from "lib/setup/config";
import { p } from "prudence";
import prValidate from "server/middleware/prudence-validate";
import {
	AggressiveRateLimitMiddleware,
	HyperAggressiveRateLimitMiddleware,
} from "server/middleware/rate-limiter";
import { DecrementCounterValue, GetNextCounterValue } from "utils/db";
import { Random20Hex } from "utils/misc";
import {
	CheckIfEmailInUse,
	FormatUserDoc,
	GetSettingsForUser,
	GetUserCaseInsensitive,
	GetUserPrivateInfo,
	GetUserWithID,
	GetUserWithIDGuaranteed,
} from "utils/user";
import type { integer } from "tachi-common";

const logger = CreateLogCtx(__filename);

const router: Router = Router({ mergeParams: true });

/**
 * Logs in a user.
 * @name POST /api/v1/auth/login
 */
router.post(
	"/login",
	AggressiveRateLimitMiddleware,
	prValidate(
		{
			username: p.regex(/^[a-zA-Z_-][a-zA-Z0-9_-]{2,20}$/u),
			"!password": ValidatePassword,
			captcha: "string",
		},
		{
			username:
				"Invalid username. Usernames cannot start with a number, and must be between 2 and 20 characters.",
			captcha: "Please fill out the captcha.",
		},
		undefined,
		"verbose"
	),
	async (req, res) => {
		if (req.session.tachi?.user.id !== undefined) {
			// Dual logins should destroy the users session and recreate it.
			req.session.tachi = undefined;
		}

		const body = req.safeBody as {
			username: string;
			"!password": string;
			captcha: string;
		};

		logger.verbose(`Received login request with username ${body.username} (${req.ip})`);

		/* istanbul ignore next */
		if (Environment.nodeEnv === "production" || Environment.nodeEnv === "staging") {
			logger.verbose("Validating captcha...");
			const validCaptcha = await ValidateCaptcha(body.captcha, req.socket.remoteAddress);

			if (!validCaptcha) {
				logger.verbose("Captcha failed.");
				return res.status(400).json({
					success: false,
					description: `Captcha failed.`,
				});
			}

			logger.verbose("Captcha validated!");
		} else {
			logger.warn("Skipped captcha check because not in production.");
		}

		const requestedUser = await GetUserCaseInsensitive(body.username);

		if (!requestedUser) {
			logger.verbose(`Invalid username for login ${body.username}.`);
			return res.status(404).json({
				success: false,
				description: `This user does not exist.`,
			});
		}

		const privateInfo = await GetUserPrivateInfo(requestedUser.id);

		if (!privateInfo) {
			logger.severe(
				`State desync for user ${FormatUserDoc(
					requestedUser
				)}. This user has no password/email information?`,
				{ requestedUser }
			);

			return res.status(500).json({
				success: false,
				description: `An internal server error has occured.`,
			});
		}

		const passwordMatch = await PasswordCompare(body["!password"], privateInfo.password);

		if (!passwordMatch) {
			logger.verbose("Invalid password provided.");
			return res.status(403).json({
				success: false,
				description: `Invalid password.`,
			});
		}

		const user = await GetUserWithID(requestedUser.id);

		if (!user) {
			logger.severe(`User logged in as someone who does not exist?`, { requestedUser });
			return res.status(500).json({
				success: false,
				description: `An internal server error has occured.`,
			});
		}

		let settings = await GetSettingsForUser(requestedUser.id);

		if (!settings) {
			logger.warn(`User ${FormatUserDoc(user)} has no settings. Inserting default settings.`);
			settings = await InsertDefaultUserSettings(user.id);
		}

		MountAuthCookie(req, user, settings);

		logger.verbose(`${FormatUserDoc(requestedUser)} Logged in.`);

		return res.status(200).json({
			success: true,
			description: `Successfully logged in as ${FormatUserDoc(requestedUser)}`,
			body: {
				userID: requestedUser.id,
			},
		});
	}
);

/**
 * Registers a new user.
 * @name POST /api/v1/auth/register
 */
router.post(
	"/register",
	AggressiveRateLimitMiddleware,
	prValidate(
		{
			username: p.regex(/^[a-zA-Z_-][a-zA-Z0-9_-]{2,20}$/u),
			"!password": ValidatePassword,
			email: ValidateEmail,
			inviteCode: "*string",
			captcha: "string",
		},
		{
			username:
				"Usernames must be between 3 and 20 characters long, can only contain alphanumeric characters and cannot start with a number.",
			email: "Invalid email.",
			inviteCode: "Invalid invite code.",
			captcha: "Please fill out the captcha.",
		},
		undefined,
		"verbose"
	),
	async (req, res) => {
		const body = req.safeBody as {
			username: string;
			"!password": string;
			email: string;
			inviteCode?: string;
			captcha: string;
		};

		if (body.inviteCode === undefined && ServerConfig.INVITE_CODE_CONFIG) {
			return res.status(400).json({
				success: false,
				description: `No invite code given, yet the server uses invites.`,
			});
		}

		logger.verbose(`received register request with username ${body.username} (${req.ip})`);

		/* istanbul ignore next */
		if (Environment.nodeEnv === "production" || Environment.nodeEnv === "staging") {
			logger.verbose("Validating captcha...");
			const validCaptcha = await ValidateCaptcha(body.captcha, req.socket.remoteAddress);

			if (!validCaptcha) {
				logger.verbose("Captcha failed.");
				return res.status(400).json({
					success: false,
					description: `Captcha failed.`,
				});
			}

			logger.verbose("Captcha validated.");
		} else {
			logger.warn("Skipped captcha check because not in production.");
		}

		const existingUser = await GetUserCaseInsensitive(body.username);

		if (existingUser) {
			logger.verbose(`Invalid username ${body.username}, already in use.`);
			return res.status(409).json({
				success: false,
				description: "This username is already in use.",
			});
		}

		const existingEmail = await CheckIfEmailInUse(body.email);

		if (existingEmail) {
			logger.info(`User attempted to sign up with email that was already in use.`);
			return res.status(409).json({
				success: false,
				description: `This email is already in use.`,
			});
		}

		let hasInsertedUserID: integer | null = null;

		try {
			const userID = await GetNextCounterValue("users");

			if (ServerConfig.INVITE_CODE_CONFIG) {
				const inviteCodeDoc = await db.invites.findOneAndUpdate(
					{
						code: body.inviteCode,
						consumed: false,
					},
					{
						$set: {
							consumed: true,
							consumedAt: Date.now(),
							consumedBy: userID,
						},
					}
				);

				if (!inviteCodeDoc) {
					logger.info(`Invalid invite code given: ${body.inviteCode}.`);
					return res.status(401).json({
						success: false,
						description: `This invite code is not valid.`,
					});
				}

				logger.info(`Consumed invite ${inviteCodeDoc.code}.`);
			}

			// if we get to this point, We're good to create the user.

			const { newUser, newSettings } = await AddNewUser(
				body.username,
				body["!password"],
				body.email,
				userID
			);

			hasInsertedUserID = newUser.id;

			// re-fetch the user like this so we guaranteeably omit the private fields.
			const user = await GetUserWithIDGuaranteed(newUser.id);

			MountAuthCookie(req, user, newSettings);

			// If we have an EMAIL_CONFIG set, send out
			// authentication emails.
			// Otherwise, don't bother; this is equivalent to
			// automatically verifying all users' emails.
			if (ServerConfig.EMAIL_CONFIG) {
				const resetEmailCode = Random20Hex();

				await db["verify-email-codes"].insert({
					code: resetEmailCode,
					userID,
					email: body.email,
				});

				const { text, html } = EmailFormatVerifyEmail(user.username, resetEmailCode);

				void SendEmail(body.email, "Email Verification", html, text);
			}

			return res.status(200).json({
				success: true,
				description: `Successfully created account ${body.username}!`,
				body: user,
			});
		} catch (err) {
			logger.error(`Bailed on user creation ${body.username}.`, { err });

			if (ServerConfig.INVITE_CODE_CONFIG && body.inviteCode !== undefined) {
				await ReinstateInvite(body.inviteCode);
			}

			if (hasInsertedUserID !== null) {
				logger.warn(
					`Removing user ${body.username} (#${hasInsertedUserID}), as their document was created, but creation still failed.`
				);
				await db.users.remove({ username: body.username });
				await db["user-settings"].remove({ userID: hasInsertedUserID });
				await db["user-private-information"].remove({ userID: hasInsertedUserID });
			}

			await DecrementCounterValue("users");

			return res.status(500).json({
				success: false,
				description: "An internal server error has occured.",
			});
		}
	}
);

/**
 * Verifies the provided email according to the code provided.
 *
 * @param code - The emailCode set in the /register function.
 *
 * @name POST /api/v1/auth/verify-email
 */
router.post(
	"/verify-email",
	AggressiveRateLimitMiddleware,
	prValidate({
		code: "string",
	}),
	async (req, res) => {
		const body = req.safeBody as {
			code: string;
		};

		const code = await db["verify-email-codes"].findOne({
			code: body.code,
		});

		if (!code) {
			return res.status(400).json({
				success: false,
				description: `This email code is invalid.`,
			});
		}

		await db["verify-email-codes"].remove({
			code: body.code,
		});

		return res.status(200).json({
			success: true,
			description: `Verified email!`,
			body: {},
		});
	}
);

/**
 * Resend a verification email, for when they fall through the
 * cracks.
 *
 * @param email - The email to send a verification email to.
 *
 * @name POST /api/v1/auth/resend-verify-email
 */
router.post("/resend-verify-email", HyperAggressiveRateLimitMiddleware, async (req, res) => {
	// Immediately send a response so the existence of emails
	// cannot be timing attacked out.
	res.status(200).json({
		success: true,
		description: `Sent an email if the email address has not been verified.`,
		body: {},
	});

	const user = req.session.tachi?.user;

	if (!user) {
		return;
	}

	const userID = user.id;

	const verifyInfo = await db["verify-email-codes"].findOne({ userID });

	if (!verifyInfo) {
		logger.warn(
			`Attempted to send reset email to ${userID}, but no verifyInfo was set for them.`
		);
		return;
	}

	// Send the email again.

	const { text, html } = EmailFormatVerifyEmail(user.username, verifyInfo.code);

	void SendEmail(verifyInfo.email, "Email Verification", html, text);
});

/**
 * Logs out the requesting user.
 * @name POST /api/v1/auth/logout
 */
router.post("/logout", (req, res) => {
	if (req.session.tachi?.user.id === undefined) {
		return res.status(409).json({
			success: false,
			description: `You are not logged in.`,
		});
	}

	req.session.destroy(() => 0);

	return res.status(200).json({
		success: true,
		description: `Logged Out.`,
		body: {},
	});
});

/**
 * Creates a password reset code for a user. The user will then
 * be able to trigger POST /reset-password with that code.
 *
 * @param email - The email associated with the account you want to reset.
 *
 * @name POST /api/v1/auth/forgot-password
 */
router.post(
	"/forgot-password",
	HyperAggressiveRateLimitMiddleware,
	prValidate({ email: "string" }),
	async (req, res) => {
		if (!ServerConfig.EMAIL_CONFIG && Environment.nodeEnv !== "test") {
			return res.status(501).json({
				success: false,
				description: `This server does not support password resets.`,
			});
		}

		const body = req.safeBody as {
			email: string;
		};

		logger.debug(`received password reset request for ${body.email}.`);

		// For timing attack and infosec reasons, we can't do anything but **immediately** return here.
		res.status(202).json({
			success: true,
			description: "A code has been sent to your email.",
			body: {},
		});

		const userPrivateInfo = await db["user-private-information"].findOne({
			email: body.email,
		});

		if (userPrivateInfo) {
			const user = await db.users.findOne({ id: userPrivateInfo.userID });

			if (!user) {
				logger.severe(
					`User ${userPrivateInfo.userID} has private information but no real account.`
				);
				return;
			}

			const code = `M${Random20Hex()}`;

			logger.verbose(`Created password reset code for ${FormatUserDoc(user)}.`);

			await db["password-reset-codes"].insert({
				code,
				userID: user.id,
				createdOn: Date.now(),
			});

			const { html, text } = EmailFormatResetPassword(user.username, code, req.ip);

			void SendEmail(userPrivateInfo.email, "Reset Password", html, text);
		} else {
			logger.info(
				`Silently rejected password reset request for ${body.email}, as no user has this email.`
			);
		}
	}
);

/**
 * Takes a code generated from /forgot-password, a new password,
 * and performs the reset for the user.
 *
 * @param password - The users new password.
 * @param code - The code to use to reset this password.
 *
 * @name POST /api/v1/auth/reset-password
 */
router.post(
	"/reset-password",
	AggressiveRateLimitMiddleware,
	prValidate({
		code: "string",
		"!password": ValidatePassword,
	}),
	async (req, res) => {
		const body = req.safeBody as {
			code: string;
			"!password": string;
		};

		const code = await db["password-reset-codes"].findOneAndDelete({
			code: body.code,
		});

		if (!code) {
			return res.status(404).json({
				success: false,
				description: `Invalid Reset Code.`,
			});
		}

		const encryptedPassword = await HashPassword(body["!password"]);

		await db["user-private-information"].update(
			{
				userID: code.userID,
			},
			{
				$set: {
					password: encryptedPassword,
				},
			}
		);

		logger.info(`User ${code.userID} reset their password.`);

		return res.status(200).json({
			success: true,
			description: `Reset your password.`,
			body: {},
		});
	}
);

export default router;
