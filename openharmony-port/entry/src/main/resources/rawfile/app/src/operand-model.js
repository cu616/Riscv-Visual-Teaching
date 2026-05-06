(function () {
  const OPERAND_KINDS = ["register", "immediate", "label"];

  function isOperandKind(kind) {
    return OPERAND_KINDS.includes(kind);
  }

  function createLooseOperand(payload, position, createId = defaultId) {
    if (!isOperandKind(payload?.kind)) {
      throw new Error(`Unsupported operand kind: ${payload?.kind}`);
    }
    return {
      id: createId(),
      kind: payload.kind,
      value: payload.value,
      x: position.x,
      y: position.y
    };
  }

  function normalizeLooseOperands(rawOperands = [], createId = (index) => `imported-operand-${index}`) {
    return rawOperands
      .filter((operand) => isOperandKind(operand.kind))
      .map((operand, index) => ({
        ...operand,
        id: operand.id || createId(index),
        x: Number.isFinite(Number(operand.x)) ? Number(operand.x) : 36,
        y: Number.isFinite(Number(operand.y)) ? Number(operand.y) : 96 + index * 42
      }));
  }

  function detachPayloadSource(rawInstructions, payload) {
    if (!payload?.detach) return rawInstructions;
    const { instructionId, field } = payload.detach;
    return rawInstructions.map((instruction) => {
      if (instruction.id !== instructionId) return instruction;
      const next = { ...instruction };
      delete next[field];
      return next;
    });
  }

  function attachOperandToInstruction(rawInstructions, operand, target, fieldKinds) {
    return rawInstructions.map((instruction) => {
      if (instruction.id !== target.instructionId) return instruction;
      return {
        ...instruction,
        [target.field]: fieldKinds[target.field] === "immediate" ? Number(operand.value) : operand.value
      };
    });
  }

  function removeLooseOperand(looseOperands, id) {
    return looseOperands.filter((operand) => operand.id !== id);
  }

  function updateLooseOperand(looseOperands, id, patch) {
    return looseOperands.map((operand) => (operand.id === id ? { ...operand, ...patch } : operand));
  }

  function defaultId() {
    return `operand-${Date.now()}-${Math.random()}`;
  }

  window.RiscVOperandModel = {
    OPERAND_KINDS,
    isOperandKind,
    createLooseOperand,
    normalizeLooseOperands,
    detachPayloadSource,
    attachOperandToInstruction,
    removeLooseOperand,
    updateLooseOperand
  };
})();
