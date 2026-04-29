import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = {
  window: {},
  crypto: {
    randomUUID: () => `test-${Math.random()}`
  }
};
vm.createContext(context);

for (const file of ["./app/src/instructions.js", "./app/src/simulator.js"]) {
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
}

const { parseProgram } = context.window.RiscVTeaching;
const { createInitialState, executeInstruction } = context.window.RiscVSimulator;

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

console.log("Core parser and simulator tests passed.");
