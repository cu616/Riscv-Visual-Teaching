import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = {
  window: {},
  crypto: {
    randomUUID: () => `test-${Math.random()}`
  }
};
vm.createContext(context);

for (const file of ["./app/src/instructions.js", "./app/src/simulator.js", "./app/src/case-format.js", "./app/src/operand-model.js", "./app/src/machine-state.js"]) {
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
}

const { EXAMPLES, parseProgram, formatAssembly } = context.window.RiscVTeaching;
const { createInitialState, executeInstruction } = context.window.RiscVSimulator;
const { createTeachingCasePayload, parseTeachingCasePayload } = context.window.RiscVCaseFormat;
const operandModel = context.window.RiscVOperandModel;
const machineState = context.window.RiscVMachineState;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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

console.log("Core parser and simulator tests passed.");
