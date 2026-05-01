import * as Blockly from "blockly";

class RiscVConstantProvider extends Blockly.blockRendering.ConstantProvider {
  constructor() {
    super();
    this.CORNER_RADIUS = 1;
    this.NOTCH_WIDTH = 30;
    this.NOTCH_HEIGHT = 7;
    this.TAB_WIDTH = 9;
    this.TAB_HEIGHT = 24;
  }

  override makeNotch() {
    const width = this.NOTCH_WIDTH;
    const height = this.NOTCH_HEIGHT;
    // Square vertical-sided notch. This intentionally avoids Blockly's
    // rounded/Scratch-like profile to match the project's brick language.
    const pathLeft = `v ${height} h ${width} v -${height}`;
    const pathRight = `v ${height} h -${width} v -${height}`;
    return {
      type: this.SHAPES.NOTCH,
      width,
      height,
      pathLeft,
      pathRight
    };
  }

  override makePuzzleTab() {
    const width = this.TAB_WIDTH;
    const height = this.TAB_HEIGHT;
    // Square side tab for value inputs such as the left label tag socket.
    const cap = 5;
    const pathUp = `v ${cap} h ${width} v ${height - cap * 2} h -${width} v ${cap}`;
    const pathDown = `v -${cap} h ${width} v -${height - cap * 2} h -${width} v -${cap}`;
    return {
      type: this.SHAPES.PUZZLE_TAB,
      width,
      height,
      pathUp,
      pathDown
    };
  }
}

class RiscVRenderer extends Blockly.blockRendering.Renderer {
  constructor(name: string) {
    super(name);
  }

  override makeConstants_() {
    return new RiscVConstantProvider();
  }
}

export function registerRiscVRenderer() {
  const name = "riscv_square";
  if (!rendererRegistered) {
    Blockly.blockRendering.register(name, RiscVRenderer);
    rendererRegistered = true;
  }
  return name;
}

let rendererRegistered = false;
