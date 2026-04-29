(function () {
  const REGISTERS = Array.from({ length: 32 }, (_, index) => `x${index}`);

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
    lw: {
      type: "I",
      color: "memory",
      fields: ["rd", "rs1", "imm"],
      label: "读取内存",
      help: "用基址寄存器加偏移量得到地址，从内存读取数据写入目标寄存器。"
    },
    sw: {
      type: "S",
      color: "memory",
      fields: ["rs2", "rs1", "imm"],
      label: "写入内存",
      help: "用基址寄存器加偏移量得到地址，把源寄存器的值写入内存。"
    },
    beq: {
      type: "B",
      color: "branch",
      fields: ["rs1", "rs2", "label"],
      label: "相等分支",
      help: "比较两个寄存器，相等时跳转到目标标签。"
    }
  };

  const EXAMPLES = [
    {
      id: "imm",
      title: "立即数赋值",
      description: "用 addi 把常量 5 写入 x1，适合演示 x0 和立即数。",
      instructions: [
        { opcode: "addi", rd: "x1", rs1: "x0", imm: 5 }
      ]
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
        { opcode: "beq", rs1: "x1", rs2: "x2", label: "4" },
        { opcode: "addi", rd: "x3", rs1: "x0", imm: 99 },
        { opcode: "add", rd: "x4", rs1: "x1", rs2: "x2" }
      ]
    }
  ];

  function createDefaultInstruction(opcode = "addi", position = {}) {
    const base = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), opcode };
    const layout = {
      x: position.x ?? 40,
      y: position.y ?? 100
    };
    switch (opcode) {
      case "add":
      case "sub":
        return { ...base, ...layout, rd: "x1", rs1: "x0", rs2: "x0" };
      case "lw":
        return { ...base, ...layout, rd: "x1", rs1: "x0", imm: 0 };
      case "sw":
        return { ...base, ...layout, rs2: "x1", rs1: "x0", imm: 0 };
      case "beq":
        return { ...base, ...layout, rs1: "x1", rs2: "x2", label: "loop" };
      case "addi":
      default:
        return { ...base, ...layout, rd: "x1", rs1: "x0", imm: 1 };
    }
  }

  function normalizeInstruction(raw, index) {
    const def = INSTRUCTION_DEFS[raw.opcode];
    if (!def) {
      return {
        ok: false,
        error: `第 ${index + 1} 条指令的 opcode 不受支持：${raw.opcode}。请使用 add、sub、addi、lw、sw 或 beq。`
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

      if (field === "imm") {
        const imm = Number(value);
        if (!Number.isInteger(imm)) {
          return {
            ok: false,
            error: `第 ${index + 1} 条 ${raw.opcode} 指令的立即数必须是整数。请把 ${value} 改成整数。`
          };
        }
        instruction[field] = imm;
      } else if (field === "label") {
        instruction[field] = String(value).trim();
      } else {
        if (!REGISTERS.includes(value)) {
          return {
            ok: false,
            error: `第 ${index + 1} 条 ${raw.opcode} 指令中的 ${field} 不是合法寄存器。请选择 x0 到 x31。`
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
        if (labelName) {
          labelMap[labelName] = index;
        }
      }
    });

    orderedRawInstructions.forEach((raw, index) => {
      const result = normalizeInstruction(raw, index);
      if (result.ok) {
        const instruction = result.instruction;
        if (instruction.opcode === "beq") {
          const labelValue = String(instruction.label).trim();
          const numericTarget = Number(labelValue);
          if (Object.prototype.hasOwnProperty.call(labelMap, labelValue)) {
            instruction.labelName = labelValue;
            instruction.targetIndex = labelMap[labelValue];
          } else if (Number.isInteger(numericTarget)) {
            instruction.targetIndex = numericTarget;
          } else {
            errors.push(`第 ${index + 1} 条 beq 引用了不存在的标签 ${labelValue}。请先把绿色标签贴到目标指令上。`);
          }
        }
        if (raw.labelTag) {
          instruction.labelTag = String(raw.labelTag).trim();
        }
        instructions.push(instruction);
      } else {
        errors.push(result.error);
      }
    });

    return { instructions, errors, labelMap, orderedRawInstructions };
  }

  function formatAssembly(instruction) {
    switch (instruction.opcode) {
      case "add":
      case "sub":
        return `${instruction.opcode} ${instruction.rd}, ${instruction.rs1}, ${instruction.rs2}`;
      case "addi":
        return `addi ${instruction.rd}, ${instruction.rs1}, ${instruction.imm}`;
      case "lw":
        return `lw ${instruction.rd}, ${instruction.imm}(${instruction.rs1})`;
      case "sw":
        return `sw ${instruction.rs2}, ${instruction.imm}(${instruction.rs1})`;
      case "beq":
        return `beq ${instruction.rs1}, ${instruction.rs2}, ${instruction.labelName || instruction.label}`;
      default:
        return instruction.opcode;
    }
  }

  function explainInstruction(instruction) {
    switch (instruction.opcode) {
      case "add":
        return `${instruction.rd} 将接收 ${instruction.rs1} 与 ${instruction.rs2} 相加后的结果。`;
      case "sub":
        return `${instruction.rd} 将接收 ${instruction.rs1} 减去 ${instruction.rs2} 的结果。`;
      case "addi":
        return `${instruction.rd} 将接收 ${instruction.rs1} 加上立即数 ${instruction.imm} 的结果。`;
      case "lw":
        return `先计算地址 ${instruction.rs1} + ${instruction.imm}，再把该地址的内存值读入 ${instruction.rd}。`;
      case "sw":
        return `先计算地址 ${instruction.rs1} + ${instruction.imm}，再把 ${instruction.rs2} 的值写入内存。`;
      case "beq":
        return `比较 ${instruction.rs1} 和 ${instruction.rs2}，相等时跳转到 ${instruction.labelName || "第 " + (Number(instruction.label) + 1) + " 条指令"}。`;
      default:
        return "未知指令。";
    }
  }

  function fieldExplanation(field) {
    const map = {
      rd: "rd 是目标寄存器，用来接收运算结果。",
      rs1: "rs1 是第一个源寄存器，通常提供运算输入或地址基址。",
      rs2: "rs2 是第二个源寄存器，通常提供运算输入或要写入内存的值。",
      imm: "imm 是立即数或地址偏移量，需要填写整数。",
      label: "label 是分支目标，第一版用目标指令序号表示。"
    };
    return map[field] || "请补充该字段。";
  }

  window.RiscVTeaching = {
    REGISTERS,
    INSTRUCTION_DEFS,
    EXAMPLES,
    createDefaultInstruction,
    parseProgram,
    formatAssembly,
    explainInstruction
  };
})();
