import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..", "entry", "src", "main", "resources", "rawfile", "app");
const portRoot = join(here, "..");
const index = await readFile(join(appRoot, "index.html"), "utf8");

const requiredMarkers = [
  "./openharmony-port.css",
  "./openharmony-bridge.js",
  "./src/datapath.js",
  'id="programCanvas"',
  'id="instructionList"',
  'class="softbus-canvas-anchor"',
  'id="registerGrid"',
  'id="memoryGrid"',
  'id="teachingNotesInput"',
  'id="zoomOutBtn"',
  'id="zoomResetBtn"',
  'id="zoomInBtn"',
  'id="pcValue"',
  'id="runtimeState"',
  'id="logPanelBtn"',
  'id="logCloseBtn"',
  'id="stateAnimationDock"',
  'id="harmonyWorkspaceToggleBtn"',
  'id="workspaceHarmonyPanel"',
  'data-side-tab="machine"',
  'data-side-tab="code"',
  'data-side-tab="notes"'
];

for (const marker of requiredMarkers) {
  if (!index.includes(marker)) {
    throw new Error(`OpenHarmony rawfile index is missing marker: ${marker}`);
  }
}

const requiredFiles = [
  "styles.css",
  "openharmony-port.css",
  "openharmony-bridge.js",
  "src/instructions.js",
  "src/simulator.js",
  "src/datapath.js",
  "src/ui-utils.js",
  "src/case-format.js",
  "src/operand-model.js",
  "src/machine-state.js",
  "src/state-animation.js",
  "src/app.js"
];

for (const file of requiredFiles) {
  await readFile(join(appRoot, file));
}

const projectFiles = [
  "build-profile.json5",
  "hvigorfile.ts",
  "hvigor/hvigor-config.json5",
  "AppScope/app.json5",
  "AppScope/resources/base/element/string.json",
  "AppScope/resources/base/media/app_icon.png",
  "AppScope/resources/base/media/icon.png",
  "AppScope/resources/base/media/startIcon.png",
  "AppScope/resources/base/profile/configuration.json",
  "entry/build-profile.json5",
  "entry/hvigorfile.ts",
  "entry/src/main/module.json5",
  "entry/src/main/ets/entryability/EntryAbility.ets",
  "entry/src/main/ets/pages/Index.ets",
  "entry/src/main/resources/base/media/icon.png",
  "entry/src/main/resources/base/media/startIcon.png"
];

for (const file of projectFiles) {
  await readFile(join(portRoot, file));
}

const moduleConfig = await readFile(join(portRoot, "entry", "src", "main", "module.json5"), "utf8");
const appConfig = await readFile(join(portRoot, "AppScope", "app.json5"), "utf8");
const buildProfile = await readFile(join(portRoot, "build-profile.json5"), "utf8");
const openHarmonyCss = await readFile(join(appRoot, "openharmony-port.css"), "utf8");
const openHarmonyBridge = await readFile(join(appRoot, "openharmony-bridge.js"), "utf8");
const indexPage = await readFile(join(portRoot, "entry", "src", "main", "ets", "pages", "Index.ets"), "utf8");
if (!appConfig.includes("$media:app_icon")) {
  throw new Error("OpenHarmony AppScope app.json5 should reference AppScope $media:app_icon.");
}
if (!appConfig.includes("$profile:configuration")) {
  throw new Error("OpenHarmony AppScope app.json5 should reference $profile:configuration.");
}
if (!moduleConfig.includes("ohos.want.action.home")) {
  throw new Error("OpenHarmony module config is missing ohos.want.action.home.");
}
if (!buildProfile.includes('"compileSdkVersion": 24')) {
  throw new Error("OpenHarmony build-profile.json5 must declare product compileSdkVersion 24 for this DevEco setup.");
}
if (!buildProfile.includes('"compatibleSdkVersion": 12')) {
  throw new Error("OpenHarmony build-profile.json5 must use numeric compatibleSdkVersion 12 for the current RV2 OpenHarmony image.");
}
if (!buildProfile.includes('"compatibleSdkVersionStage": "release"')) {
  throw new Error("OpenHarmony build-profile.json5 should declare compatibleSdkVersionStage release for the current RV2 OpenHarmony image.");
}
if (!buildProfile.includes('"targetSdkVersion": 12')) {
  throw new Error("OpenHarmony build-profile.json5 should declare numeric targetSdkVersion 12 for the current RV2 OpenHarmony image.");
}
if (buildProfile.includes('"compatibleSdkVersion": "')) {
  throw new Error("OpenHarmony compatibleSdkVersion must be numeric, not a HarmonyOS version string.");
}
if (!openHarmonyCss.includes(".visual-panel:not(.workspace-harmony-panel)")) {
  throw new Error("OpenHarmony CSS must hide only the legacy visual panel and keep workspaceHarmonyPanel available.");
}
if (!openHarmonyCss.includes("--assistant-width")) {
  throw new Error("OpenHarmony CSS must adapt the current assistant-panel layout, not the old right-stack layout.");
}
if (!openHarmonyBridge.includes("targetDisplay")) {
  throw new Error("OpenHarmony JS bridge should expose targetDisplay for runtime diagnostics.");
}
if (!indexPage.includes("targetDisplay: '1920x1080'")) {
  throw new Error("OpenHarmony ArkTS bridge should identify the current 1920x1080 target display.");
}

console.log(`OpenHarmony rawfile smoke test passed. Checked ${requiredFiles.length + projectFiles.length} files.`);
