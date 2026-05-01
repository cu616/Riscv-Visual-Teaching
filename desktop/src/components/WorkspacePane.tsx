import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import "blockly/msg/zh-hans";
import { registerRiscVBlocks } from "../blocks/riscvBlocks";
import { registerRiscVRenderer } from "../blocks/squareRenderer";
import { toolbox } from "../blocks/toolbox";
import { blocklyWorkspaceToInstructions } from "../parser/blocklyToInstruction";
import { instructionsToBlocklyState } from "../parser/instructionToBlockly";
import type { RawInstruction } from "../core/types";

interface Props {
  seedInstructions: RawInstruction[];
  seedWorkspaceState?: unknown;
  seedVersion: number;
  onInstructionsChange: (instructions: RawInstruction[]) => void;
  onWorkspaceStateChange: (workspaceState: unknown) => void;
}

export default function WorkspacePane({ seedInstructions, seedWorkspaceState, seedVersion, onInstructionsChange, onWorkspaceStateChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return;

    registerRiscVBlocks();
    const renderer = registerRiscVRenderer();
    const workspace = Blockly.inject(containerRef.current, {
      toolbox,
      renderer,
      grid: { spacing: 24, length: 3, colour: "#d9dee5", snap: true },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true }
    });

    workspace.addChangeListener((event) => {
      if (loadingRef.current) return;
      if (event.isUiEvent) return;
      onInstructionsChange(blocklyWorkspaceToInstructions(workspace));
      onWorkspaceStateChange(Blockly.serialization.workspaces.save(workspace));
    });

    workspaceRef.current = workspace;
    onInstructionsChange(blocklyWorkspaceToInstructions(workspace));

    const resizeObserver = new ResizeObserver(() => {
      Blockly.svgResize(workspace);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [onInstructionsChange]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    loadingRef.current = true;
    Blockly.serialization.workspaces.load(seedWorkspaceState || instructionsToBlocklyState(seedInstructions), workspace);
    loadingRef.current = false;
    onInstructionsChange(blocklyWorkspaceToInstructions(workspace));
    onWorkspaceStateChange(Blockly.serialization.workspaces.save(workspace));
    Blockly.svgResize(workspace);
  }, [seedInstructions, seedWorkspaceState, seedVersion, onInstructionsChange, onWorkspaceStateChange]);

  return <div ref={containerRef} className="blockly-host" />;
}
