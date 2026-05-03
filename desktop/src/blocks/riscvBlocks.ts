import * as Blockly from "blockly";
import { FIELD_KINDS, INSTRUCTION_DEFS, REGISTERS } from "../core/instructionDefs";

const COLOR_MAP: Record<string, string> = {
  arithmetic: "#206bc4",
  logic: "#635bff",
  shift: "#7c3aed",
  memory: "#0f8f6f",
  branch: "#ad6b00",
  jump: "#c2410c"
};

export function registerRiscVBlocks() {
  for (const def of Object.values(INSTRUCTION_DEFS)) {
    Blockly.Blocks[`riscv_${def.opcode}`] = {
      init() {
        this.appendDummyInput("HEADER").appendField(def.opcode.toUpperCase());
        this.appendEndRowInput("HEADER_BREAK");
        this.appendValueInput("LABEL_TAG")
          .setCheck("LabelTag")
          .appendField(new Blockly.FieldLabel("TAG", "operand-hint"));
        for (const field of def.fields) appendOperandInput(this, field);
        this.setInputsInline(true);
        this.setPreviousStatement(true, "Instruction");
        this.setNextStatement(true, "Instruction");
        this.setColour(COLOR_MAP[def.color]);
        this.setTooltip(`${def.opcode.toUpperCase()}: ${def.help}. Drag operands from the toolbox into the lower sockets.`);
        this.setHelpUrl("");
      }
    };
  }

  Blockly.Blocks.riscv_register = {
    init() {
      this.appendDummyInput().appendField(new Blockly.FieldDropdown(REGISTERS.map((name) => [name, name])), "REGISTER");
      this.setOutput(true, "RegisterOperand");
      this.setColour("#2f80ed");
      this.setTooltip("Register operand. x0 is always zero.");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_immediate = {
    init() {
      this.appendDummyInput().appendField(new Blockly.FieldNumber(0), "VALUE");
      this.setOutput(true, "ImmediateOperand");
      this.setColour("#d99000");
      this.setTooltip("Immediate operand. Type a number directly.");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_shamt = {
    init() {
      this.appendDummyInput().appendField(new Blockly.FieldNumber(1, 0, 31, 1), "VALUE");
      this.setOutput(true, "ShamtOperand");
      this.setColour("#7c3aed");
      this.setTooltip("Shift amount operand, 0 to 31 in RV32.");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_label_ref = {
    init() {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput("loop"), "LABEL");
      this.setOutput(true, "LabelOperand");
      this.setColour("#0f8f6f");
      this.setTooltip("Target label operand.");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_label_tag = {
    init() {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput("loop"), "LABEL");
      this.setOutput(true, "LabelTag");
      this.setColour("#0f8f6f");
      this.setTooltip("Label tag. Connect it to the TAG socket of an instruction.");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_label_hat = Blockly.Blocks.riscv_label_tag;
}

function appendOperandInput(block: Blockly.Block, field: string) {
  const label = field.toUpperCase();
  const input = block.appendValueInput(label);
  input.appendField(new Blockly.FieldLabel(label, "operand-hint"));
  input.setCheck(checkForField(field));
}

function checkForField(field: string) {
  if (FIELD_KINDS[field] === "register") return "RegisterOperand";
  if (field === "shamt") return "ShamtOperand";
  if (FIELD_KINDS[field] === "label") return "LabelOperand";
  return "ImmediateOperand";
}
