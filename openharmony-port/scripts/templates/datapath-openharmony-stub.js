(function () {
  function getStageLabel(stage) {
    const labels = {
      fetch: "取指",
      decode: "译码",
      execute: "执行",
      memory: "访存",
      writeback: "回写",
      branch: "分支"
    };
    return labels[stage] || "执行";
  }

  function summarizeInstruction(instruction) {
    if (!instruction) return "等待执行";
    return [instruction.label ? `${instruction.label}:` : "", instruction.opcode]
      .filter(Boolean)
      .join(" ");
  }

  function buildAnimationFrames(instruction, result) {
    return [{
      stage: "execute",
      title: summarizeInstruction(instruction),
      description: result?.message || "OpenHarmony 移植版已隐藏数据流动画，仅保留执行说明。"
    }];
  }

  function applyFrame() {}
  function resetVisualState() {}

  window.RiscVDatapath = {
    getStageLabel,
    summarizeInstruction,
    buildAnimationFrames,
    applyFrame,
    resetVisualState
  };
})();
