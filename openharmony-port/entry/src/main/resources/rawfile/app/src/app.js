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
  const stateAnimation = window.RiscVStateAnimation;
  const ui = window.RiscVUiUtils;
  const caseFormat = window.RiscVCaseFormat;
  const operandModel = window.RiscVOperandModel;
  const machineState = window.RiscVMachineState;

  const dom = {
    tabs: document.querySelectorAll(".tab"),
    views: document.querySelectorAll(".view"),
    instructionList: document.getElementById("instructionList"),
    assemblyPreview: document.getElementById("assemblyPreview"),
    clearProgramBtn: document.getElementById("clearProgramBtn"),
    demoModeBtn: document.getElementById("demoModeBtn"),
    programCanvas: document.getElementById("programCanvas"),
    programDropZone: document.getElementById("programDropZone"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    assistPanelBtn: document.getElementById("assistPanelBtn"),
    assistCloseBtn: document.getElementById("assistCloseBtn"),
    assistPanel: document.getElementById("assistPanel"),
    assistTabs: document.querySelectorAll(".assist-tab"),
    assistSections: document.querySelectorAll(".assist-section"),
    statePanel: document.querySelector(".state-panel"),
    previewPanel: document.querySelector(".preview-panel"),
    notesPanel: document.querySelector(".notes-panel"),
    customRegisterInput: document.getElementById("customRegisterInput"),
    customImmInput: document.getElementById("customImmInput"),
    customLabelInput: document.getElementById("customLabelInput"),
    prevBtn: document.getElementById("prevBtn"),
    stepBtn: document.getElementById("stepBtn"),
    autoBtn: document.getElementById("autoBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    animationSpeedSelect: document.getElementById("animationSpeedSelect"),
    resetBtn: document.getElementById("resetBtn"),
    saveProgramBtn: document.getElementById("saveProgramBtn"),
    importProgramInput: document.getElementById("importProgramInput"),
    harmonyWorkspaceToggleBtn: document.getElementById("harmonyWorkspaceToggleBtn"),
    harmonyWorkspaceControls: document.getElementById("harmonyWorkspaceControls"),
    harmonyWorkspaceResetBtn: document.getElementById("harmonyWorkspaceResetBtn"),
    harmonyWorkspacePrevBtn: document.getElementById("harmonyWorkspacePrevBtn"),
    harmonyWorkspaceNextBtn: document.getElementById("harmonyWorkspaceNextBtn"),
    harmonyWorkspaceCollapseBtn: document.getElementById("harmonyWorkspaceCollapseBtn"),
    workspaceHarmonyPanel: document.getElementById("workspaceHarmonyPanel"),
    workspaceHarmonyBody: document.getElementById("workspaceHarmonyBody"),
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
    ].map((id) => document.getElementById(id)).filter(Boolean)
  };

  const app = {
    rawInstructions: [
      createDefaultInstruction("addi", { x: 336, y: 96 }),
      { ...createDefaultInstruction("addi", { x: 336, y: 250 }), rd: "x2", imm: 7 },
      { ...createDefaultInstruction("add", { x: 336, y: 404 }), rd: "x3", rs1: "x1", rs2: "x2" }
    ],
    looseOperands: [],
    selectedInstructionIds: [],
    selectedLooseOperandIds: [],
    selectionBox: null,
    parsedProgram: [],
    state: createInitialState(),
    changedRegisters: [],
    changedMemoryAddresses: [],
    stateHistory: [],
    lastExecutedInstructionId: null,
    animationTimers: [],
    timer: null
    ,
    autoRunRequested: false,
    isAnimating: false,
    animationProgress: null,
    animationSpeed: 1,
    displayBase: "dec",
    canvasScale: 1,
    assistOpen: false,
    activeAssistTab: "machine",
    pendingOperand: null,
    initialState: { registers: {}, memory: {} },
    notes: { title: "", goal: "", steps: "" },
    harmonyWorkspaceMode: false,
    harmonyWorkspaceCollapsed: false,
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
    setCanvasScale(app.canvasScale);
    toggleAssistPanel(false);
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
    dom.animationSpeedSelect.addEventListener("change", () => {
      app.animationSpeed = Number(dom.animationSpeedSelect.value) || 1;
    });
    dom.zoomOutBtn.addEventListener("click", () => adjustCanvasScale(-0.1));
    dom.zoomInBtn.addEventListener("click", () => adjustCanvasScale(0.1));
    dom.zoomResetBtn.addEventListener("click", () => setCanvasScale(1));
    dom.assistPanelBtn.addEventListener("click", () => toggleAssistPanel());
    dom.assistCloseBtn.addEventListener("click", () => toggleAssistPanel(false));
    dom.assistTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setAssistTab(tab.dataset.sideTab);
        toggleAssistPanel(true);
      });
    });
    dom.saveProgramBtn.addEventListener("click", saveProgramFile);
    dom.importProgramInput.addEventListener("change", (event) => importProgramFile(event.target.files?.[0] || null));
    dom.harmonyWorkspaceToggleBtn.addEventListener("click", toggleHarmonyWorkspaceMode);
    dom.harmonyWorkspaceResetBtn.addEventListener("click", () => setHarmonyStep(0));
    dom.harmonyWorkspacePrevBtn.addEventListener("click", () => setHarmonyStep(app.harmonyStep - 1));
    dom.harmonyWorkspaceNextBtn.addEventListener("click", () => setHarmonyStep(app.harmonyStep + 1));
    dom.harmonyWorkspaceCollapseBtn.addEventListener("click", toggleWorkspaceHarmonyPanel);
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
        showProgramDropHint();
        document.body.classList.add("dragging-instruction");
      });
      chip.addEventListener("dragend", () => {
        hideProgramDropHint();
        document.body.classList.remove("dragging-instruction");
      });
    });

    dom.programDropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      showProgramDropHint();
      dom.programDropZone.classList.add("accepting");
    });
    dom.programDropZone.addEventListener("dragleave", () => dom.programDropZone.classList.remove("accepting"));
    dom.programDropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dom.programDropZone.classList.remove("accepting");
      hideProgramDropHint();
      document.body.classList.remove("dragging-instruction");
      const payload = ui.readDragPayload(event);
      if (payload && payload.kind === "instruction") {
        const point = canvasPointFromClient(event.clientX, event.clientY);
        addInstruction(payload.opcode, {
          x: Math.max(24, point.x - 140),
          y: Math.max(96, point.y)
        });
      } else if (payload && operandModel.isOperandKind(payload.kind)) {
        addLooseOperand(payload, event);
      }
    });

    dom.programCanvas.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (ui.readDragPayload(event)?.kind === "instruction") showProgramDropHint();
      autoScrollCanvas(event.clientY);
    });
    dom.programCanvas.addEventListener("drop", (event) => {
      event.preventDefault();
      hideProgramDropHint();
      document.body.classList.remove("dragging-instruction");
      const payload = ui.readDragPayload(event);
      if (payload && payload.kind === "instruction") {
        const point = canvasPointFromClient(event.clientX, event.clientY);
        addInstruction(payload.opcode, {
          x: Math.max(24, point.x - 140),
          y: Math.max(96, point.y)
        });
      } else if (payload && operandModel.isOperandKind(payload.kind)) {
        addLooseOperand(payload, event);
      }
    });
    bindCanvasPinchZoom();
    bindCanvasSelectionBox();
    bindCanvasPan();

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
          y: event.clientY,
          toolbox: Number.parseFloat(styles.getPropertyValue("--toolbox-width")),
          assistant: Number.parseFloat(styles.getPropertyValue("--assistant-width")),
          log: Number.parseFloat(styles.getPropertyValue("--log-height"))
        };
      });
      handle.addEventListener("pointermove", (event) => {
        if (!start) return;
        const dx = event.clientX - start.x;
        if (start.kind === "toolbox") {
          const next = ui.clamp(start.toolbox + dx, 170, 420);
          root.style.setProperty("--toolbox-width", `${next}px`);
          enforceWorkspaceBounds();
          renderAll();
        } else if (start.kind === "assistant") {
          const next = ui.clamp(start.assistant - dx, 280, 640);
          root.style.setProperty("--assistant-width", `${next}px`);
        } else if (start.kind === "log") {
          const dy = event.clientY - start.y;
          const next = ui.clamp(start.log - dy, 110, 360);
          root.style.setProperty("--log-height", `${next}px`);
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

  function setCanvasScale(scale) {
    app.canvasScale = ui.clamp(Number(scale.toFixed(2)), 0.55, 1.6);
    document.documentElement.style.setProperty("--canvas-scale", app.canvasScale);
    dom.zoomResetBtn.textContent = `${Math.round(app.canvasScale * 100)}%`;
  }

  function adjustCanvasScale(delta) {
    setCanvasScale(app.canvasScale + delta);
  }

  function canvasPointFromClient(clientX, clientY) {
    const rect = dom.programCanvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left + dom.programCanvas.scrollLeft) / app.canvasScale,
      y: (clientY - rect.top + dom.programCanvas.scrollTop) / app.canvasScale
    };
  }

  function toggleAssistPanel(forced) {
    app.assistOpen = typeof forced === "boolean" ? forced : !app.assistOpen;
    document.body.classList.toggle("assist-panel-open", app.assistOpen);
    dom.assistPanelBtn.classList.toggle("primary", app.assistOpen);
  }

  function setAssistTab(tabName) {
    app.activeAssistTab = tabName || "machine";
    dom.assistTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.sideTab === app.activeAssistTab));
    dom.assistSections.forEach((section) => section.classList.toggle("active", section.dataset.sideSection === app.activeAssistTab));
  }

  function bindCanvasPinchZoom() {
    let pinch = null;
    dom.programCanvas.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 2) return;
      const distance = touchDistance(event.touches[0], event.touches[1]);
      pinch = { distance, scale: app.canvasScale };
    }, { passive: true });
    dom.programCanvas.addEventListener("touchmove", (event) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const distance = touchDistance(event.touches[0], event.touches[1]);
      setCanvasScale(pinch.scale * (distance / Math.max(pinch.distance, 1)));
    }, { passive: false });
    dom.programCanvas.addEventListener("touchend", (event) => {
      if (event.touches.length < 2) pinch = null;
    }, { passive: true });
  }

  function touchDistance(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function bindCanvasPan() {
    let pan = null;
    dom.programCanvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.ctrlKey) return;
      if (event.target.closest(".instruction-card, .floating-operand-chip, .slot, .label-dock, button, input, select, textarea, .program-drop-zone")) return;
      event.preventDefault();
      pan = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scrollLeft: dom.programCanvas.scrollLeft,
        scrollTop: dom.programCanvas.scrollTop
      };
      dom.programCanvas.setPointerCapture(event.pointerId);
      dom.programCanvas.classList.add("panning");
    });

    dom.programCanvas.addEventListener("pointermove", (event) => {
      if (!pan) return;
      dom.programCanvas.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
      dom.programCanvas.scrollTop = pan.scrollTop - (event.clientY - pan.y);
    });

    const stopPan = () => {
      if (!pan) return;
      dom.programCanvas.releasePointerCapture(pan.pointerId);
      pan = null;
      dom.programCanvas.classList.remove("panning");
    };
    dom.programCanvas.addEventListener("pointerup", stopPan);
    dom.programCanvas.addEventListener("pointercancel", stopPan);
  }

  function showProgramDropHint() {
    dom.programDropZone.hidden = false;
  }

  function hideProgramDropHint() {
    dom.programDropZone.hidden = true;
    dom.programDropZone.classList.remove("accepting");
  }

  function orderedInstructions() {
    return [...app.rawInstructions].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
  }

  function addInstruction(opcode, position = {}) {
    const nextY = app.rawInstructions.length ? Math.max(...app.rawInstructions.map((item) => item.y ?? 0)) + 154 : 96;
    app.rawInstructions.push(createDefaultInstruction(opcode, { x: position.x ?? defaultInstructionX(), y: position.y ?? nextY }));
    resetMachine(false);
    renderAll();
  }

  function defaultInstructionX() {
    const rawWidth = getComputedStyle(document.documentElement).getPropertyValue("--toolbox-width");
    const toolboxWidth = Number.parseFloat(rawWidth) || 260;
    return minBlockX();
  }

  function minBlockX() {
    const rawWidth = getComputedStyle(document.documentElement).getPropertyValue("--toolbox-width");
    const toolboxWidth = Number.parseFloat(rawWidth) || 260;
    return toolboxWidth + 44;
  }

  function maxInstructionX() {
    const canvas = dom.programCanvas.getBoundingClientRect();
    return Math.max(minBlockX(), canvas.width / app.canvasScale - 330);
  }

  function maxLooseOperandX() {
    const canvas = dom.programCanvas.getBoundingClientRect();
    return Math.max(minBlockX(), canvas.width / app.canvasScale - 96);
  }

  function enforceWorkspaceBounds() {
    const minX = minBlockX();
    app.rawInstructions = app.rawInstructions.map((instruction) => ({
      ...instruction,
      x: Math.max(minX, instruction.x ?? minX)
    }));
    app.looseOperands = app.looseOperands.map((operand) => ({
      ...operand,
      x: Math.max(minX, operand.x ?? minX)
    }));
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
    app.selectedInstructionIds = app.selectedInstructionIds.filter((selectedId) => selectedId !== id);
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
    const point = canvasPointFromClient(event.clientX, event.clientY);
    app.looseOperands.push(operandModel.createLooseOperand(payload, {
      x: Math.max(12, point.x - 40),
      y: Math.max(82, point.y - 16)
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
    enforceWorkspaceBounds();
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

  function toggleHarmonyWorkspaceMode(forced) {
    app.harmonyWorkspaceMode = typeof forced === "boolean" ? forced : !app.harmonyWorkspaceMode;
    if (app.harmonyWorkspaceMode) {
      app.harmonyWorkspaceCollapsed = false;
      setAssistTab("machine");
      toggleAssistPanel(true);
    }
    document.body.classList.toggle("harmony-workspace-mode", app.harmonyWorkspaceMode);
    dom.harmonyWorkspaceToggleBtn.classList.toggle("primary", app.harmonyWorkspaceMode);
    dom.harmonyWorkspaceToggleBtn.setAttribute("aria-pressed", String(app.harmonyWorkspaceMode));
    dom.harmonyWorkspaceControls.hidden = !app.harmonyWorkspaceMode;
    dom.workspaceHarmonyPanel.hidden = !app.harmonyWorkspaceMode;
    syncWorkspaceHarmonyPanel();
    renderHarmony();
  }

  function toggleWorkspaceHarmonyPanel() {
    app.harmonyWorkspaceCollapsed = !app.harmonyWorkspaceCollapsed;
    syncWorkspaceHarmonyPanel();
  }

  function syncWorkspaceHarmonyPanel() {
    dom.workspaceHarmonyPanel.classList.toggle("collapsed", app.harmonyWorkspaceCollapsed);
    dom.workspaceHarmonyBody.hidden = app.harmonyWorkspaceCollapsed;
    dom.harmonyWorkspaceCollapseBtn.textContent = app.harmonyWorkspaceCollapsed ? "展开" : "收起";
    dom.harmonyWorkspaceCollapseBtn.title = app.harmonyWorkspaceCollapsed ? "展开 OpenHarmony 展示栏" : "收起 OpenHarmony 展示栏";
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
      if (app.selectedInstructionIds.includes(instruction.id)) {
        card.classList.add("selected");
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
      card.addEventListener("click", (event) => {
        if (Date.now() < suppressClickUntil) return;
        if (event.target.closest(".slot, .label-dock, button, input, .operand-chip")) return;
        if (event.ctrlKey) {
          toggleInstructionSelection(instruction.id, true);
        } else if (!card.classList.contains("dragging")) {
          selectInstruction(instruction.id, false);
        }
      });
      dom.instructionList.appendChild(card);
    });
    renderLooseOperands();
    updateCanvasExtent();
  }

  function updateCanvasExtent() {
    const items = [
      ...app.rawInstructions.map((item) => ({ x: item.x ?? defaultInstructionX(), y: item.y ?? 96, width: 360, height: 170 })),
      ...app.looseOperands.map((item) => ({ x: item.x ?? minBlockX(), y: item.y ?? 96, width: 140, height: 80 }))
    ];
    const viewportWidth = dom.programCanvas.clientWidth / app.canvasScale;
    const viewportHeight = dom.programCanvas.clientHeight / app.canvasScale;
    const maxRight = Math.max(viewportWidth + 240, ...items.map((item) => item.x + item.width));
    const maxBottom = Math.max(viewportHeight + 320, ...items.map((item) => item.y + item.height));
    dom.instructionList.style.width = `${Math.ceil(maxRight)}px`;
    dom.instructionList.style.height = `${Math.ceil(maxBottom)}px`;
  }

  function renderLooseOperands() {
    app.looseOperands.forEach((operand) => {
      const chip = document.createElement("span");
      chip.className = `operand-chip floating-operand-chip ${operand.kind} ${app.selectedLooseOperandIds.includes(operand.id) ? "selected" : ""}`;
      chip.dataset.id = operand.id;
      chip.dataset.kind = operand.kind;
      chip.dataset.value = operand.value;
      chip.textContent = ui.formatOperand(operand.kind, operand.value);
      chip.style.left = `${operand.x ?? minBlockX()}px`;
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
      if (event.ctrlKey) {
        toggleInstructionSelection(instruction.id, true);
        return;
      }
      card.setPointerCapture(event.pointerId);
      if (!app.selectedInstructionIds.includes(instruction.id)) {
        app.selectedInstructionIds = [instruction.id];
        app.selectedLooseOperandIds = [];
      }
      const selectedInstructions = app.rawInstructions.filter((item) => app.selectedInstructionIds.includes(item.id));
      const selectedLooseOperands = app.looseOperands.filter((item) => app.selectedLooseOperandIds.includes(item.id));
      start = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: instruction.x ?? 36,
        y: instruction.y ?? 96,
        instructionPositions: selectedInstructions.map((item) => ({ id: item.id, x: item.x ?? defaultInstructionX(), y: item.y ?? 96 })),
        loosePositions: selectedLooseOperands.map((item) => ({ id: item.id, x: item.x ?? minBlockX(), y: item.y ?? 96 }))
      };
      card.classList.add("dragging");
      showSortGuide(instruction.y ?? 96);
    });
    card.addEventListener("pointermove", (event) => {
      if (!start) return;
      const dx = (event.clientX - start.pointerX) / app.canvasScale;
      const dy = (event.clientY - start.pointerY) / app.canvasScale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) start.moved = true;
      const minDx = Math.max(...start.instructionPositions.map((item) => minBlockX() - item.x), ...start.loosePositions.map((item) => minBlockX() - item.x), -Infinity);
      const maxDx = Math.min(...start.instructionPositions.map((item) => maxInstructionX() - item.x), ...start.loosePositions.map((item) => maxLooseOperandX() - item.x), Infinity);
      const safeDx = ui.clamp(dx, Number.isFinite(minDx) ? minDx : dx, Number.isFinite(maxDx) ? maxDx : dx);
      const x = Math.max(minBlockX(), Math.min(start.x + safeDx, maxInstructionX()));
      const y = Math.max(82, start.y + (event.clientY - start.pointerY) / app.canvasScale);
      start.instructionPositions.forEach((item) => {
        const target = dom.instructionList.querySelector(`.instruction-card[data-id="${item.id}"]`);
        if (target) {
          target.style.left = `${item.x + safeDx}px`;
          target.style.top = `${Math.max(82, item.y + dy)}px`;
          target.classList.add("dragging");
        }
      });
      start.loosePositions.forEach((item) => {
        const target = dom.instructionList.querySelector(`.floating-operand-chip[data-id="${item.id}"]`);
        if (target) {
          target.style.left = `${item.x + safeDx}px`;
          target.style.top = `${Math.max(82, item.y + dy)}px`;
          target.classList.add("dragging");
        }
      });
      showSortGuide(y, previewInsertIndex(instruction.id, y));
      autoScrollCanvas(event.clientY);
    });
    card.addEventListener("pointerup", (event) => {
      if (!start) return;
      card.releasePointerCapture(event.pointerId);
      const x = ui.snapToGrid(Number.parseFloat(card.style.left), 12);
      const y = ui.snapToGrid(Number.parseFloat(card.style.top), 12);
      const movedInstructions = start.instructionPositions.map((item) => {
        const target = dom.instructionList.querySelector(`.instruction-card[data-id="${item.id}"]`);
        return {
          id: item.id,
          x: ui.snapToGrid(Number.parseFloat(target?.style.left || item.x), 12),
          y: ui.snapToGrid(Number.parseFloat(target?.style.top || item.y), 12)
        };
      });
      const movedLooseOperands = start.loosePositions.map((item) => {
        const target = dom.instructionList.querySelector(`.floating-operand-chip[data-id="${item.id}"]`);
        return {
          id: item.id,
          x: ui.snapToGrid(Number.parseFloat(target?.style.left || item.x), 12),
          y: ui.snapToGrid(Number.parseFloat(target?.style.top || item.y), 12)
        };
      });
      if (start.moved) suppressClickUntil = Date.now() + 180;
      start = null;
      dom.instructionList.querySelectorAll(".dragging").forEach((element) => element.classList.remove("dragging"));
      hideSortGuide();
      moveSelectedBlocks(movedInstructions, movedLooseOperands, instruction.id, x, y);
    });
  }

  function moveSelectedBlocks(movedInstructions, movedLooseOperands, activeId, fallbackX, fallbackY) {
    if (movedInstructions.length <= 1 && movedLooseOperands.length === 0) {
      moveInstruction(activeId, Math.max(minBlockX(), fallbackX), fallbackY);
      return;
    }
    const instructionPatch = new Map(movedInstructions.map((item) => [item.id, item]));
    const loosePatch = new Map(movedLooseOperands.map((item) => [item.id, item]));
    app.rawInstructions = app.rawInstructions.map((instruction) => {
      const patch = instructionPatch.get(instruction.id);
      return patch ? { ...instruction, x: Math.max(minBlockX(), patch.x), y: patch.y } : instruction;
    });
    app.looseOperands = app.looseOperands.map((operand) => {
      const patch = loosePatch.get(operand.id);
      return patch ? { ...operand, x: Math.max(minBlockX(), patch.x), y: patch.y } : operand;
    });
    if (hasInstructionOverlap(app.rawInstructions)) {
      app.rawInstructions = normalizeInstructionLayout(app.rawInstructions);
    }
    resetMachine(false);
    renderAll();
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
        x: minBlockX() + columnIndex * 306,
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
        const world = canvasPointFromClient(point.x, point.y);
        const position = {
          x: Math.max(24, world.x - 140),
          y: Math.max(96, world.y)
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
      if (!app.selectedLooseOperandIds.includes(operand.id)) {
        app.selectedLooseOperandIds = [operand.id];
        app.selectedInstructionIds = [];
      }
      chip.classList.add("selected");
      showOperandTrash();
      const selectedLooseOperands = app.looseOperands.filter((item) => app.selectedLooseOperandIds.includes(item.id));
      start = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: operand.x ?? 36,
        y: operand.y ?? 96,
        operands: selectedLooseOperands.map((item) => ({ id: item.id, x: item.x ?? minBlockX(), y: item.y ?? 96, kind: item.kind }))
      };
      chip.classList.add("dragging");
      document.body.classList.toggle("dragging-label", operand.kind === "label");
      document.body.classList.toggle("dragging-operand", operand.kind !== "label");
    });
    chip.addEventListener("pointermove", (event) => {
      if (!start) return;
      const dx = (event.clientX - start.pointerX) / app.canvasScale;
      const dy = (event.clientY - start.pointerY) / app.canvasScale;
      const minDx = Math.max(...start.operands.map((item) => minBlockX() - item.x));
      const maxDx = Math.min(...start.operands.map((item) => maxLooseOperandX() - item.x));
      const safeDx = ui.clamp(dx, minDx, maxDx);
      start.operands.forEach((item) => {
        const target = dom.instructionList.querySelector(`.floating-operand-chip[data-id="${item.id}"]`);
        if (!target) return;
        target.style.left = `${item.x + safeDx}px`;
        target.style.top = `${Math.max(82, item.y + dy)}px`;
        target.classList.add("dragging");
      });
      if (start.operands.length === 1) highlightNearestAttachTarget(operand.kind, event.clientX, event.clientY);
      updateOperandTrashHover(event.clientX, event.clientY);
      autoScrollCanvas(event.clientY);
    });
    chip.addEventListener("pointerup", (event) => {
      if (!start) return;
      chip.releasePointerCapture(event.pointerId);
      const drag = start;
      start = null;
      dom.instructionList.querySelectorAll(".floating-operand-chip.dragging").forEach((element) => element.classList.remove("dragging"));
      document.body.classList.remove("dragging-label");
      document.body.classList.remove("dragging-operand");
      clearAttachHints();
      const overTrash = isPointerOverOperandTrash(event.clientX, event.clientY);
      hideOperandTrash();
      if (overTrash) {
        deleteLooseOperands(drag.operands.map((item) => item.id));
        return;
      }
      const target = drag.operands.length === 1 ? findNearestAttachTarget(operand.kind, event.clientX, event.clientY) : null;
      if (target) {
        attachLooseOperand(operand, target);
        return;
      }
      const patches = drag.operands.map((item) => {
        const targetChip = dom.instructionList.querySelector(`.floating-operand-chip[data-id="${item.id}"]`);
        return {
          id: item.id,
          x: ui.snapToGrid(Number.parseFloat(targetChip?.style.left || item.x), 12),
          y: ui.snapToGrid(Number.parseFloat(targetChip?.style.top || item.y), 12)
        };
      });
      app.looseOperands = app.looseOperands.map((item) => {
        const patch = patches.find((candidate) => candidate.id === item.id);
        return patch ? { ...item, x: Math.max(minBlockX(), patch.x), y: patch.y } : item;
      });
      renderAll();
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
    if (!app.selectedLooseOperandIds.length && !app.selectedInstructionIds.length) return;
    event.preventDefault();
    if (app.selectedInstructionIds.length) deleteInstructions(app.selectedInstructionIds);
    if (app.selectedLooseOperandIds.length) deleteLooseOperands(app.selectedLooseOperandIds);
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
      return;
    }

    dom.assemblyPreview.textContent = app.parsedProgram.map((instruction, index) => `${index}: ${formatAssembly(instruction)}`).join("\n") || "暂无指令";
  }

  function selectInstruction(id, additive) {
    app.selectedInstructionIds = additive ? [...new Set([...app.selectedInstructionIds, id])] : [id];
    if (!additive) app.selectedLooseOperandIds = [];
    renderAll();
  }

  function toggleInstructionSelection(id, additive) {
    if (!additive) {
      selectInstruction(id, false);
      return;
    }
    app.selectedInstructionIds = app.selectedInstructionIds.includes(id)
      ? app.selectedInstructionIds.filter((selectedId) => selectedId !== id)
      : [...app.selectedInstructionIds, id];
    renderAll();
  }

  function deleteInstructions(ids) {
    app.rawInstructions = app.rawInstructions.filter((instruction) => !ids.includes(instruction.id));
    app.selectedInstructionIds = app.selectedInstructionIds.filter((id) => !ids.includes(id));
    resetMachine(false);
    renderAll();
  }

  function bindCanvasSelectionBox() {
    let start = null;
    dom.programCanvas.addEventListener("pointerdown", (event) => {
      if (!event.ctrlKey || event.button !== 0) return;
      if (event.target.closest(".instruction-card, .floating-operand-chip, .slot, .label-dock, button, input, select, textarea")) return;
      event.preventDefault();
      const origin = canvasPointFromClient(event.clientX, event.clientY);
      start = { pointerId: event.pointerId, origin, current: origin };
      dom.programCanvas.setPointerCapture(event.pointerId);
      app.selectionBox = { left: origin.x, top: origin.y, width: 0, height: 0 };
      renderSelectionBox();
    });

    dom.programCanvas.addEventListener("pointermove", (event) => {
      if (!start) return;
      const current = canvasPointFromClient(event.clientX, event.clientY);
      start.current = current;
      app.selectionBox = {
        left: Math.min(start.origin.x, current.x),
        top: Math.min(start.origin.y, current.y),
        width: Math.abs(current.x - start.origin.x),
        height: Math.abs(current.y - start.origin.y)
      };
      renderSelectionBox();
    });

    dom.programCanvas.addEventListener("pointerup", (event) => {
      if (!start) return;
      dom.programCanvas.releasePointerCapture(start.pointerId);
      applySelectionBox(app.selectionBox);
      start = null;
      app.selectionBox = null;
      renderSelectionBox();
    });
  }

  function renderSelectionBox() {
    let box = document.getElementById("selectionBox");
    if (!app.selectionBox) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.id = "selectionBox";
      box.className = "selection-box";
      dom.instructionList.appendChild(box);
    }
    box.style.left = `${app.selectionBox.left}px`;
    box.style.top = `${app.selectionBox.top}px`;
    box.style.width = `${app.selectionBox.width}px`;
    box.style.height = `${app.selectionBox.height}px`;
  }

  function applySelectionBox(box) {
    if (!box || box.width < 8 || box.height < 8) return;
    app.selectedInstructionIds = app.rawInstructions
      .filter((instruction) => intersects(box, {
        left: instruction.x ?? defaultInstructionX(),
        top: instruction.y ?? 96,
        width: 300,
        height: 96
      }))
      .map((instruction) => instruction.id);
    app.selectedLooseOperandIds = app.looseOperands
      .filter((operand) => intersects(box, {
        left: operand.x ?? minBlockX(),
        top: operand.y ?? 96,
        width: 96,
        height: 38
      }))
      .map((operand) => operand.id);
    renderAll();
  }

  function intersects(a, b) {
    return a.left < b.left + b.width &&
      a.left + a.width > b.left &&
      a.top < b.top + b.height &&
      a.top + a.height > b.top;
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

  async function stepProgram() {
    const parsed = parseProgram(app.rawInstructions);
    if (parsed.errors.length) {
      renderError(parsed.errors[0]);
      return;
    }

    try {
      if (app.state.halted || app.isAnimating) return;
      const previousState = cloneExecutionState(app.state);
      const previousPc = app.state.pc;
      app.stateHistory.push({
        state: previousState,
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
      await renderExecutionResult(result, previousState, previousPc, parsed.instructions.length);
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
    stateAnimation.clearStateAnimation();
    app.isAnimating = false;
    app.animationProgress = null;
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

  async function renderExecutionResult(result, previousState, previousPc, total) {
    const instruction = result.instruction;
    const duration = animationDuration();
    setAssistTab("machine");
    toggleAssistPanel(true);
    app.isAnimating = true;
    app.animationProgress = { index: previousPc, total, fraction: 0, label: "start" };
    updateExecutionProgress();
    updateRunState();
    await stateAnimation.playStateAnimation(result, {
      previousState,
      currentState: app.state,
      duration,
      onProgress(fraction) {
        app.animationProgress = { index: previousPc, total, fraction, label: app.animationProgress?.label || "" };
        updateExecutionProgress();
      },
      onPhase(label) {
        app.animationProgress = { index: previousPc, total, fraction: app.animationProgress?.fraction || 0, label };
        updateExecutionProgress();
      }
    });
    app.isAnimating = false;
    app.animationProgress = null;
    updateExecutionProgress();
    updateRunState();
    if (!dom.visualNodes.length) return;
    const currentInstructionLabel = document.getElementById("currentInstructionLabel");
    const stepExplanation = document.getElementById("stepExplanation");
    if (currentInstructionLabel) currentInstructionLabel.textContent = instruction ? formatAssembly(instruction) : "程序结束";
    if (stepExplanation) stepExplanation.textContent = result.explanation;
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
        const stepExplanation = document.getElementById("stepExplanation");
        if (stepExplanation) stepExplanation.textContent = frame.text;
      }, index * 620);
      app.animationTimers.push(timer);
    });
    const finalTimer = window.setTimeout(() => {
      const stepExplanation = document.getElementById("stepExplanation");
      if (stepExplanation) stepExplanation.textContent = result.explanation;
    }, frames.length * 620);
    app.animationTimers.push(finalTimer);
  }

  function clearAnimationTimers() {
    app.animationTimers.forEach((timer) => window.clearTimeout(timer));
    app.animationTimers = [];
  }

  function animationDuration() {
    return Math.round(3000 / (app.animationSpeed || 1));
  }

  function resetMachine(render = true) {
    pauseAutoRun();
    app.state = machineState.createStateFromInitial(createInitialState, app.initialState);
    app.changedRegisters = [];
    app.changedMemoryAddresses = [];
    app.stateHistory = [];
    app.lastExecutedInstructionId = null;
    clearAnimationTimers();
    stateAnimation.clearStateAnimation();
    app.isAnimating = false;
    app.animationProgress = null;
    const currentInstructionLabel = document.getElementById("currentInstructionLabel");
    const stepExplanation = document.getElementById("stepExplanation");
    if (currentInstructionLabel) currentInstructionLabel.textContent = "等待执行";
    if (stepExplanation) stepExplanation.textContent = "点击“单步执行”，观察寄存器、ALU、内存和 PC 的变化。";
    dom.visualNodes.forEach((node) => node.classList.remove("active"));
    const instructionNode = document.querySelector("#instructionNode strong");
    const pcNode = document.querySelector("#pcNode strong");
    const aluNode = document.querySelector("#aluNode strong");
    const memoryNode = document.querySelector("#memoryNode strong");
    const writebackNode = document.querySelector("#writebackNode strong");
    const branchNode = document.querySelector("#branchNode strong");
    if (instructionNode) instructionNode.textContent = "等待执行";
    if (pcNode) pcNode.textContent = "0";
    if (aluNode) aluNode.textContent = "运算";
    if (memoryNode) memoryNode.textContent = "load / store";
    if (writebackNode) writebackNode.textContent = "rd";
    if (branchNode) branchNode.textContent = "PC 更新";
    if (render) renderAll();
  }

  async function startAutoRun() {
    if (app.timer || app.state.halted) return;
    app.autoRunRequested = true;
    app.timer = true;
    updateRunState();
    while (app.autoRunRequested && !app.state.halted) {
      await stepProgram();
      if (app.autoRunRequested && !app.state.halted) {
        await delay(160);
      }
    }
    app.timer = null;
    app.autoRunRequested = false;
    updateRunState();
  }

  function pauseAutoRun() {
    if (app.timer) {
      app.autoRunRequested = false;
      app.timer = null;
    }
    updateRunState();
  }

  function updateRunState() {
    document.body.classList.toggle("is-running", Boolean(app.timer));
    dom.prevBtn.disabled = app.stateHistory.length === 0 || Boolean(app.timer) || app.isAnimating;
    dom.stepBtn.disabled = app.state.halted || Boolean(app.timer) || app.isAnimating;
    dom.autoBtn.disabled = app.state.halted || Boolean(app.timer);
    dom.pauseBtn.disabled = !app.timer && !app.isAnimating;
    if (app.isAnimating) {
      dom.runState.textContent = "动画中";
    } else if (app.timer) {
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
    if (app.animationProgress) {
      const index = Math.min(app.animationProgress.index + 1, Math.max(total, 1));
      const percent = Math.round((app.animationProgress.fraction || 0) * 100);
      dom.executionProgressText.textContent = `${index}/${total} · ${percent}%`;
      dom.executionProgressBar.max = Math.max(total * 100, 1);
      dom.executionProgressBar.value = Math.min(total * 100, app.animationProgress.index * 100 + percent);
      return;
    }
    dom.executionProgressText.textContent = `${done}/${total}`;
    dom.executionProgressBar.max = Math.max(total * 100, 1);
    dom.executionProgressBar.value = done * 100;
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
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
          ...createDefaultInstruction(instruction.opcode, { x: defaultInstructionX(), y: 96 + index * 154 }),
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
