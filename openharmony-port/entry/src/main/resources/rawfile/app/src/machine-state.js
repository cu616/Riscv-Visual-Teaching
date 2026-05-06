(function () {
  const { REGISTERS } = window.RiscVTeaching;
  const DEFAULT_MEMORY_ADDRESSES = [0, 4, 8, 12, 16, 20, 24, 28];

  function normalizeInitialState(raw = {}) {
    const registers = {};
    const memory = {};

    Object.entries(raw.registers || {}).forEach(([name, value]) => {
      const parsed = parseInteger(value);
      if (!REGISTERS.includes(name) || parsed === null || name === "x0") return;
      registers[name] = parsed;
    });

    Object.entries(raw.memory || {}).forEach(([address, value]) => {
      const parsedAddress = parseInteger(address);
      const parsedValue = parseInteger(value);
      if (parsedAddress === null || parsedValue === null || parsedAddress < 0) return;
      memory[parsedAddress] = parsedValue;
    });

    return { registers, memory };
  }

  function createStateFromInitial(createInitialState, initialState = {}) {
    const state = createInitialState();
    const normalized = normalizeInitialState(initialState);
    Object.entries(normalized.registers).forEach(([name, value]) => {
      state.registers[name] = value;
    });
    Object.entries(normalized.memory).forEach(([address, value]) => {
      state.memory[address] = value;
    });
    state.registers.x0 = 0;
    state.pc = 0;
    state.halted = false;
    state.logs = [];
    return state;
  }

  function setInitialValue(initialState, targetType, targetName, rawValue) {
    const value = parseInteger(rawValue);
    if (value === null) {
      throw new Error("初始状态数值必须是整数。");
    }

    const normalized = normalizeInitialState(initialState);
    if (targetType === "register") {
      if (!REGISTERS.includes(targetName)) {
        throw new Error("未知寄存器。");
      }
      if (targetName === "x0") {
        delete normalized.registers.x0;
        return normalized;
      }
      normalized.registers[targetName] = value;
      return normalized;
    }

    if (targetType === "memory") {
      const address = parseInteger(targetName);
      if (address === null || address < 0) {
        throw new Error("内存地址必须是非负整数。");
      }
      normalized.memory[address] = value;
      return normalized;
    }

    throw new Error("未知初始状态目标类型。");
  }

  function clearInitialValue(initialState, targetType, targetName) {
    const normalized = normalizeInitialState(initialState);
    if (targetType === "register") {
      delete normalized.registers[targetName];
    } else if (targetType === "memory") {
      delete normalized.memory[Number(targetName)];
    }
    return normalized;
  }

  function listMemoryAddresses(initialState = {}) {
    const normalized = normalizeInitialState(initialState);
    return [...new Set([...DEFAULT_MEMORY_ADDRESSES, ...Object.keys(normalized.memory).map(Number)])].sort((a, b) => a - b);
  }

  function parseInteger(value) {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  window.RiscVMachineState = {
    DEFAULT_MEMORY_ADDRESSES,
    normalizeInitialState,
    createStateFromInitial,
    setInitialValue,
    clearInitialValue,
    listMemoryAddresses
  };
})();
