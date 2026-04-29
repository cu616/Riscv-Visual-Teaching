(function () {
  const { REGISTERS, formatAssembly, explainInstruction } = window.RiscVTeaching;

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
      next.registers[name] = value;
      changedRegisters.push(name);
    };

    switch (instruction.opcode) {
      case "add": {
        const left = readReg(instruction.rs1);
        const right = readReg(instruction.rs2);
        const value = left + right;
        writeReg(instruction.rd, value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：读取 ${instruction.rs1}=${left} 和 ${instruction.rs2}=${right}，ALU 相加得到 ${value}，写回 ${instruction.rd}。`;
        animationPlan = createArithmeticAnimation(instruction, `${left} + ${right} = ${value}`);
        break;
      }
      case "sub": {
        const left = readReg(instruction.rs1);
        const right = readReg(instruction.rs2);
        const value = left - right;
        writeReg(instruction.rd, value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：读取 ${instruction.rs1}=${left} 和 ${instruction.rs2}=${right}，ALU 相减得到 ${value}，写回 ${instruction.rd}。`;
        animationPlan = createArithmeticAnimation(instruction, `${left} - ${right} = ${value}`);
        break;
      }
      case "addi": {
        const left = readReg(instruction.rs1);
        const value = left + instruction.imm;
        writeReg(instruction.rd, value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：读取 ${instruction.rs1}=${left}，与立即数 ${instruction.imm} 相加得到 ${value}，写回 ${instruction.rd}。`;
        animationPlan = createArithmeticAnimation(instruction, `${left} + ${instruction.imm} = ${value}`, true);
        break;
      }
      case "lw": {
        const base = readReg(instruction.rs1);
        const address = base + instruction.imm;
        if (address < 0) {
          throw new Error(`访存地址 ${address} 无效。请让 ${instruction.rs1} + ${instruction.imm} 大于等于 0。`);
        }
        const value = Number(next.memory[address] || 0);
        writeReg(instruction.rd, value);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：先用 ${instruction.rs1}=${base} 加偏移 ${instruction.imm} 得到地址 ${address}，再读取 memory[${address}]=${value} 写回 ${instruction.rd}。`;
        animationPlan = ["registerFileNode", "rs1Node", "aluNode", "memoryNode", "writebackNode", "busRs1", "busAluMem", "busMemWb"];
        break;
      }
      case "sw": {
        const base = readReg(instruction.rs1);
        const address = base + instruction.imm;
        if (address < 0) {
          throw new Error(`访存地址 ${address} 无效。请让 ${instruction.rs1} + ${instruction.imm} 大于等于 0。`);
        }
        const value = readReg(instruction.rs2);
        next.memory[address] = value;
        changedMemoryAddresses.push(address);
        next.pc += 1;
        explanation = `${formatAssembly(instruction)}：先用 ${instruction.rs1}=${base} 加偏移 ${instruction.imm} 得到地址 ${address}，再把 ${instruction.rs2}=${value} 写入 memory[${address}]。`;
        animationPlan = ["registerFileNode", "rs1Node", "rs2Node", "aluNode", "memoryNode", "busRs1", "busRs2", "busAluMem"];
        break;
      }
      case "beq": {
        const left = readReg(instruction.rs1);
        const right = readReg(instruction.rs2);
        const target = instruction.targetIndex ?? Number(instruction.label);
        if (!Number.isInteger(target) || target < 0 || target >= program.length) {
          throw new Error(`beq 的目标 label 必须是 0 到 ${program.length - 1} 之间的指令序号。`);
        }
        const taken = left === right;
        next.pc = taken ? target : next.pc + 1;
        explanation = `${formatAssembly(instruction)}：比较 ${instruction.rs1}=${left} 和 ${instruction.rs2}=${right}，结果${taken ? "相等，PC 跳转到 " + (instruction.labelName || target) : "不相等，PC 顺序前进"}。`;
        animationPlan = ["registerFileNode", "rs1Node", "rs2Node", "aluNode", "branchNode", "busRs1", "busRs2", "busPc"];
        break;
      }
      default:
        throw new Error(`暂不支持指令 ${instruction.opcode}。`);
    }

    next.registers.x0 = 0;
    if (next.pc >= program.length) {
      next.halted = true;
    }

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

  function createArithmeticAnimation(instruction, formula, usesImmediate = false) {
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

  window.RiscVSimulator = {
    createInitialState,
    executeInstruction
  };
})();
