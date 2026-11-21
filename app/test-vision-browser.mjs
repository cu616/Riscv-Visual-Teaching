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
  const labelSelect = page.locator("select#customLabelInput");
  assert.deepEqual(await labelSelect.locator("option").allTextContents(), ["main", "loop", "done", "target", "start", "end"]);
  assert.equal(await labelSelect.inputValue(), "loop");
  await labelSelect.selectOption("done");
  assert.match(await page.locator("#operandPalette").innerText(), /Ldone/);
  await page.locator("#visionCaptureBtn").click();
  await page.locator("#visionImageInput").setInputFiles(fileURLToPath(new URL("pictures/1.jpg", root)));
  await page.waitForFunction(() => !document.getElementById("visionAnalyzeBtn").disabled);
  await page.locator("#visionAnalyzeBtn").click();
  await page.waitForFunction(() => document.querySelector("[data-vision-opcode]")?.value === "add");
  assert.equal(await page.locator("#visionApplyBtn").isDisabled(), true, "a lone ADD must still require its three registers");
  assert.equal(externalRequests.length, 0, "mounted ADD should not request OCR assets");

  // Photo contents follow pictures/STATEMENT.txt. Repeated values and their
  // positions matter, especially the two columns of attached yellow blocks.
  const expectedProgram = [
    ["andi", { rd: "x25", rs1: "x20", imm: 17 }],
    ["sub", { rd: "x14", rs1: "x16", rs2: "x1" }],
    ["jalr", { rd: "x8", imm: 16, rs1: "x7" }],
    ["lw", { rd: "x31", imm: 2, rs1: "x0" }]
  ];
  const photographed = await page.evaluate(async () => {
    const results = [];
    for (let i = 1; i <= 12; i += 1) {
      const image = new Image();
      image.src = `/pictures/${i}.jpg`;
      await image.decode();
      const canvas = document.createElement("canvas");
      const scale = 2400 / Math.max(image.naturalWidth, image.naturalHeight);
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      results.push(await window.RiscVVision.analyzeCanvas(canvas, {
        instructionDefinitions: window.RiscVTeaching.INSTRUCTION_DEFS
      }));
    }
    return results;
  });
  photographed.forEach(({ detections, drafts }, index) => {
    const photo = index + 1;
    const opcodes = drafts.map(({ opcode }) => opcode);
    const count = (kind, expected) => assert.equal(detections.filter((item) => item.kind === kind).length, expected, `photo ${photo}: ${kind}`);
    const byX = (a, b) => a.centerX - b.centerX;
    const byY = (a, b) => a.centerY - b.centerY;
    if (photo >= 2 && photo <= 4) {
      assert.equal(detections.length, 16, `photo ${photo}: all program blocks`);
      assert.deepEqual(drafts.map(({ opcode, values }) => [opcode, values]), expectedProgram);
      assert(drafts.every(({ errors }) => errors.length === 0));
    } else if (photo <= 7) {
      const expected = photo === 1 ? ["add"] : photo === 5 ? ["sw", "jal"] : ["bne", "blt", "beq"];
      assert.deepEqual(opcodes, expected);
      assert.equal(detections.length, expected.length);
    } else if (photo <= 10) {
      count("immediate", 10);
      assert.equal(detections.length, 10);
      const columns = [...detections].sort(byX);
      assert.deepEqual(columns.slice(0, 5).sort(byY).map(({ value }) => value), [24, 29, 31, 25, 18]);
      assert.deepEqual(columns.slice(5).sort(byY).map(({ value }) => value), [20, 13, 1, 0, 20]);
    } else {
      count("register", 4);
      assert.equal(detections.length, 4);
      const rows = [...detections].sort(byY);
      assert.deepEqual(rows.slice(0, 2).sort(byX).map(({ value }) => value), ["x29", "x23"]);
      assert.deepEqual(rows.slice(2).sort(byX).map(({ value }) => value), ["x12", "x12"]);
    }
  });
  assert.equal(externalRequests.length, 0, "all real photos should be recognized locally");
  console.log(`All 12 photos passed (${photographed.reduce((total, photo) => total + photo.detections.length, 0)} blocks).`);

  // The new cases are screenshots. Only feed their photo area to the recognizer.
  const screenshots = [
    [13, [22, 227, 645, 362]], [14, [26, 210, 644, 362]], [15, [27, 216, 644, 362]],
    [16, [30, 211, 644, 362]], [17, [25, 293, 644, 362]]
  ];
  const captureCases = await page.evaluate(async (screenshots) => {
    window.Tesseract = { createWorker: async () => { throw new Error("Offline test"); } };
    const results = [];
    for (const [number, rect] of screenshots) {
      const image = new Image();
      image.src = `/pictures/${number}.jpg`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = rect[2];
      canvas.height = rect[3];
      canvas.getContext("2d").drawImage(image, ...rect, 0, 0, canvas.width, canvas.height);
      const result = await window.RiscVVision.analyzeCanvas(canvas, {
        instructionDefinitions: window.RiscVTeaching.INSTRUCTION_DEFS
      });
      results.push({ result, png: canvas.toDataURL().split(",")[1] });
    }
    return results;
  }, screenshots);
  const expectedCapture = [
    ["andi", { rd: "x12", rs1: "x29", imm: 24 }],
    ["sub", { rd: "x23", rs1: "x20", rs2: "x25" }]
  ];
  const programFrom = ({ drafts }) => drafts.map(({ opcode, values }) => [opcode, values]);
  for (const [index, { result }] of captureCases.slice(0, 2).entries()) {
    assert.equal(result.detections.length, 8, `screenshot ${13 + index}: all blocks`);
    assert.deepEqual(programFrom(result), expectedCapture);
    assert(result.drafts.every(({ errors }) => errors.length === 0));
  }
  const obscured = captureCases[2].result;
  const obscuredOperands = obscured.detections.filter(({ kind }) => kind !== "instruction").map(({ value }) => String(value)).sort();
  assert.deepEqual(obscuredOperands, ["24", "x12", "x20", "x23", "x25", "x29"]);
  if (!obscured.missingInstructionRow) assert.deepEqual(programFrom(obscured), expectedCapture);

  // The UI must keep the partial program blocked even if SUB is confirmed.
  await page.locator("#visionImageInput").setInputFiles({ name: "capture-15.png", mimeType: "image/png", buffer: Buffer.from(captureCases[2].png, "base64") });
  await page.waitForFunction(() => !document.getElementById("visionAnalyzeBtn").disabled);
  await page.locator("#visionAnalyzeBtn").click();
  await page.waitForFunction(() => document.querySelector("[data-vision-opcode]"));
  if (obscured.missingInstructionRow) {
    await page.locator("[data-vision-opcode]").first().selectOption("sub");
    assert.match(await page.locator("#visionWarnings").innerText(), /可能漏识别/);
    assert(await page.locator("#visionApplyBtn").isDisabled());
  }
  assert(await page.locator("#visionEmptyState").isHidden(), "the preview must hide its empty placeholder");
  const expectedLoad = ["lw", { rd: "x31", imm: 2, rs1: "x0" }];
  const glare = captureCases[3].result;
  assert.equal(glare.detections.length, 8);
  assert.deepEqual(programFrom(glare), [expectedLoad, expectedCapture[0]]);
  assert(glare.drafts.every(({ errors }) => errors.length === 0));
  assert.equal(glare.missingInstructionRow, false);
  assert.deepEqual(glare.warnings, []);

  const annotated = captureCases[4].result;
  assert.equal(annotated.detections.length, 12);
  assert.equal(annotated.drafts.length, 3);
  assert.equal(annotated.missingInstructionRow, false);
  assert(["", "sub"].includes(annotated.drafts[0].opcode), "an obscured SUB must not be guessed as a different instruction");
  assert.deepEqual(annotated.drafts[0].sequenceValues, ["x23", "x20", "x25"]);
  assert.deepEqual(programFrom(annotated)[1], expectedLoad);
  assert.equal(annotated.drafts[2].opcode, "andi");
  assert(["", "x12"].includes(annotated.drafts[2].values.rd), "a crossed-out digit must not select a wrong register");
  assert.equal(annotated.drafts[2].values.rs1, "x29");
  assert.equal(annotated.drafts[2].values.imm, 24);

  await page.locator("#visionImageInput").setInputFiles({ name: "capture-17.png", mimeType: "image/png", buffer: Buffer.from(captureCases[4].png, "base64") });
  await page.waitForFunction(() => !document.getElementById("visionAnalyzeBtn").disabled);
  await page.locator("#visionAnalyzeBtn").click();
  await page.waitForFunction(() => document.querySelectorAll("[data-vision-opcode]").length === 3);
  if (!annotated.drafts[0].opcode || !annotated.drafts[2].values.rd) {
    assert(await page.locator("#visionApplyBtn").isDisabled());
    await page.locator("[data-vision-opcode]").first().selectOption("sub");
    await page.locator('[data-vision-index="2"] [data-vision-field="rd"]').fill("x12");
  }
  assert(await page.locator("#visionApplyBtn").isEnabled(), "manually reviewing obscured fields should restore import");
  console.log("Screenshots 13–17 passed: glare recovery, missed-row protection, and manual review of obscured fields.");

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
