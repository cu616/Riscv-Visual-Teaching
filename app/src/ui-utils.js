(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function snapToGrid(value, grid) {
    return Math.round(value / grid) * grid;
  }

  function isAddressField(opcode, field) {
    return (opcode === "lw" || opcode === "sw" || opcode === "jalr" || opcode === "lwadd") && (field === "imm" || field === "rs1");
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

  function formatValue(value, base) {
    const normalized = Number(value) || 0;
    if (base === "hex") {
      return `0x${toUnsigned32(normalized).toString(16).toUpperCase().padStart(8, "0")}`;
    }
    if (base === "bin") {
      return `0b${toUnsigned32(normalized).toString(2).padStart(32, "0")}`;
    }
    return String(normalized);
  }

  function toUnsigned32(value) {
    return value >>> 0;
  }

  window.RiscVUiUtils = {
    clamp,
    snapToGrid,
    isAddressField,
    readDragPayload,
    slotName,
    formatOperand,
    formatValue,
    toUnsigned32
  };
})();
