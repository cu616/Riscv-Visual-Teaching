(function () {
  const {
    REGISTERS,
    FIELD_KINDS,
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
    demoModeBtn: document.getElementById("demoModeBtn"),
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
    baseButtons: document.querySelectorAll(".base-btn"),
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
    ,
    displayBase: "dec"
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
    dom.demoModeBtn.addEventListener("click", toggleDemoMode);
    dom.customImmInput.addEventListener("input", renderOperandPalette);
    dom.customRegisterInput.addEventListener("change", renderOperandPalette);
    dom.customLabelInput.addEventListener("input", renderOperandPalette);
    dom.stepBtn.addEventListener("click", stepProgram);
    dom.autoBtn.addEventListener("click", startAutoRun);
    dom.pauseBtn.addEventListener("click", pauseAutoRun);
    dom.baseButtons.forEach((button) => {
      button.addEventListener("click", () => setDisplayBase(button.dataset.base));
    });
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
      const updated = { ...instruction, [field]: FIELD_KINDS[field] === "immediate" ? Number(value) : value };
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

  function setDisplayBase(base) {
    app.displayBase = base;
    dom.baseButtons.forEach((button) => button.classList.toggle("active", button.dataset.base === base));
    renderState();
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
      card.className = `instruction-card ${def.color}-block`;
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
        ${renderInstructionWarning(instruction)}
      `;
      bindBlockDrag(card, instruction);
      bindSlots(card, instruction, def);
      bindLabelDock(card, instruction);
      card.querySelector(".delete-btn").addEventListener("click", () => deleteInstruction(instruction.id));
      dom.instructionList.appendChild(card);
    });
  }

  function renderInstructionWarning(instruction) {
    const writesRd = ["add", "sub", "addi", "and", "or", "xor", "andi", "ori", "xori", "sll", "srl", "sra", "slli", "srli", "srai", "lw", "jal", "jalr"].includes(instruction.opcode);
    if (!writesRd || instruction.rd !== "x0") return "";
    return `<div class="block-warning">x0 是恒零寄存器，写入结果会被忽略。</div>`;
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
      showSortGuide(instruction.y ?? 96);
    });
    card.addEventListener("pointermove", (event) => {
      if (!start) return;
      const canvas = dom.programCanvas.getBoundingClientRect();
      const x = Math.max(12, Math.min(start.x + event.clientX - start.pointerX, canvas.width - 330));
      const y = Math.max(82, start.y + event.clientY - start.pointerY);
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      showSortGuide(y);
      autoScrollCanvas(event.clientY);
    });
    card.addEventListener("pointerup", (event) => {
      if (!start) return;
      card.releasePointerCapture(event.pointerId);
      const x = snapToGrid(Number.parseFloat(card.style.left), 12);
      const y = snapToGrid(Number.parseFloat(card.style.top), 12);
      start = null;
      card.classList.remove("dragging");
      hideSortGuide();
      moveInstruction(instruction.id, x, y);
    });
  }

  function snapToGrid(value, grid) {
    return Math.round(value / grid) * grid;
  }

  function showSortGuide(y) {
    let guide = document.getElementById("sortGuide");
    if (!guide) {
      guide = document.createElement("div");
      guide.id = "sortGuide";
      guide.className = "sort-guide";
      dom.programCanvas.appendChild(guide);
    }
    guide.style.top = `${Math.max(76, y + 96)}px`;
    guide.hidden = false;
  }

  function hideSortGuide() {
    const guide = document.getElementById("sortGuide");
    if (guide) guide.hidden = true;
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
        const kind = FIELD_KINDS[field] || "register";
        return `
          <div class="slot ${kind === "immediate" ? "editable-immediate-slot" : ""} ${isAddressField(instruction.opcode, field) ? "address-slot" : ""}" data-field="${field}" data-kind="${kind}">
            <span class="slot-label">${field}</span>
            ${renderSlotValue(kind, value, field)}
          </div>
        `;
      })
      .join("");
  }

  function isAddressField(opcode, field) {
    return (opcode === "lw" || opcode === "sw" || opcode === "jalr") && (field === "imm" || field === "rs1");
  }

  function renderSlotValue(kind, value, field) {
    if (kind === "immediate") {
      return `<input class="operand-input" type="number" data-field="${field}" value="${value ?? 0}" title="可直接输入立即数、移位量或地址偏移" />`;
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
        document.body.classList.toggle("dragging-operand", chip.dataset.kind !== "label");
      });
      chip.addEventListener("dragend", () => {
        document.body.classList.remove("dragging-label");
        document.body.classList.remove("dragging-operand");
      });
    });
  }

  function toggleDemoMode() {
    document.body.classList.toggle("demo-mode");
    dom.demoModeBtn.classList.toggle("primary", document.body.classList.contains("demo-mode"));
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
    dom.pcValue.textContent = formatValue(app.state.pc);
    dom.registerGrid.innerHTML = REGISTERS.slice(0, 16)
      .map((name) => `<div class="reg-cell ${app.changedRegisters.includes(name) ? "changed" : ""}"><span>${name}</span><strong>${formatValue(app.state.registers[name])}</strong></div>`)
      .join("");

    const addresses = Object.keys(app.state.memory)
      .map(Number)
      .sort((a, b) => a - b);
    dom.memoryGrid.innerHTML = addresses
      .map((address) => `<div class="mem-cell ${app.changedMemoryAddresses.includes(address) ? "changed" : ""}"><span>@${formatValue(address)}</span><strong>${formatValue(app.state.memory[address])}</strong></div>`)
      .join("");
  }

  function formatValue(value) {
    const normalized = Number(value) || 0;
    if (app.displayBase === "hex") {
      return `0x${toUnsigned32(normalized).toString(16).toUpperCase().padStart(8, "0")}`;
    }
    if (app.displayBase === "bin") {
      return `0b${toUnsigned32(normalized).toString(2).padStart(32, "0")}`;
    }
    return String(normalized);
  }

  function toUnsigned32(value) {
    return value >>> 0;
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
      document.getElementById("rs2Node").textContent = operandTwoLabel(instruction);
      document.querySelector("#writebackNode strong").textContent = instruction.rd || (instruction.opcode === "sw" ? "memory" : "rd");
      document.querySelector("#aluNode strong").textContent = result.animationPlan.find((item) => typeof item === "string" && item.includes("=")) || aluLabel(instruction);
      document.querySelector("#memoryNode strong").textContent = memoryLabel(instruction);
      document.querySelector("#branchNode strong").textContent = branchLabel(instruction);
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

  function clearAnimationTimers() {
    app.animationTimers.forEach((timer) => window.clearTimeout(timer));
    app.animationTimers = [];
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
