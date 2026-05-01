import type { TeachingCase } from "../core/types";

export const CASE_FILE_EXTENSION = ".riscvteach.json";

export interface TeachingCaseFile extends TeachingCase {
  savedAt?: string;
  author?: string;
}

export function serializeTeachingCaseFile(teachingCase: TeachingCaseFile): string {
  return JSON.stringify(
    {
      ...teachingCase,
      savedAt: teachingCase.savedAt || new Date().toISOString()
    },
    null,
    2
  );
}

export function parseTeachingCaseFile(content: string): TeachingCaseFile {
  const parsed = JSON.parse(content) as TeachingCaseFile;
  if (!parsed.version || !parsed.id || !parsed.title) {
    throw new Error("案例文件缺少 version、id 或 title。");
  }
  if (!Array.isArray(parsed.instructions) && !parsed.workspace) {
    throw new Error("案例文件必须包含 instructions 或 Blockly workspace。");
  }
  return parsed;
}
