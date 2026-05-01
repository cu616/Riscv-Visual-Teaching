export type RegisterName = `x${number}`;

export type InstructionType = "R" | "I" | "S" | "B" | "J" | "PSEUDO";

export type InstructionColor = "arithmetic" | "logic" | "shift" | "memory" | "branch" | "jump";

export type OperandKind = "register" | "immediate" | "label";

export interface InstructionDef {
  opcode: string;
  type: InstructionType;
  color: InstructionColor;
  fields: string[];
  label: string;
  help: string;
}

export interface RawInstruction {
  id?: string;
  opcode: string;
  rd?: RegisterName;
  rs1?: RegisterName;
  rs2?: RegisterName;
  imm?: number;
  shamt?: number;
  label?: string;
  labelTag?: string;
  x?: number;
  y?: number;
}

export interface Instruction extends RawInstruction {
  id: string;
  type: InstructionType;
  sourceBlockId: string;
  targetIndex?: number;
  labelName?: string;
}

export interface ParseResult {
  instructions: Instruction[];
  errors: string[];
  labelMap: Record<string, number>;
  orderedRawInstructions: RawInstruction[];
}

export interface MachineState {
  registers: Record<RegisterName, number>;
  memory: Record<number, number>;
  pc: number;
  halted: boolean;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  pc: number;
  assembly: string;
  explanation: string;
  changedRegisters: RegisterName[];
  changedMemoryAddresses: number[];
}

export interface ExecutionResult {
  instruction?: Instruction;
  explanation: string;
  changedRegisters: RegisterName[];
  changedMemoryAddresses: number[];
  animationPlan: string[];
}

export interface TeachingCase {
  version: string;
  id: string;
  title: string;
  description: string;
  instructions: RawInstruction[];
  initialState?: {
    registers?: Partial<Record<RegisterName, number>>;
    memory?: Record<number, number>;
  };
  workspace?: unknown;
  displayBase?: "dec" | "bin" | "hex";
  notes?: string[];
}
