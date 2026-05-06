(function () {
  const { REGISTERS, formatAssembly, explainInstruction } = window.RiscVTeaching;

  const BRANCH_OPS = ["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"];
  const LOGIC_OPS = ["and", "or", "xor", "andi", "ori", "xori"];
  const SHIFT_OPS = ["sll", "srl", "sra", "slli", "srli", "srai"];
  const WRITES_RD = ["add", "sub", "addi", ...LOGIC_OPS, ...SHIFT_OPS, "lw", "jal", "jalr"];

  function createInitialState() {
    const registers = Object.fromEntries(REGISTERS.map((name) => [name, 0]));
    return {
      registers,
      memory: {
        0: 8,
        4: 13,
        8: 21,
        12: 34,
        16: 0,
        20: 0,
        24: 0,
        28: 0
      },
      pc: 0,
      halted: false,
      logs: []
    };
  }

  function cloneState(state) {
    return {
      registers: { ...state.registers },
      memory: { ...state.memory },
      pc: state.pc,
      halted: state.halted,
      logs: [...state.logs]
    };
  }

  function executeInstruction(state, program) {
    if (state.halted || state.pc < 0 || state.pc >= program.length) {
      return {
        state: { ...cloneState(state), halted: true },
        result: {
          explanation: "程序已经执行结束。PC 指向程序外部，模拟器停止。",
          changedRegisters: [],
          changedMemoryAddresses: [],
          animationPlan: []
        }
      };
    }

    const instruction = program[state.pc];
    const next = cloneState(state);
    const oldPc = state.pc;
    const changedRegisters = [];
    const changedMemoryAddresses = [];
    let explanation = explainInstruction(instruction);
    let animationPlan = [];

    const readReg = (name) => Number(next.registers[name] || 0);
    const writeReg = (name, value) => {
      if (name === "x0") {
        next.registers.x0 = 0;
        explanation += " 注意：x0 是恒为 0 的寄存器，写入会被忽略。";
        return;
      }
      next.registers[name] = toSigned32(value);
      changedRegisters.push(name);
    };

    switch (instruction.opcode) {
      case "add":
      case "sub":
      case "addi": {
        const result = executeArithmetic(instruction, readReg);
        writeReg(instruction.rd, result.value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：${result.text}，写回 ${instruction.rd}。${x0Note(instruction)}`;
        animationPlan = createAluAnimation(instruction, result.formula, instruction.opcode === "addi");
        break;
      }
      case "and":
      case "or":
      case "xor":
      case "andi":
      case "ori":
      case "xori": {
        const result = executeLogic(instruction, readReg);
        writeReg(instruction.rd, result.value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：${result.text}，按位结果写回 ${instruction.rd}。${x0Note(instruction)}`;
        animationPlan = createAluAnimation(instruction, result.formula, instruction.imm !== undefined);
        break;
      }
      case "sll":
      case "srl":
      case "sra":
      case "slli":
      case "srli":
      case "srai": {
        const result = executeShift(instruction, readReg);
        writeReg(instruction.rd, result.value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：${result.text}，移位结果写回 ${instruction.rd}。${x0Note(instruction)}`;
        animationPlan = createAluAnimation(instruction, result.formula, instruction.shamt !== undefined);
        break;
      }
      case "lw": {
        const base = readReg(instruction.rs1);
        const address = base + instruction.imm;
        validateAddress(address);
        const value = Number(next.memory[address] || 0);
        writeReg(instruction.rd, value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：先用 ${instruction.rs1}=${base} 加偏移 ${instruction.imm} 得到地址 ${address}，再读取 memory[${address}]=${value} 写回 ${instruction.rd}。${x0Note(instruction)}`;
        animationPlan = ["registerFileNode", "rs1Node", "aluNode", "memoryNode", "writebackNode", "busRs1", "busAluMem", "busMemWb"];
        break;
      }
      case "sw": {
        const base = readReg(instruction.rs1);
        const address = base + instruction.imm;
        validateAddress(address);
        const value = readReg(instruction.rs2);
        next.memory[address] = value;
        changedMemoryAddresses.push(address);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：先用 ${instruction.rs1}=${base} 加偏移 ${instruction.imm} 得到地址 ${address}，再把 ${instruction.rs2}=${value} 写入 memory[${address}]。`;
        animationPlan = ["registerFileNode", "rs1Node", "rs2Node", "aluNode", "memoryNode", "busRs1", "busRs2", "busAluMem"];
        break;
      }
      case "beq":
      case "bne":
      case "blt":
      case "bge":
      case "bltu":
      case "bgeu":
      case "bltz": {
        const branch = evaluateBranch(instruction, readReg, program.length);
        next.pc = branch.taken ? branch.target : next.pc + 1;
        explanation = `${formatAssembly(instruction)}：${branch.text}，${branch.taken ? `PC 跳转到 ${instruction.labelName || branch.target}` : "PC 顺序前进"}。`;
        animationPlan = ["registerFileNode", "rs1Node", "rs2Node", "aluNode", "branchNode", "busRs1", "busRs2", "busPc"];
        break;
      }
      case "jal":
      case "j": {
        const target = validateTarget(instruction, program.length);
        if (instruction.opcode === "jal") writeReg(instruction.rd, oldPc + 1);
        next.pc = target;
        explanation = `${formatAssembly(instruction)}：无条件跳转到 ${instruction.labelName || target}${instruction.opcode === "jal" ? `，并把返回位置 ${oldPc + 1} 写入 ${instruction.rd}` : ""}。${x0Note(instruction)}`;
        animationPlan = ["pcNode", "instructionNode", "branchNode", "writebackNode", "busFetch", "busPc", "busAluWb"];
        break;
      }
      case "jalr": {
        const returnPc = oldPc + 1;
        const target = readReg(instruction.rs1) + instruction.imm;
        validateJumpIndex(target, program.length, "jalr");
        writeReg(instruction.rd, returnPc);
        next.pc = target;
        explanation = `${formatAssembly(instruction)}：用 ${instruction.rs1} + ${instruction.imm} 得到目标 ${target}，并把返回位置 ${returnPc} 写入 ${instruction.rd}。${x0Note(instruction)}`;
        animationPlan = ["registerFileNode", "rs1Node", "aluNode", "branchNode", "writebackNode", "busRs1", "busPc", "busAluWb"];
        break;
      }
      default:
        throw new Error(`暂不支持指令 ${instruction.opcode}。`);
    }

    next.registers.x0 = 0;
    if (next.pc >= program.length) next.halted = true;

    const log = {
      pc: oldPc,
      assembly: formatAssembly(instruction),
      explanation,
      changedRegisters,
      changedMemoryAddresses
    };
    next.logs.push(log);

    return {
      state: next,
      result: {
        instruction,
        explanation,
        changedRegisters,
        changedMemoryAddresses,
        animationPlan
      }
    };
  }

  function executeArithmetic(instruction, readReg) {
    const left = readReg(instruction.rs1);
    const right = instruction.opcode === "addi" ? instruction.imm : readReg(instruction.rs2);
    const value = instruction.opcode === "sub" ? left - right : left + right;
    const symbol = instruction.opcode === "sub" ? "-" : "+";
    return {
      value,
      formula: `${left} ${symbol} ${right} = ${value}`,
      text: `读取 ${instruction.rs1}=${left}${instruction.rs2 ? ` 和 ${instruction.rs2}=${right}` : `，与立即数 ${right}`}，ALU 得到 ${value}`
    };
  }

  function executeLogic(instruction, readReg) {
    const left = readReg(instruction.rs1);
    const right = instruction.imm !== undefined ? instruction.imm : readReg(instruction.rs2);
    const op = instruction.opcode.replace(/i$/, "");
    const value = op === "and" ? left & right : op === "or" ? left | right : left ^ right;
    const symbol = op === "and" ? "&" : op === "or" ? "|" : "^";
    return {
      value,
      formula: `${left} ${symbol} ${right} = ${value}`,
      text: `读取 ${instruction.rs1}=${left} 和 ${instruction.imm !== undefined ? "立即数" : instruction.rs2}=${right}，ALU 按位 ${op.toUpperCase()} 得到 ${value}`
    };
  }

  function executeShift(instruction, readReg) {
    const left = readReg(instruction.rs1);
    const shamt = instruction.shamt !== undefined ? instruction.shamt : readReg(instruction.rs2) & 31;
    const op = instruction.opcode.replace(/i$/, "");
    const value = op === "sll" ? left << shamt : op === "srl" ? left >>> shamt : left >> shamt;
    const symbol = op === "sll" ? "<<" : op === "srl" ? ">>>" : ">>";
    return {
      value,
      formula: `${left} ${symbol} ${shamt} = ${toSigned32(value)}`,
      text: `读取 ${instruction.rs1}=${left}，移位量 ${shamt}，ALU 执行 ${op.toUpperCase()} 得到 ${toSigned32(value)}`
    };
  }

  function evaluateBranch(instruction, readReg, programLength) {
    const left = readReg(instruction.rs1);
    const right = instruction.opcode === "bltz" ? 0 : readReg(instruction.rs2);
    const target = validateTarget(instruction, programLength);
    let taken = false;
    switch (instruction.opcode) {
      case "beq":
        taken = left === right;
        break;
      case "bne":
        taken = left !== right;
        break;
      case "blt":
      case "bltz":
        taken = left < right;
        break;
      case "bge":
        taken = left >= right;
        break;
      case "bltu":
        taken = (left >>> 0) < (right >>> 0);
        break;
      case "bgeu":
        taken = (left >>> 0) >= (right >>> 0);
        break;
      default:
        taken = false;
    }
    return {
      taken,
      target,
      text: `比较 ${instruction.rs1}=${left}${instruction.opcode === "bltz" ? " 与 0" : ` 和 ${instruction.rs2}=${right}`}，条件${taken ? "成立" : "不成立"}`
    };
  }

  function validateTarget(instruction, programLength) {
    const target = instruction.targetIndex ?? Number(instruction.label);
    validateJumpIndex(target, programLength, instruction.opcode);
    return target;
  }

  function validateJumpIndex(target, programLength, opcode) {
    if (!Number.isInteger(target) || target < 0 || target >= programLength) {
      throw new Error(`${opcode} 的目标必须是 0 到 ${programLength - 1} 之间的指令序号，或已经贴在目标指令上的标签。`);
    }
  }

  function validateAddress(address) {
    if (!Number.isInteger(address) || address < 0) {
      throw new Error(`访存地址 ${address} 无效。请让基址寄存器 + 偏移量大于等于 0。`);
    }
  }

  function createAluAnimation(instruction, formula, usesImmediate = false) {
    return [
      "registerFileNode",
      "rs1Node",
      usesImmediate ? "rs2Node" : "rs2Node",
      "aluNode",
      "writebackNode",
      "busRs1",
      "busRs2",
      "busAluWb",
      formula
    ];
  }

  function x0Note(instruction) {
    return WRITES_RD.includes(instruction.opcode) && instruction.rd === "x0" ? "注意：x0 写入会被忽略。" : "";
  }

  function toSigned32(value) {
    return value | 0;
  }

  window.RiscVSimulator = {
    createInitialState,
    executeInstruction,
    BRANCH_OPS,
    LOGIC_OPS,
    SHIFT_OPS,
    WRITES_RD
  };
})();
