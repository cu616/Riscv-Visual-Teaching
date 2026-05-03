import { useMemo, useState } from "react";
import { TEACHING_CASES } from "./core/examples";
import { parseProgram, formatAssembly } from "./core/parser";
import { createInitialState, executeInstruction } from "./core/simulator";
import type { Instruction, MachineState, RawInstruction, TeachingCase } from "./core/types";
import { parseTeachingCaseFile, serializeTeachingCaseFile } from "./cases/caseFormat";
import WorkspacePane from "./components/WorkspacePane";
import AssemblyPreview from "./components/AssemblyPreview";
import MachineStatePanel from "./components/MachineStatePanel";
import type { StateSelection } from "./components/MachineStatePanel";
import DatapathView from "./components/DatapathView";
import ExampleGallery from "./components/ExampleGallery";

export default function App() {
  const [rawInstructions, setRawInstructions] = useState<RawInstruction[]>(TEACHING_CASES[0].instructions);
  const [workspaceSeed, setWorkspaceSeed] = useState<RawInstruction[]>(TEACHING_CASES[0].instructions);
  const [workspaceSeedState, setWorkspaceSeedState] = useState<unknown>(TEACHING_CASES[0].workspace);
  const [workspaceSeedVersion, setWorkspaceSeedVersion] = useState(0);
  const [workspaceState, setWorkspaceState] = useState<unknown>();
  const [currentCase, setCurrentCase] = useState<TeachingCase>(TEACHING_CASES[0]);
  const [initialStateConfig, setInitialStateConfig] = useState<TeachingCase["initialState"]>(TEACHING_CASES[0].initialState);
  const [displayBase, setDisplayBase] = useState<"dec" | "bin" | "hex">(TEACHING_CASES[0].displayBase || "dec");
  const [machineState, setMachineState] = useState<MachineState>(() => createInitialState(TEACHING_CASES[0].initialState));
  const [selectedStateTarget, setSelectedStateTarget] = useState<StateSelection>({ kind: "register", name: "x1" });
  const [lastInstruction, setLastInstruction] = useState<Instruction | undefined>();
  const [lastExplanation, setLastExplanation] = useState("等待 Blockly 工作区生成指令。");

  const parsed = useMemo(() => parseProgram(rawInstructions), [rawInstructions]);

  function loadCase(teachingCase: TeachingCase) {
    setCurrentCase(teachingCase);
    setWorkspaceSeed(teachingCase.instructions);
    setWorkspaceSeedState(teachingCase.workspace);
    setWorkspaceSeedVersion((version) => version + 1);
    setRawInstructions(teachingCase.instructions);
    setInitialStateConfig(teachingCase.initialState);
    setDisplayBase(teachingCase.displayBase || "dec");
    setMachineState(createInitialState(teachingCase.initialState));
    setLastInstruction(undefined);
    setLastExplanation(`已加载案例：${teachingCase.title}`);
  }

  function saveCurrentCase() {
    const content = serializeTeachingCaseFile({
      ...currentCase,
      id: `${currentCase.id}-custom`,
      title: `${currentCase.title} 自定义`,
      instructions: rawInstructions,
      initialState: initialStateConfig,
      displayBase,
      workspace: workspaceState || { source: "blockly", note: "尚未捕获 workspace JSON。" }
    });
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentCase.id}.riscvteach.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCase(file: File | null) {
    if (!file) return;
    try {
      const content = await file.text();
      const loaded = parseTeachingCaseFile(content);
      loadCase({
        ...loaded,
        instructions: loaded.instructions || [],
        workspace: loaded.workspace
      });
    } catch (error) {
      setLastExplanation(error instanceof Error ? error.message : "案例文件读取失败。");
    }
  }

  function step() {
    if (parsed.errors.length) {
      setLastExplanation(parsed.errors[0]);
      return;
    }
    const { state, result } = executeInstruction(machineState, parsed.instructions);
    setMachineState(state);
    setLastInstruction(result.instruction);
    setLastExplanation(result.explanation);
  }

  function runToEnd() {
    if (parsed.errors.length) {
      setLastExplanation(parsed.errors[0]);
      return;
    }

    let nextState = machineState;
    let lastResult: ReturnType<typeof executeInstruction>["result"] | undefined;
    const maxSteps = Math.max(parsed.instructions.length * 20, 50);

    try {
      for (let i = 0; i < maxSteps; i += 1) {
        const execution = executeInstruction(nextState, parsed.instructions);
        nextState = execution.state;
        lastResult = execution.result;
        if (nextState.halted) break;
      }
      if (!nextState.halted) {
        setLastExplanation(`已执行 ${maxSteps} 步仍未结束，可能存在循环。`);
      } else {
        setLastExplanation(lastResult?.explanation || "程序已经执行结束。");
      }
      setMachineState(nextState);
      setLastInstruction(lastResult?.instruction);
    } catch (error) {
      setMachineState(nextState);
      setLastExplanation(error instanceof Error ? error.message : "运行失败。");
    }
  }

  function reset() {
    setMachineState(createInitialState(initialStateConfig));
    setLastInstruction(undefined);
    setLastExplanation("机器状态已重置。");
  }

  function applyInitialValue(target: StateSelection, value: number) {
    const nextInitial = {
      registers: { ...(initialStateConfig?.registers || {}) },
      memory: { ...(initialStateConfig?.memory || {}) }
    };
    if (target.kind === "register") {
      nextInitial.registers[target.name] = value;
    } else {
      nextInitial.memory[target.address] = value;
    }
    setInitialStateConfig(nextInitial);
    setMachineState(createInitialState(nextInitial));
    setLastInstruction(undefined);
    setLastExplanation(`已把 ${target.kind === "register" ? target.name : `memory[${target.address}]`} 初始化为 ${value}。`);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Blockly Migration Prototype</p>
          <h1>RISC-V 指令集可视化教学软件</h1>
        </div>
        <div className="toolbar">
          <button className="primary" onClick={step}>单步执行</button>
          <button onClick={runToEnd}>运行到结束</button>
          <button onClick={reset}>重置机器</button>
          <button onClick={saveCurrentCase}>保存案例</button>
          <label className="file-button">
            导入案例
            <input type="file" accept=".json,.riscvteach.json,application/json" onChange={(event) => importCase(event.target.files?.[0] || null)} />
          </label>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel blockly-panel">
          <div className="panel-heading">
            <h2>Blockly 指令工作区</h2>
            <span>两层方形积木 renderer</span>
          </div>
          <WorkspacePane
            seedInstructions={workspaceSeed}
            seedWorkspaceState={workspaceSeedState}
            seedVersion={workspaceSeedVersion}
            onInstructionsChange={setRawInstructions}
            onWorkspaceStateChange={setWorkspaceState}
          />
        </section>

        <aside className="side-stack">
          <MachineStatePanel
            state={machineState}
            selectedTarget={selectedStateTarget}
            displayBase={displayBase}
            onSelect={setSelectedStateTarget}
            onDisplayBaseChange={setDisplayBase}
            onApplyInitialValue={applyInitialValue}
          />
          <DatapathView instruction={lastInstruction} explanation={lastExplanation} />
        </aside>

        <section className="panel preview-panel">
          <AssemblyPreview instructions={parsed.instructions} errors={parsed.errors} formatAssembly={formatAssembly} />
        </section>

        <ExampleGallery cases={TEACHING_CASES} onLoad={loadCase} />
      </main>
    </div>
  );
}
