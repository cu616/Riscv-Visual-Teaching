import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const portRoot = resolve(here, "..");
const rawfileRoot = join(portRoot, "entry", "src", "main", "resources", "rawfile");
const sourceIndexPath = join(rawfileRoot, "app", "index.html");
const diagnosticsRoot = join(rawfileRoot, "arkweb-diagnostics");

const sourceIndex = await readFile(sourceIndexPath, "utf8");

function rewriteAssetPaths(html) {
  return html
    .replaceAll('href="./styles.css"', 'href="../app/styles.css"')
    .replaceAll('href="./openharmony-port.css"', 'href="../app/openharmony-port.css"')
    .replaceAll('src="./src/', 'src="../app/src/')
    .replaceAll('src="./openharmony-bridge.js"', 'src="../app/openharmony-bridge.js"');
}

function page(title, body) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        font-family: sans-serif;
        background: #f7fafc;
        color: #172033;
      }
      body {
        box-sizing: border-box;
        padding: 28px;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 26px;
      }
      p {
        line-height: 1.6;
      }
      a, button {
        display: block;
        width: min(560px, 100%);
        box-sizing: border-box;
        margin: 12px 0;
        padding: 14px 16px;
        border: 0;
        border-radius: 8px;
        background: #2563eb;
        color: white;
        text-decoration: none;
        font-size: 16px;
        text-align: left;
      }
      code {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        background: #e8eef7;
      }
    </style>
  </head>
  <body>
${body}
  </body>
</html>
`;
}

function removeScripts(html) {
  return html.replace(/\n\s*<script src="(?:\.|..)\/(?:app\/)?src\/instructions\.js"><\/script>[\s\S]*?<\/script>\s*\n\s*<\/body>/, "\n  </body>");
}

function removeSvg(html) {
  return html.replace(/<svg class="stage-lines"[\s\S]*?<\/svg>/, "");
}

function removeFileInput(html) {
  return html.replace(
    /<label class="file-button">[\s\S]*?<input id="importProgramInput"[\s\S]*?<\/label>/,
    '<button id="importProgramInput" type="button">File input disabled</button>'
  );
}

function keepScriptsUpTo(html, lastScript) {
  const scripts = [
    "instructions.js",
    "simulator.js",
    "datapath.js",
    "ui-utils.js",
    "case-format.js",
    "operand-model.js",
    "machine-state.js",
    "openharmony-bridge.js",
    "app.js"
  ];
  const keep = new Set(scripts.slice(0, scripts.indexOf(lastScript) + 1));
  return html.replace(/\n\s*<script src="([^"]+)"><\/script>/g, (match, src) => {
    const file = src.split("/").pop();
    return keep.has(file) ? match : "";
  });
}

await mkdir(diagnosticsRoot, { recursive: true });

await writeFile(
  join(diagnosticsRoot, "index.html"),
  page(
    "ArkWeb diagnostics",
    `    <h1>ArkWeb diagnostics</h1>
    <p>Open each item in order. Wait 60 seconds after opening one item.</p>
    <a href="./static.html">1. Full DOM + CSS, no app scripts</a>
    <a href="./libs.html">2. DOM + CSS + library scripts, no app.js</a>
    <a href="./no-svg.html">3. Full app without datapath SVG</a>
    <a href="./no-file-input.html">4. Full app without file input</a>
    <a href="../app/index.html">5. Original full app</a>`
  ),
  "utf8"
);

await writeFile(join(diagnosticsRoot, "static.html"), rewriteAssetPaths(removeScripts(sourceIndex)), "utf8");
await writeFile(join(diagnosticsRoot, "libs.html"), rewriteAssetPaths(keepScriptsUpTo(sourceIndex, "machine-state.js")), "utf8");
await writeFile(join(diagnosticsRoot, "no-svg.html"), rewriteAssetPaths(removeSvg(sourceIndex)), "utf8");
await writeFile(join(diagnosticsRoot, "no-file-input.html"), rewriteAssetPaths(removeFileInput(sourceIndex)), "utf8");

console.log(`ArkWeb diagnostics generated at ${diagnosticsRoot}`);
