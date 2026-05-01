import type { TeachingCase } from "./types";

export const TEACHING_CASES: TeachingCase[] = [
  {
    version: "0.4.0-alpha",
    id: "imm",
    title: "立即数赋值",
    description: "用 addi 把常量写入寄存器，演示 x0 恒零规则。",
    instructions: [{ opcode: "addi", rd: "x1", rs1: "x0", imm: 5 }]
  },
  {
    version: "0.4.0-alpha",
    id: "logic-mask",
    title: "掩码与位设置",
    description: "用 andi/ori/xori 展示立即数位运算。",
    instructions: [
      { opcode: "addi", rd: "x1", rs1: "x0", imm: 13 },
      { opcode: "andi", rd: "x2", rs1: "x1", imm: 7 },
      { opcode: "ori", rd: "x3", rs1: "x2", imm: 16 },
      { opcode: "xori", rd: "x4", rs1: "x3", imm: 3 }
    ]
  },
  {
    version: "0.4.0-alpha",
    id: "memory",
    title: "内存读写",
    description: "演示 sw/lw 的 imm(rs1) 地址计算。",
    instructions: [
      { opcode: "addi", rd: "x1", rs1: "x0", imm: 16 },
      { opcode: "addi", rd: "x2", rs1: "x0", imm: 42 },
      { opcode: "sw", rs2: "x2", rs1: "x1", imm: 0 },
      { opcode: "lw", rd: "x3", rs1: "x1", imm: 0 }
    ]
  },
  {
    version: "0.4.0-alpha",
    id: "jump",
    title: "JAL 跳转",
    description: "演示 jal rd, label 保存返回位置。",
    instructions: [
      { opcode: "jal", rd: "x1", label: "target" },
      { opcode: "addi", rd: "x2", rs1: "x0", imm: 99 },
      { opcode: "addi", rd: "x3", rs1: "x1", imm: 10, labelTag: "target" }
    ]
  }
];
