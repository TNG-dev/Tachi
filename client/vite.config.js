import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { defineConfig } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import fs from "fs";
import path from "path";

config();

const toplevelDirs = fs
	.readdirSync(path.join(__dirname, "src/"), { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => e.name);

export default defineConfig({
	resolve: {
		alias: [
			{
				find: /^tachi-common(.*)$/u,
				replacement: path.resolve(__dirname, "../common/src", "$1"),
			},
			{
				find: new RegExp(`^((${toplevelDirs.join("|")}).*)$`, "u"),
				replacement: path.resolve(__dirname, "src", "$1"),
			},
		],
	},
	define: {
		"process.env": process.env,
	},
	plugins: [
		react(),
		createHtmlPlugin({
			inject: {
				data: {
					VITE_CDN_URL: process.env.VITE_CDN_URL,
					TACHI_NAME: process.env.TACHI_NAME ?? "Tachi",
					THEME_INIT: `
<script>
const root = document.documentElement;
const theme = localStorage.theme ||
(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

root.style.setProperty("color-scheme", theme === "light" ? "light" : "dark"),
root.setAttribute("data-bs-theme", theme);
</script>
					`,
					GOATCOUNTER: process.env.VITE_GOATCOUNTER
						? `<script data-goatcounter="${process.env.VITE_GOATCOUNTER}" async src="//gc.zgo.at/count.js"></script>`
						: "",
				},
			},
		}),
	],
	server: {
		port: 3000,
		host: true,
		watch: {
			usePolling: process.env.FORCE_FS_POLLING,
		},
	},
	preview: {
		port: 3000,
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: [
					process.env.VITE_TCHIC_MODE === "btchi"
						? "$primary: #527acc;"
						: "$primary: #e61c6e;",
				],
			},
		},
	},
	build: {
		assetsDir: "static",
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		outDir: process.env.BUILD_OUT_DIR || "build",
		sourcemap: true,
	},
});
