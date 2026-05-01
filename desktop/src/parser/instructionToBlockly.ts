import type { RawInstruction } from "../core/types";

interface BlocklyBlockState {
  type: string;
  id?: string;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { block: BlocklyBlockState }>;
  next?: { block: BlocklyBlockState };
}

export interface BlocklyWorkspaceState {
  blocks: {
    languageVersion: number;
    blocks: BlocklyBlockState[];
  };
}

export function instructionsToBlocklyState(instructions: RawInstruction[]): BlocklyWorkspaceState {
  const blocks: BlocklyBlockState[] = [];
  let currentTop: BlocklyBlockState | undefined;
  let currentTail: BlocklyBlockState | undefined;

  instructions.forEach((instruction, index) => {
    const instructionBlock = instructionToBlock(instruction, index);
    if (!currentTop) {
      currentTop = instructionBlock;
      currentTail = tailOf(instructionBlock);
    } else if (currentTail) {
      currentTail.next = { block: instructionBlock };
      currentTail = tailOf(instructionBlock);
    }
  });

  if (currentTop) blocks.push(currentTop);
  return {
    blocks: {
      languageVersion: 0,
      blocks
    }
  };
}

function instructionToBlock(instruction: RawInstruction, index: number): BlocklyBlockState {
  const fields: Record<string, string | number> = {};
  if (instruction.rd !== undefined) fields.RD = instruction.rd;
  if (instruction.rs1 !== undefined) fields.RS1 = instruction.rs1;
  if (instruction.rs2 !== undefined) fields.RS2 = instruction.rs2;
  if (instruction.imm !== undefined) fields.IMM = instruction.imm;
  if (instruction.shamt !== undefined) fields.SHAMT = instruction.shamt;
  if (instruction.label !== undefined) fields.LABEL = instruction.label;
  const block: BlocklyBlockState = {
    type: `riscv_${instruction.opcode}`,
    id: instruction.id || `${instruction.opcode}-${index}`,
    fields
  };
  const inputs = operandInputsFor(instruction);
  if (instruction.labelTag) {
    inputs.LABEL_TAG = {
      block: labelBlock(String(instruction.labelTag), `${instruction.id || instruction.opcode}-${index}-label`)
    };
  }
  if (Object.keys(inputs).length) block.inputs = inputs;
  return block;
}

function labelBlock(label: string, id: string): BlocklyBlockState {
  return {
    type: "riscv_label_tag",
    id,
    fields: { LABEL: label }
  };
}

function tailOf(block: BlocklyBlockState): BlocklyBlockState {
  let current = block;
  while (current.next?.block) current = current.next.block;
  return current;
}

function operandInputsFor(instruction: RawInstruction): Record<string, { block: BlocklyBlockState }> {
  const inputs: Record<string, { block: BlocklyBlockState }> = {};
  addOperand(inputs, "RD", registerBlock(instruction.rd));
  addOperand(inputs, "RS1", registerBlock(instruction.rs1));
  addOperand(inputs, "RS2", registerBlock(instruction.rs2));
  addOperand(inputs, "IMM", numberBlock("riscv_immediate", instruction.imm));
  addOperand(inputs, "SHAMT", numberBlock("riscv_shamt", instruction.shamt));
  addOperand(inputs, "LABEL", labelRefBlock(instruction.label));
  return inputs;
}

function addOperand(inputs: Record<string, { block: BlocklyBlockState }>, name: string, block?: BlocklyBlockState) {
  if (block) inputs[name] = { block };
}

function registerBlock(value?: string): BlocklyBlockState | undefined {
  if (value === undefined) return undefined;
  return { type: "riscv_register", fields: { REGISTER: value } };
}

function numberBlock(type: "riscv_immediate" | "riscv_shamt", value?: number): BlocklyBlockState | undefined {
  if (value === undefined) return undefined;
  return { type, fields: { VALUE: value } };
}

function labelRefBlock(value?: string): BlocklyBlockState | undefined {
  if (value === undefined) return undefined;
  return { type: "riscv_label_ref", fields: { LABEL: value } };
}
