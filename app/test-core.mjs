import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = {
  window: {},
  crypto: {
    randomUUID: () => `test-${Math.random()}`
  }
};
vm.createContext(context);

for (const file of ["./app/src/instructions.js", "./app/src/simulator.js", "./app/src/case-format.js", "./app/src/operand-model.js", "./app/src/machine-state.js", "./app/src/vision.js"]) {
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
}

const { EXAMPLES, parseProgram, formatAssembly } = context.window.RiscVTeaching;
const { createInitialState, executeInstruction } = context.window.RiscVSimulator;
const { createTeachingCasePayload, parseTeachingCasePayload } = context.window.RiscVCaseFormat;
const operandModel = context.window.RiscVOperandModel;
const machineState = context.window.RiscVMachineState;
const vision = context.window.RiscVVision;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(!vision.canApplyDrafts([]), "vision import should stay disabled without recognized instructions");
assert(!vision.canApplyDrafts([{ errors: ["语法错误：缺少 rs1。"] }]),
  "vision import should stay disabled while a blocking syntax error exists");
assert(vision.canApplyDrafts([{ errors: ["结构警示：多出一个立即数。"] }]),
  "non-blocking structural warnings should not disable vision import");

const programSource = [
  { id: "1", opcode: "addi", rd: "x1", rs1: "x0", imm: 16 },
  { id: "2", opcode: "addi", rd: "x2", rs1: "x0", imm: 42 },
  { id: "3", opcode: "sw", rs2: "x2", rs1: "x1", imm: 0 },
  { id: "4", opcode: "lw", rd: "x3", rs1: "x1", imm: 0 },
  { id: "5", opcode: "beq", rs1: "x2", rs2: "x3", label: "6" },
  { id: "6", opcode: "addi", rd: "x4", rs1: "x0", imm: 99 },
  { id: "7", opcode: "add", rd: "x5", rs1: "x2", rs2: "x3" }
];

const parsed = parseProgram(programSource);
assert(parsed.errors.length === 0, `Parser errors: ${parsed.errors.join("; ")}`);

let state = createInitialState();
while (!state.halted) {
  const result = executeInstruction(state, parsed.instructions);
  state = result.state;
}

assert(state.registers.x1 === 16, "x1 should hold base address 16");
assert(state.registers.x2 === 42, "x2 should be 42");
assert(state.memory[16] === 42, "memory[16] should be written by sw");
assert(state.registers.x3 === 42, "x3 should be loaded by lw");
assert(state.registers.x4 === 0, "beq should skip instruction at index 5");
assert(state.registers.x5 === 84, "x5 should be x2 + x3");
assert(state.logs.length === 6, "program should execute six instructions after branch skip");

const labelProgram = parseProgram([
  { id: "l1", opcode: "addi", rd: "x1", rs1: "x0", imm: 2 },
  { id: "l2", opcode: "addi", rd: "x2", rs1: "x0", imm: 2 },
  { id: "l3", opcode: "beq", rs1: "x1", rs2: "x2", label: "done" },
  { id: "l4", opcode: "addi", rd: "x3", rs1: "x0", imm: 9 },
  { id: "l5", opcode: "add", rd: "x4", rs1: "x1", rs2: "x2", labelTag: "done" }
]);

assert(labelProgram.errors.length === 0, `Named label parser errors: ${labelProgram.errors.join("; ")}`);
assert(labelProgram.instructions[2].targetIndex === 4, "beq should resolve named label to instruction index 4");

state = createInitialState();
while (!state.halted) {
  const result = executeInstruction(state, labelProgram.instructions);
  state = result.state;
}

assert(state.registers.x3 === 0, "named label branch should skip x3 assignment");
assert(state.registers.x4 === 4, "named label branch should land on done instruction");

const extendedProgram = parseProgram([
  { id: "e1", opcode: "addi", rd: "x1", rs1: "x0", imm: 12 },
  { id: "e2", opcode: "addi", rd: "x2", rs1: "x0", imm: 10 },
  { id: "e3", opcode: "and", rd: "x3", rs1: "x1", rs2: "x2" },
  { id: "e4", opcode: "or", rd: "x4", rs1: "x1", rs2: "x2" },
  { id: "e5", opcode: "xor", rd: "x5", rs1: "x1", rs2: "x2" },
  { id: "e6", opcode: "andi", rd: "x6", rs1: "x1", imm: 8 },
  { id: "e7", opcode: "slli", rd: "x7", rs1: "x6", shamt: 1 },
  { id: "e8", opcode: "srl", rd: "x8", rs1: "x7", rs2: "x2" },
  { id: "e9", opcode: "bne", rs1: "x1", rs2: "x2", label: "jump" },
  { id: "e10", opcode: "addi", rd: "x9", rs1: "x0", imm: 99 },
  { id: "e11", opcode: "jal", rd: "x10", label: "done", labelTag: "jump" },
  { id: "e12", opcode: "addi", rd: "x11", rs1: "x0", imm: 77 },
  { id: "e13", opcode: "bltz", rs1: "x0", label: "done" },
  { id: "e14", opcode: "add", rd: "x12", rs1: "x1", rs2: "x2", labelTag: "done" }
]);

assert(extendedProgram.errors.length === 0, `Extended parser errors: ${extendedProgram.errors.join("; ")}`);
assert(formatAssembly(extendedProgram.instructions[10]) === "jal x10, done", "jal assembly should be rd, label");

state = createInitialState();
while (!state.halted) {
  const result = executeInstruction(state, extendedProgram.instructions);
  state = result.state;
}

assert(state.registers.x3 === 8, "and should produce 12 & 10 = 8");
assert(state.registers.x4 === 14, "or should produce 12 | 10 = 14");
assert(state.registers.x5 === 6, "xor should produce 12 ^ 10 = 6");
assert(state.registers.x6 === 8, "andi should produce 12 & 8 = 8");
assert(state.registers.x7 === 16, "slli should shift 8 left by 1");
assert(state.registers.x8 === 0, "srl should use rs2 low five bits as shift amount");
assert(state.registers.x9 === 0, "bne should skip x9 assignment");
assert(state.registers.x10 === 11, "jal should write the next instruction index into rd");
assert(state.registers.x11 === 0, "jal should skip x11 assignment");
assert(state.registers.x12 === 22, "jal should land on done label");

const orderedProgram = parseProgram([
  { id: "late", opcode: "addi", rd: "x1", rs1: "x0", imm: 5, y: 200, x: 20 },
  { id: "early", opcode: "addi", rd: "x2", rs1: "x0", imm: 7, y: 80, x: 20 }
]);
assert(orderedProgram.errors.length === 0, "y-sorted program should parse");
assert(orderedProgram.instructions[0].rd === "x2", "program should execute by canvas height");

const x0Program = parseProgram([{ id: "zero", opcode: "addi", rd: "x0", rs1: "x0", imm: 1 }]);
state = createInitialState();
state = executeInstruction(state, x0Program.instructions).state;
assert(state.registers.x0 === 0, "x0 writes must be ignored");

const shamtError = parseProgram([{ id: "bad", opcode: "slli", rd: "x1", rs1: "x0", shamt: 32 }]);
assert(shamtError.errors.length === 1, "shamt outside 0..31 should be rejected");

const savedCase = createTeachingCasePayload({
  displayBase: "hex",
  instructions: [{ id: "save-1", opcode: "addi", rd: "x1", rs1: "x0", imm: 5, x: 36, y: 96 }],
  looseOperands: [{ id: "loose-1", kind: "register", value: "x2", x: 140, y: 180 }],
  initialState: { registers: { x1: 5 }, memory: { 16: 99 } },
  notes: { title: "demo", goal: "show addi", steps: "demo notes" }
});
const roundTrippedCase = parseTeachingCasePayload(JSON.stringify(savedCase));
assert(roundTrippedCase.displayBase === "hex", "saved case should preserve display base");
assert(roundTrippedCase.instructions.length === 1, "saved case should preserve instructions");
assert(roundTrippedCase.looseOperands.length === 1, "saved case should preserve loose operands");
assert(roundTrippedCase.initialState.registers.x1 === 5, "saved case should preserve initial registers");
assert(roundTrippedCase.initialState.memory[16] === 99, "saved case should preserve initial memory");
assert(roundTrippedCase.notes.title === "demo", "saved case should preserve note title");
assert(roundTrippedCase.notes.goal === "show addi", "saved case should preserve note goal");
assert(roundTrippedCase.notes.steps === "demo notes", "saved case should preserve note steps");

const legacyNotesCase = parseTeachingCasePayload({
  instructions: [],
  notes: "legacy note"
});
assert(legacyNotesCase.notes.steps === "legacy note", "legacy string notes should remain readable");

const loose = operandModel.createLooseOperand({ kind: "register", value: "x3" }, { x: 12, y: 24 }, () => "loose-created");
assert(loose.id === "loose-created", "operand model should create predictable loose operand ids");
assert(loose.kind === "register" && loose.value === "x3", "operand model should preserve loose operand data");

const detachedInstructions = operandModel.detachPayloadSource(
  [{ id: "i1", opcode: "add", rd: "x1", rs1: "x2", rs2: "x3" }],
  { detach: { instructionId: "i1", field: "rs1" } }
);
assert(detachedInstructions[0].rs1 === undefined, "detach should clear the source field");

const attachedInstructions = operandModel.attachOperandToInstruction(
  detachedInstructions,
  { kind: "register", value: "x4" },
  { instructionId: "i1", field: "rs1" },
  { rs1: "register" }
);
assert(attachedInstructions[0].rs1 === "x4", "attach should write operand value into target field");

const normalizedLoose = operandModel.normalizeLooseOperands([
  { kind: "register", value: "x1" },
  { kind: "bad", value: "nope" },
  { kind: "immediate", value: 8, x: "120", y: "180" }
]);
assert(normalizedLoose.length === 2, "normalization should drop unsupported loose operand kinds");
assert(normalizedLoose[0].x === 36 && normalizedLoose[0].y === 96, "normalization should default missing loose operand positions");
assert(normalizedLoose[1].x === 120 && normalizedLoose[1].y === 180, "normalization should parse numeric loose operand positions");

const normalizedInitial = machineState.normalizeInitialState({
  registers: { x0: 99, x1: "16", bad: 5, x2: 3.5 },
  memory: { 16: "99", "-4": 1, nope: 2 }
});
assert(normalizedInitial.registers.x0 === undefined, "initial state should not persist x0 overrides");
assert(normalizedInitial.registers.x1 === 16, "initial state should parse register integers");
assert(normalizedInitial.registers.bad === undefined, "initial state should drop unknown registers");
assert(normalizedInitial.memory[16] === 99, "initial state should parse memory integers");
assert(normalizedInitial.memory[-4] === undefined, "initial state should drop negative memory addresses");

const initializedState = machineState.createStateFromInitial(createInitialState, normalizedInitial);
assert(initializedState.registers.x0 === 0, "initialized machine state should keep x0 zero");
assert(initializedState.registers.x1 === 16, "initialized machine state should apply register overrides");
assert(initializedState.memory[16] === 99, "initialized machine state should apply memory overrides");

const changedInitial = machineState.setInitialValue(normalizedInitial, "register", "x3", "27");
assert(changedInitial.registers.x3 === 27, "setInitialValue should write register values");
const changedMemoryInitial = machineState.setInitialValue(changedInitial, "memory", "32", "-5");
assert(changedMemoryInitial.memory[32] === -5, "setInitialValue should write memory values");
const clearedInitial = machineState.clearInitialValue(changedMemoryInitial, "register", "x3");
assert(clearedInitial.registers.x3 === undefined, "clearInitialValue should remove register overrides");
assert(machineState.listMemoryAddresses(changedMemoryInitial).includes(32), "memory target list should include custom addresses");

const unsignedAndJalrProgram = parseProgram([
  { id: "u1", opcode: "addi", rd: "x1", rs1: "x0", imm: -1 },
  { id: "u2", opcode: "addi", rd: "x2", rs1: "x0", imm: 1 },
  { id: "u3", opcode: "bltu", rs1: "x1", rs2: "x2", label: "bad" },
  { id: "u4", opcode: "bgeu", rs1: "x1", rs2: "x2", label: "target" },
  { id: "u5", opcode: "addi", rd: "x3", rs1: "x0", imm: 99, labelTag: "bad" },
  { id: "u6", opcode: "addi", rd: "x4", rs1: "x0", imm: 6, labelTag: "target" },
  { id: "u7", opcode: "jalr", rd: "x5", rs1: "x4", imm: 1 },
  { id: "u8", opcode: "addi", rd: "x6", rs1: "x0", imm: 123 }
]);

assert(unsignedAndJalrProgram.errors.length === 0, `Unsigned/jalr parser errors: ${unsignedAndJalrProgram.errors.join("; ")}`);
state = createInitialState();
while (!state.halted) {
  const result = executeInstruction(state, unsignedAndJalrProgram.instructions);
  state = result.state;
}
assert(state.registers.x3 === 0, "bltu should not treat -1 as less than 1 in unsigned comparison");
assert(state.registers.x4 === 6, "bgeu should jump to target");
assert(state.registers.x5 === 7, "jalr should write return index");
assert(state.registers.x6 === 123, "jalr should jump to rs1 + imm in teaching index model");

for (const example of EXAMPLES) {
  const parsedExample = parseProgram(example.instructions);
  assert(parsedExample.errors.length === 0, `Example ${example.id} should parse: ${parsedExample.errors.join("; ")}`);
  state = createInitialState();
  let guard = 0;
  while (!state.halted && guard < 40) {
    const result = executeInstruction(state, parsedExample.instructions);
    state = result.state;
    guard += 1;
  }
  assert(state.halted, `Example ${example.id} should halt without an accidental loop`);
}

const visionLayout = context.window.RiscVVision;
assert(visionLayout.normalizeOpcode("ADI", "arithmetic") === "addi", "vision OCR should correct a close arithmetic opcode");
assert(visionLayout.normalizeOpcode("b1t2", "branch") === "bltz", "vision OCR should correct common handwritten BLTZ confusions");
assert(visionLayout.normalizeRegister("xl") === "x1", "vision OCR should normalize handwritten x1");
assert(visionLayout.normalizeImmediate("−16") === -16, "vision OCR should normalize a signed immediate");
const physicalOpcodeLabels = ["ADD", "SUB", "OR", "ADDI", "AND", "XOR", "ANDI", "XORI", "SRL", "ORI", "SLL", "SRA", "LW", "BEQ", "BLT", "SW", "BNE", "BLTU"];
physicalOpcodeLabels.forEach((label) => {
  assert(visionLayout.normalizeOpcode(label) === label.toLowerCase(), `physical opcode label ${label} should normalize exactly`);
});
["x0", "x2", "x17", "x1", "x5", "x31"].forEach((label) => {
  assert(visionLayout.normalizeRegister(label) === label, `physical register label ${label} should normalize exactly`);
});
["main", "done", "start", "loop", "target", "end"].forEach((label) => {
  assert(visionLayout.normalizeLabel(label) === label, `physical jump label ${label} should normalize exactly`);
});
assert(visionLayout.normalizeLabel("d0ne") === "done", "physical jump labels should correct a common handwritten OCR confusion");
assert(visionLayout.normalizeLabel("end.") === "end", "physical jump labels should ignore trailing punctuation");
assert(visionLayout.normalizeLabel("avp") === "main", "the upper main label OCR observed in the camera photo should normalize to main");
assert(visionLayout.normalizeLabel("MOA") === "main", "the lower main label OCR observed in the camera photo should normalize to main");
assert(visionLayout.normalizeLabel("manD") === "main", "the latest upper main label OCR should normalize to main");
assert(visionLayout.normalizeLabel("omun") === "main", "the latest lower main label OCR should normalize to main");
assert(visionLayout.normalizeLabel("moun") === "main", "the current lower main label OCR should normalize to main");
assert(visionLayout.normalizeLabel("mount") === "main", "a trailing-stroke variant of the lower main label should normalize to main");
assert(visionLayout.normalizeLabel("CustomLabel") === "CustomLabel", "unlisted custom labels should preserve their original case");
assert(visionLayout.normalizePhysicalLabel("moun") === "main", "physical label OCR aliases should stay within the six samples");
assert(visionLayout.PHYSICAL_LABEL_NAMES.includes(visionLayout.normalizePhysicalLabel("strangeOcrText")),
  "physical label OCR must only return one of the six photographed labels");
assert(JSON.stringify(visionLayout.PHYSICAL_LABEL_NAMES) === JSON.stringify(["main", "loop", "done", "target", "start", "end"]),
  "physical label choices should use the six user-approved labels in UI order");

function detected(kind, category, value, x, y, width, height) {
  return {
    kind,
    category,
    value,
    rawText: value,
    x,
    y,
    width,
    height,
    area: width * height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    confidence: 0.9
  };
}

const physicalLayout = [
  detected("instruction", "arithmetic", "add", 100, 100, 400, 60),
  detected("register", "register", "x2", 125, 180, 70, 60),
  detected("register", "register", "x3", 245, 180, 70, 60),
  detected("register", "register", "x4", 365, 180, 70, 60),
  detected("label", "label", "main", 35, 260, 80, 30),
  detected("instruction", "arithmetic", "addi", 100, 290, 400, 60),
  detected("register", "register", "x2", 125, 370, 70, 60),
  detected("register", "register", "x1", 245, 370, 70, 60),
  detected("immediate", "immediate", 2, 365, 370, 70, 60),
  detected("instruction", "jump", "j", 100, 470, 400, 60),
  detected("label", "label", "main", 125, 550, 80, 30)
];
const physicalDrafts = visionLayout.mapLayout(physicalLayout, context.window.RiscVTeaching.INSTRUCTION_DEFS);
assert(physicalDrafts.length === 3, "vision layout should reconstruct three instructions");
assert(physicalDrafts[0].opcode === "add" && physicalDrafts[0].values.rs2 === "x4", "vision layout should preserve ADD operands");
assert(physicalDrafts[1].labelTag === "main", "upper-left half-height label should define the following instruction");
assert(physicalDrafts[1].values.imm === 2, "vision layout should preserve ADDI immediate");
assert(physicalDrafts[2].opcode === "j" && physicalDrafts[2].values.label === "main", "label below J should become the jump target");

const e2Layout = [
  detected("label", "label", "main", 35, 60, 80, 30),
  detected("instruction", "arithmetic", "add", 100, 100, 400, 60),
  detected("register", "register", "x2", 125, 180, 70, 60),
  detected("register", "register", "x3", 245, 180, 70, 60),
  detected("register", "register", "x4", 365, 180, 70, 60),
  detected("instruction", "branch", "bltz", 100, 290, 400, 60),
  detected("register", "register", "x1", 125, 370, 70, 60),
  detected("immediate", "immediate", 2, 245, 370, 70, 60),
  detected("label", "label", "main", 365, 370, 80, 30)
];
const e2Drafts = visionLayout.mapLayout(e2Layout, context.window.RiscVTeaching.INSTRUCTION_DEFS);
assert(e2Drafts[0].labelTag === "main", "e2 upper-left main label should belong to ADD");
assert(e2Drafts[1].values.rs1 === "x1", "e2 BLTZ should preserve its register operand");
assert(e2Drafts[1].values.label === "main", "e2 BLTZ should match the green target label instead of the yellow immediate");
assert(e2Drafts[1].errors.some((error) => error.includes("立即数") && error.includes("2")), "e2 should report its unmatched immediate block as a structural warning");
assert(e2Drafts[1].errors.every((error) => error.startsWith("结构警示：")), "extra physical blocks should use non-blocking structural warnings");
assert(e2Drafts[1].errors.every((error) => !visionLayout.isBlockingDraftIssue(error)),
  "extra physical blocks must not block importing the mapped instruction");

function blankImageData(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 245;
    data[index + 1] = 245;
    data[index + 2] = 245;
    data[index + 3] = 255;
  }
  return { data, width, height };
}

function paintRect(imageData, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const index = (row * imageData.width + column) * 4;
      imageData.data[index] = color[0];
      imageData.data[index + 1] = color[1];
      imageData.data[index + 2] = color[2];
    }
  }
}

const handwrittenOneImage = blankImageData(120, 54);
paintRect(handwrittenOneImage, 60, 13, 5, 28, [0, 0, 0]);
assert(visionLayout.imageDataHasHandwrittenOne(handwrittenOneImage),
  "a tall narrow handwritten stroke should recover a missing register digit 1");
assert(visionLayout.resolveRegisterOcr("x", "", handwrittenOneImage) === "x1",
  "a detected x plus a handwritten vertical stroke should recover x1");
assert(visionLayout.resolveRegisterOcr("x1", "2", handwrittenOneImage) === "x2",
  "an ambiguous full-register OCR result should accept the isolated digit pass");
assert(visionLayout.resolveRegisterOcr("x2", "1", handwrittenOneImage) === "x2",
  "a valid non-ambiguous full-register result must not be overwritten");
const smallHandwrittenOneImage = blankImageData(120, 54);
paintRect(smallHandwrittenOneImage, 92, 24, 2, 9, [0, 0, 0]);
assert(visionLayout.imageDataHasHandwrittenOne(smallHandwrittenOneImage),
  "a short narrow handwritten 1 must survive the fallback shape check");
const trailingHandwrittenOneImage = blankImageData(120, 54);
paintRect(trailingHandwrittenOneImage, 48, 17, 18, 22, [0, 0, 0]);
paintRect(trailingHandwrittenOneImage, 94, 24, 2, 9, [0, 0, 0]);
assert(visionLayout.imageDataHasTrailingHandwrittenOne(trailingHandwrittenOneImage),
  "a small trailing handwritten 1 should be detected after another digit");
assert(visionLayout.resolveRegisterOcr("x", "4", blankImageData(120, 54)) === "x4",
  "an isolated digit pass should recover x4 when the full pass only sees x");
assert(visionLayout.resolveRegisterOcr("x3", "31", trailingHandwrittenOneImage) === "x31",
  "a wider digit pass should restore x31 when the full pass drops its small trailing 1");
assert(visionLayout.resolveRegisterOcr("x3", "3", trailingHandwrittenOneImage) === "x31",
  "the trailing-stroke fallback should restore x31 when both OCR passes drop its small 1");
assert(visionLayout.resolveImmediateOcr("4", "2") === 2,
  "the isolated immediate digit pass should correct a full-crop 4/2 confusion");
const horizontalStrokeImage = blankImageData(120, 54);
paintRect(horizontalStrokeImage, 40, 26, 38, 5, [0, 0, 0]);
assert(!visionLayout.imageDataHasHandwrittenOne(horizontalStrokeImage),
  "a horizontal OCR artifact must not be treated as register digit 1");

const touchingBlocks = blankImageData(600, 400);
const branchYellow = [240, 180, 30];
const labelGreen = [109, 145, 49];
paintRect(touchingBlocks, 80, 100, 440, 70, branchYellow);
paintRect(touchingBlocks, 280, 170, 100, 100, branchYellow);
paintRect(touchingBlocks, 80, 30, 20, 30, labelGreen);
paintRect(touchingBlocks, 125, 30, 30, 10, labelGreen);
paintRect(touchingBlocks, 175, 30, 20, 30, labelGreen);
const touchingDetections = visionLayout.detectBlocksFromImageData(
  touchingBlocks,
  touchingBlocks.width,
  touchingBlocks.height
);
assert(touchingDetections.filter((item) => item.kind === "instruction" && item.category === "branch").length === 1,
  "touching yellow blocks should keep one branch instruction");
assert(touchingDetections.filter((item) => item.kind === "immediate").length === 1,
  "touching yellow blocks should split out one immediate block");
assert(touchingDetections.filter((item) => item.kind === "label").length === 1,
  "nearby green fragments should merge into one label block");

const stickerFilterImage = blankImageData(600, 400);
const memoryGreen = [50, 145, 80];
const stickerWhite = [232, 232, 226];
const handwritingBlack = [20, 20, 20];
paintRect(stickerFilterImage, 80, 80, 440, 80, branchYellow);
paintRect(stickerFilterImage, 120, 108, 150, 36, stickerWhite);
paintRect(stickerFilterImage, 155, 120, 42, 5, handwritingBlack);
paintRect(stickerFilterImage, 172, 116, 5, 18, handwritingBlack);
paintRect(stickerFilterImage, 100, 300, 400, 60, memoryGreen);
const stickeredBlocks = visionLayout.detectStickeredBlocksFromImageData(
  stickerFilterImage,
  stickerFilterImage.width,
  stickerFilterImage.height,
  { includeIgnored: true }
);
assert(stickeredBlocks.detections.some((item) => item.kind === "instruction" && item.category === "branch"),
  "a colored instruction with a white label sticker should remain detectable");
assert(!stickeredBlocks.detections.some((item) => item.category === "memory"),
  "an unlabeled green background stripe should not enter the instruction mapping");
assert(stickeredBlocks.ignoredDetections.some((item) => item.category === "memory"),
  "the unlabeled background candidate should be reported as ignored");

const faintHandwritingProgram = blankImageData(700, 500);
const faintInk = [170, 170, 170];
paintRect(faintHandwritingProgram, 70, 50, 560, 75, [0, 85, 203]);
paintRect(faintHandwritingProgram, 115, 72, 165, 36, stickerWhite);
paintRect(faintHandwritingProgram, 150, 82, 60, 5, faintInk);
paintRect(faintHandwritingProgram, 175, 77, 5, 22, faintInk);
paintRect(faintHandwritingProgram, 110, 125, 105, 85, [80, 190, 245]);
paintRect(faintHandwritingProgram, 125, 148, 75, 35, stickerWhite);
paintRect(faintHandwritingProgram, 145, 158, 28, 4, faintInk);
paintRect(faintHandwritingProgram, 156, 152, 4, 22, faintInk);
paintRect(faintHandwritingProgram, 270, 125, 105, 85, [80, 190, 245]);
paintRect(faintHandwritingProgram, 285, 148, 75, 35, stickerWhite);
paintRect(faintHandwritingProgram, 305, 158, 28, 4, faintInk);
paintRect(faintHandwritingProgram, 318, 152, 4, 22, faintInk);
paintRect(faintHandwritingProgram, 430, 125, 105, 85, branchYellow);
paintRect(faintHandwritingProgram, 445, 148, 75, 35, stickerWhite);
paintRect(faintHandwritingProgram, 468, 153, 22, 4, faintInk);
paintRect(faintHandwritingProgram, 486, 153, 4, 22, faintInk);
paintRect(faintHandwritingProgram, 70, 210, 560, 75, [230, 35, 10]);
paintRect(faintHandwritingProgram, 115, 232, 165, 36, stickerWhite);
paintRect(faintHandwritingProgram, 170, 239, 5, 22, faintInk);
paintRect(faintHandwritingProgram, 160, 257, 15, 4, faintInk);
paintRect(faintHandwritingProgram, 430, 285, 105, 45, labelGreen);
paintRect(faintHandwritingProgram, 445, 294, 75, 28, stickerWhite);
paintRect(faintHandwritingProgram, 462, 302, 38, 4, faintInk);
paintRect(faintHandwritingProgram, 480, 298, 4, 18, faintInk);
const faintProgramBlocks = visionLayout.detectStickeredBlocksFromImageData(
  faintHandwritingProgram,
  faintHandwritingProgram.width,
  faintHandwritingProgram.height
).detections;
assert(faintProgramBlocks.filter((item) => item.kind === "instruction").length === 2,
  "faint handwriting should preserve both the upper instruction and the touching J instruction");
assert(faintProgramBlocks.filter((item) => item.kind === "register").length >= 2,
  "faint handwriting should preserve adjacent register blocks");
assert(faintProgramBlocks.some((item) => item.kind === "immediate"),
  "faint handwriting should preserve an adjacent immediate block");
assert(faintProgramBlocks.some((item) => item.kind === "label"),
  "faint handwriting should preserve the label below J");

const blankStickerBlock = blankImageData(600, 300);
paintRect(blankStickerBlock, 80, 80, 440, 80, [230, 35, 10]);
paintRect(blankStickerBlock, 120, 105, 150, 36, stickerWhite);
const blankStickerDetections = visionLayout.detectStickeredBlocksFromImageData(
  blankStickerBlock,
  blankStickerBlock.width,
  blankStickerBlock.height
).detections;
assert(!blankStickerDetections.some((item) => item.kind === "instruction"),
  "a blank sticker without handwriting must still be excluded");

const connectedBlueBlocks = blankImageData(600, 400);
const darkBlue = [0, 85, 203];
paintRect(connectedBlueBlocks, 50, 70, 500, 60, darkBlue);
paintRect(connectedBlueBlocks, 90, 130, 110, 90, darkBlue);
paintRect(connectedBlueBlocks, 245, 130, 110, 90, darkBlue);
paintRect(connectedBlueBlocks, 400, 130, 110, 90, darkBlue);
const fallbackStickers = [
  [100, 109, 100, 20],
  [105, 160, 80, 35],
  [260, 160, 80, 35],
  [415, 160, 80, 35]
];
fallbackStickers.forEach(([x, y, width, height]) => {
  paintRect(connectedBlueBlocks, x, y, width, height, stickerWhite);
  paintRect(connectedBlueBlocks, x + Math.round(width * 0.3), y + 12, Math.max(12, Math.round(width * 0.25)), 4, handwritingBlack);
});
const recoveredBlueBlocks = visionLayout.detectStickeredBlocksFromImageData(
  connectedBlueBlocks,
  connectedBlueBlocks.width,
  connectedBlueBlocks.height
).detections;
assert(recoveredBlueBlocks.filter((item) => item.kind === "instruction").length === 1,
  "a connected blue assembly should recover one long instruction from its sticker row");
assert(recoveredBlueBlocks.filter((item) => item.kind === "register").length === 3,
  "a connected blue assembly should recover three register blocks from their stickers");
const recoveredInstruction = recoveredBlueBlocks.find((item) => item.kind === "instruction");
recoveredInstruction.value = "";
recoveredInstruction.rawText = "";
recoveredBlueBlocks.filter((item) => item.kind === "register")
  .sort((left, right) => left.centerX - right.centerX)
  .forEach((item, index) => {
    item.value = ["x2", "x3", "x4"][index];
    item.rawText = item.value;
  });
const recoveredAddDraft = visionLayout.mapLayout(recoveredBlueBlocks, context.window.RiscVTeaching.INSTRUCTION_DEFS)[0];
assert(recoveredAddDraft.opcode === "add", "three recovered register operands should select ADD instead of ADDI");
assert(recoveredAddDraft.values.rd === "x2" && recoveredAddDraft.values.rs1 === "x3" && recoveredAddDraft.values.rs2 === "x4",
  "the recovered ADD should preserve x2, x3, x4 from left to right");

const photographedAddLayout = [
  detected("instruction", "arithmetic", "add", 24, 82, 548, 102),
  detected("register", "register", "x2", 90, 183, 144, 86),
  detected("register", "register", "x3", 289, 168, 174, 93),
  detected("register", "register", "x4", 433, 168, 155, 88)
];
const photographedAddDraft = visionLayout.mapLayout(
  photographedAddLayout,
  context.window.RiscVTeaching.INSTRUCTION_DEFS
)[0];
assert(photographedAddDraft.operands.length === 3,
  "partly overlapping register blocks in the photographed ADD should remain attached to the long instruction");
assert(photographedAddDraft.values.rd === "x2" && photographedAddDraft.values.rs1 === "x3" && photographedAddDraft.values.rs2 === "x4",
  "the photographed ADD layout should map x2, x3, x4 from left to right");

const invalidAddiLayout = [
  detected("instruction", "arithmetic", "addi", 100, 100, 400, 60),
  detected("register", "register", "x2", 125, 180, 70, 60),
  detected("register", "register", "x3", 245, 180, 70, 60),
  detected("register", "register", "x4", 365, 180, 70, 60)
];
const invalidAddiDraft = visionLayout.mapLayout(invalidAddiLayout, context.window.RiscVTeaching.INSTRUCTION_DEFS)[0];
assert(invalidAddiDraft.opcode === "addi",
  "a clearly recognized ADDI label should remain ADDI even when a register is attached where an immediate belongs");
assert(invalidAddiDraft.values.rd === "x2" && invalidAddiDraft.values.rs1 === "x3",
  "the invalid ADDI should preserve its first two register operands");
assert(invalidAddiDraft.errors.some((error) => error.includes("多出的寄存器") && error.includes("x4")),
  "the invalid ADDI should report x4 as a mismatched register block");
assert(invalidAddiDraft.errors.some((error) => error.includes("缺少 imm")),
  "the invalid ADDI should report its missing immediate block");
assert(invalidAddiDraft.errors.some((error) => visionLayout.isBlockingDraftIssue(error)),
  "a missing required field must remain a blocking syntax error");

const misreadBltzLayout = [
  detected("instruction", "branch", "blt", 100, 100, 400, 60),
  detected("register", "register", "x1", 125, 180, 70, 60),
  detected("label", "label", "main", 365, 180, 80, 30)
];
misreadBltzLayout[0].confidence = 0.25;
const correctedBltzDraft = visionLayout.mapLayout(misreadBltzLayout, context.window.RiscVTeaching.INSTRUCTION_DEFS)[0];
assert(correctedBltzDraft.opcode === "bltz", "a BLT OCR result with register-plus-label structure should correct to BLTZ");
assert(correctedBltzDraft.values.rs1 === "x1" && correctedBltzDraft.values.label === "main",
  "the corrected BLTZ should preserve x1 and main");

const uniqueDefinitionLabelLayout = [
  detected("label", "label", "main", 35, 55, 80, 30),
  detected("instruction", "arithmetic", "addi", 100, 100, 400, 60),
  detected("register", "register", "x2", 125, 180, 70, 60),
  detected("register", "register", "x3", 245, 180, 70, 60),
  detected("immediate", "immediate", 2, 365, 180, 70, 60),
  detected("instruction", "branch", "bltz", 100, 290, 400, 60),
  detected("register", "register", "x1", 125, 370, 70, 60),
  detected("label", "label", "main", 365, 370, 80, 30)
];
const uniqueDefinitionDrafts = visionLayout.mapLayout(
  uniqueDefinitionLabelLayout,
  context.window.RiscVTeaching.INSTRUCTION_DEFS
);
assert(uniqueDefinitionDrafts[0].labelTag === "main",
  "the upper-left main block should define ADDI");
assert(uniqueDefinitionDrafts[1].labelTag === "",
  "the ADDI definition label must not be reused as a BLTZ definition label");
assert(uniqueDefinitionDrafts[1].values.rs1 === "x1" && uniqueDefinitionDrafts[1].values.label === "main",
  "the blocks below BLTZ should map to x1 and target main");

const extraJumpOperandLayout = [
  detected("instruction", "jump", "j", 100, 100, 400, 60),
  detected("label", "label", "main", 125, 180, 80, 30),
  detected("label", "label", "done", 365, 180, 80, 30)
];
const extraJumpDraft = visionLayout.mapLayout(
  extraJumpOperandLayout,
  context.window.RiscVTeaching.INSTRUCTION_DEFS
)[0];
assert(extraJumpDraft.values.label === "main", "J should keep the first target label when two labels are attached");
assert(extraJumpDraft.errors.length > 0 && extraJumpDraft.errors.every((issue) => !visionLayout.isBlockingDraftIssue(issue)),
  "a second label below J should warn without blocking import");
extraJumpDraft.operands.splice(1, 1);
extraJumpDraft.values = visionLayout.mapFieldsFromOperands(
  context.window.RiscVTeaching.INSTRUCTION_DEFS.j.fields,
  extraJumpDraft.operands
).values;
assert(visionLayout.validateDraftOperands("j", context.window.RiscVTeaching.INSTRUCTION_DEFS.j, extraJumpDraft.operands, extraJumpDraft.values).length === 0,
  "deleting the extra physical label should clear the J structural warning");
const noisyBltzLayout = [
  detected("instruction", "branch", "", 100, 100, 400, 60),
  detected("register", "register", "x1", 125, 180, 70, 60),
  detected("immediate", "immediate", 2, 245, 180, 70, 60),
  detected("label", "label", "main", 365, 180, 80, 30)
];
noisyBltzLayout[0].rawText = "COM";
const noisyBltzDraft = visionLayout.mapLayout(noisyBltzLayout, context.window.RiscVTeaching.INSTRUCTION_DEFS)[0];
assert(noisyBltzDraft.opcode === "bltz",
  "a branch with register, extra immediate, and target label should prefer BLTZ over BEQ");
assert(noisyBltzDraft.values.rs1 === "x1" && noisyBltzDraft.values.label === "main",
  "the noisy BLTZ structure should keep x1 and main");
assert(noisyBltzDraft.errors.some((issue) => issue.includes("立即数") && issue.includes("2")),
  "the physical immediate 2 below BLTZ should remain visible as a non-blocking extra block warning");
console.log("Core parser and simulator tests passed.");
