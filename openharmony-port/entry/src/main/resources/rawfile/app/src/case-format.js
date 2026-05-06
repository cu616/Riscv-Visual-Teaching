(function () {
  const CASE_VERSION = "0.4.0-alpha.0";

  function createTeachingCasePayload({ instructions, looseOperands = [], displayBase = "dec", initialState = {}, notes = "" }) {
    return {
      version: CASE_VERSION,
      source: "non-blockly-self-built",
      savedAt: new Date().toISOString(),
      displayBase,
      initialState: {
        registers: { ...(initialState.registers || {}) },
        memory: { ...(initialState.memory || {}) }
      },
      notes: normalizeNotes(notes),
      instructions: instructions.map((instruction) => ({ ...instruction })),
      looseOperands: looseOperands.map((operand) => ({ ...operand }))
    };
  }

  function parseTeachingCasePayload(raw) {
    const loaded = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!loaded || !Array.isArray(loaded.instructions)) {
      throw new Error("案例文件缺少 instructions 数组。");
    }
    return {
      version: loaded.version || "unknown",
      source: loaded.source || "unknown",
      displayBase: ["dec", "hex", "bin"].includes(loaded.displayBase) ? loaded.displayBase : "dec",
      initialState: {
        registers: { ...(loaded.initialState?.registers || {}) },
        memory: { ...(loaded.initialState?.memory || {}) }
      },
      notes: normalizeNotes(loaded.notes),
      instructions: loaded.instructions,
      looseOperands: Array.isArray(loaded.looseOperands) ? loaded.looseOperands : []
    };
  }

  function normalizeNotes(notes = "") {
    if (typeof notes === "string") {
      return {
        title: "",
        goal: "",
        steps: notes
      };
    }
    return {
      title: typeof notes?.title === "string" ? notes.title : "",
      goal: typeof notes?.goal === "string" ? notes.goal : "",
      steps: typeof notes?.steps === "string" ? notes.steps : ""
    };
  }

  window.RiscVCaseFormat = {
    CASE_VERSION,
    createTeachingCasePayload,
    parseTeachingCasePayload,
    normalizeNotes
  };
})();
