import { REGISTERS } from "./instructionDefs";
import { formatAssembly } from "./parser";
import type { ExecutionResult, Instruction, MachineState, RegisterName } from "./types";

export function createInitialState(initial?: {
  registers?: Partial<Record<RegisterName, number>>;
  memory?: Record<number, number>;
  pc?: number;
  halted?: boolean;
  logs?: MachineState["logs"];
}): MachineState {
  const registers = Object.fromEntries(REGISTERS.map((name) => [name, 0])) as Record<RegisterName, number>;
  if (initial?.registers) {
    for (const [name, value] of Object.entries(initial.registers) as Array<[RegisterName, number | undefined]>) {
      if (value !== undefined) registers[name] = value;
    }
  }
  return {
    registers,
    memory: {
      0: 8,
      4: 13,
      8: 21,
      12: 34,
      16: 0,
      20: 0,
      24: 0,
      28: 0,
      ...(initial?.memory || {})
    },
    pc: initial?.pc ?? 0,
    halted: initial?.halted ?? false,
    logs: initial?.logs ? [...initial.logs] : []
  };
}

export function executeInstruction(state: MachineState, program: Instruction[]): { state: MachineState; result: ExecutionResult } {
  if (state.halted || state.pc < 0 || state.pc >= program.length) {
    return {
      state: { ...cloneState(state), halted: true },
      result: { explanation: "程序已经执行结束。", changedRegisters: [], changedMemoryAddresses: [], animationPlan: [] }
    };
  }

  const instruction = program[state.pc];
  const next = cloneState(state);
  const oldPc = state.pc;
  const changedRegisters: RegisterName[] = [];
  const changedMemoryAddresses: number[] = [];
  let explanation = "";
  let animationPlan: string[] = [];

  const readReg = (name?: RegisterName) => Number((name && next.registers[name]) || 0);
  const writeReg = (name: RegisterName | undefined, value: number) => {
    if (!name) return;
    if (name === "x0") {
      next.registers.x0 = 0;
      explanation += " 注意：x0 是恒零寄存器，写入会被忽略。";
      return;
    }
    next.registers[name] = value | 0;
    changedRegisters.push(name);
  };

  switch (instruction.opcode) {
    case "add":
    case "sub":
    case "addi": {
      const left = readReg(instruction.rs1);
      const right = instruction.opcode === "addi" ? Number(instruction.imm) : readReg(instruction.rs2);
      const value = instruction.opcode === "sub" ? left - right : left + right;
      writeReg(instruction.rd, value);
      next.pc += 1;
      explanation = `${formatAssembly(instruction)}：ALU 得到 ${value}。`;
      animationPlan = ["registerFileNode", "aluNode", "writebackNode"];
      break;
    }
    case "and":
    case "or":
    case "xor":
    case "andi":
    case "ori":
    case "xori": {
      const left = readReg(instruction.rs1);
      const right = instruction.imm !== undefined ? Number(instruction.imm) : readReg(instruction.rs2);
      const op = instruction.opcode.replace(/i$/, "");
      const value = op === "and" ? left & right : op === "or" ? left | right : left ^ right;
      writeReg(instruction.rd, value);
      next.pc += 1;
      explanation = `${formatAssembly(instruction)}：按位 ${op.toUpperCase()} 得到 ${value}。`;
      animationPlan = ["registerFileNode", "aluNode", "writebackNode"];
      break;
    }
    case "sll":
    case "srl":
    case "sra":
    case "slli":
    case "srli":
    case "srai": {
      const left = readReg(instruction.rs1);
      const shamt = instruction.shamt !== undefined ? Number(instruction.shamt) : readReg(instruction.rs2) & 31;
      const op = instruction.opcode.replace(/i$/, "");
      const value = op === "sll" ? left << shamt : op === "srl" ? left >>> shamt : left >> shamt;
      writeReg(instruction.rd, value);
      next.pc += 1;
      explanation = `${formatAssembly(instruction)}：移位量 ${shamt}，结果 ${value | 0}。`;
      animationPlan = ["registerFileNode", "aluNode", "writebackNode"];
      break;
    }
    case "lw": {
      const address = readReg(instruction.rs1) + Number(instruction.imm);
      validateAddress(address);
      const value = Number(next.memory[address] || 0);
      writeReg(instruction.rd, value);
      next.pc += 1;
      explanation = `${formatAssembly(instruction)}：读取 memory[${address}]=${value}。`;
      animationPlan = ["registerFileNode", "aluNode", "memoryNode", "writebackNode"];
      break;
    }
    case "sw": {
      const address = readReg(instruction.rs1) + Number(instruction.imm);
      validateAddress(address);
      const value = readReg(instruction.rs2);
      next.memory[address] = value;
      changedMemoryAddresses.push(address);
      next.pc += 1;
      explanation = `${formatAssembly(instruction)}：写入 memory[${address}]=${value}。`;
      animationPlan = ["registerFileNode", "aluNode", "memoryNode"];
      break;
    }
    case "beq":
    case "bne":
    case "blt":
    case "bge":
    case "bltu":
    case "bgeu":
    case "bltz": {
      const branch = evaluateBranch(instruction, readReg, program.length);
      next.pc = branch.taken ? branch.target : next.pc + 1;
      explanation = `${formatAssembly(instruction)}：条件${branch.taken ? "成立" : "不成立"}。`;
      animationPlan = ["registerFileNode", "aluNode", "branchNode"];
      break;
    }
    case "jal":
    case "j": {
      const target = validateTarget(instruction, program.length);
      if (instruction.opcode === "jal") writeReg(instruction.rd, oldPc + 1);
      next.pc = target;
      explanation = `${formatAssembly(instruction)}：PC 跳转到 ${target}。`;
      animationPlan = ["pcNode", "branchNode", "writebackNode"];
      break;
    }
    case "jalr": {
      const target = readReg(instruction.rs1) + Number(instruction.imm);
      validateJumpIndex(target, program.length, "jalr");
      writeReg(instruction.rd, oldPc + 1);
      next.pc = target;
      explanation = `${formatAssembly(instruction)}：PC 跳转到 ${target}。`;
      animationPlan = ["registerFileNode", "aluNode", "branchNode", "writebackNode"];
      break;
    }
    default:
      throw new Error(`暂不支持指令 ${instruction.opcode}。`);
  }

  next.registers.x0 = 0;
  if (next.pc >= program.length) next.halted = true;
  next.logs.push({ pc: oldPc, assembly: formatAssembly(instruction), explanation, changedRegisters, changedMemoryAddresses });

  return { state: next, result: { instruction, explanation, changedRegisters, changedMemoryAddresses, animationPlan } };
}

function cloneState(state: MachineState): MachineState {
  return { registers: { ...state.registers }, memory: { ...state.memory }, pc: state.pc, halted: state.halted, logs: [...state.logs] };
}

function validateAddress(address: number) {
  if (!Number.isInteger(address) || address < 0) throw new Error(`访存地址 ${address} 无效。`);
}

function validateTarget(instruction: Instruction, programLength: number) {
  const target = instruction.targetIndex ?? Number(instruction.label);
  validateJumpIndex(target, programLength, instruction.opcode);
  return target;
}

function validateJumpIndex(target: number, programLength: number, opcode: string) {
  if (!Number.isInteger(target) || target < 0 || target >= programLength) {
    throw new Error(`${opcode} 的目标必须是 0 到 ${programLength - 1} 之间的指令序号或标签。`);
  }
}

function evaluateBranch(instruction: Instruction, readReg: (name?: RegisterName) => number, programLength: number) {
  const left = readReg(instruction.rs1);
  const right = instruction.opcode === "bltz" ? 0 : readReg(instruction.rs2);
  const target = validateTarget(instruction, programLength);
  const taken =
    instruction.opcode === "beq" ? left === right :
    instruction.opcode === "bne" ? left !== right :
    instruction.opcode === "blt" || instruction.opcode === "bltz" ? left < right :
    instruction.opcode === "bge" ? left >= right :
    instruction.opcode === "bltu" ? (left >>> 0) < (right >>> 0) :
    (left >>> 0) >= (right >>> 0);
  return { taken, target };
}
