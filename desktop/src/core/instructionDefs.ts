import type { InstructionDef, RegisterName, RawInstruction } from "./types";

export const REGISTERS = Array.from({ length: 32 }, (_, index) => `x${index}` as RegisterName);

export const FIELD_KINDS: Record<string, "register" | "immediate" | "label"> = {
  rd: "register",
  rs1: "register",
  rs2: "register",
  imm: "immediate",
  shamt: "immediate",
  label: "label"
};

export const INSTRUCTION_DEFS: Record<string, InstructionDef> = {
  add: { opcode: "add", type: "R", color: "arithmetic", fields: ["rd", "rs1", "rs2"], label: "寄存器加法", help: "rd = rs1 + rs2" },
  sub: { opcode: "sub", type: "R", color: "arithmetic", fields: ["rd", "rs1", "rs2"], label: "寄存器减法", help: "rd = rs1 - rs2" },
  addi: { opcode: "addi", type: "I", color: "arithmetic", fields: ["rd", "rs1", "imm"], label: "立即数加法", help: "rd = rs1 + imm" },
  and: { opcode: "and", type: "R", color: "logic", fields: ["rd", "rs1", "rs2"], label: "按位与", help: "rd = rs1 & rs2" },
  or: { opcode: "or", type: "R", color: "logic", fields: ["rd", "rs1", "rs2"], label: "按位或", help: "rd = rs1 | rs2" },
  xor: { opcode: "xor", type: "R", color: "logic", fields: ["rd", "rs1", "rs2"], label: "按位异或", help: "rd = rs1 ^ rs2" },
  andi: { opcode: "andi", type: "I", color: "logic", fields: ["rd", "rs1", "imm"], label: "立即数按位与", help: "rd = rs1 & imm" },
  ori: { opcode: "ori", type: "I", color: "logic", fields: ["rd", "rs1", "imm"], label: "立即数按位或", help: "rd = rs1 | imm" },
  xori: { opcode: "xori", type: "I", color: "logic", fields: ["rd", "rs1", "imm"], label: "立即数按位异或", help: "rd = rs1 ^ imm" },
  sll: { opcode: "sll", type: "R", color: "shift", fields: ["rd", "rs1", "rs2"], label: "逻辑左移", help: "rd = rs1 << (rs2 & 31)" },
  srl: { opcode: "srl", type: "R", color: "shift", fields: ["rd", "rs1", "rs2"], label: "逻辑右移", help: "rd = rs1 >>> (rs2 & 31)" },
  sra: { opcode: "sra", type: "R", color: "shift", fields: ["rd", "rs1", "rs2"], label: "算术右移", help: "rd = rs1 >> (rs2 & 31)" },
  slli: { opcode: "slli", type: "I", color: "shift", fields: ["rd", "rs1", "shamt"], label: "立即数逻辑左移", help: "rd = rs1 << shamt" },
  srli: { opcode: "srli", type: "I", color: "shift", fields: ["rd", "rs1", "shamt"], label: "立即数逻辑右移", help: "rd = rs1 >>> shamt" },
  srai: { opcode: "srai", type: "I", color: "shift", fields: ["rd", "rs1", "shamt"], label: "立即数算术右移", help: "rd = rs1 >> shamt" },
  lw: { opcode: "lw", type: "I", color: "memory", fields: ["rd", "imm", "rs1"], label: "读取内存", help: "lw rd, imm(rs1)" },
  sw: { opcode: "sw", type: "S", color: "memory", fields: ["rs2", "imm", "rs1"], label: "写入内存", help: "sw rs2, imm(rs1)" },
  beq: { opcode: "beq", type: "B", color: "branch", fields: ["rs1", "rs2", "label"], label: "相等分支", help: "beq rs1, rs2, label" },
  bne: { opcode: "bne", type: "B", color: "branch", fields: ["rs1", "rs2", "label"], label: "不等分支", help: "bne rs1, rs2, label" },
  blt: { opcode: "blt", type: "B", color: "branch", fields: ["rs1", "rs2", "label"], label: "小于分支", help: "blt rs1, rs2, label" },
  bge: { opcode: "bge", type: "B", color: "branch", fields: ["rs1", "rs2", "label"], label: "大于等于分支", help: "bge rs1, rs2, label" },
  bltu: { opcode: "bltu", type: "B", color: "branch", fields: ["rs1", "rs2", "label"], label: "无符号小于分支", help: "bltu rs1, rs2, label" },
  bgeu: { opcode: "bgeu", type: "B", color: "branch", fields: ["rs1", "rs2", "label"], label: "无符号大于等于分支", help: "bgeu rs1, rs2, label" },
  bltz: { opcode: "bltz", type: "PSEUDO", color: "branch", fields: ["rs1", "label"], label: "小于零分支", help: "伪指令：blt rs1, x0, label" },
  jal: { opcode: "jal", type: "J", color: "jump", fields: ["rd", "label"], label: "跳转并链接", help: "jal rd, label" },
  jalr: { opcode: "jalr", type: "I", color: "jump", fields: ["rd", "imm", "rs1"], label: "寄存器间接跳转", help: "jalr rd, imm(rs1)" },
  j: { opcode: "j", type: "PSEUDO", color: "jump", fields: ["label"], label: "无条件跳转", help: "伪指令：jal x0, label" }
};

export function createDefaultInstruction(opcode = "addi", position: Pick<RawInstruction, "x" | "y"> = {}): RawInstruction {
  const def = INSTRUCTION_DEFS[opcode] || INSTRUCTION_DEFS.addi;
  const base: RawInstruction = {
    id: globalThis.crypto?.randomUUID?.() || `${opcode}-${Date.now()}-${Math.random()}`,
    opcode,
    x: position.x ?? 40,
    y: position.y ?? 100
  };

  for (const field of def.fields) {
    (base as unknown as Record<string, unknown>)[field] = defaultValueForField(field, opcode);
  }

  return base;
}

function defaultValueForField(field: string, opcode: string) {
  if (field === "rd") return opcode === "jal" || opcode === "jalr" ? "x1" : "x1";
  if (field === "rs1") return "x0";
  if (field === "rs2") return "x0";
  if (field === "imm") return opcode === "addi" ? 1 : 0;
  if (field === "shamt") return 1;
  if (field === "label") return "loop";
  return "";
}
