(function () {
  const {
    REGISTERS,
    REGISTER_ALIASES,
    TEMP_REGISTERS,
    FIELD_KINDS,
    INSTRUCTION_DEFS,
    MACRO_DEFS,
    EXAMPLES,
    createDefaultInstruction,
    expandMacroInstruction,
    parseProgram,
    formatAssembly,
    macroInstructionSummary,
    explainInstruction,
    sortRawInstructions
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
    blockPalette: document.getElementById("blockPalette"),
    blockCategoryDetail: document.getElementById("blockCategoryDetail"),
    instructionList: document.getElementById("instructionList"),
    macroPalette: document.getElementById("macroPalette"),
    assemblyPreview: document.getElementById("assemblyPreview"),
    clearProgramBtn: document.getElementById("clearProgramBtn"),
    undoEditBtn: document.getElementById("undoEditBtn"),
    programCanvas: document.getElementById("programCanvas"),
    programDropZone: document.getElementById("programDropZone"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    assistPanelBtn: document.getElementById("assistPanelBtn"),
    assistCloseBtn: document.getElementById("assistCloseBtn"),
    assistPanel: document.getElementById("assistPanel"),
    logPanelBtn: document.getElementById("logPanelBtn"),
    logCloseBtn: document.getElementById("logCloseBtn"),
    logPanel: document.querySelector(".log-panel"),
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
    gpioPanel: document.getElementById("gpioPanel"),
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
    harmonyZoomOutBtn: document.getElementById("harmonyZoomOutBtn"),
    harmonyZoomInBtn: document.getElementById("harmonyZoomInBtn"),
    harmonyZoomResetBtn: document.getElementById("harmonyZoomResetBtn"),
    harmonyZoomReadout: document.getElementById("harmonyZoomReadout"),
    harmonyPipelineSteps: document.querySelectorAll(".pipeline-step"),
    runtimeState: document.getElementById("runtimeState"),
    runtimeDetailPopover: document.getElementById("runtimeDetailPopover"),
    runtimeDetailText: document.getElementById("runtimeDetailText"),
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
    editHistory: [],
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
    logOpen: false,
    activeAssistTab: "machine",
    pendingOperand: null,
    initialState: { registers: {}, memory: {} },
    notes: { title: "", goal: "", steps: "" },
    harmonyWorkspaceMode: false,
    harmonyWorkspaceCollapsed: false,
    harmonyStep: 0,
    harmonyScale: 0.9,
    stateDockOffset: { x: 0, y: 0 }
  };
  const runtime = createRuntimeInfo();
  let activeImmediateEditor = null;
  let ohTouchDrag = null;
  let suppressClickUntil = 0;

  function init() {
    document.body.classList.toggle("oh-runtime", runtime.isOpenHarmony);
    document.body.dataset.runtimeShell = runtime.shell;
    updateRuntimeState();
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
    setHarmonyScale(app.harmonyScale);
    setAssistTab("machine");
    toggleAssistPanel(runtime.isOpenHarmony);
    toggleLogPanel(false);
  }

  function createRuntimeInfo() {
    const fallback = {
      isOpenHarmony: Boolean(window.OpenHarmonyBridge),
      platform: window.OpenHarmonyBridge ? "OpenHarmony" : "Web",
      shell: window.OpenHarmonyBridge ? "ArkWeb" : "Browser",
      targetDisplay: window.OpenHarmonyBridge ? "1920x1080" : "responsive"
    };
    if (!window.RiscVOpenHarmony?.getRuntimeInfo) return fallback;
    try {
      const info = window.RiscVOpenHarmony.getRuntimeInfo();
      return {
        ...fallback,
        ...info,
        isOpenHarmony: info.platform === "OpenHarmony" || fallback.isOpenHarmony
      };
    } catch {
      return fallback;
    }
  }

  function updateRuntimeState() {
    updateRuntimeProof();
  }

  function updateRuntimeProof() {
    const platformText = runtime.isOpenHarmony
      ? `${runtime.platform} / ${runtime.shell} / 香橙派 RV2`
      : `${runtime.platform} / ${runtime.shell} / Windows 或浏览器`;
    const x1 = Number(app.state?.registers?.x1 || 0);
    if (dom.runtimeState) {
      dom.runtimeState.textContent = `${runtime.isOpenHarmony ? "OH · RV2" : "Web"} · 模拟执行`;
      dom.runtimeState.classList.remove("led-on", "led-off");
      const detail = [
        `运行平台：${platformText}`,
        "执行模式：RISC-V 教学模拟器，用于解释指令语义，不直接改写 CPU 真实寄存器。",
        `外设反馈映射：虚拟 LED 由 x1=${x1} 映射，x1 非 0 时点亮。`,
        "GPIO 区展示的是模拟硬件反馈，后续可把同一状态映射到 GPIO 或软总线对端 LED 设备。"
      ].join("\n");
      dom.runtimeState.title = detail;
      if (dom.runtimeDetailText) dom.runtimeDetailText.textContent = detail;
    }
  }

  function renderRegisterSelector() {
    dom.customRegisterInput.innerHTML = REGISTERS.map((reg) => `<option value="${reg}" ${reg === "x1" ? "selected" : ""}>${registerOptionLabel(reg)}</option>`).join("");
  }

  function registerAlias(name) {
    return REGISTER_ALIASES[name] || "";
  }

  function isTempRegister(name) {
    return TEMP_REGISTERS.includes(name);
  }

  function registerOptionLabel(name) {
    const alias = registerAlias(name);
    const suffix = isTempRegister(name) ? " temp" : "";
    return alias ? `${name} / ${alias}${suffix}` : `${name}${suffix}`;
  }

  function registerTitle(name) {
    const alias = registerAlias(name);
    const role = isTempRegister(name) ? "macro temporary register" : "register";
    return alias ? `${name} / ${alias} - ${role}` : `${name} - ${role}`;
  }

  function bindEvents() {
    dom.tabs.forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    dom.clearProgramBtn.addEventListener("click", clearProgram);
    dom.undoEditBtn.addEventListener("click", undoLastEdit);
    dom.customImmInput.addEventListener("input", renderOperandPalette);
    dom.customRegisterInput.addEventListener("change", renderOperandPalette);
    dom.customLabelInput.addEventListener("input", renderOperandPalette);
    dom.prevBtn.addEventListener("click", handlePreviousCommand);
    dom.stepBtn.addEventListener("click", handleNextCommand);
    dom.autoBtn.addEventListener("click", startAutoRun);
    dom.pauseBtn.addEventListener("click", handlePauseCommand);
    dom.animationSpeedSelect.addEventListener("change", () => {
      app.animationSpeed = Number(dom.animationSpeedSelect.value) || 1;
    });
    dom.zoomOutBtn.addEventListener("click", () => adjustCanvasScale(-0.1));
    dom.zoomInBtn.addEventListener("click", () => adjustCanvasScale(0.1));
    dom.zoomResetBtn.addEventListener("click", () => setCanvasScale(1));
    dom.assistPanelBtn.addEventListener("click", () => toggleAssistPanel());
    dom.assistCloseBtn.addEventListener("click", () => toggleAssistPanel(false));
    dom.logPanelBtn.addEventListener("click", () => toggleLogPanel());
    dom.logCloseBtn.addEventListener("click", () => toggleLogPanel(false));
    dom.assistTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setAssistTab(tab.dataset.sideTab);
        toggleAssistPanel(true);
      });
    });
    dom.saveProgramBtn.addEventListener("click", saveProgramFile);
    dom.importProgramInput.addEventListener("change", (event) => importProgramFile(event.target.files?.[0] || null));
    dom.harmonyWorkspaceToggleBtn.addEventListener("click", toggleHarmonyWorkspaceMode);
    dom.harmonyWorkspaceCollapseBtn.addEventListener("click", toggleWorkspaceHarmonyPanel);
    dom.runtimeState?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleRuntimeDetail();
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("#runtimeState, #runtimeDetailPopover")) return;
      toggleRuntimeDetail(false);
    });
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
    dom.harmonyZoomOutBtn?.addEventListener("click", () => adjustHarmonyScale(-0.1));
    dom.harmonyZoomInBtn?.addEventListener("click", () => adjustHarmonyScale(0.1));
    dom.harmonyZoomResetBtn?.addEventListener("click", () => setHarmonyScale(1));
    dom.baseButtons.forEach((button) => {
      button.addEventListener("click", () => setDisplayBase(button.dataset.base));
    });
    renderMacroPalette();
    document.querySelectorAll(".block-chip").forEach(bindPaletteChip);
    initBlockCategoryBrowser();

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
      } else if (payload && payload.kind === "macro") {
        const point = canvasPointFromClient(event.clientX, event.clientY);
        addInstruction(payload.macro, {
          x: Math.max(24, point.x - 140),
          y: Math.max(96, point.y)
        });
      } else if (payload && operandModel.isOperandKind(payload.kind)) {
        addLooseOperand(payload, event);
      }
    });

    dom.programCanvas.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (["instruction", "macro"].includes(ui.readDragPayload(event)?.kind)) showProgramDropHint();
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
      } else if (payload && payload.kind === "macro") {
        const point = canvasPointFromClient(event.clientX, event.clientY);
        addInstruction(payload.macro, {
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
    bindStateAnimationDockDrag();

    dom.resetBtn.addEventListener("click", handleResetCommand);
    document.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("resize", updateRuntimeState);
    window.addEventListener("orientationchange", updateRuntimeState);
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
          y: event.clientY,
          toolbox: Number.parseFloat(styles.getPropertyValue("--toolbox-width")),
          assistant: Number.parseFloat(styles.getPropertyValue("--assistant-width")),
          assistantHeight: dom.assistPanel.getBoundingClientRect().height,
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
        } else if (start.kind === "assistant-height") {
          const dy = event.clientY - start.y;
          const maxHeight = Math.max(260, window.innerHeight - 36);
          const next = ui.clamp(start.assistantHeight + dy, 260, maxHeight);
          root.style.setProperty("--assistant-height", `${next}px`);
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

  function bindStateAnimationDockDrag() {
    const dock = document.getElementById("stateAnimationDock");
    if (!dock) return;
    let drag = null;
    dock.title = "拖动可调整数据演示动画卡片位置；双击恢复默认位置";
    dock.addEventListener("pointerdown", (event) => {
      if (dock.hidden || event.button !== 0) return;
      event.preventDefault();
      dock.setPointerCapture(event.pointerId);
      dock.classList.add("dragging");
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offsetX: app.stateDockOffset.x,
        offsetY: app.stateDockOffset.y
      };
    });
    dock.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const nextX = ui.clamp(drag.offsetX + event.clientX - drag.x, -180, 180);
      const nextY = ui.clamp(drag.offsetY + event.clientY - drag.y, -120, 220);
      setStateDockOffset(nextX, nextY);
    });
    const stopDrag = (event) => {
      if (!drag) return;
      dock.releasePointerCapture(drag.pointerId || event.pointerId);
      dock.classList.remove("dragging");
      drag = null;
    };
    dock.addEventListener("pointerup", stopDrag);
    dock.addEventListener("pointercancel", stopDrag);
    dock.addEventListener("dblclick", () => setStateDockOffset(0, 0));
  }

  function setStateDockOffset(x, y) {
    app.stateDockOffset = { x, y };
    document.documentElement.style.setProperty("--state-dock-x", `${x}px`);
    document.documentElement.style.setProperty("--state-dock-y", `${y}px`);
  }

  function switchView(viewId) {
    toggleRuntimeDetail(false);
    dom.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
    dom.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
    if (viewId !== "harmony") {
      document.documentElement.style.setProperty("--harmony-render-scale", "1");
    } else {
      setHarmonyScale(app.harmonyScale);
    }
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

  function toggleRuntimeDetail(forced) {
    if (!dom.runtimeDetailPopover) return;
    const nextHidden = typeof forced === "boolean" ? !forced : !dom.runtimeDetailPopover.hidden;
    dom.runtimeDetailPopover.hidden = nextHidden;
  }

  function adjustHarmonyScale(delta) {
    setHarmonyScale(ui.clamp(app.harmonyScale + delta, 0.5, 1.35));
  }

  function setHarmonyScale(scale) {
    app.harmonyScale = Math.round(scale * 10) / 10;
    document.documentElement.style.setProperty("--harmony-scale", app.harmonyScale);
    document.documentElement.style.setProperty("--harmony-render-scale", app.harmonyScale);
    if (dom.harmonyZoomReadout) {
      dom.harmonyZoomReadout.textContent = `${Math.round(app.harmonyScale * 100)}%`;
    }
  }

  function handlePreviousCommand() {
    previousStep();
  }

  function handleNextCommand() {
    stepProgram();
  }

  function handleResetCommand() {
    const shouldResetHarmony = app.harmonyWorkspaceMode || app.harmonyStep !== 0;
    if (shouldResetHarmony) setHarmonyStep(0);
    if (app.harmonyWorkspaceMode) {
      app.harmonyWorkspaceCollapsed = false;
      syncWorkspaceHarmonyPanel();
    }
    resetMachine();
  }

  function toggleLogPanel(forced) {
    app.logOpen = typeof forced === "boolean" ? forced : !app.logOpen;
    document.body.classList.toggle("log-panel-open", app.logOpen);
    dom.logPanelBtn.classList.toggle("primary", app.logOpen);
    dom.logPanelBtn.textContent = app.logOpen ? "▼" : "▲";
    dom.logPanelBtn.title = app.logOpen ? "收起执行日志与教学反馈" : "展开执行日志与教学反馈";
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
    return sortRawInstructions(app.rawInstructions);
  }

  function createEditSnapshot(label = "") {
    return {
      label,
      rawInstructions: app.rawInstructions.map((instruction) => ({ ...instruction })),
      looseOperands: app.looseOperands.map((operand) => ({ ...operand })),
      selectedInstructionIds: [...app.selectedInstructionIds],
      selectedLooseOperandIds: [...app.selectedLooseOperandIds],
      initialState: {
        registers: { ...app.initialState.registers },
        memory: { ...app.initialState.memory }
      },
      notes: { ...app.notes },
      displayBase: app.displayBase,
      harmonyStep: app.harmonyStep
    };
  }

  function pushEditHistory(label) {
    app.editHistory.push(createEditSnapshot(label));
    if (app.editHistory.length > 40) app.editHistory.shift();
    syncUndoButton();
  }

  function undoLastEdit() {
    const snapshot = app.editHistory.pop();
    if (!snapshot) return;
    pauseAutoRun();
    clearAnimationTimers();
    stateAnimation.clearStateAnimation();
    app.rawInstructions = snapshot.rawInstructions.map((instruction) => ({ ...instruction }));
    app.looseOperands = snapshot.looseOperands.map((operand) => ({ ...operand }));
    app.selectedInstructionIds = [...snapshot.selectedInstructionIds];
    app.selectedLooseOperandIds = [...snapshot.selectedLooseOperandIds];
    app.initialState = {
      registers: { ...snapshot.initialState.registers },
      memory: { ...snapshot.initialState.memory }
    };
    app.notes = { ...snapshot.notes };
    app.displayBase = snapshot.displayBase;
    app.harmonyStep = snapshot.harmonyStep;
    app.pendingOperand = null;
    syncNotesInputs();
    renderStateTargetSelector();
    resetMachine(false);
    renderAll();
    syncUndoButton();
    renderError(snapshot.label ? `已撤销：${snapshot.label}` : "已撤销上一步编辑。");
  }

  function syncUndoButton() {
    if (!dom.undoEditBtn) return;
    dom.undoEditBtn.disabled = app.editHistory.length === 0 || Boolean(app.timer) || app.isAnimating;
    dom.undoEditBtn.title = app.editHistory.length
      ? `撤销：${app.editHistory[app.editHistory.length - 1].label || "上一步编辑"}`
      : "暂无可撤销的编辑操作";
  }

  function isTextEditingTarget(target = document.activeElement) {
    if (!target) return false;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
    return target.isContentEditable || Boolean(target.closest?.("[contenteditable='true']"));
  }

  function addInstruction(opcode, position = {}) {
    pushEditHistory("add instruction");
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
    return 24;
  }

  function maxInstructionX() {
    const canvas = dom.programCanvas.getBoundingClientRect();
    return Math.max(minBlockX(), canvas.width / app.canvasScale - 430);
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

  function updateInstruction(id, field, value, options = {}) {
    if (options.saveUndo !== false) pushEditHistory("edit instruction");
    app.rawInstructions = app.rawInstructions.map((instruction) => {
      if (instruction.id !== id) return instruction;
      const nextValue = value === "" ? "" : FIELD_KINDS[field] === "immediate" ? Number(value) : value;
      const updated = { ...instruction, [field]: nextValue };
      if (field === "opcode") {
        return { ...createDefaultInstruction(value, { x: instruction.x, y: instruction.y }), id };
      }
      return updated;
    });
    resetMachine(false);
    renderAll();
  }

  function deleteInstruction(id) {
    pushEditHistory("delete instruction");
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
    if (!app.rawInstructions.length && !app.looseOperands.length) return;
    pushEditHistory("clear program");
    app.rawInstructions = [];
    app.looseOperands = [];
    app.selectedLooseOperandIds = [];
    app.pendingOperand = null;
    resetMachine(false);
    renderAll();
  }

  function addLooseOperand(payload, event) {
    pushEditHistory("add loose operand");
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
      pushEditHistory("import case");
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

  function renderMacroPalette() {
    if (!dom.macroPalette) return;
    dom.macroPalette.innerHTML = MACRO_DEFS.map((macro) => `
      <button
        class="block-chip macro-chip ${macro.color}"
        draggable="true"
        data-macro="${escapeHtml(macro.opcode)}"
        title="点击预览说明；拖入编辑区后作为复合指令积木执行"
      >
        <strong>${escapeHtml(macro.shortLabel || macro.opcode)}</strong>
      </button>
    `).join("");
  }

  function bindPaletteChip(chip) {
    if (!chip || chip.dataset.bound === "true") return;
    chip.dataset.bound = "true";
    chip.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) return;
      event.preventDefault();
      previewPaletteInstruction(chip);
    });
    chip.addEventListener("dblclick", (event) => {
      if (!chip.dataset.macro) return;
      event.preventDefault();
      showMacroDetail(chip.dataset.macro);
    });
    chip.addEventListener("contextmenu", (event) => {
      if (!chip.dataset.macro) return;
      event.preventDefault();
      showMacroDetail(chip.dataset.macro);
    });
    if (runtime.isOpenHarmony) {
      chip.removeAttribute("draggable");
      chip.addEventListener("touchstart", (event) => {
        beginOhTouchDrag(event, chip.dataset.macro
          ? { type: "macro", macro: chip.dataset.macro }
          : { type: "instruction", opcode: chip.dataset.opcode }, chip.textContent);
      }, { passive: true });
      chip.addEventListener("mousedown", (event) => {
        beginOhMouseDrag(event, chip.dataset.macro
          ? { type: "macro", macro: chip.dataset.macro }
          : { type: "instruction", opcode: chip.dataset.opcode }, chip.textContent);
      });
      return;
    }
    chip.addEventListener("dragstart", (event) => {
      const payload = chip.dataset.macro
        ? { kind: "macro", macro: chip.dataset.macro }
        : { kind: "instruction", opcode: chip.dataset.opcode };
      event.dataTransfer.setData("application/json", JSON.stringify(payload));
      event.dataTransfer.effectAllowed = "copy";
      showProgramDropHint();
      document.body.classList.add("dragging-instruction");
    });
    chip.addEventListener("dragend", () => {
      hideProgramDropHint();
      document.body.classList.remove("dragging-instruction");
    });
  }

  function initBlockCategoryBrowser() {
    if (!dom.blockPalette || !dom.blockCategoryDetail) return;
    const groups = [...dom.blockPalette.querySelectorAll(".block-group")];
    groups.forEach((group, index) => {
      const firstChip = group.querySelector(".block-chip");
      const title = group.querySelector(":scope > span")?.textContent?.trim() || "指令";
      group.dataset.categoryColor = firstChip ? [...firstChip.classList].find((name) => name !== "block-chip" && name !== "macro-chip") || "arithmetic" : "arithmetic";
      group.classList.add(`${group.dataset.categoryColor}-category-card`);
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      group.addEventListener("click", (event) => {
        if (event.target.closest(".block-chip")) return;
        showBlockCategory(group);
      });
      group.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        showBlockCategory(group);
      });
      if (index === 0) {
        window.setTimeout(() => showBlockCategory(group), 0);
      }
      group.title = `查看${title}类指令`;
    });
  }

  function showBlockCategory(group) {
    if (!dom.blockCategoryDetail) return;
    dom.blockPalette.querySelectorAll(".block-group").forEach((item) => item.classList.toggle("active", item === group));
    const title = group.querySelector(":scope > span")?.textContent?.trim() || "指令";
    const color = group.dataset.categoryColor || "arithmetic";
    const chips = [...group.querySelectorAll(".block-chip")];
    dom.blockCategoryDetail.className = `block-category-detail ${color}`;
    dom.blockCategoryDetail.innerHTML = `
      <div class="category-detail-title">${escapeHtml(title)}</div>
      <div class="category-detail-grid"></div>
    `;
    const grid = dom.blockCategoryDetail.querySelector(".category-detail-grid");
    chips.forEach((chip) => {
      const clone = chip.cloneNode(true);
      clone.dataset.bound = "false";
      bindPaletteChip(clone);
      grid.appendChild(clone);
    });
  }

  function showMacroDetail(macroId) {
    const macro = MACRO_DEFS.find((item) => item.opcode === macroId);
    if (!macro) return;
    const raw = createDefaultInstruction(macro.opcode);
    const steps = macroInstructionSummary(raw).map((step) => `
      <li>
        <code>${escapeHtml(step.assembly)}</code>
        <span>${escapeHtml(step.text)}</span>
      </li>
    `).join("");
    const existing = document.querySelector(".macro-detail-popover");
    if (existing) existing.remove();
    const popover = document.createElement("div");
    popover.className = "macro-detail-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-modal", "true");
    popover.innerHTML = `
      <div class="macro-detail-card">
        <div class="macro-detail-head">
          <div>
            <span>复合指令</span>
            <h3>${escapeHtml(macro.title)}</h3>
          </div>
          <button class="tool-btn macro-detail-close" title="关闭">×</button>
        </div>
        <p>${escapeHtml(macro.description)}</p>
        <ol>${steps}</ol>
        <div class="macro-detail-actions">
          <button class="secondary macro-insert-btn">放入编辑区</button>
        </div>
      </div>
    `;
    const close = () => popover.remove();
    popover.addEventListener("click", (event) => {
      if (event.target === popover) close();
    });
    popover.querySelector(".macro-detail-close").addEventListener("click", close);
    popover.querySelector(".macro-insert-btn").addEventListener("click", () => {
      addInstruction(macro.opcode);
      close();
    });
    document.body.appendChild(popover);
  }

  function showMacroBlockDetail(instruction) {
    const macro = MACRO_DEFS.find((item) => item.opcode === instruction.opcode);
    if (!macro) return;
    const steps = macroInstructionSummary(instruction).map((step) => `
      <li>
        <code>${escapeHtml(step.assembly)}</code>
        <span>${escapeHtml(step.text)}</span>
      </li>
    `).join("");
    const existing = document.querySelector(".macro-detail-popover");
    if (existing) existing.remove();
    const popover = document.createElement("div");
    popover.className = "macro-detail-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-modal", "true");
    popover.innerHTML = `
      <div class="macro-detail-card">
        <div class="macro-detail-head">
          <div>
            <span>复合指令实例</span>
            <h3>${escapeHtml(formatAssembly(instruction))}</h3>
          </div>
          <button class="tool-btn macro-detail-close" title="关闭">×</button>
        </div>
        <p>${escapeHtml(explainInstruction(instruction))}</p>
        <ol>${steps}</ol>
        <div class="macro-detail-actions">
          <button class="secondary macro-expand-real-btn">展开为基础指令</button>
        </div>
      </div>
    `;
    const close = () => popover.remove();
    popover.addEventListener("click", (event) => {
      if (event.target === popover) close();
    });
    popover.querySelector(".macro-detail-close").addEventListener("click", close);
    popover.querySelector(".macro-expand-real-btn").addEventListener("click", () => {
      expandMacroBlock(instruction.id);
      close();
    });
    document.body.appendChild(popover);
  }

  function expandMacroBlock(id) {
    const target = app.rawInstructions.find((instruction) => instruction.id === id);
    if (!target) return;
    const groupId = crypto.randomUUID ? crypto.randomUUID() : `${target.id}-group-${Date.now()}`;
    const macroShortTag = nextMacroShortTag();
    const expandedSource = expandMacroInstruction({ ...target, macroShortTag });
    const expanded = expandedSource.map((instruction, index) => ({
      ...instruction,
      id: crypto.randomUUID ? crypto.randomUUID() : `${target.id}-expanded-${index}`,
      macroGroupId: groupId,
      macroGroupOrder: index,
      macroGroupSize: expandedSource.length,
      x: target.x,
      y: (target.y ?? 96) + index * 86
    }));
    pushEditHistory("expand macro instruction");
    const expandedIds = expanded.map((instruction) => instruction.id);
    app.rawInstructions = app.rawInstructions.flatMap((instruction) => (
      instruction.id === id ? expanded : [instruction]
    ));
    app.selectedInstructionIds = expandedIds;
    app.selectedLooseOperandIds = [];
    resetMachine(false);
    renderAll();
  }

  function nextMacroShortTag() {
    const used = new Set();
    app.rawInstructions.forEach((instruction) => {
      if (instruction.labelTag) used.add(String(instruction.labelTag).slice(0, 3));
      if (instruction.label) used.add(String(instruction.label).slice(0, 3));
    });
    for (let index = 0; index < 1296; index += 1) {
      const tag = `m${index.toString(36)}`;
      if (!used.has(tag)) return tag;
    }
    return "mx";
  }

  function previewPaletteInstruction(chip) {
    const opcode = chip.dataset.macro || chip.dataset.opcode;
    if (!opcode) return;
    const raw = createDefaultInstruction(opcode);
    const def = INSTRUCTION_DEFS[opcode];
    const baseText = `${formatAssembly(raw)}：${explainInstruction(raw)}`;
    if (def?.macro) {
      const steps = macroInstructionSummary(raw).map((step) => `${step.index}. ${step.assembly} => ${step.text}`).join("\n");
      renderError(`${baseText}\n内部展开预览：\n${steps}`);
      return;
    }
    renderError(baseText);
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
    updateRuntimeProof();
    renderHarmony();
  }

  function toggleHarmonyWorkspaceMode(forced) {
    app.harmonyWorkspaceMode = typeof forced === "boolean" ? forced : !app.harmonyWorkspaceMode;
    if (app.harmonyWorkspaceMode) {
      app.harmonyWorkspaceCollapsed = false;
      setAssistTab("machine");
      toggleAssistPanel(true);
    } else {
      app.harmonyWorkspaceCollapsed = false;
    }
    document.body.classList.toggle("harmony-workspace-mode", app.harmonyWorkspaceMode);
    dom.harmonyWorkspaceToggleBtn.classList.toggle("primary", app.harmonyWorkspaceMode);
    dom.harmonyWorkspaceToggleBtn.setAttribute("aria-pressed", String(app.harmonyWorkspaceMode));
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
    dom.harmonyWorkspaceCollapseBtn.textContent = app.harmonyWorkspaceCollapsed ? "+" : "×";
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
    dom.instructionList.querySelectorAll(".instruction-card, .floating-operand-chip, .empty-workspace-hint, .macro-group-frame").forEach((node) => node.remove());
    const errorByIndex = errorsByInstructionIndex(errors);
    if (app.rawInstructions.length === 0) {
      const hint = document.createElement("p");
      hint.className = "hint empty-workspace-hint";
      hint.textContent = "还没有指令。点击左侧积木或“添加指令”开始。";
      dom.instructionList.appendChild(hint);
    }

    orderedInstructions().forEach((instruction, index) => {
      const def = INSTRUCTION_DEFS[instruction.opcode] || INSTRUCTION_DEFS.addi;
      const card = document.createElement("article");
      card.className = `instruction-card ${def.color}-block ${def.macro ? "macro-instruction-card" : ""}`;
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
      const instructionError = errorByIndex.get(index);
      if (instructionError) card.classList.add("error");
      card.innerHTML = `
        ${renderLabelDock(instruction)}
        <div class="instruction-block-head" title="${def.label}：${def.help}">
          <span class="instruction-index">${index}</span>
          <div class="opcode-label">${instruction.opcode.toUpperCase()}</div>
          ${def.macro ? `<button class="macro-expand-btn" title="查看并展开为基础指令">展开</button>` : ""}
          <button class="delete-btn" title="删除指令">×</button>
        </div>
        <span class="workspace-starlight-label">后续通信接入</span>
        <div class="operand-rail">${renderSlots(instruction, def)}</div>
        ${renderInstructionWarning(instruction)}
        ${renderInstructionError(instructionError)}
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
      card.querySelector(".macro-expand-btn")?.addEventListener("click", (event) => {
        event.stopPropagation();
        showMacroBlockDetail(instruction);
      });
      card.querySelector(".delete-btn").addEventListener("click", () => deleteInstruction(instruction.id));
      card.addEventListener("dblclick", (event) => {
        if (!def.macro || event.target.closest(".slot, .label-dock, button, input, .operand-chip")) return;
        showMacroBlockDetail(instruction);
      });
      card.addEventListener("contextmenu", (event) => {
        if (!def.macro) return;
        event.preventDefault();
        showMacroBlockDetail(instruction);
      });
      card.addEventListener("click", (event) => {
        if (Date.now() < suppressClickUntil) return;
        if (event.target.closest(".slot, .label-dock, button, input, .operand-chip")) return;
        renderError(`${formatAssembly(instruction)}：${explainInstruction(instruction)}`);
        if (event.ctrlKey) {
          toggleInstructionSelection(instruction.id, true);
        } else if (!card.classList.contains("dragging")) {
          selectInstruction(instruction.id, false);
        }
      });
      dom.instructionList.appendChild(card);
    });
    renderMacroGroupFrames();
    renderLooseOperands();
    updateCanvasExtent();
  }

  function renderMacroGroupFrames() {
    const groups = new Map();
    app.rawInstructions.forEach((instruction) => {
      if (!instruction.macroGroupId) return;
      if (!groups.has(instruction.macroGroupId)) groups.set(instruction.macroGroupId, []);
      groups.get(instruction.macroGroupId).push(instruction);
    });
    groups.forEach((items) => {
      if (items.length < 2) return;
      const left = Math.min(...items.map((item) => item.x ?? defaultInstructionX()));
      const top = Math.min(...items.map((item) => item.y ?? 96));
      const right = Math.max(...items.map((item) => (item.x ?? defaultInstructionX()) + instructionBlockWidth(item)));
      const bottom = Math.max(...items.map((item) => (item.y ?? 96) + 74));
      const frame = document.createElement("div");
      frame.className = "macro-group-frame";
      frame.style.left = `${left - 12}px`;
      frame.style.top = `${top - 14}px`;
      frame.style.width = `${right - left + 24}px`;
      frame.style.height = `${bottom - top + 28}px`;
      frame.dataset.label = "展开组";
      dom.instructionList.appendChild(frame);
    });
  }

  function updateCanvasExtent() {
    const items = [
      ...app.rawInstructions.map((item) => ({ x: item.x ?? defaultInstructionX(), y: item.y ?? 96, width: instructionBlockWidth(item) + 60, height: 170 })),
      ...app.looseOperands.map((item) => ({ x: item.x ?? minBlockX(), y: item.y ?? 96, width: 140, height: 80 }))
    ];
    const viewportWidth = dom.programCanvas.clientWidth / app.canvasScale;
    const viewportHeight = dom.programCanvas.clientHeight / app.canvasScale;
    const maxRight = Math.max(viewportWidth + 240, ...items.map((item) => item.x + item.width));
    const maxBottom = Math.max(viewportHeight + 320, ...items.map((item) => item.y + item.height));
    const harmonyBottom = app.rawInstructions.length ? 96 + (app.rawInstructions.length - 1) * 176 + 190 : 360;
    dom.instructionList.style.width = `${Math.ceil(maxRight)}px`;
    dom.instructionList.style.height = `${Math.ceil(maxBottom)}px`;
    dom.instructionList.style.setProperty("--softbus-height", `${Math.ceil(Math.max(360, harmonyBottom))}px`);
  }

  function instructionBlockWidth(instruction) {
    return INSTRUCTION_DEFS[instruction.opcode]?.macro ? 410 : 300;
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
      if (!runtime.isOpenHarmony) {
        bindLooseOperandDrag(chip, operand);
      } else {
        const payload = {
          type: "operand",
          id: operand.id,
          kind: operand.kind,
          value: operand.value
        };
        chip.addEventListener("touchstart", (event) => {
          beginOhTouchDrag(event, payload, chip.textContent);
        }, { passive: true });
        chip.addEventListener("mousedown", (event) => {
          beginOhMouseDrag(event, payload, chip.textContent);
        });
      }
      chip.addEventListener("dblclick", () => deleteLooseOperand(operand.id));
      chip.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleLooseOperandSelection(operand.id, event.ctrlKey);
      });
      dom.instructionList.appendChild(chip);
    });
  }

  function renderInstructionWarning(instruction) {
    const writesRd = ["add", "sub", "addi", "and", "or", "xor", "andi", "ori", "xori", "sll", "srl", "sra", "slli", "srli", "srai", "lw", "jal", "jalr", "mv", "li", "neg", "not", "abs", "max", "lwadd"].includes(instruction.opcode);
    if (!writesRd || instruction.rd !== "x0") return "";
    return `<div class="block-warning">x0 是恒零寄存器，写入结果会被忽略。</div>`;
  }

  function renderInstructionError(error) {
    return error ? `<div class="block-error">${escapeHtml(formatReadableTeachingText(error))}</div>` : "";
  }

  function errorsByInstructionIndex(errors) {
    const map = new Map();
    errors.forEach((error) => {
      const match = String(error).match(/第\s*(\d+)\s*条/);
      if (!match) return;
      const index = Number(match[1]) - 1;
      map.set(index, error);
    });
    return map;
  }

  function moveInstruction(id, x, y) {
    pushEditHistory("move instruction");
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
    pushEditHistory("move blocks");
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
      right: (instruction.x ?? 36) + instructionBlockWidth(instruction)
    }));
    return boxes.some((a, index) => boxes.slice(index + 1).some((b) => (
      a.left < b.right - 48 &&
      a.right > b.left + 48 &&
      Math.abs(a.top - b.top) < 34
    )));
  }

  function normalizeInstructionLayout(instructions) {
    const rows = [];
    sortRawInstructions(instructions)
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
        x: minBlockX() + columnIndex * 420,
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
    guide.style.top = `${Math.max(76, y)}px`;
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
        pushEditHistory("fill operand slot");
        app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
        updateInstruction(instruction.id, slot.dataset.field, payload.value, { saveUndo: false });
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
        pushEditHistory("fill label slot");
        app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
        updateInstruction(instruction.id, "labelTag", payload.value, { saveUndo: false });
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
        pushEditHistory("fill label slot");
        app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, app.pendingOperand);
        app.pendingOperand = null;
        updateInstruction(instruction.id, "labelTag", payload.value, { saveUndo: false });
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
    pushEditHistory("fill operand slot");
    app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
    app.pendingOperand = null;
    updateInstruction(instruction.id, slot.dataset.field, payload.value, { saveUndo: false });
    renderError("");
    return true;
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
      if (ohTouchDrag.payload.type === "operand") showOperandTrash();
    }
    moveOhDragGhost(point.x, point.y);
    updateOhDropHints(point.x, point.y);
    if (ohTouchDrag.payload.type === "operand") updateOperandTrashHover(point.x, point.y);
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
      if (ohTouchDrag.payload.type === "operand") showOperandTrash();
    }
    moveOhDragGhost(point.x, point.y);
    updateOhDropHints(point.x, point.y);
    if (ohTouchDrag.payload.type === "operand") updateOperandTrashHover(point.x, point.y);
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
    const overTrash = payload.type === "operand" && isPointerOverOperandTrash(point.x, point.y);
    cancelOhTouchDrag();

    if (payload.type === "instruction" || payload.type === "macro" || payload.type === "move-instruction") {
      const rect = dom.programCanvas.getBoundingClientRect();
      if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        const world = canvasPointFromClient(point.x, point.y);
        const position = {
          x: Math.max(24, world.x - 140),
          y: Math.max(96, world.y)
        };
        if (payload.type === "instruction") {
          addInstruction(payload.opcode, position);
        } else if (payload.type === "macro") {
          addInstruction(payload.macro, position);
        } else {
          moveInstruction(payload.instructionId, ui.snapToGrid(position.x, 12), ui.snapToGrid(position.y, 12));
        }
        renderError("");
      }
      return;
    }

    if (overTrash) {
      deleteOhOperandPayload(payload);
      return;
    }

    const target = findOhDropTarget(payload, point.x, point.y);
    if (!target) {
      if (placeOhOperandInWorkspace(payload, point)) {
        renderError("");
        return;
      }
      selectPendingOperand(payload);
      return;
    }
    pushEditHistory("fill operand slot");
    app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
    app.pendingOperand = null;
    updateInstruction(target.instructionId, target.field, payload.value, { saveUndo: false });
    renderError("");
  }

  function cancelOhTouchDrag() {
    if (ohTouchDrag?.ghost) ohTouchDrag.ghost.remove();
    ohTouchDrag = null;
    clearOhDropHints();
    hideOperandTrash();
    document.body.classList.remove("dragging-label", "dragging-operand");
  }

  function deleteOhOperandPayload(payload) {
    if (!payload || payload.type !== "operand") return;
    if (payload.detach?.instructionId && payload.detach?.field) {
      pushEditHistory("delete attached operand");
      updateInstruction(payload.detach.instructionId, payload.detach.field, "", { saveUndo: false });
      return;
    }
    if (payload.id) {
      deleteLooseOperand(payload.id);
    }
  }

  function placeOhOperandInWorkspace(payload, point) {
    if (!payload || payload.type !== "operand") return false;
    const rect = dom.programCanvas.getBoundingClientRect();
    if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) return false;
    const world = canvasPointFromClient(point.x, point.y);
    const position = {
      x: ui.snapToGrid(Math.max(minBlockX(), Math.min(world.x - 39, maxLooseOperandX())), 12),
      y: ui.snapToGrid(Math.max(96, world.y - 17), 12)
    };
    pushEditHistory(payload.id ? "move loose operand" : payload.detach ? "detach operand to workspace" : "place operand");
    app.rawInstructions = operandModel.detachPayloadSource(app.rawInstructions, payload);
    if (payload.id) {
      app.looseOperands = operandModel.updateLooseOperand(app.looseOperands, payload.id, position);
    } else {
      app.looseOperands = [
        ...app.looseOperands,
        operandModel.createLooseOperand(payload, position)
      ];
    }
    app.pendingOperand = null;
    resetMachine(false);
    renderAll();
    return true;
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
      pushEditHistory("move loose operand");
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
    pushEditHistory("attach loose operand");
    app.rawInstructions = operandModel.attachOperandToInstruction(app.rawInstructions, operand, target, FIELD_KINDS);
    app.looseOperands = operandModel.removeLooseOperand(app.looseOperands, operand.id);
    app.selectedLooseOperandIds = app.selectedLooseOperandIds.filter((id) => id !== operand.id);
    resetMachine(false);
    renderAll();
  }

  function updateLooseOperand(id, patch) {
    pushEditHistory("move loose operand");
    app.looseOperands = operandModel.updateLooseOperand(app.looseOperands, id, patch);
    renderAll();
  }

  function deleteLooseOperand(id) {
    deleteLooseOperands([id]);
  }

  function deleteLooseOperands(ids) {
    if (!ids.length) return;
    pushEditHistory("delete loose operand");
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
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      if (isTextEditingTarget()) return;
      event.preventDefault();
      undoLastEdit();
      return;
    }
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    if (isTextEditingTarget()) return;
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

    dom.assemblyPreview.textContent = orderedInstructions().map((instruction, index) => `${index}: ${formatAssembly(instruction)}`).join("\n") || "暂无指令";
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
    if (!ids.length) return;
    pushEditHistory("delete instructions");
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
        width: instructionBlockWidth(instruction),
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
    const visibleRegisters = REGISTERS;
    dom.registerGrid.innerHTML = chunk(visibleRegisters, 4)
      .map((row) => `
        <div class="state-row-label">${row[0]}</div>
        ${row.map((name) => {
          const initialized = Object.prototype.hasOwnProperty.call(app.initialState.registers, name);
          return `<button class="reg-cell ${app.changedRegisters.includes(name) ? "changed" : ""} ${initialized ? "initialized" : ""}" data-type="register" data-name="${name}" title="${registerTitle(name)}"><strong>${formatValue(app.state.registers[name])}</strong></button>`;
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
          return `<button class="mem-cell ${app.changedMemoryAddresses.includes(address) ? "changed" : ""} ${initialized ? "initialized" : ""}" data-type="memory" data-name="${address}" title="存储器[${address}]"><strong>${formatValue(app.state.memory[address])}</strong></button>`;
        }).join("")}
      `)
      .join("");
    renderGpioPanel();
    bindStateCells();
    dom.prevBtn.disabled = app.stateHistory.length === 0;
  }

  function renderGpioPanel() {
    if (!dom.gpioPanel) return;
    const x1 = Number(app.state.registers.x1 || 0);
    const running = Boolean(app.timer || app.isAnimating);
    const hasError = Boolean(parseProgram(app.rawInstructions).errors.length);
    const halted = Boolean(app.state.halted);
    const leds = [
      {
        key: "x1",
        label: "LED-X1",
        state: x1 !== 0,
        text: `x1=${x1}`,
        note: "x1 非 0 时点亮，可模拟外接 GPIO LED"
      },
      {
        key: "run",
        label: "RUN",
        state: running,
        text: running ? "执行中" : halted ? "已结束" : "待运行",
        note: "模拟外部运行状态指示灯"
      },
      {
        key: "err",
        label: "ERR",
        state: hasError,
        text: hasError ? "异常" : "正常",
        note: "解析错误或字段异常时点亮"
      }
    ];
    dom.gpioPanel.innerHTML = leds.map((led) => `
      <div class="gpio-led-card ${led.state ? "on" : "off"}" title="${escapeHtml(led.note)}">
        <span class="gpio-led-bulb" aria-hidden="true"></span>
        <strong>${escapeHtml(led.label)}</strong>
        <em>${escapeHtml(led.text)}</em>
      </div>
    `).join("");
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
      .map((value) => `<option value="${value}" ${String(value) === current ? "selected" : ""}>${targetType === "memory" ? `@${value}` : registerOptionLabel(value)}</option>`)
      .join("");
  }

  function applyInitialStateValue() {
    try {
      pushEditHistory("set initial state");
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
    pushEditHistory("clear initial state");
    app.initialState = machineState.clearInitialValue(app.initialState, dom.stateTargetType.value, dom.stateTargetName.value);
    resetMachine(false);
    renderAll();
    renderStateDetail(dom.stateTargetType.value, dom.stateTargetName.value);
  }

  function bindStateCells() {
    document.querySelectorAll(".reg-cell, .mem-cell").forEach((cell) => {
      cell.addEventListener("mouseenter", () => {
        renderStateDetail(cell.dataset.type, cell.dataset.name);
      });
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
    const label = type === "register" ? registerOptionLabel(name) : `存储器[${name}]`;
    const tempNote = type === "register" && isTempRegister(name)
      ? "。该寄存器属于 RISC-V ABI 临时寄存器池，后续复合指令内部临时运算优先使用它"
      : "";
    dom.selectedStateDetail.textContent = `${label} 当前值：${formatValue(current || 0)}；初始值：${initial === undefined ? "默认" : formatValue(initial)}${tempNote}`;
  }

  function formatValue(value) {
    return ui.formatValue(value, app.displayBase);
  }

  function renderLog() {
    dom.executionLog.innerHTML = app.state.logs
      .map((log) => `<li><strong>PC ${log.pc}</strong> ${escapeHtml(log.assembly)}<br />${escapeHtml(formatReadableTeachingText(log.explanation))}</li>`)
      .join("");
    dom.executionLog.scrollTop = dom.executionLog.scrollHeight;
  }

  function renderError(error) {
    dom.errorBox.hidden = !error;
    dom.errorBox.textContent = formatReadableTeachingText(error || "");
  }

  function formatReadableTeachingText(text) {
    return String(text || "")
      .replace(/([。！？；])(?=\S)/g, "$1 ")
      .replace(/([.!?;])(?=\S)/g, "$1 ");
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
      app.lastExecutedInstructionId = result.instruction?.sourceBlockId || result.instruction?.id || null;
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
    const shouldShowDataAnimation = app.harmonyWorkspaceMode || (app.assistOpen && app.activeAssistTab === "machine");
    if (app.harmonyWorkspaceMode) {
      setAssistTab("machine");
      toggleAssistPanel(true);
      setHarmonyStep(app.harmonyStep + 1);
    }
    app.isAnimating = true;
    app.animationProgress = { index: previousPc, total, fraction: 0, label: "start" };
    updateExecutionProgress();
    updateRunState();
    if (shouldShowDataAnimation) {
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
    } else {
      await waitForAnimationDuration(duration);
    }
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
      document.querySelector("#writebackNode strong").textContent = instruction.rd || (instruction.opcode === "sw" ? "存储器" : "rd");
      document.querySelector("#aluNode strong").textContent = result.animationPlan.find((item) => typeof item === "string" && item.includes("=")) || datapath.aluLabel(instruction);
      document.querySelector("#memoryNode strong").textContent = datapath.memoryLabel(instruction);
      document.querySelector("#branchNode strong").textContent = datapath.branchLabel(instruction);
      if (shouldShowDataAnimation) playAnimationFrames(result);
    }
  }

  function waitForAnimationDuration(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, duration)));
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
    return Math.round(6000 / (app.animationSpeed || 1));
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
    if (stepExplanation) stepExplanation.textContent = "点击“单步执行”，观察寄存器、ALU、存储器和 PC 的变化。";
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

  function handlePauseCommand() {
    if (app.isAnimating && stateAnimation.toggleStateAnimationPause?.()) {
      updateRunState();
      return;
    }
    if (!app.timer && !app.state.halted) {
      startAutoRun();
      return;
    }
    pauseAutoRun();
  }

  function updateRunState() {
    const animationPaused = Boolean(stateAnimation.isStateAnimationPaused?.());
    const readyToRun = !app.timer && !app.isAnimating && !app.state.halted;
    const showRunIcon = animationPaused || readyToRun;
    document.body.classList.toggle("is-running", Boolean(app.timer));
    dom.prevBtn.disabled = app.stateHistory.length === 0 || Boolean(app.timer) || app.isAnimating;
    dom.stepBtn.disabled = app.state.halted || Boolean(app.timer) || app.isAnimating;
    dom.autoBtn.disabled = app.state.halted || Boolean(app.timer);
    dom.pauseBtn.disabled = app.state.halted;
    dom.pauseBtn.title = showRunIcon ? "开始 / 继续" : "暂停";
    dom.pauseBtn.setAttribute("aria-label", showRunIcon ? "开始 / 继续" : "暂停");
    const pauseIcon = dom.pauseBtn.querySelector(".line-icon");
    if (pauseIcon) {
      pauseIcon.classList.toggle("icon-pause", !showRunIcon);
      pauseIcon.classList.toggle("icon-run", showRunIcon);
    }
    if (app.isAnimating && animationPaused) {
      dom.runState.textContent = "动画暂停";
    } else if (app.isAnimating) {
      dom.runState.textContent = "动画中";
    } else if (app.timer) {
      dom.runState.textContent = "自动执行中";
    } else if (app.state.halted) {
      dom.runState.textContent = "已结束";
    } else {
      dom.runState.textContent = "就绪";
    }
    syncUndoButton();
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
        <strong>当前没有可映射的指令积木</strong>
        <span>请先回到工作台添加指令积木，再查看后续硬件化接入路线。</span>
      `;
      dom.atomCanvas.innerHTML = `
        <div class="empty-hardware-state">
          <strong>等待软件积木输入</strong>
          <span>指令积木出现后，这里会显示它如何映射为后续视觉识别或智能积木节点数据。</span>
        </div>
      `;
      renderHarmonyStatus([], 0);
      return;
    }

    const labels = instructions.filter((instruction) => instruction.labelTag).length;
    const operandCount = instructions.reduce((sum, instruction) => sum + harmonyOperandsForInstruction(instruction).length, 0);
    const errorCount = errorByIndex.size;
    dom.harmonyProgramSummary.innerHTML = `
      <strong>${instructions.length} 个软件指令积木已生成</strong>
      <span>${operandCount} 个操作数小积木可映射，${labels} 个标签帽可映射。</span>
      <span class="${errorCount ? "harmony-error-text" : ""}">${errorCount ? `${errorCount} 个积木存在错误，已在图中标红。` : "当前汇编结构有效，可继续查看接入路线。"}</span>
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
      dom.workspaceHarmonySummary.innerHTML = `<strong>暂无接入路线视图</strong><span>先在左侧工作台添加指令积木。</span>`;
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
    return ["OH 应用启动", "教学模拟执行", "视觉识别", "智能积木", "软总线设备"][step] || "OH 应用启动";
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
        <div class="starlight-link" aria-label="后续通信链路">
          <i class="starlight-pulse pulse-out" aria-hidden="true"></i>
          <i class="starlight-pulse pulse-back" aria-hidden="true"></i>
          <span class="starlight-icon">${renderStarlightIcon()}</span>
          <span>后续通信链路</span>
        </div>
        <div class="hardware-instruction">
          ${labelTag}
          <div class="hardware-main-block">
            <span class="hardware-led-strip" aria-label="积木状态灯">
              <i class="hardware-led green"></i>
              <i class="hardware-led ${error ? "red on" : "red"}"></i>
              <i class="hardware-led blue on"></i>
            </span>
            <span>软件积木映射 ${index + 1}</span>
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
      ? "寄存器小积木"
      : operand.kind === "immediate"
        ? "立即数/地址小积木"
        : "标签小积木";
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
      "已完成：OpenHarmony 应用在香橙派 RV2 上启动，ArkWeb 加载本地教学页面。",
      "已完成：RISC-V 教学模拟器读取工作台指令，并更新寄存器、存储器和 PC 状态。",
      "下一阶段：摄像头识别真实积木画面，生成与当前工作台一致的数字孪生布局。",
      "后续接入：少量智能积木模块向 OpenHarmony 主控上报身份、位置和连接状态。",
      "设计态：软总线统一管理智能积木、LED、语音或屏幕等反馈设备。"
    ];
    dom.harmonyFlowList.innerHTML = [
      "[已完成] OpenHarmony Stage 应用运行在香橙派 RV2。",
      "[已完成] ArkWeb 加载本地 RISC-V 教学软件。",
      "[已完成] 教学模拟器执行指令并更新机器状态。",
      "[下一阶段] 摄像头识别实体积木拼接画面。",
      "[设计态] 软总线发现智能积木节点，并同步拓扑或外设反馈。"
    ].map((item, index) => `<li class="${index === app.harmonyStep ? "active" : ""}">${item}</li>`).join("");

    const capabilities = [
      stepLabels[app.harmonyStep],
      `当前工作台共有 ${instructions.length} 条指令积木，可映射为后续实体积木节点。`,
      `当前共有 ${operandCount} 个操作数小积木，后续可来自视觉识别或智能节点上报。`,
      "工作台中拖动、添加、删除或修改操作数后，本图会随 renderAll 自动更新。"
    ];
    if (app.harmonyStep >= 2) {
      capabilities.push("通信链路图标表示后续接入位置，不代表当前已完成真实星闪或软总线通信。");
    }
    if (instructions.some((instruction) => instruction.labelTag || instruction.label)) {
      capabilities.push("标签帽和标签引用会作为独立小积木参与映射，适合解释分支跳转目标。");
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
        <article class="example-card ${exampleCategoryClass(example)}">
          <span class="example-category">${escapeHtml(example.category || exampleCategoryName(example))}</span>
          <h3>${example.title}</h3>
          <p>${example.description}</p>
          <button data-example="${example.id}">加载案例</button>
        </article>
      `
    ).join("");

    dom.exampleList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const example = EXAMPLES.find((item) => item.id === button.dataset.example);
        pushEditHistory("load example");
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

  function exampleCategoryName(example) {
    const opcode = example.instructions?.[0]?.opcode || "";
    const def = INSTRUCTION_DEFS[opcode];
    const color = def?.color || "arithmetic";
    return {
      arithmetic: "算术",
      logic: "逻辑",
      shift: "移位",
      memory: "访存",
      branch: "分支",
      jump: "跳转",
      macro: "复合"
    }[color] || "算术";
  }

  function exampleCategoryClass(example) {
    const name = example.category || exampleCategoryName(example);
    return {
      "算术": "arithmetic",
      "逻辑": "logic",
      "移位": "shift",
      "访存": "memory",
      "分支": "branch",
      "跳转": "jump",
      "复合": "macro"
    }[name] || "arithmetic";
  }

  init();
})();
