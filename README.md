# RISC-V Visual Teaching

RISC-V Visual Teaching is a block-based instruction visualization tool for learning RISC-V assembly and basic computer organization concepts.

The project provides a browser-based teaching interface and an OpenHarmony port for running the same teaching experience on an Orange Pi RV2 device. Learners can build instructions with visual blocks, preview the generated assembly, execute instructions step by step, and observe changes in registers, memory, PC, execution logs, and simulated GPIO/LED state.

## Features

- Block-based RISC-V instruction construction.
- Assembly preview generated from visual blocks.
- Step-by-step teaching simulator for registers, memory, and PC.
- Visual state highlighting and instruction explanation.
- Built-in examples for arithmetic, logic, memory access, branch, jump, and compound teaching blocks.
- OpenHarmony ArkWeb port for device-side demonstration.

## Repository Layout

```text
.
├─ app/                         # Web teaching application
├─ self-desktop/                # Lightweight desktop launcher
├─ openharmony-port/            # OpenHarmony port project
├─ docs/CODE_STRUCTURE.md       # Source structure notes
├─ package.json                 # Development and check scripts
└─ README.md
```

## Run the Web App

Install dependencies if needed:

```powershell
npm install
```

Start the local server:

```powershell
npm run start
```

Then open:

```text
http://localhost:4173
```

Core checks:

```powershell
npm run check
npm test
```

## Run the Desktop Launcher

On Windows, run:

```text
打开非Blockly自研积木桌面版.bat
```

The launcher starts the local web app when needed and opens it in a browser app window.

## OpenHarmony Port

The OpenHarmony port is in `openharmony-port/`. It packages the web teaching resources as local rawfile assets and loads them through an ArkTS + ArkWeb application shell.

Sync and check OpenHarmony resources:

```powershell
npm run oh:check
```

Open `openharmony-port/` with DevEco Studio to build and deploy the OpenHarmony application.

Useful files:

```text
openharmony-port/README.md
openharmony-port/docs/README.md
openharmony-port/docs/HDC部署检查清单.md
openharmony-port/docs/移植记录.md
```

## Development Notes

- Main application code is in `app/`.
- OpenHarmony rawfile resources are generated from `app/`; avoid editing generated rawfile files directly unless the change is OpenHarmony-specific.
- When adding a new instruction, update instruction metadata, parsing, assembly formatting, simulator behavior, examples, and tests together.
- The simulator is designed for teaching. It visualizes RISC-V instruction behavior, but it does not directly modify physical CPU registers.
