import * as Blockly from "blockly";
import type { RawInstruction } from "../core/types";

export function blocklyWorkspaceToInstructions(workspace: Blockly.WorkspaceSvg): RawInstruction[] {
  const topBlocks = workspace.getTopBlocks(true);
  const instructions: RawInstruction[] = [];

  for (const topBlock of topBlocks) {
    let current: Blockly.Block | null = topBlock;
    let pendingLabel: string | undefined;

    while (current) {
      if (current.type === "riscv_label_hat" || current.type === "riscv_label_tag") {
        pendingLabel = String(current.getFieldValue("LABEL") || "").trim();
      } else if (current.type.startsWith("riscv_")) {
        const raw = blockToInstruction(current);
        if (pendingLabel) {
          raw.labelTag = pendingLabel;
          pendingLabel = undefined;
        }
        instructions.push(raw);
      }
      current = current.getNextBlock();
    }
  }

  return instructions;
}

function blockToInstruction(block: Blockly.Block): RawInstruction {
  const opcode = block.type.replace(/^riscv_/, "");
  const raw: RawInstruction = {
    id: block.id,
    opcode
  };

  const labelTarget = block.getInputTargetBlock("LABEL_TAG");
  if (labelTarget?.type === "riscv_label_tag" || labelTarget?.type === "riscv_label_hat") {
    const label = String(labelTarget.getFieldValue("LABEL") || "").trim();
    if (label) raw.labelTag = label;
  }

  assignField(raw, "rd", block.getFieldValue("RD"));
  assignField(raw, "rs1", block.getFieldValue("RS1"));
  assignField(raw, "rs2", block.getFieldValue("RS2"));
  assignNumber(raw, "imm", block.getFieldValue("IMM"));
  assignNumber(raw, "shamt", block.getFieldValue("SHAMT"));
  assignField(raw, "label", block.getFieldValue("LABEL"));
  assignOperand(raw, "rd", block.getInputTargetBlock("RD"));
  assignOperand(raw, "rs1", block.getInputTargetBlock("RS1"));
  assignOperand(raw, "rs2", block.getInputTargetBlock("RS2"));
  assignOperand(raw, "imm", block.getInputTargetBlock("IMM"));
  assignOperand(raw, "shamt", block.getInputTargetBlock("SHAMT"));
  assignOperand(raw, "label", block.getInputTargetBlock("LABEL"));
  return raw;
}

function assignField(raw: RawInstruction, field: keyof RawInstruction, value: unknown) {
  if (value !== undefined && value !== null && value !== "") {
    (raw as unknown as Record<string, unknown>)[field] = String(value);
  }
}

function assignNumber(raw: RawInstruction, field: keyof RawInstruction, value: unknown) {
  if (value !== undefined && value !== null && value !== "") {
    (raw as unknown as Record<string, unknown>)[field] = Number(value);
  }
}

function assignOperand(raw: RawInstruction, field: keyof RawInstruction, block: Blockly.Block | null) {
  if (!block) return;
  if (block.type === "riscv_register") {
    assignField(raw, field, block.getFieldValue("REGISTER"));
    return;
  }
  if (block.type === "riscv_immediate" || block.type === "riscv_shamt") {
    assignNumber(raw, field, block.getFieldValue("VALUE"));
    return;
  }
  if (block.type === "riscv_label_ref") {
    assignField(raw, field, block.getFieldValue("LABEL"));
  }
}
