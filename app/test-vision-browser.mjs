// Optional browser integration check: --playwright-path <module> --browser <exe>.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createTeachingAppServer } from "./server.mjs";
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const { chromium } = createRequire(import.meta.url)(arg("--playwright-path"));
const root = new URL("../", import.meta.url);
const samples = JSON.parse(readFileSync(new URL("scripts/printed-label-samples.json", root), "utf8"));
const server = createTeachingAppServer({ root: fileURLToPath(root), port: 4193 });
await new Promise((resolve) => server.listen(4193, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: arg("--browser"), headless: true });
  const page = await browser.newPage();
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      externalRequests.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  await page.goto("http://127.0.0.1:4193/app/index.html");
  await page.locator("#visionCaptureBtn").click();
  await page.locator("#visionImageInput").setInputFiles(fileURLToPath(new URL("pictures/新标签_add.jpg", root)));
  await page.waitForFunction(() => !document.getElementById("visionAnalyzeBtn").disabled);
  await page.locator("#visionAnalyzeBtn").click();
  await page.waitForFunction(() => document.querySelector("[data-vision-opcode]")?.value === "add");
  assert.equal(await page.locator("#visionApplyBtn").isDisabled(), true, "a lone ADD must still require its three registers");
  assert.equal(externalRequests.length, 0, "mounted ADD should not request OCR assets");

  const results = await page.evaluate(async (samples) => {
    const load = (url) => new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url;
    });
    async function scene(opcode = "addi", signed = false) {
      const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 400;
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 600, 400);
      const blocks = [
        { kind: "instruction", value: opcode, x: 80, y: 70, width: 440, height: 70, color: opcode === "lb" ? "#559b38" : "#254fc2" },
        { kind: "register", value: "x31", x: 100, y: 160, width: 100, height: 100, color: "#254fc2" },
        { kind: "register", value: "x11", x: 250, y: 160, width: 100, height: 100, color: "#254fc2" },
        { kind: "immediate", value: "0", x: 400, y: 160, width: 100, height: 100, color: "#f0b41e" }
      ];
      for (const block of blocks) {
        ctx.fillStyle = block.color; ctx.fillRect(block.x, block.y, block.width, block.height);
        const sx = block.kind === "instruction" ? block.x + 30 : block.x + 10;
        const sy = block.y + (block.kind === "instruction" ? 24 : 28);
        ctx.fillStyle = "white"; ctx.fillRect(sx, sy, 80, 42);
        if (signed && block.kind === "immediate") {
          ctx.fillStyle = "black"; ctx.font = "26px serif"; ctx.fillText("-16", sx + 16, sy + 29);
        } else {
          const sample = samples.find((item) => item.kind === block.kind && item.value === block.value);
          const image = await load(`/pictures/labels/${sample.file}`);
          const r = sample.rect;
          const scale = Math.min(64 / r.width, 31 / r.height);
          const width = r.width * scale, height = r.height * scale;
          ctx.drawImage(image, r.left, r.top, r.width, r.height, sx + (80 - width) / 2, sy + (42 - height) / 2, width, height);
        }
      }
      return canvas;
    }
    const defs = window.RiscVTeaching.INSTRUCTION_DEFS;
    const offline = await window.RiscVVision.analyzeCanvas(await scene(), { instructionDefinitions: defs });
    const unsupported = await window.RiscVVision.analyzeCanvas(await scene("lb"), { instructionDefinitions: defs });
    let ocrCalls = 0;
    let failOcr = false;
    window.Tesseract = { createWorker: async () => ({
      setParameters: async () => {},
      recognize: async () => {
        ocrCalls += 1;
        if (failOcr) throw new Error("test OCR unavailable");
        return { data: { text: "-16", confidence: 96 } };
      }
    }) };
    const signed = await window.RiscVVision.analyzeCanvas(await scene("addi", true), { instructionDefinitions: defs });
    failOcr = true;
    const failed = await window.RiscVVision.analyzeCanvas(await scene("addi", true), { instructionDefinitions: defs });
    return { offline, unsupported, signed, failed, ocrCalls };
  }, samples);
  console.log("Browser offline program:", JSON.stringify(results.offline.drafts.map(({ opcode, values }) => ({ opcode, values }))));
  assert.deepEqual(results.offline.drafts[0].values, { rd: "x31", rs1: "x11", imm: 0 });
  assert.equal(results.offline.drafts[0].opcode, "addi");
  assert.deepEqual(results.offline.drafts[0].errors, []);
  assert.equal(results.unsupported.drafts[0].opcode, "");
  assert(results.unsupported.warnings.some((warning) => warning.includes("LB")));
  assert.equal(results.signed.drafts[0].values.imm, -16, "OCR fallback must preserve the negative sign");
  assert.equal(results.signed.drafts[0].values.rd, "x31", "OCR fallback must preserve locally matched registers");
  assert(results.ocrCalls > 0);
  assert.equal(results.failed.drafts[0].opcode, "addi");
  assert.equal(results.failed.drafts[0].values.rd, "x31");
  assert.equal(results.failed.drafts[0].values.imm, "");
  assert(results.failed.warnings.includes("test OCR unavailable"), "failed OCR must preserve template matches and report missing text");
  assert.equal(externalRequests.length, 0);
  assert.deepEqual(errors, []);
  console.log("Browser upload, offline matching, unsupported instruction and signed OCR fallback passed.");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
