(function () {
  const vision = window.RiscVVision;
  const bridge = window.RiscVAppVisionBridge;
  if (!vision || !bridge) return;

  const dom = {
    trigger: document.getElementById("visionCaptureBtn"),
    backdrop: document.getElementById("visionDialogBackdrop"),
    close: document.getElementById("visionCloseBtn"),
    cancel: document.getElementById("visionCancelBtn"),
    cameraSelect: document.getElementById("visionCameraSelect"),
    startCamera: document.getElementById("visionStartCameraBtn"),
    captureFrame: document.getElementById("visionCaptureFrameBtn"),
    imageInput: document.getElementById("visionImageInput"),
    video: document.getElementById("visionVideo"),
    preview: document.getElementById("visionPreviewCanvas"),
    emptyState: document.getElementById("visionEmptyState"),
    ocrToggle: document.getElementById("visionOcrToggle"),
    analyze: document.getElementById("visionAnalyzeBtn"),
    importMode: document.getElementById("visionImportMode"),
    status: document.getElementById("visionStatus"),
    warnings: document.getElementById("visionWarnings"),
    resultList: document.getElementById("visionResultList"),
    apply: document.getElementById("visionApplyBtn")
  };

  const session = {
    stream: null,
    sourceCanvas: document.createElement("canvas"),
    result: null,
    drafts: [],
    busy: false
  };

  function init() {
    dom.trigger?.addEventListener("click", openDialog);
    dom.close?.addEventListener("click", closeDialog);
    dom.cancel?.addEventListener("click", closeDialog);
    dom.backdrop?.addEventListener("click", (event) => {
      if (event.target === dom.backdrop) closeDialog();
    });
    dom.startCamera?.addEventListener("click", startCamera);
    dom.captureFrame?.addEventListener("click", captureFrame);
    dom.imageInput?.addEventListener("change", (event) => loadImageFile(event.target.files?.[0] || null));
    dom.analyze?.addEventListener("click", analyzePhoto);
    dom.apply?.addEventListener("click", applyResult);
    dom.resultList?.addEventListener("click", handleResultClick);
    dom.resultList?.addEventListener("change", handleResultChange);
    dom.resultList?.addEventListener("input", handleResultInput);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dom.backdrop?.hidden) closeDialog();
    });
  }

  async function openDialog() {
    dom.backdrop.hidden = false;
    document.body.classList.add("vision-dialog-open");
    setStatus("请选择摄像头或上传积木照片。");
    await refreshCameraList();
  }

  function closeDialog() {
    stopCamera();
    dom.backdrop.hidden = true;
    document.body.classList.remove("vision-dialog-open");
  }

  async function refreshCameraList() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      dom.cameraSelect.innerHTML = '<option value="">当前环境不支持摄像头枚举</option>';
      dom.startCamera.disabled = true;
      return;
    }
    try {
      const previous = dom.cameraSelect.value;
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
      dom.cameraSelect.innerHTML = devices.length
        ? devices.map((device, index) => `<option value="${escapeHtml(device.deviceId)}">${escapeHtml(device.label || `摄像头 ${index + 1}`)}</option>`).join("")
        : '<option value="">未发现摄像头</option>';
      if (devices.some((device) => device.deviceId === previous)) dom.cameraSelect.value = previous;
      dom.startCamera.disabled = !devices.length;
    } catch (error) {
      dom.cameraSelect.innerHTML = '<option value="">无法读取摄像头列表</option>';
      dom.startCamera.disabled = true;
      setStatus(readableCameraError(error), true);
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("当前环境无法调用摄像头，请改用“上传照片”。", true);
      return;
    }
    stopCamera();
    setStatus("正在请求摄像头权限…");
    try {
      const deviceId = dom.cameraSelect.value;
      const constraints = {
        audio: false,
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } })
        }
      };
      session.stream = await navigator.mediaDevices.getUserMedia(constraints);
      dom.video.srcObject = session.stream;
      await dom.video.play();
      dom.video.hidden = false;
      dom.preview.hidden = true;
      dom.emptyState.hidden = true;
      dom.captureFrame.disabled = false;
      dom.startCamera.textContent = "重新取景";
      setStatus("摄像头已连接。请让所有标签正对镜头，再点击“拍照”。");
      await refreshCameraList();
    } catch (error) {
      stopCamera();
      setStatus(readableCameraError(error), true);
    }
  }

  function stopCamera() {
    session.stream?.getTracks().forEach((track) => track.stop());
    session.stream = null;
    if (dom.video) dom.video.srcObject = null;
    dom.captureFrame.disabled = true;
    dom.startCamera.textContent = "打开摄像头";
  }

  function captureFrame() {
    const width = dom.video.videoWidth;
    const height = dom.video.videoHeight;
    if (!width || !height) {
      setStatus("摄像头画面尚未准备好，请稍后再试。", true);
      return;
    }
    setSourceSize(width, height);
    session.sourceCanvas.getContext("2d").drawImage(dom.video, 0, 0, width, height);
    showSourcePreview();
    setStatus("照片已获取。可以开始识别，或重新取景再拍一次。");
  }

  async function loadImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("请选择 JPG、PNG、WebP 等图片文件。", true);
      return;
    }
    try {
      const image = await loadImage(URL.createObjectURL(file));
      const maxSide = 2400;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      setSourceSize(width, height);
      session.sourceCanvas.getContext("2d").drawImage(image, 0, 0, width, height);
      showSourcePreview();
      setStatus(`已载入 ${file.name}，可以开始识别。`);
    } catch {
      setStatus("图片读取失败，请重新选择。", true);
    } finally {
      dom.imageInput.value = "";
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image load failed"));
      };
      image.src = url;
    });
  }

  function setSourceSize(width, height) {
    session.sourceCanvas.width = width;
    session.sourceCanvas.height = height;
    session.result = null;
    session.drafts = [];
    dom.apply.disabled = true;
    dom.warnings.hidden = true;
    dom.resultList.innerHTML = '<div class="vision-result-empty">照片已准备好，点击“开始识别”。</div>';
  }

  function showSourcePreview() {
    dom.preview.width = session.sourceCanvas.width;
    dom.preview.height = session.sourceCanvas.height;
    dom.preview.getContext("2d").drawImage(session.sourceCanvas, 0, 0);
    dom.video.hidden = true;
    dom.preview.hidden = false;
    dom.emptyState.hidden = true;
    dom.analyze.disabled = false;
  }

  async function analyzePhoto() {
    if (!session.sourceCanvas.width || session.busy) return;
    setBusy(true);
    session.result = null;
    session.drafts = [];
    dom.apply.disabled = true;
    dom.warnings.hidden = true;
    dom.resultList.innerHTML = '<div class="vision-result-empty"><span class="vision-spinner"></span>正在分析积木结构…</div>';
    try {
      const result = await vision.analyzeCanvas(session.sourceCanvas, {
        runOcr: dom.ocrToggle.checked,
        instructionDefinitions: bridge.instructionDefinitions,
        onProgress: (message) => setStatus(message)
      });
      session.result = result;
      session.drafts = result.drafts;
      drawResultPreview();
      renderWarnings(result.warnings);
      renderDrafts();
      updateApplyState();
      const instructionCount = result.drafts.length;
      const blockCount = result.detections.length;
      const groupedIssues = result.drafts.map((draft) => partitionDraftIssues(draft.errors));
      const errorCount = groupedIssues.filter((group) => group.errors.length).length;
      const warningCount = groupedIssues.filter((group) => group.warnings.length).length;
      let status = `检测到 ${blockCount} 块积木，重建 ${instructionCount} 条指令。请核对后导入。`;
      if (errorCount) {
        status = `检测到 ${blockCount} 块积木，其中 ${errorCount} 条指令存在必须修正的语法错误，已标红。`;
      } else if (warningCount) {
        status = `检测到 ${blockCount} 块积木，其中 ${warningCount} 条指令存在结构警示；可删除多余积木或直接导入。`;
      }
      setStatus(status, instructionCount === 0 || errorCount > 0);
    } catch (error) {
      dom.resultList.innerHTML = '<div class="vision-result-empty error">识别失败，请调整角度、光线或手动上传其他照片。</div>';
      setStatus(error instanceof Error ? error.message : "识别失败。", true);
    } finally {
      setBusy(false);
    }
  }

  function drawResultPreview() {
    dom.preview.width = session.sourceCanvas.width;
    dom.preview.height = session.sourceCanvas.height;
    const context = dom.preview.getContext("2d");
    context.drawImage(session.sourceCanvas, 0, 0);
    vision.drawDetections(dom.preview, session.result);
  }

  function renderWarnings(warnings) {
    const filtered = (warnings || []).filter(Boolean);
    dom.warnings.hidden = filtered.length === 0;
    dom.warnings.innerHTML = filtered.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("");
  }

  function partitionDraftIssues(issues) {
    const grouped = { errors: [], warnings: [] };
    (issues || []).filter(Boolean).forEach((issue) => {
      const target = vision.isBlockingDraftIssue(issue) ? grouped.errors : grouped.warnings;
      target.push(issue);
    });
    return grouped;
  }

  function renderDrafts() {
    if (!session.drafts.length) {
      dom.resultList.innerHTML = '<div class="vision-result-empty">没有检测到可导入的长条指令积木。</div>';
      return;
    }
    dom.resultList.innerHTML = session.drafts.map((draft, index) => renderDraftCard(draft, index)).join("");
  }

  function renderLabelOptions(selected, includeNone = false) {
    const value = String(selected || "").toLowerCase();
    const emptyOption = includeNone
      ? `<option value="" ${value ? "" : "selected"}>无</option>`
      : `<option value="" disabled ${value ? "" : "selected"}>请选择标签</option>`;
    const labelOptions = vision.PHYSICAL_LABEL_NAMES
      .map((label) => `<option value="${escapeHtml(label)}" ${value === label ? "selected" : ""}>${escapeHtml(label)}</option>`)
      .join("");
    return emptyOption + labelOptions;
  }

  function renderDraftCard(draft, index) {
    const definition = bridge.instructionDefinitions[draft.opcode];
    const fields = definition?.fields || [];
    const categoryOpcodes = vision.CATEGORY_OPCODES[draft.category] || bridge.baseOpcodes;
    const options = (draft.opcode ? "" : '<option value="" selected disabled>请选择指令</option>') + categoryOpcodes
      .filter((opcode) => bridge.baseOpcodes.includes(opcode))
      .map((opcode) => `<option value="${opcode}" ${opcode === draft.opcode ? "selected" : ""}>${opcode.toUpperCase()}</option>`)
      .join("");
    const issues = partitionDraftIssues(draft.errors);
    const errorText = issues.errors.join(" ");
    const warningText = issues.warnings.join(" ");
    return `
      <article class="vision-draft-card vision-category-${escapeHtml(draft.category)} ${errorText ? "has-error" : ""} ${warningText ? "has-warning" : ""}" data-vision-index="${index}">
        <div class="vision-draft-head">
          <span class="vision-draft-index">${index + 1}</span>
          <label>
            指令
            <select data-vision-opcode>${options}</select>
          </label>
          <label class="vision-label-tag-field">
            左上定义标签
            <select data-vision-label-tag>${renderLabelOptions(draft.labelTag, true)}</select>
          </label>
          <button class="vision-delete-instruction" data-vision-delete-instruction type="button" title="删除这条识别指令">删除指令</button>
        </div>
        <div class="vision-draft-fields">
          ${fields.map((field, fieldIndex) => renderDraftField(draft, field, fieldIndex)).join("")}
        </div>
        ${renderDetectedOperands(draft)}
        <div class="vision-draft-error" ${errorText ? "" : "hidden"}>${escapeHtml(errorText)}</div>
        <div class="vision-draft-warning" ${warningText ? "" : "hidden"}>${escapeHtml(warningText)}</div>
      </article>
    `;
  }

  function renderDraftField(draft, field, fieldIndex) {
    const kind = fieldKind(field);
    const detected = draft.values[field] !== undefined && draft.values[field] !== ""
      ? draft.values[field]
      : draft.sequenceValues[fieldIndex] ?? "";
    if (kind === "label") {
      return `
        <label>
          ${escapeHtml(fieldDisplayName(field))}
          <select data-vision-field="${escapeHtml(field)}">${renderLabelOptions(detected)}</select>
        </label>
      `;
    }
    const type = kind === "immediate" ? "number" : "text";
    const placeholder = kind === "register" ? "x0～x31" : "整数";
    return `
      <label>
        ${escapeHtml(fieldDisplayName(field))}
        <input data-vision-field="${escapeHtml(field)}" type="${type}" value="${escapeHtml(detected)}" placeholder="${placeholder}" />
      </label>
    `;
  }

  function renderDetectedOperands(draft) {
    const operands = draft.operands || [];
    const items = operands.map((operand, operandIndex) => {
      const value = operand.value !== "" && operand.value !== undefined
        ? operand.value
        : operand.rawText || "未识别";
      return `
        <button class="vision-detected-block kind-${escapeHtml(operand.kind)}" data-vision-delete-operand="${operandIndex}" type="button" title="删除这个下挂积木">
          <span>${escapeHtml(operandKindDisplayName(operand.kind))}</span>
          <strong>${escapeHtml(value)}</strong>
          <i aria-hidden="true">×</i>
        </button>
      `;
    }).join("");
    return `
      <div class="vision-detected-operands">
        <span>检测到的下挂积木（点击 × 删除）</span>
        <div>${items || '<em>无下挂积木</em>'}</div>
      </div>
    `;
  }

  function handleResultClick(event) {
    const row = event.target.closest("[data-vision-index]");
    if (!row) return;
    const draftIndex = Number(row.dataset.visionIndex);
    if (event.target.closest("[data-vision-delete-instruction]")) {
      session.drafts.splice(draftIndex, 1);
      renderDrafts();
      updateApplyState();
      setStatus(session.drafts.length ? "已删除一条识别指令，请继续核对。" : "识别结果已清空，请重新识别或取消。", !session.drafts.length);
      return;
    }
    const operandButton = event.target.closest("[data-vision-delete-operand]");
    if (!operandButton) return;
    const draft = session.drafts[draftIndex];
    syncDraftFromRow(row, draft);
    const operandIndex = Number(operandButton.dataset.visionDeleteOperand);
    if (!Number.isInteger(operandIndex) || operandIndex < 0 || operandIndex >= draft.operands.length) return;
    draft.operands.splice(operandIndex, 1);
    const definition = bridge.instructionDefinitions[draft.opcode];
    draft.values = vision.mapFieldsFromOperands(definition?.fields || [], draft.operands).values;
    draft.sequenceValues = draft.operands.map((operand) => operand.value);
    validateDraft(draft);
    renderDrafts();
    updateApplyState();
    setStatus(`已删除第 ${draftIndex + 1} 条指令的一个下挂积木，请继续核对。`);
  }
  function handleResultChange(event) {
    const row = event.target.closest("[data-vision-index]");
    if (!row) return;
    const index = Number(row.dataset.visionIndex);
    syncDraftFromRow(row, session.drafts[index]);
    const draft = session.drafts[index];
    if (!event.target.matches("[data-vision-opcode]")) {
      updateDraftCardValidation(row, draft);
      return;
    }
    draft.opcode = event.target.value;
    const definition = bridge.instructionDefinitions[draft.opcode];
    draft.values = vision.mapFieldsFromOperands(definition?.fields || [], draft.operands).values;
    validateDraft(draft);
    renderDrafts();
    updateApplyState();
  }

  function validateDraft(draft) {
    const definition = bridge.instructionDefinitions[draft.opcode];
    draft.errors = vision.validateDraftOperands(draft.opcode, definition, draft.operands || [], draft.values || {});
    return draft.errors;
  }

  function updateApplyState() {
    session.drafts.forEach(validateDraft);
    const canApply = !session.busy && vision.canApplyDrafts(session.drafts);
    dom.apply.disabled = !canApply;
    dom.apply.setAttribute("aria-disabled", String(!canApply));
    dom.apply.title = canApply
      ? "将核对后的结果应用到指令编辑区"
      : session.drafts.length
        ? "请先修正所有红色语法错误"
        : "请先完成照片识别";
  }

  function updateDraftCardValidation(row, draft) {
    const issues = partitionDraftIssues(validateDraft(draft));
    row.classList.toggle("has-error", issues.errors.length > 0);
    row.classList.toggle("has-warning", issues.warnings.length > 0);
    const errorBox = row.querySelector(".vision-draft-error");
    if (errorBox) {
      errorBox.hidden = issues.errors.length === 0;
      errorBox.textContent = issues.errors.join(" ");
    }
    const warningBox = row.querySelector(".vision-draft-warning");
    if (warningBox) {
      warningBox.hidden = issues.warnings.length === 0;
      warningBox.textContent = issues.warnings.join(" ");
    }
    updateApplyState();
  }

  function handleResultInput(event) {
    const row = event.target.closest("[data-vision-index]");
    if (!row) return;
    const draft = session.drafts[Number(row.dataset.visionIndex)];
    syncDraftFromRow(row, draft);
    updateDraftCardValidation(row, draft);
  }

  function syncDraftFromRow(row, draft) {
    if (!draft) return;
    draft.opcode = row.querySelector("[data-vision-opcode]")?.value || draft.opcode;
    draft.labelTag = row.querySelector("[data-vision-label-tag]")?.value.trim() || "";
    row.querySelectorAll("[data-vision-field]").forEach((input) => {
      draft.values[input.dataset.visionField] = input.value.trim();
    });
  }

  function collectInstructions() {
    dom.resultList.querySelectorAll("[data-vision-index]").forEach((row) => {
      const draft = session.drafts[Number(row.dataset.visionIndex)];
      syncDraftFromRow(row, draft);
      updateDraftCardValidation(row, draft);
    });
    return session.drafts.map((draft, index) => {
      const definition = bridge.instructionDefinitions[draft.opcode];
      const issues = partitionDraftIssues(validateDraft(draft));
      if (issues.errors.length) throw new Error(`第 ${index + 1} 条：${issues.errors[0]}`);
      if (!definition || definition.macro) throw new Error(`第 ${index + 1} 条指令名称无效。`);
      const instruction = { opcode: draft.opcode };
      const labelTag = validateLabel(draft.labelTag, `第 ${index + 1} 条定义标签`);
      if (labelTag) instruction.labelTag = labelTag;
      definition.fields.forEach((field) => {
        const value = draft.values[field];
        const kind = fieldKind(field);
        if (kind === "register") {
          const normalized = vision.normalizeRegister(value);
          if (!normalized) throw new Error(`第 ${index + 1} 条指令的 ${field} 必须是 x0～x31。`);
          instruction[field] = normalized;
        } else if (kind === "immediate") {
          const normalized = vision.normalizeImmediate(value);
          if (!Number.isInteger(normalized)) throw new Error(`第 ${index + 1} 条指令的 ${field} 必须是整数。`);
          instruction[field] = normalized;
        } else {
          const normalized = validateLabel(value, `第 ${index + 1} 条目标标签`);
          if (!normalized) throw new Error(`第 ${index + 1} 条指令缺少目标标签。`);
          instruction[field] = normalized;
        }
      });
      return instruction;
    });
  }

  function applyResult() {
    const firstInvalidIndex = session.drafts.findIndex((draft) => partitionDraftIssues(validateDraft(draft)).errors.length);
    if (firstInvalidIndex >= 0) {
      setStatus("无法应用：请先补全或修正红色语法错误；黄色结构警示不会阻止导入。", true);
      const invalidCard = dom.resultList.querySelector(`[data-vision-index="${firstInvalidIndex}"]`);
      invalidCard?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
      invalidCard?.querySelector("input, select")?.focus?.();
      return;
    }
    try {
      const instructions = collectInstructions();
      const count = bridge.applyInstructions(instructions, dom.importMode.value);
      closeDialog();
      setStatus(`已将 ${count} 条识别指令导入工作台。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "识别结果无法导入。", true);
    }
  }

  function validateLabel(value, description) {
    const normalized = vision.normalizeLabel(value);
    if (String(value || "").trim() && !normalized) throw new Error(`${description}格式无效。`);
    return normalized;
  }

  function fieldKind(field) {
    if (["rd", "rs1", "rs2", "rs3"].includes(field)) return "register";
    if (["imm", "shamt"].includes(field)) return "immediate";
    return "label";
  }

  function fieldDisplayName(field) {
    return {
      rd: "目标寄存器 rd",
      rs1: "源寄存器 rs1",
      rs2: "源寄存器 rs2",
      rs3: "源寄存器 rs3",
      imm: "立即数 imm",
      shamt: "移位量 shamt",
      label: "目标标签"
    }[field] || field;
  }

  function operandKindDisplayName(kind) {
    return {
      register: "寄存器",
      immediate: "立即数",
      label: "标签"
    }[kind] || "积木";
  }

  function setBusy(busy) {
    session.busy = busy;
    dom.analyze.disabled = busy || !session.sourceCanvas.width;
    dom.startCamera.disabled = busy;
    dom.captureFrame.disabled = busy || !session.stream;
    dom.imageInput.disabled = busy;
    dom.analyze.textContent = busy ? "识别中…" : "开始识别";
    updateApplyState();
  }

  function setStatus(message, isError = false) {
    dom.status.textContent = message;
    dom.status.classList.toggle("error", isError);
  }

  function readableCameraError(error) {
    if (error?.name === "NotAllowedError") return "摄像头权限被拒绝。请允许权限，或改用“上传照片”。";
    if (error?.name === "NotFoundError") return "没有找到可用摄像头，请连接外接摄像头或上传照片。";
    if (error?.name === "NotReadableError") return "摄像头正被其他程序占用，请关闭占用程序后重试。";
    return "摄像头启动失败，请检查设备和浏览器权限。";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  init();
})();
