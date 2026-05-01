import type { Instruction } from "../core/types";
import { formatAssembly } from "../core/parser";

interface Props {
  instruction?: Instruction;
  explanation: string;
}

export default function DatapathView({ instruction, explanation }: Props) {
  return (
    <section className="panel visual-panel">
      <div className="panel-heading">
        <h2>数据流可视化</h2>
        <span>{instruction ? formatAssembly(instruction) : "等待执行"}</span>
      </div>
      <div className="datapath-stage">
        <div className="stage-node">PC</div>
        <div className="stage-node">Instruction</div>
        <div className="stage-node">Register File</div>
        <div className="stage-node">ALU</div>
        <div className="stage-node">Memory</div>
        <div className="stage-node">Write Back</div>
      </div>
      <p className="explanation">{explanation}</p>
    </section>
  );
}
