import { setTimeout as delay } from "node:timers/promises";
import { createTeachingAppServer } from "./server.mjs";

const port = Number(process.env.SMOKE_PORT || 4183);
const baseUrl = `http://127.0.0.1:${port}`;
const server = createTeachingAppServer({ port });
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

try {
  await waitForServer();
  const indexHtml = await fetchText("/");

  assertIncludes(indexHtml, 'id="programCanvas"', "workspace canvas is missing");
  assertIncludes(indexHtml, 'id="instructionList"', "instruction list is missing");
  assertIncludes(indexHtml, 'id="operandPalette"', "operand palette is missing");
  assertIncludes(indexHtml, 'id="prevBtn"', "previous step button is missing");
  assertIncludes(indexHtml, 'id="stepBtn"', "next step button is missing");
  assertIncludes(indexHtml, 'id="pauseBtn"', "pause button is missing");
  assertIncludes(indexHtml, 'id="resetBtn"', "reset button is missing");
  assertIncludes(indexHtml, 'id="executionProgressText"', "execution progress text is missing");
  assertIncludes(indexHtml, 'id="executionProgressBar"', "execution progress bar is missing");
  assertIncludes(indexHtml, 'id="debugHint"', "debug hint is missing");
  assertIncludes(indexHtml, 'id="zoomOutBtn"', "zoom out button is missing");
  assertIncludes(indexHtml, 'id="zoomResetBtn"', "zoom reset button is missing");
  assertIncludes(indexHtml, 'id="zoomInBtn"', "zoom in button is missing");
  assertIncludes(indexHtml, 'id="assistPanelBtn"', "assist panel toggle is missing");
  assertIncludes(indexHtml, 'id="assistPanel"', "assist panel is missing");
  assertIncludes(indexHtml, 'data-side-tab="machine"', "machine assist tab is missing");
  assertIncludes(indexHtml, 'data-side-tab="code"', "code assist tab is missing");
  assertIncludes(indexHtml, 'data-side-tab="notes"', "notes assist tab is missing");
  assertIncludes(indexHtml, 'id="saveProgramBtn"', "save case button is missing");
  assertIncludes(indexHtml, 'id="importProgramInput"', "import case input is missing");
  assertIncludes(indexHtml, 'id="stateTargetType"', "state target type selector is missing");
  assertIncludes(indexHtml, 'id="stateTargetName"', "state target name selector is missing");
  assertIncludes(indexHtml, 'id="stateTargetValue"', "state target value input is missing");
  assertIncludes(indexHtml, 'id="applyStateValueBtn"', "state apply button is missing");
  assertIncludes(indexHtml, 'id="clearStateValueBtn"', "state clear button is missing");
  assertIncludes(indexHtml, 'id="caseTitleInput"', "case title input is missing");
  assertIncludes(indexHtml, 'id="teachingGoalInput"', "teaching goal input is missing");
  assertIncludes(indexHtml, 'id="teachingNotesInput"', "teaching notes input is missing");

  const assetPaths = [
    ...extractAssetPaths(indexHtml, /<script[^>]+src="([^"]+)"/g),
    ...extractAssetPaths(indexHtml, /<link[^>]+href="([^"]+)"/g)
  ];

  for (const assetPath of assetPaths) {
    await fetchText(assetPath);
  }

  console.log(`HTTP smoke test passed at ${baseUrl}. Checked ${assetPaths.length} assets.`);
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 5000) {
    try {
      await fetchText("/");
      return;
    } catch (error) {
      lastError = error;
      await delay(120);
    }
  }

  throw new Error(`Server did not become ready. Last error: ${lastError?.message}`);
}

async function fetchText(pathname) {
  const response = await fetch(new URL(pathname, baseUrl));
  if (!response.ok) {
    throw new Error(`GET ${pathname} returned ${response.status}`);
  }
  return response.text();
}

function extractAssetPaths(html, pattern) {
  return [...html.matchAll(pattern)]
    .map((match) => match[1])
    .filter((assetPath) => !assetPath.startsWith("http://") && !assetPath.startsWith("https://"));
}

function assertIncludes(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}
