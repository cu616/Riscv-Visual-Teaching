import { copyFile, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const portRoot = resolve(here, "..");
const sdkMirrorRoot = join(portRoot, ".oh-sdk");
const sdkMirrorApiRoot = join(sdkMirrorRoot, "24");
const localProperties = join(portRoot, "local.properties");
const defaultDevEcoSdk = "D:/Program Files/Huawei/DevEco Studio/sdk/default";
const sourceOpenHarmonyRoot = process.env.OH_SOURCE_SDK
  ? resolve(process.env.OH_SOURCE_SDK)
  : `${defaultDevEcoSdk}/openharmony`;
const sourceDefaultRoot = resolve(sourceOpenHarmonyRoot, "..");
const appScopeConfig = join(portRoot, "AppScope", "app.json5");

const components = ["ets", "js", "native", "previewer", "toolchains"];
const profileTemplateNames = new Set([
  "UnsgnedDebugProfileTemplate.json",
  "UnsgnedReleasedProfileTemplate.json"
]);

function readBundleName() {
  const content = existsSync(appScopeConfig) && lstatSync(appScopeConfig).isFile()
    ? readFileSync(appScopeConfig, "utf8")
    : "";
  const match = content.match(/"bundleName"\s*:\s*"([^"]+)"/);
  if (!match) {
    throw new Error(`Cannot find bundleName in ${appScopeConfig}`);
  }
  return match[1];
}

const bundleName = readBundleName();

async function ensureJunction(linkPath, targetPath) {
  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
    throw new Error(`Cannot create SDK mirror junction because a file already exists: ${linkPath}`);
  }
  await symlink(targetPath, linkPath, "junction");
}

async function patchProfileTemplate(templatePath) {
  const template = JSON.parse(await readFile(templatePath, "utf8"));
  template["bundle-info"] ??= {};
  template["bundle-info"]["bundle-name"] = bundleName;
  await writeFile(templatePath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
}

async function copyDirectory(source, target, options = {}) {
  if (existsSync(target)) {
    await rm(target, { recursive: true, force: true });
  }
  await mkdir(target, { recursive: true });

  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath, options);
    } else {
      await copyFile(sourcePath, targetPath);
      if (options.patchProfileTemplates && profileTemplateNames.has(entry.name)) {
        await patchProfileTemplate(targetPath);
      }
    }
  }
}

async function mirrorComponent(component) {
  const source = join(sourceOpenHarmonyRoot, component);
  const target = join(sdkMirrorApiRoot, component);
  if (!existsSync(source)) {
    throw new Error(`OpenHarmony SDK component not found: ${source}`);
  }
  if (existsSync(target)) {
    await rm(target, { recursive: true, force: true });
  }
  await mkdir(target, { recursive: true });

  const componentMetaPath = join(source, "oh-uni-package.json");
  const componentMeta = JSON.parse(await readFile(componentMetaPath, "utf8"));
  componentMeta.releaseType = "Release";
  await writeFile(join(target, "oh-uni-package.json"), `${JSON.stringify(componentMeta, null, 2)}\n`, "utf8");

  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "oh-uni-package.json") continue;
    const linkPath = join(target, entry.name);
    const sourcePath = join(source, entry.name);
    if (entry.isDirectory()) {
      if (component === "toolchains" && entry.name === "lib") {
        await copyDirectory(sourcePath, linkPath, { patchProfileTemplates: true });
      } else {
        await ensureJunction(linkPath, sourcePath);
      }
    } else if (!existsSync(linkPath) || lstatSync(linkPath).isSymbolicLink()) {
      if (existsSync(linkPath)) await rm(linkPath, { force: true });
      await copyFile(sourcePath, linkPath);
    }
  }
}

if (!existsSync(sourceOpenHarmonyRoot)) {
  throw new Error(`OpenHarmony SDK source not found: ${sourceOpenHarmonyRoot}`);
}

await mkdir(sdkMirrorApiRoot, { recursive: true });

for (const component of components) {
  await mirrorComponent(component);
}

const sourceSdkPkg = join(sourceDefaultRoot, "sdk-pkg.json");
if (existsSync(sourceSdkPkg)) {
  const rootMeta = JSON.parse(await readFile(sourceSdkPkg, "utf8"));
  if (rootMeta?.data) rootMeta.data.releaseType = "Release";
  await writeFile(join(sdkMirrorRoot, "sdk-pkg.json"), `${JSON.stringify(rootMeta, null, 2)}\n`, "utf8");
} else {
  await writeFile(
    join(sdkMirrorRoot, "sdk-pkg.json"),
    JSON.stringify(
      {
        meta: { version: "1.0.0" },
        data: {
          apiVersion: "24",
          displayName: "OpenHarmony 24",
          path: "OpenHarmony-24",
          platformVersion: "24",
          releaseType: "Local",
          version: "24",
          stage: "Local"
        }
      },
      null,
      2
    ),
    "utf8"
  );
}

const etsMeta = join(sdkMirrorApiRoot, "ets", "oh-uni-package.json");
const etsInfo = JSON.parse(await readFile(etsMeta, "utf8"));
if (String(etsInfo.apiVersion) !== "24") {
  throw new Error(`Expected ArkTS API 24, got ${etsInfo.apiVersion} at ${etsMeta}`);
}

await writeFile(localProperties, `sdk.dir=${sdkMirrorRoot.replaceAll("\\", "/")}\n`, "utf8");

console.log(`OpenHarmony SDK mirror prepared at ${sdkMirrorRoot}`);
console.log(`local.properties points to ${sdkMirrorRoot}`);
