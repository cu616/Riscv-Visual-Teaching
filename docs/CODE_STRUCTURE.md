# Code Structure

## Overview

```text
.
├─ app/                         # Web teaching application
├─ self-desktop/                # Lightweight desktop launcher
├─ openharmony-port/            # OpenHarmony port project
├─ docs/CODE_STRUCTURE.md       # Source structure notes
├─ package.json                 # Development and check scripts
└─ README.md
```

## app/

`app/` is the main teaching application. It is implemented with HTML, CSS, and JavaScript.

```text
app/
├─ index.html                   # Page structure and main view
├─ styles.css                   # UI, block workspace, and state panel styles
├─ server.mjs                   # Local static server
├─ smoke-http.mjs               # HTTP smoke check
├─ test-core.mjs                # Core instruction and simulator tests
└─ src/
   ├─ app.js                    # UI state, events, rendering, and run controls
   ├─ instructions.js           # Instruction metadata, examples, parsing, and assembly formatting
   ├─ simulator.js              # RISC-V teaching simulator
   ├─ state-animation.js        # Machine-state animation steps
   ├─ machine-state.js          # Register, memory, and PC display model
   ├─ operand-model.js          # Operand block model
   ├─ case-format.js            # Save/load case data model
   ├─ datapath.js               # Datapath display helpers
   └─ ui-utils.js               # Shared UI utilities
```

## Instruction Definitions

`app/src/instructions.js` contains:

- Instruction metadata and operand fields.
- Built-in teaching examples.
- Parsing from block data to structured instructions.
- Formatting from structured instructions to assembly text.

## Teaching Simulator

`app/src/simulator.js` maintains a simplified machine state:

- 32 general-purpose registers.
- Memory map.
- PC.
- Execution logs and teaching explanations.

The simulator is for teaching visualization. It explains RISC-V instruction behavior without directly changing physical CPU registers.

## State Animation

`app/src/state-animation.js` generates explanation steps for:

- Arithmetic and logic operations.
- Shift operations.
- Memory load/store.
- Branch and jump behavior.
- Register write-back and PC updates.

## OpenHarmony Port

`openharmony-port/` is the OpenHarmony project.

```text
openharmony-port/
├─ AppScope/                    # App-level configuration and resources
├─ entry/
│  └─ src/main/
│     ├─ ets/
│     │  ├─ entryability/       # EntryAbility
│     │  └─ pages/Index.ets     # ArkWeb entry page
│     ├─ resources/base/        # OpenHarmony resources
│     └─ resources/rawfile/app/ # Synced web teaching resources
├─ scripts/
│  ├─ sync-rawfile.mjs          # Sync app/ resources to rawfile
│  ├─ smoke-openharmony-port.mjs
│  └─ generate-arkweb-diagnostics.mjs
├─ docs/                        # OpenHarmony build and deployment notes
├─ build-profile.json5
├─ hvigorfile.ts
└─ oh-package.json5
```

## Sync Flow

After changing `app/`, sync OpenHarmony rawfile resources:

```powershell
npm run oh:sync
```

Run the combined OpenHarmony check:

```powershell
npm run oh:check
```

Build and deploy the OpenHarmony application from DevEco Studio by opening `openharmony-port/`.
