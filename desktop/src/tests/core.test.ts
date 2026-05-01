import { TEACHING_CASES } from "../core/examples";
import { parseProgram } from "../core/parser";
import { createInitialState, executeInstruction } from "../core/simulator";
import { parseTeachingCaseFile, serializeTeachingCaseFile } from "../cases/caseFormat";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

for (const teachingCase of TEACHING_CASES) {
  const parsed = parseProgram(teachingCase.instructions);
  assert(parsed.errors.length === 0, `Case ${teachingCase.id} should parse: ${parsed.errors.join("; ")}`);

  let state = createInitialState();
  let guard = 0;
  while (!state.halted && guard < 50) {
    state = executeInstruction(state, parsed.instructions).state;
    guard += 1;
  }
  assert(state.halted, `Case ${teachingCase.id} should halt`);
}

const saved = serializeTeachingCaseFile({
  ...TEACHING_CASES[0],
  workspace: { blocks: { languageVersion: 0, blocks: [] } }
});
const loaded = parseTeachingCaseFile(saved);
assert(loaded.id === TEACHING_CASES[0].id, "Saved case should round-trip");

console.log("Desktop core migration tests passed.");
