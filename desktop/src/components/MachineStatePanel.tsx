import { REGISTERS } from "../core/instructionDefs";
import type { MachineState, RegisterName } from "../core/types";

interface Props {
  state: MachineState;
  selectedTarget?: StateSelection;
  displayBase: DisplayBase;
  onSelect: (selection: StateSelection) => void;
  onDisplayBaseChange: (base: DisplayBase) => void;
  onApplyInitialValue: (target: StateSelection, value: number) => void;
}

export type DisplayBase = "dec" | "bin" | "hex";

export type StateSelection =
  | { kind: "register"; name: RegisterName }
  | { kind: "memory"; address: number };

export default function MachineStatePanel({ state, selectedTarget, displayBase, onSelect, onDisplayBaseChange, onApplyInitialValue }: Props) {
  const addresses = Object.keys(state.memory).map(Number).sort((a, b) => a - b);
  const selected = selectedTarget || { kind: "register" as const, name: "x1" as RegisterName };
  const selectedValue = selected.kind === "register" ? state.registers[selected.name] : state.memory[selected.address] ?? 0;

  return (
    <section className="panel state-panel">
      <div className="panel-heading">
        <h2>机器状态</h2>
        <span>初始化 / 点击详情</span>
      </div>
      <div className="pc-box">
        <span>PC</span>
        <strong>{state.pc}</strong>
      </div>
      <div className="base-switch" role="group" aria-label="机器状态显示进制">
        <button className={displayBase === "dec" ? "selected" : ""} onClick={() => onDisplayBaseChange("dec")}>DEC</button>
        <button className={displayBase === "hex" ? "selected" : ""} onClick={() => onDisplayBaseChange("hex")}>HEX</button>
        <button className={displayBase === "bin" ? "selected" : ""} onClick={() => onDisplayBaseChange("bin")}>BIN</button>
      </div>

      <form
        className="state-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onApplyInitialValue(selected, Number(form.get("value") || 0));
        }}
      >
        <div className="selected-state-detail">
          <span>{selected.kind === "register" ? selected.name : `memory[${selected.address}]`}</span>
          <strong>{formatValue(selectedValue, displayBase)}</strong>
        </div>
        <label>
          初始化值
          <input name="value" type="number" defaultValue={selectedValue} key={`${selected.kind}-${selected.kind === "register" ? selected.name : selected.address}-${selectedValue}`} />
        </label>
        <button type="submit">写入并重置</button>
      </form>

      <h3>寄存器</h3>
      <div className="register-grid">
        {REGISTERS.slice(0, 16).map((name) => (
          <button
            className={`state-cell ${selectedTarget?.kind === "register" && selectedTarget.name === name ? "selected" : ""}`}
            key={name}
            title={`${name} = ${formatValue(state.registers[name], displayBase)}`}
            onClick={() => onSelect({ kind: "register", name })}
          >
            <span>{name}</span>
            <strong>{formatValue(state.registers[name], displayBase)}</strong>
          </button>
        ))}
      </div>
      <h3>内存</h3>
      <div className="memory-grid">
        {addresses.map((address) => (
          <button
            className={`state-cell ${selectedTarget?.kind === "memory" && selectedTarget.address === address ? "selected" : ""}`}
            key={address}
            title={`memory[${address}] = ${formatValue(state.memory[address], displayBase)}`}
            onClick={() => onSelect({ kind: "memory", address })}
          >
            <span>@{address}</span>
            <strong>{formatValue(state.memory[address], displayBase)}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatValue(value: number, base: DisplayBase) {
  const normalized = Number(value) | 0;
  if (base === "hex") return `0x${(normalized >>> 0).toString(16).padStart(8, "0")}`;
  if (base === "bin") return `0b${(normalized >>> 0).toString(2).padStart(32, "0")}`;
  return String(normalized);
}
