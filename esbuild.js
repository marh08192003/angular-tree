import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",
	setup(build) {
		build.onStart(() => {
			console.log("[watch] build started");
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}`);
				}
			});
			console.log("[watch] build finished");
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ["src/extension.ts"],
		bundle: true,
		format: "cjs",
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: "node",
		outfile: "dist/extension.js",
		external: ["vscode"],
		logLevel: "silent",
		plugins: [esbuildProblemMatcherPlugin],
	});

	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

// ------------------------------------------------------------
// COPY WEBVIEW ASSETS
// ------------------------------------------------------------
const copyRecursive = (src, dest) => {
	if (!fs.existsSync(src)) return;

	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	for (const file of fs.readdirSync(src)) {
		const srcPath = path.join(src, file);
		const destPath = path.join(dest, file);

		if (fs.statSync(srcPath).isDirectory()) {
			copyRecursive(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
};

copyRecursive(
	path.resolve("src/webview"),
	path.resolve("dist/webview")
);

console.log("✅ Webview assets copied to dist/webview");

// ------------------------------------------------------------
main().catch((e) => {
	console.error(e);
	process.exit(1);
});
