(function () {
  function buildAnimationFrames(result) {
    const instruction = result.instruction;
    if (!instruction) return [{ ids: [], text: result.explanation }];

    if (instruction.opcode === "lw") {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出当前指令，并根据 PC 定位执行位置。" },
        { ids: ["registerFileNode", "rs1Node", "busRs1"], text: `读取基址寄存器 ${instruction.rs1}。` },
        { ids: ["aluNode", "busRs1"], text: `ALU 计算访存地址：${instruction.rs1} + ${instruction.imm}。` },
        { ids: ["memoryNode", "busAluMem"], text: "访问内存，读取该地址中的数据。" },
        { ids: ["writebackNode", "busMemWb"], text: `把内存数据写回目标寄存器 ${instruction.rd}。` }
      ];
    }

    if (instruction.opcode === "sw") {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出 store 指令，准备计算写入地址。" },
        { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: `读取基址 ${instruction.rs1} 和待写入数据 ${instruction.rs2}。` },
        { ids: ["aluNode", "busRs1"], text: `ALU 计算内存地址：${instruction.rs1} + ${instruction.imm}。` },
        { ids: ["memoryNode", "busAluMem"], text: "把源寄存器的数据写入计算出的内存地址。" }
      ];
    }

    if (["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"].includes(instruction.opcode)) {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出分支指令，准备比较寄存器并决定 PC 是否跳转。" },
        { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: instruction.opcode === "bltz" ? `读取 ${instruction.rs1}，并与 x0/0 比较。` : `读取 ${instruction.rs1} 和 ${instruction.rs2}。` },
        { ids: ["aluNode", "branchNode", "busPc"], text: "比较条件进入分支判断单元，条件成立时 PC 改为目标标签。" }
      ];
    }

    if (["jal", "jalr", "j"].includes(instruction.opcode)) {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出跳转指令，当前 PC 不再只做顺序加一。" },
        { ids: ["aluNode", "branchNode", "busPc"], text: instruction.opcode === "jalr" ? "用寄存器基址加偏移计算跳转目标。" : "根据标签定位跳转目标，并把 PC 指向目标指令。" },
        { ids: ["writebackNode", "busAluWb"], text: instruction.opcode === "j" || instruction.rd === "x0" ? "rd 为 x0 时返回地址被忽略，形成无条件跳转效果。" : `把返回位置写入 ${instruction.rd}，便于之后返回。` }
      ];
    }

    if (["and", "or", "xor", "andi", "ori", "xori"].includes(instruction.opcode)) {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出逻辑运算指令，准备观察位级变化。" },
        { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: instruction.imm !== undefined ? `读取 ${instruction.rs1}，并取立即数 ${instruction.imm} 作为掩码。` : `读取 ${instruction.rs1} 和 ${instruction.rs2} 两个位模式。` },
        { ids: ["aluNode", "busRs1", "busRs2"], text: "ALU 不是做十进制算术，而是逐位执行 AND / OR / XOR。" },
        { ids: ["writebackNode", "busAluWb"], text: `把位运算结果写回目标寄存器 ${instruction.rd}。` }
      ];
    }

    if (["sll", "srl", "sra", "slli", "srli", "srai"].includes(instruction.opcode)) {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出移位指令，适合切到二进制显示观察位移动。" },
        { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: instruction.shamt !== undefined ? `读取 ${instruction.rs1}，移位量 shamt=${instruction.shamt}。` : `读取 ${instruction.rs1}，并使用 ${instruction.rs2} 的低 5 位作为移位量。` },
        { ids: ["aluNode", "busRs1", "busRs2"], text: "ALU 执行左移、逻辑右移或算术右移，重点观察高位如何补齐。" },
        { ids: ["writebackNode", "busAluWb"], text: `把移位结果写回目标寄存器 ${instruction.rd}。` }
      ];
    }

    return [
      { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出当前算术指令。" },
      { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: instruction.opcode === "addi" ? `读取 ${instruction.rs1}，并取立即数 ${instruction.imm}。` : `读取 ${instruction.rs1} 和 ${instruction.rs2}。` },
      { ids: ["aluNode", "busRs1", "busRs2"], text: "数据进入 ALU，执行算术运算。" },
      { ids: ["writebackNode", "busAluWb"], text: `把 ALU 结果写回目标寄存器 ${instruction.rd}。` }
    ];
  }

  function aluLabel(instruction) {
    if (instruction.opcode === "lw" || instruction.opcode === "sw") return "地址 = rs1 + offset";
    if (["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"].includes(instruction.opcode)) return "条件比较";
    if (["jal", "jalr", "j"].includes(instruction.opcode)) return "PC 目标";
    if (["and", "or", "xor", "andi", "ori", "xori"].includes(instruction.opcode)) return "按位逻辑";
    if (["sll", "srl", "sra", "slli", "srli", "srai"].includes(instruction.opcode)) return "位移运算";
    return "算术运算";
  }

  function memoryLabel(instruction) {
    if (instruction.opcode === "lw") return "读取内存";
    if (instruction.opcode === "sw") return "写入内存";
    return "本步不访存";
  }

  function branchLabel(instruction) {
    if (["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"].includes(instruction.opcode)) return "比较并更新 PC";
    if (["jal", "jalr", "j"].includes(instruction.opcode)) return "跳转目标";
    return "PC + 1";
  }

  function operandTwoLabel(instruction) {
    if (instruction.rs2) return instruction.rs2;
    if (instruction.shamt !== undefined) return `shamt ${instruction.shamt}`;
    if (instruction.imm !== undefined) return `imm ${instruction.imm}`;
    if (instruction.label) return instruction.labelName || instruction.label;
    return "rs2 / imm";
  }

  window.RiscVDatapath = {
    buildAnimationFrames,
    aluLabel,
    memoryLabel,
    branchLabel,
    operandTwoLabel
  };
})();
