(function () {
  const REGISTERS = Array.from({ length: 32 }, (_, index) => `x${index}`);

  const FIELD_KINDS = {
    rd: "register",
    rs1: "register",
    rs2: "register",
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

  const EXAMPLES = [
    {
      id: "imm",
      title: "立即数赋值",
      description: "用 addi 把常量 5 写入 x1，适合演示 x0 和立即数。",
      instructions: [{ opcode: "addi", rd: "x1", rs1: "x0", imm: 5 }]
    },
    {
      id: "add-two",
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
      title: "按位逻辑与移位",
      description: "配合二进制显示观察 and、or、xor、sll 的位级效果。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 12 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 10 },
        { opcode: "and", rd: "x3", rs1: "x1", rs2: "x2" },
        { opcode: "xor", rd: "x4", rs1: "x1", rs2: "x2" },
        { opcode: "slli", rd: "x5", rs1: "x3", shamt: 1 }
      ]
    },
    {
      id: "memory",
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
      id: "jump",
      title: "无条件跳转",
      description: "用 jal x0, label 演示 J 型跳转如何直接改变 PC。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 1 },
        { opcode: "jal", rd: "x0", label: "target" },
        { opcode: "addi", rd: "x1", rs1: "x1", imm: 99 },
        { opcode: "addi", rd: "x2", rs1: "x0", imm: 7, labelTag: "target" }
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

  function defaultValueForField(field, opcode) {
    if (field === "rd") return opcode === "jal" || opcode === "jalr" ? "x1" : "x1";
    if (field === "rs1") return "x0";
    if (field === "rs2") return "x0";
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
    const orderedRawInstructions = [...rawInstructions].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));

    orderedRawInstructions.forEach((raw, index) => {
      if (raw.labelTag) {
        const labelName = String(raw.labelTag).trim();
        if (labelName) labelMap[labelName] = index;
      }
    });

    orderedRawInstructions.forEach((raw, index) => {
      const result = normalizeInstruction(raw, index);
      if (!result.ok) {
        errors.push(result.error);
        return;
      }

      const instruction = result.instruction;
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
      imm: "imm 是立即数或地址偏移量，需要填写整数。",
      shamt: "shamt 是移位量，在 RV32 中应填写 0 到 31 的整数。",
      label: "label 是跳转或分支目标，可填写目标序号，也可拖绿色标签命名。"
    };
    return map[field] || "请补充该字段。";
  }

  window.RiscVTeaching = {
    REGISTERS,
    FIELD_KINDS,
    INSTRUCTION_DEFS,
    EXAMPLES,
    createDefaultInstruction,
    parseProgram,
    formatAssembly,
    explainInstruction
  };
})();
