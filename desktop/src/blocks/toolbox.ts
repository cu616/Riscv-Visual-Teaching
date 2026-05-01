import { INSTRUCTION_DEFS } from "../core/instructionDefs";

const GROUPS: Array<{ name: string; colour: string; opcodes: string[] }> = [
  { name: "算术", colour: "#206bc4", opcodes: ["addi", "add", "sub"] },
  { name: "逻辑", colour: "#635bff", opcodes: ["and", "or", "xor", "andi", "ori", "xori"] },
  { name: "移位", colour: "#7c3aed", opcodes: ["sll", "srl", "sra", "slli", "srli", "srai"] },
  { name: "访存", colour: "#0f8f6f", opcodes: ["lw", "sw"] },
  { name: "分支", colour: "#ad6b00", opcodes: ["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"] },
  { name: "跳转", colour: "#c2410c", opcodes: ["jal", "jalr", "j"] }
];

export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    ...GROUPS.map((group) => ({
      kind: "category",
      name: group.name,
      colour: group.colour,
      contents: group.opcodes.map((opcode) => ({
        kind: "block",
        type: `riscv_${opcode}`,
        inputs: defaultInputsFor(opcode)
      }))
    })),
    {
      kind: "category",
      name: "操作数",
      colour: "#2f80ed",
      contents: [
        {
          kind: "block",
          type: "riscv_register",
          fields: { REGISTER: "x1" }
        },
        {
          kind: "block",
          type: "riscv_immediate",
          fields: { VALUE: 1 }
        },
        {
          kind: "block",
          type: "riscv_shamt",
          fields: { VALUE: 1 }
        },
        {
          kind: "block",
          type: "riscv_label_ref",
          fields: { LABEL: "loop" }
        }
      ]
    },
    {
      kind: "category",
      name: "标签",
      colour: "#0f8f6f",
      contents: [
        {
          kind: "block",
          type: "riscv_label_tag",
          fields: { LABEL: "loop" }
        }
      ]
    }
  ]
};

function defaultFieldsFor(opcode: string) {
  const def = INSTRUCTION_DEFS[opcode];
  const fields: Record<string, string | number> = {};
  for (const field of def.fields) {
    if (field === "rd") fields.RD = opcode === "jal" || opcode === "jalr" ? "x1" : "x1";
    if (field === "rs1") fields.RS1 = "x0";
    if (field === "rs2") fields.RS2 = "x0";
    if (field === "imm") fields.IMM = opcode === "addi" ? 1 : 0;
    if (field === "shamt") fields.SHAMT = 1;
    if (field === "label") fields.LABEL = "loop";
  }
  return fields;
}

function defaultInputsFor(opcode: string) {
  const def = INSTRUCTION_DEFS[opcode];
  const inputs: Record<string, { block: unknown }> = {};
  for (const field of def.fields) {
    inputs[field.toUpperCase()] = { block: operandBlockFor(field, defaultFieldsFor(opcode)) };
  }
  return inputs;
}

function operandBlockFor(field: string, fields: Record<string, string | number>) {
  if (field === "rd" || field === "rs1" || field === "rs2") {
    return {
      type: "riscv_register",
      fields: { REGISTER: fields[field.toUpperCase()] || "x0" }
    };
  }
  if (field === "shamt") {
    return {
      type: "riscv_shamt",
      fields: { VALUE: fields.SHAMT || 1 }
    };
  }
  if (field === "label") {
    return {
      type: "riscv_label_ref",
      fields: { LABEL: fields.LABEL || "loop" }
    };
  }
  return {
    type: "riscv_immediate",
    fields: { VALUE: fields.IMM ?? 0 }
  };
}
