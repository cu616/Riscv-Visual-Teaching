import { FIELD_KINDS, INSTRUCTION_DEFS, REGISTERS } from "./instructionDefs";
import type { Instruction, ParseResult, RawInstruction, RegisterName } from "./types";

export function parseProgram(rawInstructions: RawInstruction[]): ParseResult {
  const instructions: Instruction[] = [];
  const errors: string[] = [];
  const labelMap: Record<string, number> = {};
  const orderedRawInstructions = [...rawInstructions].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));

  orderedRawInstructions.forEach((raw, index) => {
    if (raw.labelTag?.trim()) labelMap[raw.labelTag.trim()] = index;
  });

  orderedRawInstructions.forEach((raw, index) => {
    const result = normalizeInstruction(raw, index);
    if (!result.ok) {
      errors.push(result.error);
      return;
    }

    const instruction = result.instruction;
    if (INSTRUCTION_DEFS[instruction.opcode]?.fields.includes("label")) {
      resolveTarget(instruction, labelMap, errors, index);
    }
    instructions.push(instruction);
  });

  return { instructions, errors, labelMap, orderedRawInstructions };
}

type NormalizeResult = { ok: true; instruction: Instruction } | { ok: false; error: string };

function normalizeInstruction(raw: RawInstruction, index: number): NormalizeResult {
  const def = INSTRUCTION_DEFS[raw.opcode];
  if (!def) return { ok: false, error: `第 ${index + 1} 条指令的 opcode 不受支持：${raw.opcode}。` };

  const instruction: Instruction = {
    id: raw.id || `${raw.opcode}-${index}`,
    opcode: raw.opcode,
    type: def.type,
    sourceBlockId: raw.id || `${raw.opcode}-${index}`,
    labelTag: raw.labelTag
  };

  for (const field of def.fields) {
    const value = (raw as unknown as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === "") {
      return { ok: false, error: `第 ${index + 1} 条 ${raw.opcode} 指令缺少字段 ${field}。` };
    }

    const kind = FIELD_KINDS[field];
    if (kind === "immediate") {
      const numericValue = Number(value);
      if (!Number.isInteger(numericValue)) return { ok: false, error: `第 ${index + 1} 条 ${raw.opcode} 指令的 ${field} 必须是整数。` };
      if (field === "shamt" && (numericValue < 0 || numericValue > 31)) {
        return { ok: false, error: `第 ${index + 1} 条 ${raw.opcode} 指令的 shamt 必须在 0 到 31 之间。` };
      }
      (instruction as unknown as Record<string, unknown>)[field] = numericValue;
    } else if (kind === "label") {
      (instruction as unknown as Record<string, unknown>)[field] = String(value).trim();
    } else {
      if (!REGISTERS.includes(value as RegisterName)) {
        return { ok: false, error: `第 ${index + 1} 条 ${raw.opcode} 指令中的 ${field} 不是合法寄存器。` };
      }
      (instruction as unknown as Record<string, unknown>)[field] = value;
    }
  }

  return { ok: true, instruction };
}

function resolveTarget(instruction: Instruction, labelMap: Record<string, number>, errors: string[], index: number) {
  const labelValue = String(instruction.label).trim();
  const numericTarget = Number(labelValue);
  if (Object.prototype.hasOwnProperty.call(labelMap, labelValue)) {
    instruction.labelName = labelValue;
    instruction.targetIndex = labelMap[labelValue];
  } else if (Number.isInteger(numericTarget)) {
    instruction.targetIndex = numericTarget;
  } else {
    errors.push(`第 ${index + 1} 条 ${instruction.opcode} 引用了不存在的标签 ${labelValue}。`);
  }
}

export function formatAssembly(instruction: Instruction): string {
  const op = instruction.opcode;
  if (["add", "sub", "and", "or", "xor", "sll", "srl", "sra"].includes(op)) return `${op} ${instruction.rd}, ${instruction.rs1}, ${instruction.rs2}`;
  if (["addi", "andi", "ori", "xori"].includes(op)) return `${op} ${instruction.rd}, ${instruction.rs1}, ${instruction.imm}`;
  if (["slli", "srli", "srai"].includes(op)) return `${op} ${instruction.rd}, ${instruction.rs1}, ${instruction.shamt}`;
  if (op === "lw") return `lw ${instruction.rd}, ${instruction.imm}(${instruction.rs1})`;
  if (op === "sw") return `sw ${instruction.rs2}, ${instruction.imm}(${instruction.rs1})`;
  if (["beq", "bne", "blt", "bge", "bltu", "bgeu"].includes(op)) return `${op} ${instruction.rs1}, ${instruction.rs2}, ${targetLabel(instruction)}`;
  if (op === "bltz") return `bltz ${instruction.rs1}, ${targetLabel(instruction)}`;
  if (op === "jal") return `jal ${instruction.rd}, ${targetLabel(instruction)}`;
  if (op === "jalr") return `jalr ${instruction.rd}, ${instruction.imm}(${instruction.rs1})`;
  if (op === "j") return `j ${targetLabel(instruction)}`;
  return op;
}

function targetLabel(instruction: Instruction) {
  return instruction.labelName || instruction.label;
}
