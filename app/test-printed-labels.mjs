import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = new URL("../", import.meta.url);
const context = { window: {} };
vm.createContext(context);
for (const file of ["instructions.js", "printed-label-templates.js", "printed-labels.js", "vision.js"]) {
  vm.runInContext(readFileSync(new URL(`src/${file}`, import.meta.url), "utf8"), context);
}
const { RiscVPrintedLabels: printed, RiscVPrintedLabelTemplates: bank, RiscVVision: vision } = context.window;
const samples = JSON.parse(readFileSync(new URL("scripts/printed-label-samples.json", root), "utf8"));
assert.equal(bank.samples.length, 300);
for (let i = 0; i < 32; i += 1) {
  assert(bank.samples.some((sample) => sample.kind === "register" && sample.value === `x${i}`));
  assert(bank.samples.some((sample) => sample.kind === "immediate" && sample.value === String(i)));
}
for (const [category, values] of Object.entries(vision.CATEGORY_OPCODES)) {
  for (const value of values) assert.equal(vision.normalizePrintedText(value, "instruction", category), value);
}
for (const value of ["lui", "lb", "lh", "lbu", "lhu", "sb", "sh", "slt", "sltu", "slti", "sltiu"]) {
  for (const category of Object.keys(vision.CATEGORY_OPCODES)) assert.equal(vision.normalizePrintedText(value, "instruction", category), "");
}
assert.equal(vision.normalizePrintedText("s1l", "instruction", "arithmetic"), "sll");
assert.equal(vision.normalizePrintedText("1w", "instruction", "memory"), "lw");
assert.equal(vision.normalizePrintedText("jal", "instruction", "jump"), "jal");
assert.equal(vision.normalizePrintedText("x11", "register"), "x11");
assert.equal(vision.normalizePrintedText("x31", "register"), "x31");
assert.equal(vision.normalizePrintedText("x32", "register"), "");
assert.equal(vision.normalizePrintedText("x1x2", "register"), "");
assert.equal(vision.normalizePrintedText("−16", "immediate"), -16);
assert.equal(vision.normalizePrintedText("-1", "immediate"), -1);
assert.equal(vision.normalizePrintedText("0", "immediate"), 0);
assert.equal(vision.normalizePrintedText("12garbage", "immediate"), "");
assert.equal(vision.normalizePrintedText("--16", "immediate"), "");
assert.equal(vision.normalizePrintedText("rnain", "label"), "main");
assert.equal(vision.normalizePrintedText("avp", "label"), "");
const defs = context.window.RiscVTeaching.INSTRUCTION_DEFS;
const unsupportedDraft = vision.mapLayout([{
  kind: "instruction", category: "memory", rawText: "lb", value: "", unsupportedOpcode: true,
  x: 0, y: 0, width: 400, height: 50, centerX: 200, centerY: 25
}], defs);
assert.equal(unsupportedDraft[0].opcode, "", "unsupported text must never be guessed from block structure");
assert(!vision.canApplyDrafts(unsupportedDraft));
console.log("Printed-label vocabulary and rejection checks passed.");

// Real image regression is opt-in because sharp is only needed in development.
const sharpIndex = process.argv.indexOf("--sharp-path");
if (sharpIndex < 0) process.exit(0);
const sharp = createRequire(import.meta.url)(process.argv[sharpIndex + 1]);
const groupCounts = new Map();
const holdouts = [];
const training = [];
for (let i = 0; i < bank.samples.length; i += 1) {
  const item = bank.samples[i];
  const key = `${item.kind}:${item.value}`;
  const count = groupCounts.get(key) || 0;
  groupCounts.set(key, count + 1);
  if (count === 2) holdouts.push(i);
  else training.push(item);
}
let failures = [];
for (const i of holdouts) {
  const sample = samples[i];
  const path = fileURLToPath(new URL(`pictures/labels/${sample.file}`, root));
  const { data, info } = await sharp(path).extract(sample.rect).resize({ height: 60 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const match = printed.match({ width: info.width, height: info.height, data }, sample.kind, bank.samples[i].category, { samples: training });
  const expectedSupported = bank.samples[i].supported;
  if (match.value !== sample.value || (expectedSupported ? !match.accepted : !match.unsupported)) {
    failures.push({ expected: sample.value, kind: sample.kind, match });
  }
}
console.log(`Held-out scan samples: ${holdouts.length - failures.length}/${holdouts.length} accepted correctly.`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
assert.equal(failures.length, 0, "independent scan copies should match without training on themselves");

const photo = fileURLToPath(new URL("pictures/1.jpg", root));
const { data, info } = await sharp(photo).resize({ width: 960, height: 760, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const detections = vision.detectStickeredBlocksFromImageData({ width: info.width, height: info.height, data }, info.width, info.height).detections;
const instructions = detections.filter((item) => item.kind === "instruction");
assert.equal(instructions.length, 1, "the new sticker must use the existing block detector");
const rect = instructions[0].stickerRect;
const scale = info.width / 4096;
const crop = { left: Math.round(rect.x / scale), top: Math.round(rect.y / scale), width: Math.round(rect.width / scale), height: Math.round(rect.height / scale) };
const actual = await sharp(photo).extract(crop).resize({ width: 420 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const match = printed.match({ width: actual.info.width, height: actual.info.height, data: actual.data }, "instruction", instructions[0].category);
console.log("Mounted ADD photo:", JSON.stringify(match));
assert.equal(match.value, "add");
assert(match.accepted, "the mounted printed ADD should match locally, without OCR");
for (const angle of [-8, 8]) {
  const rotated = await sharp(photo).extract(crop).resize({ width: 240 }).rotate(angle, { background: "white" }).blur(0.4).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = printed.match({ width: rotated.info.width, height: rotated.info.height, data: rotated.data }, "instruction", "arithmetic");
  assert.equal(result.value, "add");
  assert(result.accepted, `mounted ADD at ${angle} degrees should match`);
}
console.log("Mounted photo and camera-roll checks passed.");
