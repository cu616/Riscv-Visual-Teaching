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
        this.appendValueInput("LABEL_TAG")
          .setCheck("LabelTag")
          .appendField("");
        this.appendDummyInput().appendField(def.opcode.toUpperCase());
        for (const field of def.fields) {
          appendOperandInput(this, field);
        }
        this.setInputsInline(false);
        this.setPreviousStatement(true, "Instruction");
        this.setNextStatement(true, "Instruction");
        this.setColour(COLOR_MAP[def.color]);
        this.setTooltip(`${def.label}：${def.help}。下方连接寄存器、立即数或标签小积木；左侧可连接绿色标签帽。`);
        this.setHelpUrl("");
      }
    };
  }

  Blockly.Blocks.riscv_register = {
    init() {
      this.appendDummyInput()
        .appendField("寄存器")
        .appendField(new Blockly.FieldDropdown(REGISTERS.map((name) => [name, name])), "REGISTER");
      this.setOutput(true, "RegisterOperand");
      this.setColour("#2f80ed");
      this.setTooltip("浅蓝色寄存器小积木：表示 x0 到 x31。x0 恒为 0，写入会被忽略。");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_immediate = {
    init() {
      this.appendDummyInput()
        .appendField("立即数")
        .appendField(new Blockly.FieldNumber(0), "VALUE");
      this.setOutput(true, "ImmediateOperand");
      this.setColour("#d99000");
      this.setTooltip("黄色立即数小积木：可直接键盘输入，用于 addi、lw/sw 偏移等字段。");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_shamt = {
    init() {
      this.appendDummyInput()
        .appendField("移位量")
        .appendField(new Blockly.FieldNumber(1, 0, 31, 1), "VALUE");
      this.setOutput(true, "ShamtOperand");
      this.setColour("#7c3aed");
      this.setTooltip("紫色移位量小积木：RISC-V RV32 移位立即数范围为 0 到 31。");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_label_ref = {
    init() {
      this.appendDummyInput()
        .appendField("目标")
        .appendField(new Blockly.FieldTextInput("loop"), "LABEL");
      this.setOutput(true, "LabelOperand");
      this.setColour("#0f8f6f");
      this.setTooltip("绿色标签引用小积木：填写要跳转或分支到的标签名。");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_label_tag = {
    init() {
      this.appendDummyInput()
        .appendField("标签")
        .appendField(new Blockly.FieldTextInput("loop"), "LABEL");
      this.setOutput(true, "LabelTag");
      this.setColour("#0f8f6f");
      this.setTooltip("独立标签小积木：拖到指令左侧，作为分支或跳转目标。");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.riscv_label_hat = Blockly.Blocks.riscv_label_tag;
}

function appendOperandInput(block: Blockly.Block, field: string) {
  const label = field.toUpperCase();
  const input = block.appendValueInput(label);
  input.appendField(label);
  input.setCheck(checkForField(field));
}

function checkForField(field: string) {
  if (FIELD_KINDS[field] === "register") return "RegisterOperand";
  if (field === "shamt") return "ShamtOperand";
  if (FIELD_KINDS[field] === "label") return "LabelOperand";
  return "ImmediateOperand";
}
