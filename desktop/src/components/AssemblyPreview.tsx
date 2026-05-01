import type { Instruction } from "../core/types";

interface Props {
  instructions: Instruction[];
  errors: string[];
  formatAssembly: (instruction: Instruction) => string;
}

export default function AssemblyPreview({ instructions, errors, formatAssembly }: Props) {
  return (
    <div>
      <div className="panel-heading">
        <h2>汇编预览</h2>
        <span>Blockly → Instruction[]</span>
      </div>
      <pre className="code-preview">
        {errors.length ? errors.join("\n") : instructions.map((instruction, index) => `${index}: ${formatAssembly(instruction)}`).join("\n") || "暂无指令"}
      </pre>
    </div>
  );
}
