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
  const datapath = window.RiscVDatapath;
  const ui = window.RiscVUiUtils;
  const caseFormat = window.RiscVCaseFormat;
  const operandModel = window.RiscVOperandModel;
  const machineState = window.RiscVMachineState;

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
    prevBtn: document.getElementById("prevBtn"),
    stepBtn: document.getElementById("stepBtn"),
    autoBtn: document.getElementById("autoBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    saveProgramBtn: document.getElementById("saveProgramBtn"),
    importProgramInput: document.getElementById("importProgramInput"),
    harmonyWorkspaceToggleBtn: document.getElementById("harmonyWorkspaceToggleBtn"),
    harmonyWorkspaceControls: document.getElementById("harmonyWorkspaceControls"),
    harmonyWorkspaceResetBtn: document.getElementById("harmonyWorkspaceResetBtn"),
    harmonyWorkspacePrevBtn: document.getElementById("harmonyWorkspacePrevBtn"),
    harmonyWorkspaceNextBtn: document.getElementById("harmonyWorkspaceNextBtn"),
    workspaceHarmonyPanel: document.getElementById("workspaceHarmonyPanel"),
    workspaceHarmonySummary: document.getElementById("workspaceHarmonySummary"),
    workspaceHarmonyCanvas: document.getElementById("workspaceHarmonyCanvas"),
    stateTargetType: document.getElementById("stateTargetType"),
    stateTargetName: document.getElementById("stateTargetName"),
    stateTargetValue: document.getElementById("stateTargetValue"),
    applyStateValueBtn: document.getElementById("applyStateValueBtn"),
    clearStateValueBtn: document.getElementById("clearStateValueBtn"),
    selectedStateDetail: document.getElementById("selectedStateDetail"),
    caseTitleInput: document.getElementById("caseTitleInput"),
    teachingGoalInput: document.getElementById("teachingGoalInput"),
    teachingNotesInput: document.getElementById("teachingNotesInput"),
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
    executionProgressText: document.getElementById("executionProgressText"),
    executionProgressBar: document.getElementById("executionProgressBar"),
    harmonyStage: document.querySelector(".harmony-stage"),
    atomCanvas: document.getElementById("atomCanvas"),
    harmonyProgramSummary: document.getElementById("harmonyProgramSummary"),
    harmonyFlowList: document.getElementById("harmonyFlowList"),
    harmonyCapabilityList: document.getElementById("harmonyCapabilityList"),
    harmonyGoWorkspaceBtn: document.getElementById("harmonyGoWorkspaceBtn"),
    harmonyNextStepBtn: document.getElementById("harmonyNextStepBtn"),
    harmonyResetStepBtn: document.getElementById("harmonyResetStepBtn"),
    harmonyPipelineSteps: document.querySelectorAll(".pipeline-step"),
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
    looseOperands: [],
    selectedLooseOperandIds: [],
    parsedProgram: [],
    state: createInitialState(),
    changedRegisters: [],
    changedMemoryAddresses: [],
    stateHistory: [],
    lastExecutedInstructionId: null,
    animationTimers: [],
    timer: null
    ,
    displayBase: "dec",
    pendingOperand: null,
    initialState: { registers: {}, memory: {} },
    notes: { title: "", goal: "", steps: "" },
    harmonyWorkspaceMode: false,
    harmonyStep: 0
  };
  const runtime = {
    isOpenHarmony: Boolean(window.OpenHarmonyBridge)
  };
  let activeImmediateEditor = null;
  let ohTouchDrag = null;
  let suppressClickUntil = 0;

  function init() {
    document.body.classList.toggle("oh-runtime", runtime.isOpenHarmony);
    if (runtime.isOpenHarmony) {
      document.addEventListener("dragstart", (event) => event.preventDefault(), true);
      document.addEventListener("drop", (event) => event.preventDefault(), true);
      document.addEventListener("touchmove", handleOhTouchMove, { passive: false });
      document.addEventListener("touchend", handleOhTouchEnd, { passive: false });
      document.addEventListener("touchcancel", cancelOhTouchDrag, { passive: false });
      document.addEventListener("mousemove", handleOhMouseMove);
      document.addEventListener("mouseup", handleOhMouseUp);
    }
    renderRegisterSelector();
    bindEvents();
    renderOperandPalette();
    renderExamples();
    renderHarmony();
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
    dom.prevBtn.addEventListener("click", previousStep);
    dom.stepBtn.addEventListener("click", stepProgram);
    dom.autoBtn.addEventListener("click", startAutoRun);
    dom.pauseBtn.addEventListener("click", pauseAutoRun);
    dom.saveProgramBtn.addEventListener("click", saveProgramFile);
    dom.importProgramInput.addEventListener("change", (event) => importProgramFile(event.target.files?.[0] || null));
    dom.harmonyWorkspaceToggleBtn.addEventListener("click", toggleHarmonyWorkspaceMode);
    dom.harmonyWorkspaceResetBtn.addEventListener("click", () => setHarmonyStep(0));
    dom.harmonyWorkspacePrevBtn.addEventListener("click", () => setHarmonyStep(app.harmonyStep - 1));
    dom.harmonyWorkspaceNextBtn.addEventListener("click", () => setHarmonyStep(app.harmonyStep + 1));
    dom.stateTargetType.addEventListener("change", renderStateTargetSelector);
    dom.applyStateValueBtn.addEventListener("click", applyInitialStateValue);
    dom.clearStateValueBtn.addEventListener("click", clearInitialStateValue);
    [dom.caseTitleInput, dom.teachingGoalInput, dom.teachingNotesInput].forEach((input) => {
      input.addEventListener("input", updateNotesFromInputs);
    });
    dom.harmonyGoWorkspaceBtn.addEventListener("click", () => switchView("workspace"));
    dom.harmonyNextStepBtn.addEventListener("click", () => {
      setHarmonyStep(app.harmonyStep + 1);
    });
    dom.harmonyResetStepBtn.addEventListener("click", () => {
      setHarmonyStep(0);
    });
    dom.baseButtons.forEach((button) => {
      button.addEventListener("click", () => setDisplayBase(button.dataset.base));
    });
    document.querySelectorAll(".block-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (Date.now() < suppressClickUntil) return;
        addInstruction(chip.dataset.opcode);
        renderError("");
      });
      if (runtime.isOpenHarmony) {
        chip.removeAttribute("draggable");
        chip.addEventListener("touchstart", (event) => {
          beginOhTouchDrag(event, { type: "instruction", opcode: chip.dataset.opcode }, chip.textContent);
        }, { passive: true });
        chip.addEventListener("mousedown", (event) => {
          beginOhMouseDrag(event, { type: "instruction", opcode: chip.dataset.opcode }, chip.textContent);
        });
        return;
      }
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
      const payload = ui.readDragPayload(event);
      if (payload && payload.kind === "instruction") {
        const rect = dom.programCanvas.getBoundingClientRect();
        addInstruction(payload.opcode, {
          x: Math.max(24, event.clientX - rect.left + dom.programCanvas.scrollLeft - 140),
          y: Math.max(96, event.clientY - rect.top + dom.programCanvas.scrollTop)
        });
      } else if (payload && operandModel.isOperandKind(payload.kind)) {
        addLooseOperand(payload, event);
      }
    });

    dom.programCanvas.addEventListener("dragover", (event) => {
      event.preventDefault();
      autoScrollCanvas(event.clientY);
    });
    dom.programCanvas.addEventListener("drop", (event) => {
      event.preventDefault();
      const payload = ui.readDragPayload(event);
      if (payload && payload.kind === "instruction") {
        const rect = dom.programCanvas.getBoundingClientRect();
        addInstruction(payload.opcode, {
          x: Math.max(24, event.clientX - rect.left + dom.programCanvas.scrollLeft - 140),
          y: Math.max(96, event.clientY - rect.top + dom.programCanvas.scrollTop)
        });
      } else if (payload && operandModel.isOperandKind(payload.kind)) {
        addLooseOperand(payload, event);
      }
    });

    dom.resetBtn.addEventListener("click", resetMachine);
    document.addEventListener("keydown", handleGlobalKeyDown);
    if (!runtime.isOpenHarmony) bindPaneResize();
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
          const next = ui.clamp(start.toolbox + dx, 170, 320);
          root.style.setProperty("--toolbox-width", `${next}px`);
        } else {
          const next = ui.clamp(start.editor + dx, 340, 760);
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
    app.looseOperands = [];
    app.selectedLooseOperandIds = [];
    app.pendingOperand = null;
    resetMachine(false);
    renderAll();
  }

  function addLooseOperand(payload, event) {
    app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
    const rect = dom.programCanvas.getBoundingClientRect();
    app.looseOperands.push(operandModel.createLooseOperand(payload, {
      x: Math.max(12, event.clientX - rect.left + dom.programCanvas.scrollLeft - 40),
      y: Math.max(82, event.clientY - rect.top + dom.programCanvas.scrollTop - 16)
    }));
    resetMachine(false);
    renderAll();
  }

  function saveProgramFile() {
    const content = JSON.stringify(caseFormat.createTeachingCasePayload({
      displayBase: app.displayBase,
      instructions: orderedInstructions(),
      looseOperands: app.looseOperands,
      initialState: app.initialState,
      notes: app.notes
    }), null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "riscv-teaching-case.riscvteach.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importProgramFile(file) {
    if (!file) return;
    try {
      const loaded = caseFormat.parseTeachingCasePayload(await file.text());
      const parsed = parseProgram(loaded.instructions);
      if (parsed.errors.length) {
        throw new Error(parsed.errors[0]);
      }
      app.rawInstructions = loaded.instructions.map((instruction, index) => ({
        ...instruction,
        id: instruction.id || `imported-${index}`,
        x: Number.isFinite(Number(instruction.x)) ? Number(instruction.x) : 36,
        y: Number.isFinite(Number(instruction.y)) ? Number(instruction.y) : 96 + index * 154
      }));
      app.looseOperands = operandModel.normalizeLooseOperands(loaded.looseOperands);
      app.selectedLooseOperandIds = [];
      if (["dec", "hex", "bin"].includes(loaded.displayBase)) app.displayBase = loaded.displayBase;
      app.initialState = machineState.normalizeInitialState(loaded.initialState);
      app.notes = caseFormat.normalizeNotes(loaded.notes);
      syncNotesInputs();
      renderStateTargetSelector();
      resetMachine(false);
      renderAll();
      renderError("");
    } catch (error) {
      renderError(error instanceof Error ? error.message : "案例文件导入失败。");
    } finally {
      dom.importProgramInput.value = "";
    }
  }

  function renderAll() {
    const parsed = parseProgram(app.rawInstructions);
    app.parsedProgram = parsed.instructions;
    syncDisplayBaseControls();
    renderInstructions(parsed.errors);
    renderPreviews(parsed.errors);
    renderStateTargetSelector();
    renderState();
    renderLog();
    renderError(parsed.errors[0]);
    renderPendingOperandState();
    updateExecutionProgress();
    updateRunState();
    renderHarmony();
  }

  function toggleHarmonyWorkspaceMode() {
    app.harmonyWorkspaceMode = !app.harmonyWorkspaceMode;
    document.body.classList.toggle("harmony-workspace-mode", app.harmonyWorkspaceMode);
    dom.harmonyWorkspaceToggleBtn.classList.toggle("primary", app.harmonyWorkspaceMode);
    dom.harmonyWorkspaceToggleBtn.setAttribute("aria-pressed", String(app.harmonyWorkspaceMode));
    dom.harmonyWorkspaceControls.hidden = !app.harmonyWorkspaceMode;
    dom.workspaceHarmonyPanel.hidden = !app.harmonyWorkspaceMode;
    renderHarmony();
  }

  function setHarmonyStep(step) {
    app.harmonyStep = (step + 5) % 5;
    renderHarmony();
  }

  function updateNotesFromInputs() {
    app.notes = {
      title: dom.caseTitleInput.value,
      goal: dom.teachingGoalInput.value,
      steps: dom.teachingNotesInput.value
    };
  }

  function syncNotesInputs() {
    const notes = caseFormat.normalizeNotes(app.notes);
    dom.caseTitleInput.value = notes.title;
    dom.teachingGoalInput.value = notes.goal;
    dom.teachingNotesInput.value = notes.steps;
    app.notes = notes;
  }

  function syncDisplayBaseControls() {
    dom.baseButtons.forEach((button) => button.classList.toggle("active", button.dataset.base === app.displayBase));
  }

  function renderInstructions(errors) {
    dom.instructionList.innerHTML = "";
    if (app.rawInstructions.length === 0) {
      dom.instructionList.innerHTML = `<p class="hint">还没有指令。点击左侧积木或“添加指令”开始。</p>`;
    }

    orderedInstructions().forEach((instruction, index) => {
      const def = INSTRUCTION_DEFS[instruction.opcode] || INSTRUCTION_DEFS.addi;
      const card = document.createElement("article");
      card.className = `instruction-card ${def.color}-block`;
      card.style.position = "absolute";
      const x = instruction.x ?? 36;
      const y = instruction.y ?? 96;
      const harmonyX = 228;
      const harmonyY = 96 + index * 176;
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      card.style.setProperty("--oh-dx", `${harmonyX - x}px`);
      card.style.setProperty("--oh-dy", `${harmonyY - y}px`);
      card.dataset.id = instruction.id;
      if (instruction.id === app.lastExecutedInstructionId || (!app.lastExecutedInstructionId && index === app.state.pc && !app.state.halted)) {
        card.classList.add("active");
      }
      if (errors.length) card.classList.add("error");
      card.innerHTML = `
        ${renderLabelDock(instruction)}
        <div class="instruction-block-head" title="${def.label}：${def.help}">
          <span class="instruction-index">${index}</span>
          <div class="opcode-label">${instruction.opcode.toUpperCase()}</div>
          <button class="delete-btn" title="删除指令">×</button>
        </div>
        <span class="workspace-starlight-label">星闪连接技术</span>
        <div class="operand-rail">${renderSlots(instruction, def)}</div>
        ${renderInstructionWarning(instruction)}
      `;
      if (runtime.isOpenHarmony) {
        card.addEventListener("touchstart", (event) => {
          if (event.target.closest(".slot, .label-dock, button, input, .operand-chip")) return;
          beginOhTouchDrag(event, { type: "move-instruction", instructionId: instruction.id }, instruction.opcode.toUpperCase());
        }, { passive: true });
        card.addEventListener("mousedown", (event) => {
          if (event.target.closest(".slot, .label-dock, button, input, .operand-chip")) return;
          beginOhMouseDrag(event, { type: "move-instruction", instructionId: instruction.id }, instruction.opcode.toUpperCase());
        });
      } else {
        bindBlockDrag(card, instruction);
      }
      bindSlots(card, instruction, def);
      bindLabelDock(card, instruction);
      card.querySelector(".delete-btn").addEventListener("click", () => deleteInstruction(instruction.id));
      dom.instructionList.appendChild(card);
    });
    renderLooseOperands();
  }

  function renderLooseOperands() {
    app.looseOperands.forEach((operand) => {
      const chip = document.createElement("span");
      chip.className = `operand-chip floating-operand-chip ${operand.kind} ${app.selectedLooseOperandIds.includes(operand.id) ? "selected" : ""}`;
      chip.dataset.id = operand.id;
      chip.dataset.kind = operand.kind;
      chip.dataset.value = operand.value;
      chip.textContent = ui.formatOperand(operand.kind, operand.value);
      chip.style.left = `${operand.x ?? 36}px`;
      chip.style.top = `${operand.y ?? 96}px`;
      chip.title = "可自由拖动；靠近对应槽位后会自动吸附。双击删除。";
      if (!runtime.isOpenHarmony) bindLooseOperandDrag(chip, operand);
      chip.addEventListener("dblclick", () => deleteLooseOperand(operand.id));
      chip.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleLooseOperandSelection(operand.id, event.ctrlKey);
      });
      dom.instructionList.appendChild(chip);
    });
  }

  function renderInstructionWarning(instruction) {
    const writesRd = ["add", "sub", "addi", "and", "or", "xor", "andi", "ori", "xori", "sll", "srl", "sra", "slli", "srli", "srai", "lw", "jal", "jalr"].includes(instruction.opcode);
    if (!writesRd || instruction.rd !== "x0") return "";
    return `<div class="block-warning">x0 是恒零寄存器，写入结果会被忽略。</div>`;
  }

  function moveInstruction(id, x, y) {
    app.rawInstructions = restackInstructions(id, x, y);
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
      showSortGuide(y, previewInsertIndex(instruction.id, y));
      autoScrollCanvas(event.clientY);
    });
    card.addEventListener("pointerup", (event) => {
      if (!start) return;
      card.releasePointerCapture(event.pointerId);
      const x = ui.snapToGrid(Number.parseFloat(card.style.left), 12);
      const y = ui.snapToGrid(Number.parseFloat(card.style.top), 12);
      start = null;
      card.classList.remove("dragging");
      hideSortGuide();
      moveInstruction(instruction.id, x, y);
    });
  }

  function restackInstructions(activeId, x, y) {
    const placed = app.rawInstructions.map((instruction) => (
      instruction.id === activeId ? { ...instruction, x, y } : instruction
    ));
    if (hasInstructionOverlap(placed)) {
      return normalizeInstructionLayout(placed);
    }
    return placed;
  }

  function hasInstructionOverlap(instructions) {
    const boxes = instructions.map((instruction) => ({
      left: instruction.x ?? 36,
      top: instruction.y ?? 96,
      right: (instruction.x ?? 36) + 300,
      bottom: (instruction.y ?? 96) + 48
    }));
    return boxes.some((a, index) => boxes.slice(index + 1).some((b) => (
      a.left < b.right - 48 &&
      a.right > b.left + 48 &&
      a.top < b.bottom - 10 &&
      a.bottom > b.top + 10
    )));
  }

  function normalizeInstructionLayout(instructions) {
    const rows = [];
    instructions
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
      .forEach((instruction) => {
        const row = rows.find((candidate) => {
          const last = candidate.items[candidate.items.length - 1];
          return Math.abs((instruction.y ?? 0) - candidate.y) < 42 && Math.abs((instruction.x ?? 0) - (last.x ?? 0)) > 180;
        });
        if (row) {
          row.items.push(instruction);
        } else {
          rows.push({ y: instruction.y ?? 0, items: [instruction] });
        }
      });

    return rows.flatMap((row, rowIndex) => row.items
      .sort((a, b) => (a.x ?? 0) - (b.x ?? 0))
      .map((instruction, columnIndex) => ({
        ...instruction,
        x: 36 + columnIndex * 306,
        y: 96 + rowIndex * 86
      })));
  }

  function previewInsertIndex(activeId, y) {
    return app.rawInstructions
      .map((instruction) => (instruction.id === activeId ? { ...instruction, y } : instruction))
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
      .findIndex((instruction) => instruction.id === activeId);
  }

  function showSortGuide(y, insertIndex = 0) {
    let guide = document.getElementById("sortGuide");
    if (!guide) {
      guide = document.createElement("div");
      guide.id = "sortGuide";
      guide.className = "sort-guide";
      dom.programCanvas.appendChild(guide);
    }
    guide.style.top = `${Math.max(76, y + 96)}px`;
    guide.dataset.insertLabel = `插入为第 ${insertIndex + 1} 步`;
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
        ${instruction.labelTag ? renderOperandChip("label", instruction.labelTag, true) : `<span class="empty-slot">绿色标签可贴到这里</span>`}
      </div>
    `;
  }

  function renderSlots(instruction, def) {
    return def.fields
      .map((field) => {
        const value = instruction[field];
        const kind = FIELD_KINDS[field] || "register";
        return `
          <div class="slot ${kind === "immediate" ? "editable-immediate-slot" : ""} ${ui.isAddressField(instruction.opcode, field) ? "address-slot" : ""}" data-field="${field}" data-kind="${kind}">
            <span class="workspace-recognition-label">连接状态识别</span>
            <span class="slot-label">${field}</span>
            ${renderSlotValue(kind, value, field)}
          </div>
        `;
      })
      .join("");
  }

  function renderSlotValue(kind, value, field) {
    if (value === undefined || value === "") {
      return `<span class="empty-slot">拖入${ui.slotName(kind)}积木</span>`;
    }
    if (kind === "immediate") {
      return renderOperandChip(kind, value, true);
    }
    return renderOperandChip(kind, value, true);
  }

  function bindSlots(card, instruction) {
    card.querySelectorAll(".slot").forEach((slot) => {
      const input = slot.querySelector(".operand-input");
      if (input) {
        input.addEventListener("change", () => updateInstruction(instruction.id, input.dataset.field, input.value));
        input.addEventListener("click", (event) => event.stopPropagation());
      }
      const chip = slot.querySelector(".operand-chip");
      if (chip) {
        if (!runtime.isOpenHarmony) bindAttachedOperandDrag(chip, instruction.id, slot.dataset.field);
        if (runtime.isOpenHarmony) {
          chip.addEventListener("touchstart", (event) => {
            beginOhTouchDrag(event, {
              type: "operand",
              kind: chip.dataset.kind,
              value: chip.dataset.value,
              detach: { instructionId: instruction.id, field: slot.dataset.field }
            }, chip.textContent);
          }, { passive: true });
          chip.addEventListener("mousedown", (event) => {
            beginOhMouseDrag(event, {
              type: "operand",
              kind: chip.dataset.kind,
              value: chip.dataset.value,
              detach: { instructionId: instruction.id, field: slot.dataset.field }
            }, chip.textContent);
          });
        }
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          if (Date.now() < suppressClickUntil) return;
          if (applyPendingOperandToSlot(instruction, slot)) return;
          selectPendingOperand({
            kind: chip.dataset.kind,
            value: chip.dataset.value,
            detach: { instructionId: instruction.id, field: slot.dataset.field }
          });
        });
        if (slot.dataset.kind === "immediate") {
          chip.addEventListener("dblclick", (event) => {
            event.stopPropagation();
            editImmediateField(instruction, slot.dataset.field, chip);
          });
        }
      }
      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        const payload = ui.readDragPayload(event);
        slot.classList.toggle("accepting", Boolean(payload && payload.kind === slot.dataset.kind));
        slot.classList.toggle("invalid-drop", Boolean(payload && payload.kind !== slot.dataset.kind));
      });
      slot.addEventListener("dragleave", () => {
        slot.classList.remove("accepting", "invalid-drop");
      });
      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        slot.classList.remove("accepting", "invalid-drop");
        const payload = ui.readDragPayload(event);
        if (!payload || payload.kind !== slot.dataset.kind) {
          renderError(`${slot.dataset.field} 槽位需要${ui.slotName(slot.dataset.kind)}积木。`);
          return;
        }
        app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
        updateInstruction(instruction.id, slot.dataset.field, payload.value);
      });
      slot.addEventListener("click", () => {
        if (applyPendingOperandToSlot(instruction, slot)) return;
        cycleSlotValue(instruction, slot.dataset.field, slot.dataset.kind);
      });
    });
  }

  function bindLabelDock(card, instruction) {
    const dock = card.querySelector(".label-dock");
    dock.addEventListener("dragover", (event) => {
      event.preventDefault();
      const payload = ui.readDragPayload(event);
      dock.classList.toggle("accepting", Boolean(payload && payload.kind === "label"));
    });
    dock.addEventListener("dragleave", () => dock.classList.remove("accepting"));
    dock.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dock.classList.remove("accepting");
      const payload = ui.readDragPayload(event);
      if (payload && payload.kind === "label") {
        app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
        updateInstruction(instruction.id, "labelTag", payload.value);
      }
    });
    const chip = dock.querySelector(".operand-chip");
      if (chip) {
      if (!runtime.isOpenHarmony) bindAttachedOperandDrag(chip, instruction.id, "labelTag");
      if (runtime.isOpenHarmony) {
        chip.addEventListener("touchstart", (event) => {
          beginOhTouchDrag(event, {
            type: "operand",
            kind: chip.dataset.kind,
            value: chip.dataset.value,
            detach: { instructionId: instruction.id, field: "labelTag" }
          }, chip.textContent);
        }, { passive: true });
        chip.addEventListener("mousedown", (event) => {
          beginOhMouseDrag(event, {
            type: "operand",
            kind: chip.dataset.kind,
            value: chip.dataset.value,
            detach: { instructionId: instruction.id, field: "labelTag" }
          }, chip.textContent);
        });
      }
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        selectPendingOperand({
          kind: chip.dataset.kind,
          value: chip.dataset.value,
          detach: { instructionId: instruction.id, field: "labelTag" }
        });
      });
    }
    dock.addEventListener("click", () => {
      if (app.pendingOperand?.kind === "label") {
        const payload = app.pendingOperand;
        app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, app.pendingOperand);
        app.pendingOperand = null;
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
      chip.addEventListener("click", () => {
        if (Date.now() < suppressClickUntil) return;
        selectPendingOperand({ kind: chip.dataset.kind, value: chip.dataset.value });
      });
      if (runtime.isOpenHarmony) {
        chip.removeAttribute("draggable");
        chip.addEventListener("touchstart", (event) => {
          beginOhTouchDrag(event, {
            type: "operand",
            kind: chip.dataset.kind,
            value: chip.dataset.value
          }, chip.textContent);
        }, { passive: true });
        chip.addEventListener("mousedown", (event) => {
          beginOhMouseDrag(event, {
            type: "operand",
            kind: chip.dataset.kind,
            value: chip.dataset.value
          }, chip.textContent);
        });
        return;
      }
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

  function selectPendingOperand(payload) {
    if (!payload || !operandModel.isOperandKind(payload.kind)) return;
    app.pendingOperand = {
      kind: payload.kind,
      value: payload.value,
      detach: payload.detach
    };
    document.body.classList.toggle("dragging-label", payload.kind === "label");
    document.body.classList.toggle("dragging-operand", payload.kind !== "label");
    renderPendingOperandState();
    renderError(`${ui.slotName(payload.kind)} selected. Tap a matching slot to fill it.`);
  }

  function renderPendingOperandState() {
    document.querySelectorAll(".operand-chip.pending").forEach((chip) => chip.classList.remove("pending"));
    document.querySelectorAll(".slot.tap-target, .label-dock.tap-target").forEach((slot) => slot.classList.remove("tap-target"));
    if (!app.pendingOperand) {
      document.body.classList.remove("dragging-label", "dragging-operand");
      return;
    }
    document.querySelectorAll(`.operand-chip[data-kind="${app.pendingOperand.kind}"]`).forEach((chip) => {
      if (String(chip.dataset.value) === String(app.pendingOperand.value)) chip.classList.add("pending");
    });
    const targetSelector = app.pendingOperand.kind === "label" ? ".label-dock" : `.slot[data-kind="${app.pendingOperand.kind}"]`;
    document.querySelectorAll(targetSelector).forEach((slot) => slot.classList.add("tap-target"));
  }

  function applyPendingOperandToSlot(instruction, slot) {
    if (!app.pendingOperand) return false;
    if (app.pendingOperand.kind !== slot.dataset.kind) {
      renderError(`${slot.dataset.field} needs ${ui.slotName(slot.dataset.kind)}. Selected ${ui.slotName(app.pendingOperand.kind)}.`);
      return true;
    }
    const payload = app.pendingOperand;
    app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
    app.pendingOperand = null;
    updateInstruction(instruction.id, slot.dataset.field, payload.value);
    renderError("");
    return true;
  }

  function toggleDemoMode() {
    document.body.classList.toggle("demo-mode");
    dom.demoModeBtn.classList.toggle("primary", document.body.classList.contains("demo-mode"));
  }

  function renderOperandChip(kind, value, draggable) {
    const canDrag = draggable && !runtime.isOpenHarmony;
    return `<span class="operand-chip ${kind}" ${canDrag ? "draggable=\"true\"" : ""} data-kind="${kind}" data-value="${value}">${ui.formatOperand(kind, value)}</span>`;
  }

  function beginOhTouchDrag(event, payload, label) {
    if (!runtime.isOpenHarmony) return;
    const point = readTouchPoint(event);
    if (!point) return;
    beginOhDrag(point, payload, label);
  }

  function beginOhMouseDrag(event, payload, label) {
    if (!runtime.isOpenHarmony || event.button !== 0) return;
    event.preventDefault();
    beginOhDrag({ x: event.clientX, y: event.clientY }, payload, label);
  }

  function beginOhDrag(point, payload, label) {
    ohTouchDrag = {
      payload,
      label,
      startX: point.x,
      startY: point.y,
      x: point.x,
      y: point.y,
      active: false,
      ghost: null
    };
  }

  function handleOhTouchMove(event) {
    if (!ohTouchDrag) return;
    const point = readTouchPoint(event);
    if (!point) return;
    ohTouchDrag.x = point.x;
    ohTouchDrag.y = point.y;
    const distance = Math.hypot(point.x - ohTouchDrag.startX, point.y - ohTouchDrag.startY);
    if (!ohTouchDrag.active && distance < 10) return;
    event.preventDefault();
    if (!ohTouchDrag.active) {
      ohTouchDrag.active = true;
      ohTouchDrag.ghost = createOhDragGhost(ohTouchDrag.label);
      document.body.classList.toggle("dragging-label", ohTouchDrag.payload.kind === "label");
      document.body.classList.toggle("dragging-operand", ohTouchDrag.payload.type === "operand" && ohTouchDrag.payload.kind !== "label");
    }
    moveOhDragGhost(point.x, point.y);
    updateOhDropHints(point.x, point.y);
    autoScrollCanvas(point.y);
  }

  function handleOhTouchEnd(event) {
    if (!ohTouchDrag) return;
    if (!ohTouchDrag.active) {
      cancelOhTouchDrag();
      return;
    }
    event.preventDefault();
    suppressClickUntil = Date.now() + 500;
    const point = readTouchPoint(event) || { x: ohTouchDrag.x, y: ohTouchDrag.y };
    finishOhDrag(point);
  }

  function handleOhMouseMove(event) {
    if (!ohTouchDrag) return;
    const point = { x: event.clientX, y: event.clientY };
    ohTouchDrag.x = point.x;
    ohTouchDrag.y = point.y;
    const distance = Math.hypot(point.x - ohTouchDrag.startX, point.y - ohTouchDrag.startY);
    if (!ohTouchDrag.active && distance < 6) return;
    event.preventDefault();
    if (!ohTouchDrag.active) {
      ohTouchDrag.active = true;
      ohTouchDrag.ghost = createOhDragGhost(ohTouchDrag.label);
      document.body.classList.toggle("dragging-label", ohTouchDrag.payload.kind === "label");
      document.body.classList.toggle("dragging-operand", ohTouchDrag.payload.type === "operand" && ohTouchDrag.payload.kind !== "label");
    }
    moveOhDragGhost(point.x, point.y);
    updateOhDropHints(point.x, point.y);
    autoScrollCanvas(point.y);
  }

  function handleOhMouseUp(event) {
    if (!ohTouchDrag) return;
    if (!ohTouchDrag.active) {
      cancelOhTouchDrag();
      return;
    }
    event.preventDefault();
    suppressClickUntil = Date.now() + 500;
    finishOhDrag({ x: event.clientX, y: event.clientY });
  }

  function finishOhDrag(point) {
    const payload = ohTouchDrag.payload;
    cancelOhTouchDrag();

    if (payload.type === "instruction" || payload.type === "move-instruction") {
      const rect = dom.programCanvas.getBoundingClientRect();
      if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        const position = {
          x: Math.max(24, point.x - rect.left + dom.programCanvas.scrollLeft - 140),
          y: Math.max(96, point.y - rect.top + dom.programCanvas.scrollTop)
        };
        if (payload.type === "instruction") {
          addInstruction(payload.opcode, position);
        } else {
          moveInstruction(payload.instructionId, ui.snapToGrid(position.x, 12), ui.snapToGrid(position.y, 12));
        }
        renderError("");
      }
      return;
    }

    const target = findOhDropTarget(payload, point.x, point.y);
    if (!target) {
      selectPendingOperand(payload);
      return;
    }
    app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
    app.pendingOperand = null;
    updateInstruction(target.instructionId, target.field, payload.value);
    renderError("");
  }

  function cancelOhTouchDrag() {
    if (ohTouchDrag?.ghost) ohTouchDrag.ghost.remove();
    ohTouchDrag = null;
    clearOhDropHints();
    document.body.classList.remove("dragging-label", "dragging-operand");
  }

  function readTouchPoint(event) {
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function createOhDragGhost(label) {
    const ghost = document.createElement("div");
    ghost.className = "oh-drag-ghost";
    ghost.textContent = label;
    document.body.appendChild(ghost);
    return ghost;
  }

  function moveOhDragGhost(x, y) {
    if (!ohTouchDrag?.ghost) return;
    ohTouchDrag.ghost.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
  }

  function findOhDropTarget(payload, x, y) {
    if (payload.type !== "operand") return null;
    const element = document.elementFromPoint(x, y);
    const target = payload.kind === "label"
      ? element?.closest(".label-dock")
      : element?.closest(".slot");
    if (!target) return findNearestAttachTarget(payload.kind, x, y);
    if (payload.kind !== "label" && target.dataset.kind !== payload.kind) return null;
    const card = target.closest(".instruction-card");
    if (!card?.dataset.id) return null;
    return {
      instructionId: card.dataset.id,
      field: payload.kind === "label" ? "labelTag" : target.dataset.field
    };
  }

  function updateOhDropHints(x, y) {
    clearOhDropHints();
    const target = findOhDropTarget(ohTouchDrag.payload, x, y);
    if (!target) return;
    const card = dom.instructionList.querySelector(`.instruction-card[data-id="${target.instructionId}"]`);
    const selector = target.field === "labelTag" ? ".label-dock" : `.slot[data-field="${target.field}"]`;
    card?.querySelector(selector)?.classList.add("accepting");
  }

  function clearOhDropHints() {
    dom.instructionList.querySelectorAll(".slot.accepting, .label-dock.accepting").forEach((element) => {
      element.classList.remove("accepting");
    });
  }

  function bindAttachedOperandDrag(chip, instructionId, field) {
    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          kind: chip.dataset.kind,
          value: chip.dataset.value,
          detach: { instructionId, field }
        })
      );
      event.dataTransfer.effectAllowed = "move";
      document.body.classList.toggle("dragging-label", chip.dataset.kind === "label");
      document.body.classList.toggle("dragging-operand", chip.dataset.kind !== "label");
    });
    chip.addEventListener("dragend", () => {
      document.body.classList.remove("dragging-label");
      document.body.classList.remove("dragging-operand");
    });
  }

  function editImmediateField(instruction, field, anchor) {
    closeImmediateEditor();
    const editor = document.createElement("form");
    editor.className = "immediate-editor";
    editor.innerHTML = `
      <input type="number" value="${instruction[field] ?? 0}" aria-label="立即数" />
      <button type="submit">确定</button>
      <button type="button" data-cancel>取消</button>
    `;
    document.body.appendChild(editor);

    const rect = anchor.getBoundingClientRect();
    editor.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
    editor.style.top = `${rect.bottom + 6}px`;

    const input = editor.querySelector("input");
    const cleanup = () => {
      document.removeEventListener("pointerdown", onOutsidePointerDown);
      document.removeEventListener("keydown", onKeyDown);
      editor.remove();
      activeImmediateEditor = null;
    };
    const submit = () => {
      const value = Number(input.value);
      if (!Number.isInteger(value)) {
        renderError("立即数、移位量或地址偏移必须是整数。");
        input.focus();
        input.select();
        return;
      }
      cleanup();
      updateInstruction(instruction.id, field, value);
    };
    const onOutsidePointerDown = (event) => {
      if (!editor.contains(event.target)) cleanup();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") cleanup();
    };

    editor.addEventListener("submit", (event) => {
      event.preventDefault();
      submit();
    });
    editor.querySelector("[data-cancel]").addEventListener("click", cleanup);
    document.addEventListener("pointerdown", onOutsidePointerDown);
    document.addEventListener("keydown", onKeyDown);

    activeImmediateEditor = cleanup;
    input.focus();
    input.select();
  }

  function closeImmediateEditor() {
    if (activeImmediateEditor) {
      activeImmediateEditor();
    }
  }

  function bindLooseOperandDrag(chip, operand) {
    let start = null;
    chip.addEventListener("pointerdown", (event) => {
      if (event.button === 2) return;
      if (event.ctrlKey) {
        toggleLooseOperandSelection(operand.id, true);
        return;
      }
      chip.setPointerCapture(event.pointerId);
      app.selectedLooseOperandIds = [operand.id];
      chip.classList.add("selected");
      showOperandTrash();
      start = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: operand.x ?? 36,
        y: operand.y ?? 96
      };
      chip.classList.add("dragging");
      document.body.classList.toggle("dragging-label", operand.kind === "label");
      document.body.classList.toggle("dragging-operand", operand.kind !== "label");
    });
    chip.addEventListener("pointermove", (event) => {
      if (!start) return;
      const canvas = dom.programCanvas.getBoundingClientRect();
      const x = Math.max(12, Math.min(start.x + event.clientX - start.pointerX, canvas.width - 96));
      const y = Math.max(82, start.y + event.clientY - start.pointerY);
      chip.style.left = `${x}px`;
      chip.style.top = `${y}px`;
      highlightNearestAttachTarget(operand.kind, event.clientX, event.clientY);
      updateOperandTrashHover(event.clientX, event.clientY);
      autoScrollCanvas(event.clientY);
    });
    chip.addEventListener("pointerup", (event) => {
      if (!start) return;
      chip.releasePointerCapture(event.pointerId);
      start = null;
      chip.classList.remove("dragging");
      document.body.classList.remove("dragging-label");
      document.body.classList.remove("dragging-operand");
      clearAttachHints();
      const overTrash = isPointerOverOperandTrash(event.clientX, event.clientY);
      hideOperandTrash();
      if (overTrash) {
        deleteLooseOperands([operand.id]);
        return;
      }
      const target = findNearestAttachTarget(operand.kind, event.clientX, event.clientY);
      if (target) {
        attachLooseOperand(operand, target);
        return;
      }
      updateLooseOperand(operand.id, {
        x: ui.snapToGrid(Number.parseFloat(chip.style.left), 12),
        y: ui.snapToGrid(Number.parseFloat(chip.style.top), 12)
      });
    });
  }

  function highlightNearestAttachTarget(kind, clientX, clientY) {
    clearAttachHints();
    const target = findNearestAttachTarget(kind, clientX, clientY);
    if (!target) return;
    const selector = target.field === "labelTag" ? ".label-dock" : `.slot[data-field="${target.field}"]`;
    const card = dom.instructionList.querySelector(`.instruction-card[data-id="${target.instructionId}"]`);
    const element = card?.querySelector(selector);
    if (element) element.classList.add("accepting");
  }

  function clearAttachHints() {
    dom.instructionList.querySelectorAll(".slot.accepting, .label-dock.accepting").forEach((element) => {
      element.classList.remove("accepting");
    });
  }

  function findNearestAttachTarget(kind, clientX, clientY) {
    const selector = kind === "label" ? ".label-dock" : `.slot[data-kind="${kind}"]`;
    const candidates = [...dom.instructionList.querySelectorAll(selector)];
    let best = null;
    candidates.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(cx - clientX, cy - clientY);
      if (distance <= 52 && (!best || distance < best.distance)) {
        best = { element, distance };
      }
    });
    if (!best) return null;
    const card = best.element.closest(".instruction-card");
    return {
      instructionId: card?.dataset.id,
      field: kind === "label" ? "labelTag" : best.element.dataset.field
    };
  }

  function attachLooseOperand(operand, target) {
    app.rawInstructions = operandModel.attachOperandToInstruction(app.rawInstructions, operand, target, FIELD_KINDS);
    app.looseOperands = operandModel.removeLooseOperand(app.looseOperands, operand.id);
    app.selectedLooseOperandIds = app.selectedLooseOperandIds.filter((id) => id !== operand.id);
    resetMachine(false);
    renderAll();
  }

  function updateLooseOperand(id, patch) {
    app.looseOperands = operandModel.updateLooseOperand(app.looseOperands, id, patch);
    renderAll();
  }

  function deleteLooseOperand(id) {
    deleteLooseOperands([id]);
  }

  function deleteLooseOperands(ids) {
    app.looseOperands = app.looseOperands.filter((operand) => !ids.includes(operand.id));
    app.selectedLooseOperandIds = app.selectedLooseOperandIds.filter((id) => !ids.includes(id));
    renderAll();
  }

  function selectLooseOperand(id, additive) {
    app.selectedLooseOperandIds = additive ? [...new Set([...app.selectedLooseOperandIds, id])] : [id];
    renderAll();
  }

  function toggleLooseOperandSelection(id, additive) {
    if (!additive) {
      selectLooseOperand(id, false);
      return;
    }
    app.selectedLooseOperandIds = app.selectedLooseOperandIds.includes(id)
      ? app.selectedLooseOperandIds.filter((selectedId) => selectedId !== id)
      : [...app.selectedLooseOperandIds, id];
    renderAll();
  }

  function handleGlobalKeyDown(event) {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    if (!app.selectedLooseOperandIds.length) return;
    event.preventDefault();
    deleteLooseOperands(app.selectedLooseOperandIds);
  }

  function showOperandTrash() {
    ensureOperandTrash().classList.add("visible");
  }

  function hideOperandTrash() {
    const trash = document.getElementById("operandTrash");
    if (trash) trash.classList.remove("visible", "active");
  }

  function updateOperandTrashHover(clientX, clientY) {
    ensureOperandTrash().classList.toggle("active", isPointerOverOperandTrash(clientX, clientY));
  }

  function isPointerOverOperandTrash(clientX, clientY) {
    const trash = document.getElementById("operandTrash");
    if (!trash) return false;
    const rect = trash.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function ensureOperandTrash() {
    let trash = document.getElementById("operandTrash");
    if (!trash) {
      trash = document.createElement("div");
      trash.id = "operandTrash";
      trash.className = "operand-trash";
      trash.textContent = "删除";
      document.body.appendChild(trash);
    }
    return trash;
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
    const visibleRegisters = REGISTERS.slice(0, 16);
    dom.registerGrid.innerHTML = chunk(visibleRegisters, 4)
      .map((row) => `
        <div class="state-row-label">${row[0]}</div>
        ${row.map((name) => {
          const initialized = Object.prototype.hasOwnProperty.call(app.initialState.registers, name);
          return `<button class="reg-cell ${app.changedRegisters.includes(name) ? "changed" : ""} ${initialized ? "initialized" : ""}" data-type="register" data-name="${name}" title="${name}"><strong>${formatValue(app.state.registers[name])}</strong></button>`;
        }).join("")}
      `)
      .join("");

    const addresses = Object.keys(app.state.memory)
      .map(Number)
      .sort((a, b) => a - b);
    dom.memoryGrid.innerHTML = addresses
      .reduce((rows, address, index) => {
        if (index % 4 === 0) rows.push([]);
        rows[rows.length - 1].push(address);
        return rows;
      }, [])
      .map((row) => `
        <div class="state-row-label">@${formatValue(row[0])}</div>
        ${row.map((address) => {
          const initialized = Object.prototype.hasOwnProperty.call(app.initialState.memory, address);
          return `<button class="mem-cell ${app.changedMemoryAddresses.includes(address) ? "changed" : ""} ${initialized ? "initialized" : ""}" data-type="memory" data-name="${address}" title="memory[${address}]"><strong>${formatValue(app.state.memory[address])}</strong></button>`;
        }).join("")}
      `)
      .join("");
    bindStateCells();
    dom.prevBtn.disabled = app.stateHistory.length === 0;
  }

  function chunk(items, size) {
    const rows = [];
    for (let index = 0; index < items.length; index += size) {
      rows.push(items.slice(index, index + size));
    }
    return rows;
  }

  function renderStateTargetSelector() {
    const targetType = dom.stateTargetType.value;
    const values = targetType === "register" ? REGISTERS : machineState.listMemoryAddresses(app.initialState);
    const current = dom.stateTargetName.value;
    dom.stateTargetName.innerHTML = values
      .map((value) => `<option value="${value}" ${String(value) === current ? "selected" : ""}>${targetType === "memory" ? `@${value}` : value}</option>`)
      .join("");
  }

  function applyInitialStateValue() {
    try {
      app.initialState = machineState.setInitialValue(
        app.initialState,
        dom.stateTargetType.value,
        dom.stateTargetName.value,
        dom.stateTargetValue.value
      );
      resetMachine(false);
      renderAll();
      renderStateDetail(dom.stateTargetType.value, dom.stateTargetName.value);
    } catch (error) {
      renderError(error instanceof Error ? error.message : "初始状态写入失败。");
    }
  }

  function clearInitialStateValue() {
    app.initialState = machineState.clearInitialValue(app.initialState, dom.stateTargetType.value, dom.stateTargetName.value);
    resetMachine(false);
    renderAll();
    renderStateDetail(dom.stateTargetType.value, dom.stateTargetName.value);
  }

  function bindStateCells() {
    document.querySelectorAll(".reg-cell, .mem-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        dom.stateTargetType.value = cell.dataset.type;
        renderStateTargetSelector();
        dom.stateTargetName.value = cell.dataset.name;
        renderStateDetail(cell.dataset.type, cell.dataset.name);
      });
    });
  }

  function renderStateDetail(type, name) {
    const initial = type === "register" ? app.initialState.registers[name] : app.initialState.memory[Number(name)];
    const current = type === "register" ? app.state.registers[name] : app.state.memory[Number(name)];
    const label = type === "register" ? name : `memory[${name}]`;
    dom.selectedStateDetail.textContent = `${label} 当前值：${formatValue(current || 0)}；初始值：${initial === undefined ? "默认" : formatValue(initial)}`;
  }

  function formatValue(value) {
    return ui.formatValue(value, app.displayBase);
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
      if (app.state.halted) return;
      app.stateHistory.push({
        state: cloneExecutionState(app.state),
        changedRegisters: [...app.changedRegisters],
        changedMemoryAddresses: [...app.changedMemoryAddresses],
        lastExecutedInstructionId: app.lastExecutedInstructionId
      });
      const { state, result } = executeInstruction(app.state, parsed.instructions);
      app.state = state;
      app.changedRegisters = result.changedRegisters;
      app.changedMemoryAddresses = result.changedMemoryAddresses;
      app.lastExecutedInstructionId = result.instruction?.id || null;
      renderAll();
      renderExecutionResult(result);
    } catch (error) {
      pauseAutoRun();
      renderError(error.message);
    }
  }

  function previousStep() {
    const snapshot = app.stateHistory.pop();
    if (!snapshot) return;
    pauseAutoRun();
    app.state = cloneExecutionState(snapshot.state);
    app.changedRegisters = snapshot.changedRegisters;
    app.changedMemoryAddresses = snapshot.changedMemoryAddresses;
    app.lastExecutedInstructionId = snapshot.lastExecutedInstructionId;
    clearAnimationTimers();
    renderAll();
  }

  function cloneExecutionState(state) {
    return {
      registers: { ...state.registers },
      memory: { ...state.memory },
      pc: state.pc,
      halted: state.halted,
      logs: [...state.logs]
    };
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
      document.getElementById("rs2Node").textContent = datapath.operandTwoLabel(instruction);
      document.querySelector("#writebackNode strong").textContent = instruction.rd || (instruction.opcode === "sw" ? "memory" : "rd");
      document.querySelector("#aluNode strong").textContent = result.animationPlan.find((item) => typeof item === "string" && item.includes("=")) || datapath.aluLabel(instruction);
      document.querySelector("#memoryNode strong").textContent = datapath.memoryLabel(instruction);
      document.querySelector("#branchNode strong").textContent = datapath.branchLabel(instruction);
      playAnimationFrames(result);
    }
  }

  function playAnimationFrames(result) {
    clearAnimationTimers();
    const frames = datapath.buildAnimationFrames(result);
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

  function clearAnimationTimers() {
    app.animationTimers.forEach((timer) => window.clearTimeout(timer));
    app.animationTimers = [];
  }

  function resetMachine(render = true) {
    pauseAutoRun();
    app.state = machineState.createStateFromInitial(createInitialState, app.initialState);
    app.changedRegisters = [];
    app.changedMemoryAddresses = [];
    app.stateHistory = [];
    app.lastExecutedInstructionId = null;
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
    if (app.timer || app.state.halted) return;
    app.timer = window.setInterval(() => {
      if (app.state.halted) {
        pauseAutoRun();
        return;
      }
      stepProgram();
    }, 3200);
    updateRunState();
  }

  function pauseAutoRun() {
    if (app.timer) {
      window.clearInterval(app.timer);
      app.timer = null;
    }
    updateRunState();
  }

  function updateRunState() {
    document.body.classList.toggle("is-running", Boolean(app.timer));
    dom.prevBtn.disabled = app.stateHistory.length === 0 || Boolean(app.timer);
    dom.stepBtn.disabled = app.state.halted || Boolean(app.timer);
    dom.autoBtn.disabled = app.state.halted || Boolean(app.timer);
    dom.pauseBtn.disabled = !app.timer;
    if (app.timer) {
      dom.runState.textContent = "自动执行中";
    } else if (app.state.halted) {
      dom.runState.textContent = "已结束";
    } else {
      dom.runState.textContent = "就绪";
    }
  }

  function updateExecutionProgress() {
    const total = app.parsedProgram.length;
    const done = app.state.halted ? total : Math.min(app.state.pc, total);
    dom.executionProgressText.textContent = `${done} / ${total}`;
    dom.executionProgressBar.max = Math.max(total, 1);
    dom.executionProgressBar.value = done;
  }

  function renderHarmony() {
    if (!dom.atomCanvas) return;
    const instructions = orderedInstructions();
    const parsed = parseProgram(app.rawInstructions);
    const errorByIndex = harmonyErrorsByInstruction(parsed.errors);
    const step = app.harmonyStep;
    document.body.dataset.harmonyStep = String(step);
    dom.harmonyStage.dataset.step = String(step);
    dom.harmonyPipelineSteps.forEach((step, index) => {
      step.classList.toggle("active", index === app.harmonyStep);
      step.classList.toggle("complete", index < app.harmonyStep);
    });
    renderWorkspaceHarmony(instructions, errorByIndex, step);
    if (instructions.length === 0) {
      dom.harmonyProgramSummary.innerHTML = `
        <strong>当前没有可固化的硬件积木</strong>
        <span>请先回到工作台添加指令积木。</span>
      `;
      dom.atomCanvas.innerHTML = `
        <div class="empty-hardware-state">
          <strong>等待工作台状态</strong>
          <span>指令积木出现后，这里会显示它与香橙派软总线、下方操作数小积木之间的连接关系。</span>
        </div>
      `;
      renderHarmonyStatus([], 0);
      return;
    }

    const labels = instructions.filter((instruction) => instruction.labelTag).length;
    const operandCount = instructions.reduce((sum, instruction) => sum + harmonyOperandsForInstruction(instruction).length, 0);
    const errorCount = errorByIndex.size;
    dom.harmonyProgramSummary.innerHTML = `
      <strong>${instructions.length} 个指令硬件积木已入网</strong>
      <span>${operandCount} 个下挂小积木被识别，${labels} 个标签帽被固化。</span>
      <span class="${errorCount ? "harmony-error-text" : ""}">${errorCount ? `${errorCount} 个积木存在错误，已在图中标红。` : "当前汇编结构有效，可继续推进联网流程。"}</span>
      <span>当前 PC=${app.state.pc}，执行状态：${app.state.halted ? "已结束" : "可继续单步"}。</span>
    `;
    dom.atomCanvas.innerHTML = instructions.map((instruction, index) => renderHardwareInstructionBlock(instruction, index, errorByIndex.get(index))).join("");
    renderHarmonyStatus(instructions, operandCount);
  }

  function renderWorkspaceHarmony(instructions, errorByIndex, step) {
    if (!dom.workspaceHarmonyPanel) return;
    dom.workspaceHarmonyPanel.dataset.step = String(step);
    if (!app.harmonyWorkspaceMode) return;
    if (instructions.length === 0) {
      dom.workspaceHarmonySummary.innerHTML = `<strong>暂无硬件通信视图</strong><span>先在左侧工作台添加指令积木。</span>`;
      dom.workspaceHarmonyCanvas.innerHTML = `<div class="empty-hardware-state compact">等待工作台状态</div>`;
      return;
    }
    const operandCount = instructions.reduce((sum, instruction) => sum + harmonyOperandsForInstruction(instruction).length, 0);
    dom.workspaceHarmonySummary.innerHTML = `
      <strong>${instructions.length} 个指令积木，${operandCount} 个小积木</strong>
      <span>当前处于第 ${step + 1} 步：${harmonyStepTitle(step)}。</span>
      ${errorByIndex.size ? `<span class="harmony-error-text">${errorByIndex.size} 个积木存在错误。</span>` : ""}
    `;
    dom.workspaceHarmonyCanvas.innerHTML = instructions.map((instruction, index) => renderMiniHardwareBlock(instruction, index, errorByIndex.get(index))).join("");
  }

  function harmonyStepTitle(step) {
    return ["读取工作台", "识别连接", "星闪入网", "状态传输", "固化展示"][step] || "读取工作台";
  }

  function renderMiniHardwareBlock(instruction, index, error) {
    const operands = harmonyOperandsForInstruction(instruction);
    return `
      <article class="mini-hardware-block ${error ? "has-error" : ""}">
        <div class="mini-starlight">${renderStarlightIcon()}</div>
        <div class="mini-main">
          <span>${index + 1}</span>
          <strong>${escapeHtml(instruction.opcode.toUpperCase())}</strong>
        </div>
        <div class="mini-operands">
          ${operands.map((operand) => `<span class="${operand.kind}">${escapeHtml(ui.formatOperand(operand.kind, operand.value))}</span>`).join("")}
        </div>
        ${error ? `<div class="mini-error">${escapeHtml(error)}</div>` : ""}
      </article>
    `;
  }

  function renderHardwareInstructionBlock(instruction, index, error) {
    const operands = harmonyOperandsForInstruction(instruction);
    const labelTag = instruction.labelTag
      ? `<div class="hardware-label-chip">标签帽 L${escapeHtml(instruction.labelTag)}</div>`
      : "";
    return `
      <article class="hardware-row ${error ? "has-error" : ""}" style="--delay: ${index * 90}ms">
        <div class="starlight-link" aria-label="星闪传输协议">
          <i class="starlight-pulse pulse-out" aria-hidden="true"></i>
          <i class="starlight-pulse pulse-back" aria-hidden="true"></i>
          <span class="starlight-icon">${renderStarlightIcon()}</span>
          <span>星闪传输协议</span>
        </div>
        <div class="hardware-instruction">
          ${labelTag}
          <div class="hardware-main-block">
            <span>指令积木块 ${index + 1}</span>
            <strong>${escapeHtml(instruction.opcode.toUpperCase())}</strong>
          </div>
          <div class="connection-recognition">
            <i class="vertical-recognition-dot dot-down" aria-hidden="true"></i>
            <i class="vertical-recognition-dot dot-up" aria-hidden="true"></i>
            <span>连接状态识别</span>
          </div>
          <div class="hardware-operands" style="--operand-count: ${Math.max(operands.length, 1)}; --line-inset: calc((100% - ${Math.max(operands.length - 1, 0) * 12}px) / ${Math.max(operands.length, 1)} / 2)">
            ${operands.length ? operands.map(renderHardwareOperand).join("") : `<div class="hardware-empty-operand">等待小积木连接</div>`}
          </div>
          ${error ? `<div class="hardware-error">${escapeHtml(error)}</div>` : ""}
        </div>
      </article>
    `;
  }

  function harmonyErrorsByInstruction(errors) {
    const map = new Map();
    errors.forEach((error) => {
      const match = String(error).match(/第\s*(\d+)\s*条/);
      const index = match ? Number(match[1]) - 1 : 0;
      map.set(index, error);
    });
    return map;
  }

  function harmonyOperandsForInstruction(instruction) {
    const def = INSTRUCTION_DEFS[instruction.opcode];
    if (!def) return [];
    const operands = def.fields
      .filter((field) => instruction[field] !== undefined && instruction[field] !== "")
      .map((field) => ({
        field,
        kind: FIELD_KINDS[field] || "register",
        value: instruction[field]
      }));
    if (instruction.labelTag) {
      operands.unshift({ field: "labelTag", kind: "label", value: instruction.labelTag });
    }
    return operands;
  }

  function renderHardwareOperand(operand) {
    const label = operand.kind === "register"
      ? "寄存器积木块"
      : operand.kind === "immediate"
        ? "立即数/地址积木块"
        : "标签积木块";
    return `
      <div class="hardware-operand ${operand.kind}">
        <span>${escapeHtml(operand.field)}</span>
        <strong>${escapeHtml(ui.formatOperand(operand.kind, operand.value))}</strong>
        <em>${label}</em>
      </div>
    `;
  }

  function renderHarmonyStatus(instructions, operandCount) {
    const stepLabels = [
      "只读取工作台快照：先看到每个指令硬件积木，连接线暂不出现。",
      "连接状态识别：指令块与寄存器、立即数、标签等小积木之间出现虚线。",
      "星闪入网：每个指令块与香橙派软总线建立近场通信链路。",
      "状态传输：软总线开始接收每个指令积木上报的连接关系。",
      "固化展示：所有识别结果稳定显示，可用于课堂讲解或答辩说明。"
    ];
    dom.harmonyFlowList.innerHTML = [
      "读取工作台：把当前软件积木序列作为硬件积木快照。",
      "连接状态识别：识别每条指令下方已经吸附的寄存器、立即数、标签等小积木。",
      "星闪入网：每个指令积木通过近场链路把自身状态发给香橙派。",
      "软总线固化：BusCenter 维护逻辑设备关系，Trans 传输连接状态。",
      "课堂展示：OpenHarmony 页把原本硬件方案的软件模拟结果画成框图。"
    ].map((item, index) => `<li class="${index === app.harmonyStep ? "active" : ""}">${item}</li>`).join("");

    const capabilities = [
      stepLabels[app.harmonyStep],
      `已固化 ${instructions.length} 条指令积木，按工作台从上到下顺序入网。`,
      `已识别 ${operandCount} 个下挂小积木，虚线表示它们与指令块的连接状态。`,
      "工作台中拖动、添加、删除或修改操作数后，本图会随 renderAll 自动更新。"
    ];
    if (app.harmonyStep >= 2) {
      capabilities.push("星闪链路出现后，代表指令硬件积木已开始向香橙派上报自身状态。");
    }
    if (instructions.some((instruction) => instruction.labelTag || instruction.label)) {
      capabilities.push("标签帽和标签引用会作为独立小积木参与固化，适合解释分支跳转目标。");
    }
    if (instructions.some((instruction) => ["lw", "sw"].includes(instruction.opcode))) {
      capabilities.push("访存指令会显示地址相关小积木，便于说明硬件积木如何识别地址拼接。");
    }
    dom.harmonyCapabilityList.innerHTML = capabilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderStarlightIcon() {
    return `
      <svg viewBox="0 0 42 42" aria-hidden="true" focusable="false">
        <path d="M21 4l3.7 10.1L35 17.8l-10.3 3.7L21 32l-3.7-10.5L7 17.8l10.3-3.7L21 4z"></path>
        <path d="M9 29c7 5 17 5 24 0"></path>
        <path d="M13 34c5 3 11 3 16 0"></path>
      </svg>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
        app.looseOperands = [];
        app.selectedLooseOperandIds = [];
        app.initialState = { registers: {}, memory: {} };
        app.notes = { title: "", goal: "", steps: "" };
        syncNotesInputs();
        renderStateTargetSelector();
        resetMachine(false);
        renderAll();
        switchView("workspace");
      });
    });
  }

  init();
})();
