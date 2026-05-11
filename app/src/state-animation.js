(function () {
  const ARITHMETIC_OPS = ["add", "sub", "addi"];
  const LOGIC_OPS = ["and", "or", "xor", "andi", "ori", "xori"];
  const SHIFT_OPS = ["sll", "srl", "sra", "slli", "srli", "srai"];
  const BRANCH_OPS = ["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"];
  let activeAnimation = null;

  function playStateAnimation(result, context = {}) {
    clearStateAnimation();
    const instruction = result.instruction;
    if (!instruction) return Promise.resolve();

    const duration = context.duration || 1200;
    const previousState = context.previousState;
    const currentState = context.currentState;
    const steps = buildSteps(instruction, previousState, currentState, result);
    const stepDuration = duration / Math.max(steps.length, 1);
    const controller = {
      cancelled: false,
      paused: false,
      frameId: 0,
      pausedSince: 0
    };
    activeAnimation = controller;

    return new Promise((resolve) => {
      let elapsed = 0;
      let lastTime = performance.now();
      let appliedIndex = -1;

      const finish = () => {
        if (activeAnimation === controller) activeAnimation = null;
        clearTransientClasses();
        scheduleExpressionDockHide();
        context.onProgress?.(1);
        context.onPhase?.(result.explanation || "");
        resolve();
      };

      const tick = (time) => {
        if (controller.cancelled) {
          if (activeAnimation === controller) activeAnimation = null;
          resolve();
          return;
        }
        if (!controller.paused) {
          elapsed += Math.max(0, time - lastTime);
          const nextIndex = Math.min(steps.length - 1, Math.floor(elapsed / stepDuration));
          if (nextIndex !== appliedIndex && steps[nextIndex]) {
            appliedIndex = nextIndex;
            clearTransientClasses();
            applyStep(steps[nextIndex]);
            context.onPhase?.(steps[nextIndex].label || "");
          }
          context.onProgress?.(Math.min(elapsed / duration, 1));
        }
        lastTime = time;
        if (elapsed >= duration) {
          finish();
          return;
        }
        controller.frameId = window.requestAnimationFrame(tick);
      };

      controller.frameId = window.requestAnimationFrame(tick);
    });
  }

  function clearStateAnimation() {
    if (activeAnimation) {
      activeAnimation.cancelled = true;
      window.cancelAnimationFrame(activeAnimation.frameId);
      activeAnimation = null;
    }
    (window.__riscvStateAnimationTimers || []).forEach((timer) => {
      window.clearTimeout(timer);
      window.clearInterval(timer);
    });
    window.__riscvStateAnimationTimers = [];
    window.clearTimeout(window.__riscvExpressionHideTimer);
    clearTransientClasses();
    document.querySelectorAll(".state-fly-token, .state-operation-badge, .state-expression-badge, .state-change-card-row").forEach((element) => element.remove());
    hideExpressionDock();
  }

  function pauseStateAnimation() {
    if (!activeAnimation || activeAnimation.paused) return false;
    activeAnimation.paused = true;
    document.body.classList.add("state-animation-paused");
    return true;
  }

  function resumeStateAnimation() {
    if (!activeAnimation || !activeAnimation.paused) return false;
    activeAnimation.paused = false;
    document.body.classList.remove("state-animation-paused");
    return true;
  }

  function toggleStateAnimationPause() {
    if (!activeAnimation) return false;
    return activeAnimation.paused ? resumeStateAnimation() : pauseStateAnimation();
  }

  function isStateAnimationPaused() {
    return Boolean(activeAnimation?.paused);
  }

  function buildSteps(instruction, previousState, currentState, result) {
    const opcode = instruction.opcode;
    if (opcode === "lw") return mergeFinalPcChange(buildLoadSteps(instruction, previousState, currentState, result));
    if (opcode === "sw") return mergeFinalPcChange(buildStoreSteps(instruction, previousState, currentState, result));
    if (BRANCH_OPS.includes(opcode)) return buildBranchSteps(instruction, previousState, currentState);
    if (["jal", "jalr", "j"].includes(opcode)) return mergeFinalPcChange(buildJumpSteps(instruction, previousState, currentState, result));
    if (ARITHMETIC_OPS.includes(opcode) || LOGIC_OPS.includes(opcode) || SHIFT_OPS.includes(opcode)) {
      return mergeFinalPcChange(buildAluSteps(instruction, previousState, currentState, result));
    }
    return [{ kind: "pc", pc: currentState?.pc, label: "PC" }];
  }

  function mergeFinalPcChange(steps) {
    const last = steps[steps.length - 1];
    const previous = steps[steps.length - 2];
    if (last?.kind === "pc" && ["write", "memory-write"].includes(previous?.kind)) {
      previous.pcChange = last;
      return steps.slice(0, -1);
    }
    return steps;
  }

  function buildAluSteps(instruction, previousState, currentState, result) {
    const sourceRegs = [instruction.rs1, usesImmediateOperand(instruction) ? null : instruction.rs2].filter(Boolean);
    const writeReg = result.changedRegisters?.[0] || instruction.rd;
    const formula = aluFormula(instruction, previousState, currentState);
    return [
      { kind: "read", registers: sourceRegs, tokenLabels: sourceRegs.map((name) => registerToken(name, previousState)), label: sourceRegs.join(" ") || "read" },
      {
        kind: "compute",
        fromRegisters: sourceRegs,
        immediate: immediateValue(instruction),
        expression: aluExpression(instruction, previousState, currentState),
        badge: formula || formulaFromPlan(result) || opLabel(instruction),
        label: opLabel(instruction)
      },
      {
        kind: "write",
        register: writeReg,
        oldValue: previousState?.registers?.[writeReg],
        newValue: currentState?.registers?.[writeReg],
        label: writeReg || "write"
      },
      { kind: "pc", oldValue: previousState?.pc, newValue: currentState?.pc, label: "PC" }
    ];
  }

  function buildLoadSteps(instruction, previousState, currentState, result) {
    const base = previousState?.registers?.[instruction.rs1] || 0;
    const address = base + Number(instruction.imm || 0);
    return [
      { kind: "read", registers: [instruction.rs1], tokenLabels: [registerToken(instruction.rs1, previousState)], label: instruction.rs1 },
      {
        kind: "compute",
        fromRegisters: [instruction.rs1],
        immediate: instruction.imm,
        expression: {
          mode: "address",
          left: registerToken(instruction.rs1, previousState),
          op: "+",
          right: `imm=${formatMaybe(instruction.imm)}`,
          result: `addr=${address}`
        },
        badge: `ADDR ${base} + ${instruction.imm} = ${address}`,
        label: "addr"
      },
      { kind: "memory-read", address, tokenLabel: `M[${address}]=${formatMaybe(previousState?.memory?.[address])}`, label: `M[${address}]` },
      {
        kind: "write",
        register: instruction.rd,
        oldValue: previousState?.registers?.[instruction.rd],
        newValue: currentState?.registers?.[instruction.rd],
        fromMemory: address,
        label: instruction.rd
      },
      { kind: "pc", oldValue: previousState?.pc, newValue: currentState?.pc, label: "PC" }
    ];
  }

  function buildStoreSteps(instruction, previousState, currentState, result) {
    const base = previousState?.registers?.[instruction.rs1] || 0;
    const address = result.changedMemoryAddresses?.[0] ?? (base + Number(instruction.imm || 0));
    return [
      { kind: "read", registers: [instruction.rs1, instruction.rs2], tokenLabels: [registerToken(instruction.rs1, previousState), registerToken(instruction.rs2, previousState)], label: `${instruction.rs1} ${instruction.rs2}` },
      {
        kind: "compute",
        fromRegisters: [instruction.rs1],
        immediate: instruction.imm,
        expression: {
          mode: "address",
          left: registerToken(instruction.rs1, previousState),
          op: "+",
          right: `imm=${formatMaybe(instruction.imm)}`,
          result: `addr=${address}`
        },
        badge: `ADDR ${base} + ${instruction.imm} = ${address}`,
        label: "addr"
      },
      {
        kind: "memory-write",
        address,
        fromRegister: instruction.rs2,
        oldValue: previousState?.memory?.[address],
        newValue: currentState?.memory?.[address],
        label: `M[${address}]`
      },
      { kind: "pc", oldValue: previousState?.pc, newValue: currentState?.pc, label: "PC" }
    ];
  }

  function buildBranchSteps(instruction, previousState, currentState) {
    const regs = instruction.opcode === "bltz" ? [instruction.rs1] : [instruction.rs1, instruction.rs2];
    return [
      { kind: "read", registers: regs, tokenLabels: regs.map((name) => registerToken(name, previousState)), label: regs.join(" ") },
      {
        kind: "compute",
        fromRegisters: regs,
        expression: branchExpression(instruction, previousState, currentState),
        badge: branchFormula(instruction, previousState, currentState),
        label: "cmp"
      },
      { kind: "pc", oldValue: previousState?.pc, newValue: currentState?.pc, label: currentState?.pc === previousState?.pc + 1 ? "PC+1" : "JUMP" }
    ];
  }

  function buildJumpSteps(instruction, previousState, currentState, result) {
    const steps = [];
    if (instruction.rs1) steps.push({ kind: "read", registers: [instruction.rs1], tokenLabels: [registerToken(instruction.rs1, previousState)], label: instruction.rs1 });
    if (result.changedRegisters?.length) {
      const rd = result.changedRegisters[0];
      steps.push({
        kind: "write",
        register: rd,
        oldValue: previousState?.registers?.[rd],
        newValue: currentState?.registers?.[rd],
        label: rd
      });
    }
    steps.push({ kind: "pc", oldValue: previousState?.pc, newValue: currentState?.pc, label: "PC" });
    return steps;
  }

  function applyStep(step) {
    if (step.kind === "read") {
      step.registers?.forEach((name) => mark(registerCell(name), "state-read"));
      flyFromMany(step.registers?.map(registerCell).filter(Boolean), step.tokenLabels || step.badge || step.label);
    }
    if (step.kind === "compute") {
      step.fromRegisters?.forEach((name) => mark(registerCell(name), "state-read"));
      if (step.expression) {
        flyFromMany(step.fromRegisters?.map(registerCell).filter(Boolean), [step.expression.left, step.expression.right].filter(Boolean));
        showExpressionBadge(step.expression);
      } else {
        showOperationBadge(step.badge || "ALU");
      }
    }
    if (step.kind === "write") {
      if (step.fromMemory !== undefined) mark(memoryCell(step.fromMemory), "state-read");
      mark(registerCell(step.register), "state-write");
      if (step.pcChange) mark(document.getElementById("pcValue"), "state-pc");
      showStateChangeCards([
        stateChangeCard(`寄存器 ${step.register || "rd"}`, step.oldValue, step.newValue),
        step.pcChange ? stateChangeCard("PC", step.pcChange.oldValue, step.pcChange.newValue) : null
      ]);
    }
    if (step.kind === "memory-read") {
      mark(memoryCell(step.address), "state-read");
      flyFromMany([memoryCell(step.address)].filter(Boolean), [step.tokenLabel || `M[${step.address}]`]);
    }
    if (step.kind === "memory-write") {
      mark(registerCell(step.fromRegister), "state-read");
      mark(memoryCell(step.address), "state-write");
      if (step.pcChange) mark(document.getElementById("pcValue"), "state-pc");
      showStateChangeCards([
        stateChangeCard(`存储器[${step.address}]`, step.oldValue, step.newValue),
        step.pcChange ? stateChangeCard("PC", step.pcChange.oldValue, step.pcChange.newValue) : null
      ]);
    }
    if (step.kind === "pc") {
      mark(document.getElementById("pcValue"), "state-pc");
      showStateChangeCards([stateChangeCard("PC", step.oldValue, step.newValue)]);
    }
  }

  function stateChangeCard(target, oldValue, newValue) {
    if (!target) return null;
    return {
      target,
      oldValue: formatMaybe(oldValue),
      newValue: formatMaybe(newValue)
    };
  }

  function mark(element, className) {
    if (element) element.classList.add("state-animating", className);
  }

  function clearTransientClasses() {
    document.querySelectorAll(".state-animating, .state-read, .state-write, .state-pc").forEach((element) => {
      element.classList.remove("state-animating", "state-read", "state-write", "state-pc");
    });
    document.querySelectorAll(".state-fly-token, .state-operation-badge, .state-change-card-row").forEach((element) => element.remove());
  }

  function registerCell(name) {
    if (!name) return null;
    return document.querySelector(`.reg-cell[data-name="${cssEscape(name)}"]`);
  }

  function memoryCell(address) {
    return document.querySelector(`.mem-cell[data-name="${cssEscape(String(address))}"]`);
  }

  function showOperationBadge(text) {
    const dock = document.getElementById("stateAnimationDock");
    const host = dock || document.querySelector(".assist-section.active") || document.body;
    if (dock) {
      dock.hidden = false;
      document.body.classList.add("state-animation-active");
    }
    const badge = document.createElement("div");
    badge.className = "state-operation-badge";
    badge.textContent = text;
    host.appendChild(badge);
  }

  function showStateChangeCards(changes) {
    const activeChanges = changes.filter(Boolean);
    if (!activeChanges.length) return;
    const dock = document.getElementById("stateAnimationDock");
    const host = dock || document.querySelector(".assist-section.active") || document.body;
    if (dock) {
      dock.hidden = false;
      document.body.classList.add("state-animation-active");
    }
    const row = document.createElement("div");
    row.className = activeChanges.length > 1 ? "state-change-card-row paired" : "state-change-card-row";
    activeChanges.forEach((change) => {
      const card = document.createElement("div");
      card.className = "state-change-card";
      const target = document.createElement("span");
      target.className = "state-change-target";
      target.textContent = change.target;
      const values = document.createElement("strong");
      values.className = "state-change-values";
      values.textContent = `${change.oldValue} -> ${change.newValue}`;
      card.append(target, values);
      row.appendChild(card);
    });
    host.appendChild(row);
  }

  function showExpressionBadge(expression) {
    window.clearTimeout(window.__riscvExpressionHideTimer);
    document.querySelectorAll(".state-expression-badge").forEach((element) => element.remove());
    const dock = document.getElementById("stateAnimationDock");
    const host = dock || document.body;
    if (dock) {
      dock.hidden = false;
      document.body.classList.add("state-animation-active");
    }
    const badge = document.createElement("div");
    badge.className = `state-expression-badge ${expression.mode ? `expr-${expression.mode}` : ""}`;

    appendExpressionPart(badge, "expr-token", expression.left);
    appendExpressionPart(badge, "expr-op", expression.op);
    if (expression.right) appendExpressionPart(badge, "expr-token", expression.right);
    appendExpressionPart(badge, "expr-arrow", "=>");
    appendExpressionPart(badge, "expr-result", expression.result);

    host.appendChild(badge);
  }

  function scheduleExpressionDockHide() {
    window.clearTimeout(window.__riscvExpressionHideTimer);
    window.__riscvExpressionHideTimer = window.setTimeout(hideExpressionDock, 620);
  }

  function hideExpressionDock() {
    const dock = document.getElementById("stateAnimationDock");
    document.body.classList.remove("state-animation-active");
    document.body.classList.remove("state-animation-paused");
    document.querySelectorAll(".state-expression-badge, .state-change-card-row").forEach((element) => element.remove());
    if (dock) {
      dock.hidden = true;
      dock.textContent = "";
    }
  }

  function appendExpressionPart(parent, className, text) {
    const part = document.createElement("span");
    part.className = className;
    part.textContent = text || "?";
    parent.appendChild(part);
  }

  function flyFromMany(elements, text) {
    elements.slice(0, 2).forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const token = document.createElement("div");
      token.className = "state-fly-token";
      token.textContent = Array.isArray(text) ? (text[index] || text[0] || "read") : (text || "read");
      token.style.left = `${rect.left + rect.width / 2}px`;
      token.style.top = `${rect.top + rect.height / 2}px`;
      token.style.setProperty("--fly-x", `${index === 0 ? 44 : -44}px`);
      token.style.setProperty("--fly-y", "-34px");
      document.body.appendChild(token);
    });
  }

  function formulaFromPlan(result) {
    return result.animationPlan?.find((item) => typeof item === "string" && item.includes("="));
  }

  function immediateValue(instruction) {
    if (instruction.imm !== undefined) return instruction.imm;
    if (instruction.shamt !== undefined) return instruction.shamt;
    return undefined;
  }

  function opLabel(instruction) {
    const op = instruction.opcode;
    if (op === "sub") return "SUB (-)";
    if (["and", "andi"].includes(op)) return "AND (&)";
    if (["or", "ori"].includes(op)) return "OR (|)";
    if (["xor", "xori"].includes(op)) return "XOR (^)";
    if (["sll", "slli"].includes(op)) return "SLL (<<)";
    if (["srl", "srli"].includes(op)) return "SRL (>>u)";
    if (["sra", "srai"].includes(op)) return "SRA (>>s)";
    return "ADD (+)";
  }

  function aluFormula(instruction, previousState, currentState) {
    const left = registerValue(previousState, instruction.rs1);
    const right = usesImmediateOperand(instruction) ? immediateValue(instruction) : registerValue(previousState, instruction.rs2);
    const output = currentState?.registers?.[instruction.rd];
    const op = instruction.opcode;
    const symbol = op === "sub" ? "-" :
      ["and", "andi"].includes(op) ? "AND (&)" :
      ["or", "ori"].includes(op) ? "OR (|)" :
      ["xor", "xori"].includes(op) ? "XOR (^)" :
      ["sll", "slli"].includes(op) ? "SLL (<<)" :
      ["srl", "srli"].includes(op) ? "SRL (>>u)" :
      ["sra", "srai"].includes(op) ? "SRA (>>s)" :
      "+";
    const rightLabel = usesImmediateOperand(instruction) ? `imm ${right}` : `${instruction.rs2}=${right}`;
    return `${instruction.rs1}=${left} ${symbol} ${rightLabel} -> ${formatMaybe(output)}`;
  }

  function aluExpression(instruction, previousState, currentState) {
    const rightValue = usesImmediateOperand(instruction) ? immediateValue(instruction) : registerValue(previousState, instruction.rs2);
    return {
      mode: expressionMode(instruction),
      left: registerToken(instruction.rs1, previousState),
      op: opSymbol(instruction),
      right: usesImmediateOperand(instruction)
        ? immediateLabel(instruction, rightValue)
        : registerToken(instruction.rs2, previousState),
      result: `${instruction.rd || "rd"}=${formatMaybe(currentState?.registers?.[instruction.rd])}`
    };
  }

  function branchFormula(instruction, previousState, currentState) {
    const left = registerValue(previousState, instruction.rs1);
    const right = instruction.opcode === "bltz" ? 0 : registerValue(previousState, instruction.rs2);
    const target = currentState?.pc === previousState?.pc + 1 ? "PC+1" : `PC=${currentState?.pc}`;
    return `${instruction.rs1}=${left} ${branchLabel(instruction)} ${instruction.opcode === "bltz" ? "0" : `${instruction.rs2}=${right}`} -> ${target}`;
  }

  function branchExpression(instruction, previousState, currentState) {
    const nextPc = previousState?.pc + 1;
    const taken = currentState?.pc !== nextPc;
    return {
      mode: taken ? "branch-taken" : "branch-next",
      left: registerToken(instruction.rs1, previousState),
      op: branchOperator(instruction),
      right: instruction.opcode === "bltz" ? "0" : registerToken(instruction.rs2, previousState),
      result: taken ? `PC=${formatMaybe(currentState?.pc)}` : "PC+1"
    };
  }

  function registerToken(name, state) {
    return `${name}=${formatMaybe(registerValue(state, name))}`;
  }

  function registerValue(state, name) {
    return name ? state?.registers?.[name] ?? 0 : undefined;
  }

  function usesImmediateOperand(instruction) {
    return instruction.imm !== undefined || instruction.shamt !== undefined;
  }

  function immediateLabel(instruction, value) {
    return instruction.shamt !== undefined ? `shamt=${formatMaybe(value)}` : `imm=${formatMaybe(value)}`;
  }

  function expressionMode(instruction) {
    if (LOGIC_OPS.includes(instruction.opcode)) return "logic";
    if (SHIFT_OPS.includes(instruction.opcode)) return "shift";
    return "arithmetic";
  }

  function opSymbol(instruction) {
    const labels = {
      add: "+",
      addi: "+",
      sub: "-",
      and: "&",
      andi: "&",
      or: "|",
      ori: "|",
      xor: "^",
      xori: "^",
      sll: "<<",
      slli: "<<",
      srl: ">>u",
      srli: ">>u",
      sra: ">>s",
      srai: ">>s"
    };
    return labels[instruction.opcode] || opLabel(instruction);
  }

  function branchLabel(instruction) {
    const labels = {
      beq: "== ?",
      bne: "!= ?",
      blt: "< ?",
      bge: ">= ?",
      bltu: "<u ?",
      bgeu: ">=u ?",
      bltz: "<0 ?"
    };
    return labels[instruction.opcode] || "cmp";
  }

  function branchOperator(instruction) {
    const labels = {
      beq: "==",
      bne: "!=",
      blt: "<",
      bge: ">=",
      bltu: "<u",
      bgeu: ">=u",
      bltz: "<"
    };
    return labels[instruction.opcode] || "cmp";
  }

  function formatMaybe(value) {
    return value === undefined || value === null ? "?" : String(value);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  window.RiscVStateAnimation = {
    playStateAnimation,
    clearStateAnimation,
    pauseStateAnimation,
    resumeStateAnimation,
    toggleStateAnimationPause,
    isStateAnimationPaused
  };
})();
