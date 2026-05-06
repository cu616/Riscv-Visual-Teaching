import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const portRoot = resolve(here, "..");
const repoRoot = resolve(portRoot, "..");
const sourceApp = resolve(repoRoot, "app");
const rawApp = resolve(portRoot, "entry", "src", "main", "resources", "rawfile", "app");
const rawSrc = join(rawApp, "src");
const stubPath = join(here, "templates", "datapath-openharmony-stub.js");

function assertInside(child, parent) {
  const normalizedChild = resolve(child).toLowerCase();
  const normalizedParent = resolve(parent).toLowerCase();
  if (!normalizedChild.startsWith(normalizedParent)) {
    throw new Error(`Refusing to write outside expected directory: ${child}`);
  }
}

function injectOnce(content, marker, injection) {
  if (content.includes(injection.trim())) return content;
  if (!content.includes(marker)) {
    throw new Error(`Cannot inject OpenHarmony marker before missing text: ${marker}`);
  }
  return content.replace(marker, `${injection}${marker}`);
}

assertInside(rawApp, portRoot);
assertInside(rawSrc, portRoot);

await mkdir(rawApp, { recursive: true });
await rm(rawSrc, { recursive: true, force: true });
await cp(join(sourceApp, "src"), rawSrc, {
  recursive: true,
  filter(source) {
    return !source.replaceAll("\\", "/").endsWith("/datapath.js");
  }
});

await cp(join(sourceApp, "styles.css"), join(rawApp, "styles.css"));

const sourceIndex = await readFile(join(sourceApp, "index.html"), "utf8");
let index = injectOnce(
  sourceIndex,
  "  </head>",
  '    <link rel="stylesheet" href="./openharmony-port.css" />\n'
);
index = injectOnce(
  index,
  '    <script src="./src/app.js"></script>',
  '    <script src="./openharmony-bridge.js"></script>\n'
);
await writeFile(join(rawApp, "index.html"), index, "utf8");
await cp(stubPath, join(rawSrc, "datapath.js"));

console.log("OpenHarmony rawfile assets synchronized from app/.");
