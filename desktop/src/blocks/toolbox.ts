const GROUPS: Array<{ name: string; opcodes: string[] }> = [
  { name: "算术 R 型", opcodes: ["add", "sub"] },
  { name: "算术 I 型", opcodes: ["addi"] },
  { name: "逻辑 R 型", opcodes: ["and", "or", "xor"] },
  { name: "逻辑 I 型", opcodes: ["andi", "ori", "xori"] },
  { name: "移位 R 型", opcodes: ["sll", "srl", "sra"] },
  { name: "移位 I 型", opcodes: ["slli", "srli", "srai"] },
  { name: "访存", opcodes: ["lw", "sw"] },
  { name: "分支", opcodes: ["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"] },
  { name: "跳转", opcodes: ["jal", "jalr", "j"] }
];

export const toolbox = {
  kind: "flyoutToolbox",
  contents: [
    ...GROUPS.flatMap((group) => [
      { kind: "label", text: group.name, cssConfig: { label: "toolbox-section-label" } },
      ...group.opcodes.map((opcode) => ({
        kind: "block",
        type: `riscv_${opcode}`
      }))
    ]),
    { kind: "label", text: "操作数小积木", cssConfig: { label: "toolbox-section-label" } },
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
    },
    {
      kind: "block",
      type: "riscv_label_tag",
      fields: { LABEL: "loop" }
    }
  ]
};
