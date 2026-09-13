// Loads a package's built UMD bundle (dist/umd/<name>.js) into a real
// headless browser exactly the way a <script src="..."> consumer
// would, and hands off to that package's own test/browser-smoke.mjs to
// exercise its specific API. This is the only part of the build that
// `npm test` (Node's test runner, against src/*.ts) can't verify —
// that the bundle is valid browser script, exposes the documented
// global, and actually works once loaded that way.
//
// Shared across every package in this monorepo: everything below —
// engine selection and browser launching — is identical for every
// package; only the page.evaluate() assertions differ, and those live
// in each package's own test/browser-smoke.mjs, which must export:
//
//   export async function runBrowserSmoke({ page, globalName, bundleSource })
//
// and is responsible for navigating the page, injecting bundleSource
// (and any window.fetch stub it needs, via page.addInitScript BEFORE
// page.goto), and asserting the result.
//
// Engine selection (env var PLAYWRIGHT_ENGINE, default "chromium"):
//   - "chromium" (default): tries real Chrome, then Edge — already
//     installed on most machines and every GitHub-hosted runner, so no
//     download needed. Falls back to Playwright's own managed Chromium if
//     neither is found (see launchChromium() below).
//   - "firefox" / "webkit": these aren't preinstalled anywhere, so a
//     managed copy must exist first — run
//     `npx playwright@<version-matching-the-playwright-core-devDependency> install firefox`
//     (or `webkit`) once. CI does this explicitly; see .github/workflows/ci.yml.
import { chromium, firefox, webkit } from "playwright-core";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

const globalName = pkg.umdName;
if (!globalName) {
  throw new Error(`${pkg.name}'s package.json is missing the "umdName" field the browser smoke test needs.`);
}
const basename = pkg.name.replace(/^@[^/]+\//, "");
const bundlePath = join(root, "dist", "umd", `${basename}.js`);
const engine = process.env.PLAYWRIGHT_ENGINE ?? "chromium";

let bundleSource;
try {
  bundleSource = readFileSync(bundlePath, "utf-8");
} catch {
  console.error(
    `Could not read ${bundlePath}.\nRun "npm run build:umd" first (this script is normally invoked via "npm run test:browser", which does that for you).`,
  );
  process.exit(1);
}

const { runBrowserSmoke } = await import(pathToFileURL(join(root, "test", "browser-smoke.mjs")).href);

/**
 * Tries the system browsers Playwright can drive without downloading
 * anything: real Chrome, then Edge. Falls back to Playwright's own
 * managed Chromium (only present if `npx playwright install chromium`
 * has been run) as a last resort.
 */
async function launchChromium() {
  const attempts = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? [{ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }]
    : [{ channel: "chrome" }, { channel: "msedge" }, {}];

  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    "Could not launch a Chromium-based browser for the UMD smoke test. Install " +
      "Google Chrome or Microsoft Edge, or run \"npx playwright install chromium\" " +
      `to fetch a managed one.\n\nUnderlying error: ${lastError?.message ?? lastError}`,
  );
}

async function launchBrowser() {
  if (engine === "firefox") {
    return firefox.launch().catch((error) => {
      throw new Error(
        `Could not launch Firefox. Run "npx playwright install firefox" first (pin ` +
          `the same version as this package's playwright-core devDependency).\n\n` +
          `Underlying error: ${error?.message ?? error}`,
      );
    });
  }
  if (engine === "webkit") {
    return webkit.launch().catch((error) => {
      throw new Error(
        `Could not launch WebKit. Run "npx playwright install webkit" first (pin ` +
          `the same version as this package's playwright-core devDependency).\n\n` +
          `Underlying error: ${error?.message ?? error}`,
      );
    });
  }
  if (engine !== "chromium") {
    throw new Error(`Unknown PLAYWRIGHT_ENGINE "${engine}" — expected "chromium", "firefox", or "webkit".`);
  }
  return launchChromium();
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();

  await runBrowserSmoke({ page, globalName, bundleSource });

  console.log(`Browser (UMD) smoke test passed on ${engine} for ${pkg.name}.`);
} finally {
  await browser.close();
}
