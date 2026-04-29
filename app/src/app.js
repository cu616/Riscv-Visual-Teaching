(function () {
  const {
    REGISTERS,
    INSTRUCTION_DEFS,
    EXAMPLES,
    createDefaultInstruction,
    parseProgram,
    formatAssembly
  } = window.RiscVTeaching;
  const { createInitialState, executeInstruction } = window.RiscVSimulator;

  const dom = {
    tabs: document.querySelectorAll(".tab"),
    views: document.querySelectorAll(".view"),
    instructionList: document.getElementById("instructionList"),
    assemblyPreview: document.getElementById("assemblyPreview"),
    jsonPreview: document.getElementById("jsonPreview"),
    clearProgramBtn: document.getElementById("clearProgramBtn"),
    programCanvas: document.getElementById("programCanvas"),
    programDropZone: document.getElementById("programDropZone"),
    customRegisterInput: document.getElementById("customRegisterInput"),
    customImmInput: document.getElementById("customImmInput"),
    customLabelInput: document.getElementById("customLabelInput"),
    stepBtn: document.getElementById("stepBtn"),
    autoBtn: document.getElementById("autoBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    runState: document.getElementById("runState"),
    pcValue: document.getElementById("pcValue"),
    registerGrid: document.getElementById("registerGrid"),
    memoryGrid: document.getElementById("memoryGrid"),
    executionLog: document.getElementById("executionLog"),
    errorBox: document.getElementById("errorBox"),
    exampleList: document.getElementById("exampleList"),
    operandPalette: document.getElementById("operandPalette"),
    currentInstructionLabel: document.getElementById("currentInstructionLabel"),
    stepExplanation: document.getElementById("stepExplanation"),
    visualNodes: [
      "pcNode",
      "instructionNode",
      "registerFileNode",
      "rs1Node",
      "rs2Node",
      "aluNode",
      "memoryNode",
      "writebackNode",
      "branchNode",
      "busFetch",
      "busRs1",
      "busRs2",
      "busAluMem",
      "busAluWb",
      "busMemWb",
      "busPc"
    ].map((id) => document.getElementById(id))
  };

  const app = {
    rawInstructions: [
      createDefaultInstruction("addi", { x: 36, y: 96 }),
      { ...createDefaultInstruction("addi", { x: 36, y: 250 }), rd: "x2", imm: 7 },
      { ...createDefaultInstruction("add", { x: 36, y: 404 }), rd: "x3", rs1: "x1", rs2: "x2" }
    ],
    parsedProgram: [],
    state: createInitialState(),
    changedRegisters: [],
    changedMemoryAddresses: [],
    animationTimers: [],
    timer: null
  };

  function init() {
    renderRegisterSelector();
    bindEvents();
    renderOperandPalette();
    renderExamples();
    renderAll();
  }

  function renderRegisterSelector() {
    dom.customRegisterInput.innerHTML = REGISTERS.map((reg) => `<option value="${reg}" ${reg === "x1" ? "selected" : ""}>${reg}</option>`).join("");
  }

  function bindEvents() {
    dom.tabs.forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    dom.clearProgramBtn.addEventListener("click", clearProgram);
    dom.customImmInput.addEventListener("input", renderOperandPalette);
    dom.customRegisterInput.addEventListener("change", renderOperandPalette);
    dom.customLabelInput.addEventListener("input", renderOperandPalette);
    dom.stepBtn.addEventListener("click", stepProgram);
    dom.autoBtn.addEventListener("click", startAutoRun);
    dom.pauseBtn.addEventListener("click", pauseAutoRun);
    document.querySelectorAll(".block-chip").forEach((chip) => {
      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("application/json", JSON.stringify({ kind: "instruction", opcode: chip.dataset.opcode }));
        event.dataTransfer.effectAllowed = "copy";
      });
    });

    dom.programDropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dom.programDropZone.classList.add("accepting");
    });
    dom.programDropZone.addEventListener("dragleave", () => dom.programDropZone.classList.remove("accepting"));
    dom.programDropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dom.programDropZone.classList.remove("accepting");
      const payload = readDragPayload(event);
      if (payload && payload.kind === "instruction") {
        const rect = dom.programCanvas.getBoundingClientRect();
        addInstruction(payload.opcode, {
          x: Math.max(24, event.clientX - rect.left + dom.programCanvas.scrollLeft - 140),
          y: Math.max(96, event.clientY - rect.top + dom.programCanvas.scrollTop)
        });
      }
    });

    dom.programCanvas.addEventListener("dragover", (event) => {
      event.preventDefault();
      autoScrollCanvas(event.clientY);
    });
    dom.programCanvas.addEventListener("drop", (event) => {
      event.preventDefault();
      const payload = readDragPayload(event);
      if (payload && payload.kind === "instruction") {
        const rect = dom.programCanvas.getBoundingClientRect();
        addInstruction(payload.opcode, {
          x: Math.max(24, event.clientX - rect.left + dom.programCanvas.scrollLeft - 140),
          y: Math.max(96, event.clientY - rect.top + dom.programCanvas.scrollTop)
        });
      }
    });

    dom.resetBtn.addEventListener("click", resetMachine);
    bindPaneResize();
  }

  function bindPaneResize() {
    const root = document.documentElement;
    const handles = document.querySelectorAll(".resize-handle");
    handles.forEach((handle) => {
      let start = null;
      handle.addEventListener("pointerdown", (event) => {
        handle.setPointerCapture(event.pointerId);
        handle.classList.add("resizing");
        const styles = getComputedStyle(root);
        start = {
          kind: handle.dataset.resize,
          x: event.clientX,
          toolbox: Number.parseFloat(styles.getPropertyValue("--toolbox-width")),
          editor: document.querySelector(".editor-panel").getBoundingClientRect().width
        };
      });
      handle.addEventListener("pointermove", (event) => {
        if (!start) return;
        const dx = event.clientX - start.x;
        if (start.kind === "toolbox") {
          const next = clamp(start.toolbox + dx, 170, 320);
          root.style.setProperty("--toolbox-width", `${next}px`);
        } else {
          const next = clamp(start.editor + dx, 340, 760);
          root.style.setProperty("--editor-width", `${next}px`);
        }
      });
      handle.addEventListener("pointerup", (event) => {
        if (!start) return;
        handle.releasePointerCapture(event.pointerId);
        handle.classList.remove("resizing");
        start = null;
      });
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function switchView(viewId) {
    dom.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
    dom.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  }

  function orderedInstructions() {
    return [...app.rawInstructions].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
  }

  function addInstruction(opcode, position = {}) {
    const nextY = app.rawInstructions.length ? Math.max(...app.rawInstructions.map((item) => item.y ?? 0)) + 154 : 96;
    app.rawInstructions.push(createDefaultInstruction(opcode, { x: position.x ?? 36, y: position.y ?? nextY }));
    resetMachine(false);
    renderAll();
  }

  function updateInstruction(id, field, value) {
    app.rawInstructions = app.rawInstructions.map((instruction) => {
      if (instruction.id !== id) return instruction;
      const updated = { ...instruction, [field]: field === "imm" ? Number(value) : value };
      if (field === "opcode") {
        return { ...createDefaultInstruction(value, { x: instruction.x, y: instruction.y }), id };
      }
      return updated;
    });
    resetMachine(false);
    renderAll();
  }

  function deleteInstruction(id) {
    app.rawInstructions = app.rawInstructions.filter((instruction) => instruction.id !== id);
    resetMachine(false);
    renderAll();
  }

  function clearProgram() {
    app.rawInstructions = [];
    resetMachine(false);
    renderAll();
  }

  function renderAll() {
    const parsed = parseProgram(app.rawInstructions);
    app.parsedProgram = parsed.instructions;
    renderInstructions(parsed.errors);
    renderPreviews(parsed.errors);
    renderState();
    renderLog();
    renderError(parsed.errors[0]);
    updateRunState();
  }

  function renderInstructions(errors) {
    dom.instructionList.innerHTML = "";
    if (app.rawInstructions.length === 0) {
      dom.instructionList.innerHTML = `<p class="hint">还没有指令。点击左侧积木或“添加指令”开始。</p>`;
      return;
    }

    orderedInstructions().forEach((instruction, index) => {
      const def = INSTRUCTION_DEFS[instruction.opcode] || INSTRUCTION_DEFS.addi;
      const card = document.createElement("article");
      card.className = `instruction-card ${def.color === "memory" ? "memory-block" : ""} ${def.color === "branch" ? "branch-block" : ""}`;
      card.style.position = "absolute";
      card.style.left = `${instruction.x ?? 36}px`;
      card.style.top = `${instruction.y ?? 96}px`;
      card.dataset.id = instruction.id;
      if (index === app.state.pc && !app.state.halted) card.classList.add("active");
      if (errors.length) card.classList.add("error");
      card.innerHTML = `
        ${renderLabelDock(instruction)}
        <div class="instruction-block-head" title="${def.label}：${def.help}">
          <span class="instruction-index">${index}</span>
          <div class="opcode-label">${instruction.opcode.toUpperCase()}</div>
          <button class="delete-btn" title="删除指令">×</button>
        </div>
        <div class="operand-rail">${renderSlots(instruction, def)}</div>
      `;
      bindBlockDrag(card, instruction);
      bindSlots(card, instruction, def);
      bindLabelDock(card, instruction);
      card.querySelector(".delete-btn").addEventListener("click", () => deleteInstruction(instruction.id));
      dom.instructionList.appendChild(card);
    });
  }

  function moveInstruction(id, x, y) {
    app.rawInstructions = app.rawInstructions.map((instruction) => {
      if (instruction.id !== id) return instruction;
      return { ...instruction, x, y };
    });
    resetMachine(false);
    renderAll();
  }

  function bindBlockDrag(card, instruction) {
    let start = null;
    card.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".slot, .label-dock, button, input, .operand-chip")) return;
      card.setPointerCapture(event.pointerId);
      start = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: instruction.x ?? 36,
        y: instruction.y ?? 96
      };
      card.classList.add("dragging");
    });
    card.addEventListener("pointermove", (event) => {
      if (!start) return;
      const canvas = dom.programCanvas.getBoundingClientRect();
      const x = Math.max(12, Math.min(start.x + event.clientX - start.pointerX, canvas.width - 330));
      const y = Math.max(82, start.y + event.clientY - start.pointerY);
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      autoScrollCanvas(event.clientY);
    });
    card.addEventListener("pointerup", (event) => {
      if (!start) return;
      card.releasePointerCapture(event.pointerId);
      const x = Number.parseFloat(card.style.left);
      const y = Number.parseFloat(card.style.top);
      start = null;
      card.classList.remove("dragging");
      moveInstruction(instruction.id, x, y);
    });
  }

  function autoScrollCanvas(clientY) {
    const rect = dom.programCanvas.getBoundingClientRect();
    if (clientY > rect.bottom - 56) dom.programCanvas.scrollTop += 18;
    if (clientY < rect.top + 56) dom.programCanvas.scrollTop -= 18;
  }

  function renderLabelDock(instruction) {
    return `
      <div class="label-dock" data-kind="label">
        <span class="slot-label">标签帽</span>
        ${instruction.labelTag ? renderOperandChip("label", instruction.labelTag, false) : `<span class="empty-slot">绿色标签可贴到这里</span>`}
      </div>
    `;
  }

  function renderSlots(instruction, def) {
    return def.fields
      .map((field) => {
        const value = instruction[field];
        const kind = field === "imm" ? "immediate" : field === "label" ? "label" : "register";
        return `
          <div class="slot ${kind === "immediate" ? "editable-immediate-slot" : ""}" data-field="${field}" data-kind="${kind}">
            <span class="slot-label">${field}</span>
            ${renderSlotValue(kind, value, field)}
          </div>
        `;
      })
      .join("");
  }

  function renderSlotValue(kind, value, field) {
    if (kind === "immediate") {
      return `<input class="operand-input" type="number" data-field="${field}" value="${value ?? 0}" title="可直接输入立即数或地址偏移" />`;
    }
    if (value === undefined || value === "") {
      return `<span class="empty-slot">拖入${slotName(kind)}积木</span>`;
    }
    return renderOperandChip(kind, value, false);
  }

  function bindSlots(card, instruction) {
    card.querySelectorAll(".slot").forEach((slot) => {
      const input = slot.querySelector(".operand-input");
      if (input) {
        input.addEventListener("change", () => updateInstruction(instruction.id, input.dataset.field, input.value));
        input.addEventListener("click", (event) => event.stopPropagation());
      }
      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        const payload = readDragPayload(event);
        slot.classList.toggle("accepting", Boolean(payload && payload.kind === slot.dataset.kind));
        slot.classList.toggle("invalid-drop", Boolean(payload && payload.kind !== slot.dataset.kind));
      });
      slot.addEventListener("dragleave", () => {
        slot.classList.remove("accepting", "invalid-drop");
      });
      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        slot.classList.remove("accepting", "invalid-drop");
        const payload = readDragPayload(event);
        if (!payload || payload.kind !== slot.dataset.kind) {
          renderError(`${slot.dataset.field} 槽位需要${slotName(slot.dataset.kind)}积木。`);
          return;
        }
        updateInstruction(instruction.id, slot.dataset.field, payload.value);
      });
      slot.addEventListener("click", () => cycleSlotValue(instruction, slot.dataset.field, slot.dataset.kind));
    });
  }

  function bindLabelDock(card, instruction) {
    const dock = card.querySelector(".label-dock");
    dock.addEventListener("dragover", (event) => {
      event.preventDefault();
      const payload = readDragPayload(event);
      dock.classList.toggle("accepting", Boolean(payload && payload.kind === "label"));
    });
    dock.addEventListener("dragleave", () => dock.classList.remove("accepting"));
    dock.addEventListener("drop", (event) => {
      event.preventDefault();
      dock.classList.remove("accepting");
      const payload = readDragPayload(event);
      if (payload && payload.kind === "label") {
        updateInstruction(instruction.id, "labelTag", payload.value);
      }
    });
    dock.addEventListener("dblclick", () => {
      updateInstruction(instruction.id, "labelTag", "");
    });
  }

  function renderOperandPalette() {
    const chips = [
      { kind: "register", value: dom.customRegisterInput.value || "x1" },
      { kind: "immediate", value: dom.customImmInput.value || 8 },
      { kind: "label", value: dom.customLabelInput.value || "loop" }
    ];
    dom.operandPalette.innerHTML = chips.map((chip) => renderOperandChip(chip.kind, chip.value, true)).join("");
    dom.operandPalette.querySelectorAll(".operand-chip").forEach((chip) => {
      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("application/json", JSON.stringify({ kind: chip.dataset.kind, value: chip.dataset.value }));
        event.dataTransfer.effectAllowed = "copy";
        document.body.classList.toggle("dragging-label", chip.dataset.kind === "label");
      });
      chip.addEventListener("dragend", () => document.body.classList.remove("dragging-label"));
    });
  }

  function renderOperandChip(kind, value, draggable) {
    return `<span class="operand-chip ${kind}" ${draggable ? "draggable=\"true\"" : ""} data-kind="${kind}" data-value="${value}">${formatOperand(kind, value)}</span>`;
  }

  function readDragPayload(event) {
    try {
      const raw = event.dataTransfer.getData("application/json");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function slotName(kind) {
    return {
      register: "寄存器",
      immediate: "立即数/地址偏移",
      label: "标签"
    }[kind] || "操作数";
  }

  function formatOperand(kind, value) {
    if (kind === "immediate") return `#${value}`;
    if (kind === "label") return `L${value}`;
    return value;
  }

  function cycleSlotValue(instruction, field, kind) {
    if (kind === "immediate") return;
    const labelValues = Object.keys(parseProgram(app.rawInstructions).labelMap || {});
    const values = kind === "register" ? REGISTERS : labelValues.length ? labelValues : ["start", "loop", "skip", "done", "exit"];
    const current = String(instruction[field]);
    const index = values.map(String).indexOf(current);
    const next = values[(index + 1 + values.length) % values.length];
    updateInstruction(instruction.id, field, next);
  }

  function renderPreviews(errors) {
    if (errors.length) {
      dom.assemblyPreview.textContent = "请先修复指令字段错误。";
      dom.jsonPreview.textContent = JSON.stringify({ errors }, null, 2);
      return;
    }

    dom.assemblyPreview.textContent = app.parsedProgram.map((instruction, index) => `${index}: ${formatAssembly(instruction)}`).join("\n") || "暂无指令";
    dom.jsonPreview.textContent = JSON.stringify(app.parsedProgram, null, 2);
  }

  function renderState() {
    dom.pcValue.textContent = app.state.pc;
    dom.registerGrid.innerHTML = REGISTERS.slice(0, 16)
      .map((name) => `<div class="reg-cell ${app.changedRegisters.includes(name) ? "changed" : ""}"><span>${name}</span><strong>${app.state.registers[name]}</strong></div>`)
      .join("");

    const addresses = Object.keys(app.state.memory)
      .map(Number)
      .sort((a, b) => a - b);
    dom.memoryGrid.innerHTML = addresses
      .map((address) => `<div class="mem-cell ${app.changedMemoryAddresses.includes(address) ? "changed" : ""}"><span>${address}</span><strong>${app.state.memory[address]}</strong></div>`)
      .join("");
  }

  function renderLog() {
    dom.executionLog.innerHTML = app.state.logs
      .map((log) => `<li><strong>PC ${log.pc}</strong> ${log.assembly}<br />${log.explanation}</li>`)
      .join("");
    dom.executionLog.scrollTop = dom.executionLog.scrollHeight;
  }

  function renderError(error) {
    dom.errorBox.hidden = !error;
    dom.errorBox.textContent = error || "";
  }

  function stepProgram() {
    const parsed = parseProgram(app.rawInstructions);
    if (parsed.errors.length) {
      renderError(parsed.errors[0]);
      return;
    }

    try {
      const { state, result } = executeInstruction(app.state, parsed.instructions);
      app.state = state;
      app.changedRegisters = result.changedRegisters;
      app.changedMemoryAddresses = result.changedMemoryAddresses;
      renderAll();
      renderExecutionResult(result);
    } catch (error) {
      pauseAutoRun();
      renderError(error.message);
    }
  }

  function renderExecutionResult(result) {
    const instruction = result.instruction;
    dom.currentInstructionLabel.textContent = instruction ? formatAssembly(instruction) : "程序结束";
    dom.stepExplanation.textContent = result.explanation;
    const plan = new Set(result.animationPlan.filter((item) => typeof item === "string"));
    dom.visualNodes.forEach((node) => node.classList.toggle("active", plan.has(node.id)));

    if (instruction) {
      document.querySelector("#instructionNode strong").textContent = formatAssembly(instruction);
      document.querySelector("#pcNode strong").textContent = app.state.pc;
      document.getElementById("rs1Node").textContent = instruction.rs1 || "rs1";
      document.getElementById("rs2Node").textContent = instruction.rs2 || (instruction.imm !== undefined ? `imm ${instruction.imm}` : "rs2 / imm");
      document.querySelector("#writebackNode strong").textContent = instruction.rd || (instruction.opcode === "sw" ? "memory" : "rd");
      document.querySelector("#aluNode strong").textContent = result.animationPlan.find((item) => typeof item === "string" && item.includes("=")) || aluLabel(instruction);
      document.querySelector("#memoryNode strong").textContent = memoryLabel(instruction);
      document.querySelector("#branchNode strong").textContent = instruction.opcode === "beq" ? "比较并更新 PC" : "PC + 1";
      playAnimationFrames(result);
    }
  }

  function playAnimationFrames(result) {
    clearAnimationTimers();
    const frames = buildAnimationFrames(result);
    frames.forEach((frame, index) => {
      const timer = window.setTimeout(() => {
        dom.visualNodes.forEach((node) => node.classList.remove("active"));
        frame.ids.forEach((id) => {
          const node = document.getElementById(id);
          if (node) node.classList.add("active");
        });
        dom.stepExplanation.textContent = frame.text;
      }, index * 620);
      app.animationTimers.push(timer);
    });
    const finalTimer = window.setTimeout(() => {
      dom.stepExplanation.textContent = result.explanation;
    }, frames.length * 620);
    app.animationTimers.push(finalTimer);
  }

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

    if (instruction.opcode === "beq") {
      return [
        { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出分支指令，准备比较两个寄存器。" },
        { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: `读取 ${instruction.rs1} 和 ${instruction.rs2}。` },
        { ids: ["aluNode", "branchNode", "busPc"], text: "比较两个值是否相等，并决定 PC 是否跳转。" }
      ];
    }

    return [
      { ids: ["pcNode", "instructionNode", "busFetch"], text: "取出当前算术指令。" },
      { ids: ["registerFileNode", "rs1Node", "rs2Node", "busRs1", "busRs2"], text: instruction.opcode === "addi" ? `读取 ${instruction.rs1}，并取立即数 ${instruction.imm}。` : `读取 ${instruction.rs1} 和 ${instruction.rs2}。` },
      { ids: ["aluNode", "busRs1", "busRs2"], text: "数据进入 ALU，执行算术运算。" },
      { ids: ["writebackNode", "busAluWb"], text: `把 ALU 结果写回目标寄存器 ${instruction.rd}。` }
    ];
  }

  function clearAnimationTimers() {
    app.animationTimers.forEach((timer) => window.clearTimeout(timer));
    app.animationTimers = [];
  }

  function aluLabel(instruction) {
    if (instruction.opcode === "lw" || instruction.opcode === "sw") return "地址 = rs1 + offset";
    if (instruction.opcode === "beq") return "rs1 == rs2 ?";
    return "算术运算";
  }

  function memoryLabel(instruction) {
    if (instruction.opcode === "lw") return "读取内存";
    if (instruction.opcode === "sw") return "写入内存";
    return "本步不访存";
  }

  function resetMachine(render = true) {
    pauseAutoRun();
    app.state = createInitialState();
    app.changedRegisters = [];
    app.changedMemoryAddresses = [];
    clearAnimationTimers();
    dom.currentInstructionLabel.textContent = "等待执行";
    dom.stepExplanation.textContent = "点击“单步执行”，观察寄存器、ALU、内存和 PC 的变化。";
    dom.visualNodes.forEach((node) => node.classList.remove("active"));
    document.querySelector("#instructionNode strong").textContent = "等待执行";
    document.querySelector("#pcNode strong").textContent = "0";
    document.querySelector("#aluNode strong").textContent = "运算";
    document.querySelector("#memoryNode strong").textContent = "load / store";
    document.querySelector("#writebackNode strong").textContent = "rd";
    document.querySelector("#branchNode strong").textContent = "PC 更新";
    if (render) renderAll();
  }

  function startAutoRun() {
    if (app.timer) return;
    dom.runState.textContent = "自动执行中";
    app.timer = window.setInterval(() => {
      if (app.state.halted) {
        pauseAutoRun();
        return;
      }
      stepProgram();
    }, 3200);
  }

  function pauseAutoRun() {
    if (app.timer) {
      window.clearInterval(app.timer);
      app.timer = null;
    }
    updateRunState();
  }

  function updateRunState() {
    if (app.timer) {
      dom.runState.textContent = "自动执行中";
    } else if (app.state.halted) {
      dom.runState.textContent = "已结束";
    } else {
      dom.runState.textContent = "就绪";
    }
  }

  function renderExamples() {
    dom.exampleList.innerHTML = EXAMPLES.map(
      (example) => `
        <article class="example-card">
          <h3>${example.title}</h3>
          <p>${example.description}</p>
          <button data-example="${example.id}">加载案例</button>
        </article>
      `
    ).join("");

    dom.exampleList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const example = EXAMPLES.find((item) => item.id === button.dataset.example);
        app.rawInstructions = example.instructions.map((instruction, index) => ({
          ...createDefaultInstruction(instruction.opcode, { x: 36, y: 96 + index * 154 }),
          ...instruction
        }));
        resetMachine(false);
        renderAll();
        switchView("workspace");
      });
    });
  }

  init();
})();
