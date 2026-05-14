(function () {
  const REGISTERS = Array.from({ length: 32 }, (_, index) => `x${index}`);
  const REGISTER_ALIASES = {
    x0: "zero",
    x1: "ra",
    x2: "sp",
    x3: "gp",
    x4: "tp",
    x5: "t0",
    x6: "t1",
    x7: "t2",
    x8: "s0/fp",
    x9: "s1",
    x10: "a0",
    x11: "a1",
    x12: "a2",
    x13: "a3",
    x14: "a4",
    x15: "a5",
    x16: "a6",
    x17: "a7",
    x18: "s2",
    x19: "s3",
    x20: "s4",
    x21: "s5",
    x22: "s6",
    x23: "s7",
    x24: "s8",
    x25: "s9",
    x26: "s10",
    x27: "s11",
    x28: "t3",
    x29: "t4",
    x30: "t5",
    x31: "t6"
  };
  const TEMP_REGISTERS = ["x5", "x6", "x7", "x28", "x29", "x30", "x31"];
  const MACRO_TEMP_REGISTERS = {
    t0: "x5",
    t1: "x6",
    t2: "x7",
    t3: "x28",
    t4: "x29",
    t5: "x30",
    t6: "x31"
  };

  const FIELD_KINDS = {
    rd: "register",
    rs1: "register",
    rs2: "register",
    rs3: "register",
    imm: "immediate",
    shamt: "immediate",
    label: "label"
  };

  const INSTRUCTION_DEFS = {
    addi: {
      type: "I",
      color: "arithmetic",
      fields: ["rd", "rs1", "imm"],
      label: "立即数加法",
      help: "把一个寄存器的值和立即数相加，再写回目标寄存器。"
    },
    add: {
      type: "R",
      color: "arithmetic",
      fields: ["rd", "rs1", "rs2"],
      label: "寄存器加法",
      help: "把两个源寄存器送入 ALU 相加，结果写回目标寄存器。"
    },
    sub: {
      type: "R",
      color: "arithmetic",
      fields: ["rd", "rs1", "rs2"],
      label: "寄存器减法",
      help: "把两个源寄存器送入 ALU 相减，结果写回目标寄存器。"
    },
    and: {
      type: "R",
      color: "logic",
      fields: ["rd", "rs1", "rs2"],
      label: "按位与",
      help: "两个寄存器按位 AND，常用于保留某些位。"
    },
    or: {
      type: "R",
      color: "logic",
      fields: ["rd", "rs1", "rs2"],
      label: "按位或",
      help: "两个寄存器按位 OR，常用于设置某些位。"
    },
    xor: {
      type: "R",
      color: "logic",
      fields: ["rd", "rs1", "rs2"],
      label: "按位异或",
      help: "两个寄存器按位 XOR，常用于翻转或比较位模式。"
    },
    andi: {
      type: "I",
      color: "logic",
      fields: ["rd", "rs1", "imm"],
      label: "立即数按位与",
      help: "寄存器与立即数按位 AND，适合讲解掩码。"
    },
    ori: {
      type: "I",
      color: "logic",
      fields: ["rd", "rs1", "imm"],
      label: "立即数按位或",
      help: "寄存器与立即数按位 OR，适合讲解位设置。"
    },
    xori: {
      type: "I",
      color: "logic",
      fields: ["rd", "rs1", "imm"],
      label: "立即数按位异或",
      help: "寄存器与立即数按位 XOR，适合讲解位翻转。"
    },
    sll: {
      type: "R",
      color: "shift",
      fields: ["rd", "rs1", "rs2"],
      label: "逻辑左移",
      help: "把 rs1 的位模式向左移动，移位量来自 rs2 的低 5 位。"
    },
    srl: {
      type: "R",
      color: "shift",
      fields: ["rd", "rs1", "rs2"],
      label: "逻辑右移",
      help: "把 rs1 的位模式向右移动，高位补 0，移位量来自 rs2 的低 5 位。"
    },
    sra: {
      type: "R",
      color: "shift",
      fields: ["rd", "rs1", "rs2"],
      label: "算术右移",
      help: "把 rs1 按有符号数向右移动，高位补符号位，移位量来自 rs2 的低 5 位。"
    },
    slli: {
      type: "I",
      color: "shift",
      fields: ["rd", "rs1", "shamt"],
      label: "立即数逻辑左移",
      help: "把 rs1 的位模式向左移动，移位量由 shamt 给出。"
    },
    srli: {
      type: "I",
      color: "shift",
      fields: ["rd", "rs1", "shamt"],
      label: "立即数逻辑右移",
      help: "把 rs1 的位模式向右移动，高位补 0，移位量由 shamt 给出。"
    },
    srai: {
      type: "I",
      color: "shift",
      fields: ["rd", "rs1", "shamt"],
      label: "立即数算术右移",
      help: "把 rs1 按有符号数向右移动，高位补符号位，移位量由 shamt 给出。"
    },
    lw: {
      type: "I",
      color: "memory",
      fields: ["rd", "imm", "rs1"],
      label: "读取内存",
      help: "格式是 lw rd, imm(rs1)：用基址寄存器加偏移量得到地址，再读入 rd。"
    },
    sw: {
      type: "S",
      color: "memory",
      fields: ["rs2", "imm", "rs1"],
      label: "写入内存",
      help: "格式是 sw rs2, imm(rs1)：用基址寄存器加偏移量得到地址，再写入 rs2。"
    },
    beq: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "相等分支",
      help: "比较两个寄存器，相等时跳转到目标标签。"
    },
    bne: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "不等分支",
      help: "比较两个寄存器，不相等时跳转到目标标签。"
    },
    blt: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "小于分支",
      help: "按有符号数比较，rs1 小于 rs2 时跳转。"
    },
    bge: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "大于等于分支",
      help: "按有符号数比较，rs1 大于等于 rs2 时跳转。"
    },
    bltu: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "无符号小于分支",
      help: "按无符号数比较，rs1 小于 rs2 时跳转。"
    },
    bgeu: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "无符号大于等于分支",
      help: "按无符号数比较，rs1 大于等于 rs2 时跳转。"
    },
    bltz: {
      type: "PSEUDO",
      color: "branch",
      fields: ["rs1", "label"],
      label: "小于零分支",
      help: "教学伪指令，等价于 blt rs1, x0, label。"
    },
    jal: {
      type: "J",
      color: "jump",
      fields: ["rd", "label"],
      label: "跳转并链接",
      help: "J 型跳转：跳到标签，并把下一条指令位置写入 rd。rd 为 x0 时可作为无条件跳转。"
    },
    jalr: {
      type: "I",
      color: "jump",
      fields: ["rd", "imm", "rs1"],
      label: "寄存器间接跳转",
      help: "格式是 jalr rd, imm(rs1)：目标来自 rs1 加偏移，同时把下一条位置写入 rd。"
    },
    j: {
      type: "PSEUDO",
      color: "jump",
      fields: ["label"],
      label: "无条件跳转",
      help: "教学伪指令，等价于 jal x0, label。"
    }
  };

  const MACRO_DEFS = [
    {
      opcode: "mv",
      title: "寄存器移动",
      shortLabel: "mv",
      color: "macro",
      fields: ["rd", "rs1"],
      description: "最简单的包装指令：把 rs1 的值复制到 rd，等价于 addi rd, rs1, 0。",
      expand(raw) {
        return [{ opcode: "addi", rd: raw.rd, rs1: raw.rs1, imm: 0 }];
      },
      steps: ["addi rd, rs1, 0：利用加 0 完成寄存器复制。"]
    },
    {
      opcode: "li",
      title: "加载立即数",
      shortLabel: "li",
      color: "macro",
      fields: ["rd", "imm"],
      description: "把一个小立即数写入 rd，当前教学版等价于 addi rd, x0, imm。",
      expand(raw) {
        return [{ opcode: "addi", rd: raw.rd, rs1: "x0", imm: raw.imm }];
      },
      steps: ["addi rd, x0, imm：利用 x0 恒为 0 的特性写入常量。"]
    },
    {
      opcode: "neg",
      title: "取负",
      shortLabel: "neg",
      color: "macro",
      fields: ["rd", "rs1"],
      description: "把 rs1 取相反数写入 rd，等价于 sub rd, x0, rs1。",
      expand(raw) {
        return [{ opcode: "sub", rd: raw.rd, rs1: "x0", rs2: raw.rs1 }];
      },
      steps: ["sub rd, x0, rs1：用 0 减去输入值。"]
    },
    {
      opcode: "not",
      title: "按位取反",
      shortLabel: "not",
      color: "macro",
      fields: ["rd", "rs1"],
      description: "把 rs1 的每一位翻转后写入 rd，等价于 xori rd, rs1, -1。",
      expand(raw) {
        return [{ opcode: "xori", rd: raw.rd, rs1: raw.rs1, imm: -1 }];
      },
      steps: ["xori rd, rs1, -1：和全 1 掩码异或，实现逐位翻转。"]
    },
    {
      opcode: "nop",
      title: "空操作",
      shortLabel: "nop",
      color: "macro",
      fields: [],
      description: "不改变任何有效状态，常用来占位，等价于 addi x0, x0, 0。",
      expand() {
        return [{ opcode: "addi", rd: "x0", rs1: "x0", imm: 0 }];
      },
      steps: ["addi x0, x0, 0：写入 x0 会被忽略，因此不产生有效变化。"]
    },
    {
      opcode: "abs",
      title: "绝对值",
      shortLabel: "abs",
      color: "macro",
      fields: ["rd", "rs1"],
      description: "函数式复合指令：把 rs1 的绝对值写入 rd，内部用分支区分正负路径。",
      expand(raw, tag) {
        const end = `${tag}e`;
        const neg = `${tag}n`;
        return [
          { opcode: "bltz", rs1: raw.rs1, label: neg },
          { opcode: "add", rd: raw.rd, rs1: raw.rs1, rs2: "x0" },
          { opcode: "j", label: end },
          { opcode: "sub", rd: raw.rd, rs1: "x0", rs2: raw.rs1, labelTag: neg },
          { opcode: "addi", rd: "x0", rs1: "x0", imm: 0, labelTag: end }
        ];
      },
      steps: [
        "如果输入小于 0，跳到取负路径。",
        "非负路径：rd = rs1。",
        "非负路径执行后跳过取负路径。",
        "负数路径：rd = 0 - rs1。",
        "内部结束点，使用 addi x0, x0, 0 作为空操作。"
      ]
    },
    {
      opcode: "max",
      title: "较大值",
      shortLabel: "max",
      color: "macro",
      fields: ["rd", "rs1", "rs2"],
      description: "函数式复合指令：比较 rs1 和 rs2，把较大值写入 rd。",
      expand(raw, tag) {
        const useSecond = `${tag}s`;
        const end = `${tag}e`;
        return [
          { opcode: "blt", rs1: raw.rs1, rs2: raw.rs2, label: useSecond },
          { opcode: "add", rd: raw.rd, rs1: raw.rs1, rs2: "x0" },
          { opcode: "j", label: end },
          { opcode: "add", rd: raw.rd, rs1: raw.rs2, rs2: "x0", labelTag: useSecond },
          { opcode: "addi", rd: "x0", rs1: "x0", imm: 0, labelTag: end }
        ];
      },
      steps: [
        "如果 rs1 < rs2，跳到使用第二个输入的路径。",
        "否则 rd = rs1。",
        "写完 rs1 后跳过另一条路径。",
        "第二条路径：rd = rs2。",
        "内部结束点。"
      ]
    },
    {
      opcode: "iflt",
      title: "若小于则跳转",
      shortLabel: "iflt",
      color: "macro",
      fields: ["rs1", "rs2", "label"],
      description: "接近 if 语句的复合分支：若 rs1 < rs2，则跳转到标签。",
      expand(raw) {
        return [{ opcode: "blt", rs1: raw.rs1, rs2: raw.rs2, label: raw.label }];
      },
      steps: [
        "blt rs1, rs2, label：如果第一个寄存器小于第二个寄存器，就跳转。"
      ]
    },
    {
      opcode: "lwadd",
      title: "读内存后累加",
      shortLabel: "lwadd",
      color: "macro",
      fields: ["rd", "imm", "rs1", "rs2"],
      description: "函数式复合指令：先读取 memory[rs1 + imm]，再与 rs2 相加写回 rd。",
      expand(raw) {
        return [
          { opcode: "lw", rd: raw.rd, imm: raw.imm, rs1: raw.rs1 },
          { opcode: "add", rd: raw.rd, rs1: raw.rd, rs2: raw.rs2 }
        ];
      },
      steps: [
        "rd = memory[rs1 + imm]，从内存读入一个操作数。",
        "rd = rd + rs2，把读入结果与另一个寄存器相加。"
      ]
    }
  ];

  MACRO_DEFS.forEach((macro) => {
    INSTRUCTION_DEFS[macro.opcode] = {
      type: "MACRO",
      color: "macro",
      fields: macro.fields,
      label: macro.title,
      help: macro.description,
      macro: true
    };
  });

  const EXAMPLES = [
    {
      id: "imm",
      category: "算术",
      title: "立即数赋值",
      description: "用 addi 把常量 5 写入 x1，适合演示 x0 和立即数。",
      instructions: [{ opcode: "addi", rd: "x1", rs1: "x0", imm: 5 }]
    },
    {
      id: "add-two",
      category: "算术",
      title: "两数相加",
      description: "先准备两个值，再用 add 展示两个寄存器进入 ALU。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 5 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 7 },
        { opcode: "add", rd: "x3", rs1: "x1", rs2: "x2" }
      ]
    },
    {
      id: "logic",
      category: "逻辑",
      title: "按位逻辑与移位",
      description: "配合二进制显示观察 and、or、xor、sll 的位级效果。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 12 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 10 },
        { opcode: "and", rd: "x3", rs1: "x1", rs2: "x2" },
        { opcode: "or", rd: "x6", rs1: "x1", rs2: "x2" },
        { opcode: "xor", rd: "x4", rs1: "x1", rs2: "x2" },
        { opcode: "slli", rd: "x5", rs1: "x3", shamt: 1 }
      ]
    },
    {
      id: "mask-immediate",
      category: "逻辑",
      title: "掩码与位设置",
      description: "用 andi/ori/xori 展示保留低位、设置标志位和翻转位模式。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 13 },
        { opcode: "andi", rd: "x2", rs1: "x1", imm: 7 },
        { opcode: "ori", rd: "x3", rs1: "x2", imm: 16 },
        { opcode: "xori", rd: "x4", rs1: "x3", imm: 3 }
      ]
    },
    {
      id: "shift-family",
      category: "移位",
      title: "三类移位对比",
      description: "对比 sll、srl、sra 与立即数移位，适合讲低 5 位移位量和符号位。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: -16 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 2 },
        { opcode: "sll", rd: "x3", rs1: "x2", rs2: "x2" },
        { opcode: "srl", rd: "x4", rs1: "x1", rs2: "x2" },
        { opcode: "sra", rd: "x5", rs1: "x1", rs2: "x2" },
        { opcode: "srli", rd: "x6", rs1: "x3", shamt: 1 }
      ]
    },
    {
      id: "memory",
      category: "访存",
      title: "内存读写",
      description: "演示 sw 写内存、lw 读内存，以及地址由 rs1 + offset 计算。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 16 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 42 },
        { opcode: "sw", rs2: "x2", rs1: "x1", imm: 0 },
        { opcode: "lw", rd: "x3", rs1: "x1", imm: 0 }
      ]
    },
    {
      id: "branch",
      category: "分支",
      title: "条件分支",
      description: "比较 x1 和 x2，相等时跳过一条指令，观察 PC 变化。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 3 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 3 },
        { opcode: "beq", rs1: "x1", rs2: "x2", label: "done" },
        { opcode: "addi", rd: "x3", rs1: "x0", imm: 99 },
        { opcode: "add", rd: "x4", rs1: "x1", rs2: "x2", labelTag: "done" }
      ]
    },
    {
      id: "signed-unsigned-branch",
      category: "分支",
      title: "有符号与无符号分支",
      description: "用 blt 和 bgeu 对比 -1 在有符号/无符号比较中的不同含义。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: -1 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 1 },
        { opcode: "blt", rs1: "x1", rs2: "x2", label: "signedLess" },
        { opcode: "addi", rd: "x3", rs1: "x0", imm: 99 },
        { opcode: "bgeu", rs1: "x1", rs2: "x2", label: "unsignedGreater", labelTag: "signedLess" },
        { opcode: "addi", rd: "x4", rs1: "x0", imm: 88 },
        { opcode: "addi", rd: "x5", rs1: "x0", imm: 1, labelTag: "unsignedGreater" }
      ]
    },
    {
      id: "jump",
      category: "跳转",
      title: "无条件跳转",
      description: "用 jal x0, label 演示 J 型跳转如何直接改变 PC。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 1 },
        { opcode: "jal", rd: "x0", label: "target" },
        { opcode: "addi", rd: "x1", rs1: "x1", imm: 99 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 7, labelTag: "target" }
      ]
    },
    {
      id: "jal-link",
      category: "跳转",
      title: "JAL 保存返回位置",
      description: "用 jal x1, label 演示跳转同时把下一条指令位置写入 x1。",
      instructions: [
        { opcode: "jal", rd: "x1", label: "target" },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 99 },
        { opcode: "addi", rd: "x3", rs1: "x1", imm: 10, labelTag: "target" }
      ]
    },
    {
      id: "pseudo",
      category: "复合",
      title: "教学伪指令",
      description: "演示 j 与 bltz：它们便于教学，但文档中会说明它们不是 RV32I 基础独立指令。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: -3 },
        { opcode: "bltz", rs1: "x1", label: "negative" },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 99 },
        { opcode: "j", label: "done", labelTag: "negative" },
        { opcode: "addi", rd: "x3", rs1: "x0", imm: 7 },
        { opcode: "add", rd: "x4", rs1: "x1", rs2: "x3", labelTag: "done" }
      ]
    },
    {
      id: "arithmetic-sub-chain",
      category: "算术",
      title: "差值再累加",
      description: "用 sub 和 addi 展示减法结果如何继续参与后续运算。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 15 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 6 },
        { opcode: "sub", rd: "x3", rs1: "x1", rs2: "x2" },
        { opcode: "addi", rd: "x4", rs1: "x3", imm: 2 }
      ]
    },
    {
      id: "logic-flag-pack",
      category: "逻辑",
      title: "标志位打包",
      description: "用 andi 保留低位，再用 ori 设置高位标志。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 13 },
        { opcode: "andi", rd: "x2", rs1: "x1", imm: 3 },
        { opcode: "ori", rd: "x3", rs1: "x2", imm: 8 }
      ]
    },
    {
      id: "shift-scale-index",
      category: "移位",
      title: "下标乘 4",
      description: "用 slli 把数组下标转换成字节偏移。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 3 },
        { opcode: "slli", rd: "x2", rs1: "x1", shamt: 2 },
        { opcode: "addi", rd: "x3", rs1: "x2", imm: 16 }
      ]
    },
    {
      id: "memory-offset-read",
      category: "访存",
      title: "偏移地址读取",
      description: "用基址和偏移读出数组中的一个元素。",
      instructions: [
        { opcode: "addi", rd: "x10", rs1: "x0", imm: 16 },
        { opcode: "lw", rd: "x1", rs1: "x10", imm: 4 },
        { opcode: "addi", rd: "x2", rs1: "x1", imm: 1 }
      ]
    },
    {
      id: "macro-iflt-abs",
      category: "复合",
      title: "iflt 与 abs",
      description: "用 iflt 表达 if 判断，再用 abs 展示复合指令内部会被解释成基础指令。",
      instructions: [
        { opcode: "li", rd: "x1", imm: -5 },
        { opcode: "li", rd: "x2", imm: 0 },
        { opcode: "iflt", rs1: "x1", rs2: "x2", label: "neg" },
        { opcode: "mv", rd: "x3", rs1: "x1" },
        { opcode: "abs", rd: "x3", rs1: "x1", labelTag: "neg" }
      ]
    }
  ];

  function createDefaultInstruction(opcode = "addi", position = {}) {
    const base = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      opcode,
      x: position.x ?? 40,
      y: position.y ?? 100
    };
    const def = INSTRUCTION_DEFS[opcode] || INSTRUCTION_DEFS.addi;

    for (const field of def.fields) {
      base[field] = defaultValueForField(field, opcode);
    }
    return base;
  }

  function expandMacroInstruction(raw, rawIndex = 0) {
    const macro = macroDefinition(raw.opcode);
    if (!macro) return [raw];
    const tag = String(raw.macroShortTag || `m${Number(rawIndex || 0).toString(36)}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 3) || "m0";
    return macro.expand(raw, tag).map((instruction, index) => ({
      ...instruction,
      id: `${raw.id || raw.opcode}-${index}`,
      sourceBlockId: raw.id || `${raw.opcode}-${rawIndex}`,
      fromMacro: raw.opcode
    }));
  }

  function macroInstructionSummary(macroOrInstruction) {
    const macro = macroDefinition(macroOrInstruction.opcode) || macroOrInstruction;
    const raw = macroOrInstruction.opcode
      ? { ...createDefaultInstruction(macro.opcode), ...macroOrInstruction }
      : createDefaultInstruction(macro.opcode);
    return expandMacroInstruction(raw).map((instruction, index) => {
      const normalized = {
        ...createDefaultInstruction(instruction.opcode),
        ...instruction
      };
      return {
        index: index + 1,
        assembly: formatAssembly(normalized),
        text: macro.steps?.[index] || explainInstruction(normalized)
      };
    });
  }

  function macroDefinition(opcode) {
    return MACRO_DEFS.find((item) => item.opcode === opcode);
  }

  function sortRawInstructions(rawInstructions) {
    const groups = new Map();
    const units = [];
    rawInstructions.forEach((instruction, originalIndex) => {
      if (!instruction.macroGroupId) {
        units.push({ kind: "single", originalIndex, instruction });
        return;
      }
      if (!groups.has(instruction.macroGroupId)) {
        const group = {
          kind: "group",
          id: instruction.macroGroupId,
          originalIndex,
          instructions: []
        };
        groups.set(instruction.macroGroupId, group);
        units.push(group);
      }
      groups.get(instruction.macroGroupId).instructions.push({ ...instruction, originalIndex });
    });

    const unitPosition = (unit) => {
      const items = unit.kind === "group" ? unit.instructions : [unit.instruction];
      const anchor = items.reduce((best, item) => {
        const order = Number.isFinite(Number(item.macroGroupOrder)) ? Number(item.macroGroupOrder) : Number.POSITIVE_INFINITY;
        const bestOrder = Number.isFinite(Number(best.macroGroupOrder)) ? Number(best.macroGroupOrder) : Number.POSITIVE_INFINITY;
        if (order !== bestOrder) return order < bestOrder ? item : best;
        if ((item.y ?? 0) !== (best.y ?? 0)) return (item.y ?? 0) < (best.y ?? 0) ? item : best;
        return (item.x ?? 0) < (best.x ?? 0) ? item : best;
      }, items[0]);
      return {
        y: anchor?.y ?? 0,
        x: anchor?.x ?? 0,
        originalIndex: unit.originalIndex
      };
    };

    return units
      .sort((a, b) => {
        const pa = unitPosition(a);
        const pb = unitPosition(b);
        return pa.y - pb.y || pa.x - pb.x || pa.originalIndex - pb.originalIndex;
      })
      .flatMap((unit) => {
        if (unit.kind === "single") return [unit.instruction];
        return unit.instructions.sort((a, b) => {
          const ao = Number.isFinite(Number(a.macroGroupOrder)) ? Number(a.macroGroupOrder) : a.originalIndex;
          const bo = Number.isFinite(Number(b.macroGroupOrder)) ? Number(b.macroGroupOrder) : b.originalIndex;
          return ao - bo || a.originalIndex - b.originalIndex;
        });
      });
  }

  function defaultValueForField(field, opcode) {
    if (field === "rd") return opcode === "jal" || opcode === "jalr" ? "x1" : "x1";
    if (field === "rs1") return "x0";
    if (field === "rs2") return "x0";
    if (field === "rs3") return "x0";
    if (field === "imm") return opcode === "addi" ? 1 : 0;
    if (field === "shamt") return 1;
    if (field === "label") return "loop";
    return "";
  }

  function normalizeInstruction(raw, index) {
    const def = INSTRUCTION_DEFS[raw.opcode];
    if (!def) {
      return {
        ok: false,
        error: `第 ${index + 1} 条指令的 opcode 不受支持：${raw.opcode}。`
      };
    }

    const instruction = {
      id: raw.id || `${raw.opcode}-${index}`,
      opcode: raw.opcode,
      type: def.type,
      sourceBlockId: raw.id || `${raw.opcode}-${index}`
    };

    for (const field of def.fields) {
      const value = raw[field];
      if (value === undefined || value === null || value === "") {
        return {
          ok: false,
          error: `第 ${index + 1} 条 ${raw.opcode} 指令缺少字段 ${field}。${fieldExplanation(field)}`
        };
      }

      const kind = FIELD_KINDS[field];
      if (kind === "immediate") {
        const numericValue = Number(value);
        if (!Number.isInteger(numericValue)) {
          return {
            ok: false,
            error: `第 ${index + 1} 条 ${raw.opcode} 指令的 ${field} 必须是整数，请把 ${value} 改成整数。`
          };
        }
        if (field === "shamt" && (numericValue < 0 || numericValue > 31)) {
          return {
            ok: false,
            error: `第 ${index + 1} 条 ${raw.opcode} 指令的 shamt 必须在 0 到 31 之间。`
          };
        }
        instruction[field] = numericValue;
      } else if (kind === "label") {
        instruction[field] = String(value).trim();
      } else {
        if (!REGISTERS.includes(value)) {
          return {
            ok: false,
            error: `第 ${index + 1} 条 ${raw.opcode} 指令中的 ${field} 不是合法寄存器，请选择 x0 到 x31。`
          };
        }
        instruction[field] = value;
      }
    }

    return { ok: true, instruction };
  }

  function parseProgram(rawInstructions) {
    const instructions = [];
    const errors = [];
    const labelMap = {};
    const orderedRawInstructions = sortRawInstructions(rawInstructions);
    const expandedRawInstructions = [];

    orderedRawInstructions.forEach((raw, index) => {
      if (raw.labelTag) {
        const labelName = String(raw.labelTag).trim();
        if (labelName) labelMap[labelName] = expandedRawInstructions.length;
      }
      const expanded = macroDefinition(raw.opcode) ? expandMacroInstruction(raw, index) : [raw];
      expanded.forEach((instruction, offset) => {
        if (offset > 0 && instruction.labelTag) {
          const labelName = String(instruction.labelTag).trim();
          if (labelName) labelMap[labelName] = expandedRawInstructions.length + offset;
        }
      });
      expandedRawInstructions.push(...expanded);
    });

    expandedRawInstructions.forEach((raw, index) => {
      const result = normalizeInstruction(raw, index);
      if (!result.ok) {
        errors.push(result.error);
        return;
      }

      const instruction = result.instruction;
      if (raw.sourceBlockId) instruction.sourceBlockId = raw.sourceBlockId;
      if (raw.fromMacro) instruction.fromMacro = raw.fromMacro;
      if (hasLabelTarget(instruction)) {
        resolveTarget(instruction, labelMap, errors, index);
      }
      if (raw.labelTag) instruction.labelTag = String(raw.labelTag).trim();
      instructions.push(instruction);
    });

    return { instructions, errors, labelMap, orderedRawInstructions };
  }

  function hasLabelTarget(instruction) {
    return INSTRUCTION_DEFS[instruction.opcode]?.fields.includes("label");
  }

  function resolveTarget(instruction, labelMap, errors, index) {
    const labelValue = String(instruction.label).trim();
    const numericTarget = Number(labelValue);
    if (Object.prototype.hasOwnProperty.call(labelMap, labelValue)) {
      instruction.labelName = labelValue;
      instruction.targetIndex = labelMap[labelValue];
    } else if (Number.isInteger(numericTarget)) {
      instruction.targetIndex = numericTarget;
    } else {
      errors.push(`第 ${index + 1} 条 ${instruction.opcode} 引用了不存在的标签 ${labelValue}。请先把绿色标签贴到目标指令上。`);
    }
  }

  function formatAssembly(instruction) {
    const op = instruction.opcode;
    if (op === "mv") return `mv ${instruction.rd}, ${instruction.rs1}`;
    if (op === "li") return `li ${instruction.rd}, ${instruction.imm}`;
    if (op === "neg") return `neg ${instruction.rd}, ${instruction.rs1}`;
    if (op === "not") return `not ${instruction.rd}, ${instruction.rs1}`;
    if (op === "nop") return "nop";
    if (op === "abs") return `abs ${instruction.rd}, ${instruction.rs1}`;
    if (op === "max") return `max ${instruction.rd}, ${instruction.rs1}, ${instruction.rs2}`;
    if (op === "iflt") return `iflt ${instruction.rs1}, ${instruction.rs2}, ${targetLabel(instruction)}`;
    if (op === "lwadd") return `lwadd ${instruction.rd}, ${instruction.imm}(${instruction.rs1}), ${instruction.rs2}`;
    if (["add", "sub", "and", "or", "xor", "sll", "srl", "sra"].includes(op)) {
      return `${op} ${instruction.rd}, ${instruction.rs1}, ${instruction.rs2}`;
    }
    if (["addi", "andi", "ori", "xori"].includes(op)) {
      return `${op} ${instruction.rd}, ${instruction.rs1}, ${instruction.imm}`;
    }
    if (["slli", "srli", "srai"].includes(op)) {
      return `${op} ${instruction.rd}, ${instruction.rs1}, ${instruction.shamt}`;
    }
    if (op === "lw") return `lw ${instruction.rd}, ${instruction.imm}(${instruction.rs1})`;
    if (op === "sw") return `sw ${instruction.rs2}, ${instruction.imm}(${instruction.rs1})`;
    if (["beq", "bne", "blt", "bge", "bltu", "bgeu"].includes(op)) {
      return `${op} ${instruction.rs1}, ${instruction.rs2}, ${targetLabel(instruction)}`;
    }
    if (op === "bltz") return `bltz ${instruction.rs1}, ${targetLabel(instruction)}`;
    if (op === "jal") return `jal ${instruction.rd}, ${targetLabel(instruction)}`;
    if (op === "jalr") return `jalr ${instruction.rd}, ${instruction.imm}(${instruction.rs1})`;
    if (op === "j") return `j ${targetLabel(instruction)}`;
    return op;
  }

  function explainInstruction(instruction) {
    const target = targetLabel(instruction);
    switch (instruction.opcode) {
      case "add":
        return `${instruction.rd} 接收 ${instruction.rs1} 与 ${instruction.rs2} 相加后的结果。`;
      case "sub":
        return `${instruction.rd} 接收 ${instruction.rs1} 减去 ${instruction.rs2} 的结果。`;
      case "addi":
        return `${instruction.rd} 接收 ${instruction.rs1} 加上立即数 ${instruction.imm} 的结果。`;
      case "and":
      case "or":
      case "xor":
        return `${instruction.rd} 接收 ${instruction.rs1} 与 ${instruction.rs2} 按位 ${instruction.opcode.toUpperCase()} 的结果。`;
      case "andi":
      case "ori":
      case "xori":
        return `${instruction.rd} 接收 ${instruction.rs1} 与立即数 ${instruction.imm} 按位 ${instruction.opcode.slice(0, -1).toUpperCase()} 的结果。`;
      case "sll":
      case "srl":
      case "sra":
        return `${instruction.rd} 接收 ${instruction.rs1} 按 ${instruction.rs2} 给出的低 5 位移位后的结果。`;
      case "slli":
      case "srli":
      case "srai":
        return `${instruction.rd} 接收 ${instruction.rs1} 按 shamt=${instruction.shamt} 移位后的结果。`;
      case "lw":
        return `先计算地址 ${instruction.rs1} + ${instruction.imm}，再把该地址的内存值读入 ${instruction.rd}。`;
      case "sw":
        return `先计算地址 ${instruction.rs1} + ${instruction.imm}，再把 ${instruction.rs2} 的值写入内存。`;
      case "beq":
        return `比较 ${instruction.rs1} 和 ${instruction.rs2}，相等时跳转到 ${target}。`;
      case "bne":
        return `比较 ${instruction.rs1} 和 ${instruction.rs2}，不相等时跳转到 ${target}。`;
      case "blt":
        return `按有符号数比较 ${instruction.rs1} 和 ${instruction.rs2}，小于时跳转到 ${target}。`;
      case "bge":
        return `按有符号数比较 ${instruction.rs1} 和 ${instruction.rs2}，大于等于时跳转到 ${target}。`;
      case "bltu":
        return `按无符号数比较 ${instruction.rs1} 和 ${instruction.rs2}，小于时跳转到 ${target}。`;
      case "bgeu":
        return `按无符号数比较 ${instruction.rs1} 和 ${instruction.rs2}，大于等于时跳转到 ${target}。`;
      case "bltz":
        return `教学伪指令：判断 ${instruction.rs1} 是否小于 0，等价于 blt ${instruction.rs1}, x0, ${target}。`;
      case "jal":
        return `跳转到 ${target}，同时把下一条指令位置写入 ${instruction.rd}。`;
      case "jalr":
        return `跳转到 ${instruction.rs1} + ${instruction.imm} 指向的位置，同时把下一条指令位置写入 ${instruction.rd}。`;
      case "j":
        return `教学伪指令：无条件跳转到 ${target}，等价于 jal x0, ${target}。`;
      case "mv":
        return `包装指令：把 ${instruction.rs1} 的值复制到 ${instruction.rd}，等价于 addi ${instruction.rd}, ${instruction.rs1}, 0。`;
      case "li":
        return `包装指令：把立即数 ${instruction.imm} 写入 ${instruction.rd}，当前教学版等价于 addi ${instruction.rd}, x0, ${instruction.imm}。`;
      case "neg":
        return `包装指令：把 ${instruction.rs1} 取负后写入 ${instruction.rd}，等价于 sub ${instruction.rd}, x0, ${instruction.rs1}。`;
      case "not":
        return `包装指令：把 ${instruction.rs1} 按位取反后写入 ${instruction.rd}，等价于 xori ${instruction.rd}, ${instruction.rs1}, -1。`;
      case "nop":
        return "包装指令：空操作，等价于 addi x0, x0, 0。";
      case "abs":
        return `复合指令：把 ${instruction.rs1} 的绝对值写入 ${instruction.rd}，底层由 bltz、add、sub 和 j 合成。`;
      case "max":
        return `复合指令：比较 ${instruction.rs1} 与 ${instruction.rs2}，把较大者写入 ${instruction.rd}。`;
      case "iflt":
        return `复合分支：如果 ${instruction.rs1} 小于 ${instruction.rs2}，就跳转到 ${target}。`;
      case "lwadd":
        return `复合指令：先读取 memory[${instruction.rs1} + ${instruction.imm}]，再与 ${instruction.rs2} 相加写入 ${instruction.rd}。`;
      default:
        return "未知指令。";
    }
  }

  function targetLabel(instruction) {
    return instruction.labelName || instruction.label;
  }

  function fieldExplanation(field) {
    const map = {
      rd: "rd 是目标寄存器，用来接收运算结果。",
      rs1: "rs1 是第一个源寄存器，通常提供运算输入或地址基址。",
      rs2: "rs2 是第二个源寄存器，通常提供运算输入或要写入内存的值。",
      rs3: "rs3 是第三个源寄存器，常用于复合判断或多输入运算。",
      imm: "imm 是立即数或地址偏移量，需要填写整数。",
      shamt: "shamt 是移位量，在 RV32 中应填写 0 到 31 的整数。",
      label: "label 是跳转或分支目标，可填写目标序号，也可拖绿色标签命名。"
    };
    return map[field] || "请补充该字段。";
  }

  window.RiscVTeaching = {
    REGISTERS,
    REGISTER_ALIASES,
    TEMP_REGISTERS,
    MACRO_TEMP_REGISTERS,
    FIELD_KINDS,
    INSTRUCTION_DEFS,
    MACRO_DEFS,
    EXAMPLES,
    createDefaultInstruction,
    expandMacroInstruction,
    macroInstructionSummary,
    macroDefinition,
    sortRawInstructions,
    parseProgram,
    formatAssembly,
    explainInstruction
  };
})();
