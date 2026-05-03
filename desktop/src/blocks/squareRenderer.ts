import * as Blockly from "blockly";

class RiscVConstantProvider extends Blockly.blockRendering.ConstantProvider {
  constructor() {
    super();
    this.CORNER_RADIUS = 0;
    this.NOTCH_WIDTH = 0;
    this.NOTCH_HEIGHT = 0;
    this.NOTCH_OFFSET_LEFT = 0;
    this.TAB_WIDTH = 0;
    this.TAB_HEIGHT = 0;
    this.MIN_BLOCK_HEIGHT = 32;
    this.MIN_BLOCK_WIDTH = 360;
    this.DUMMY_INPUT_MIN_HEIGHT = 30;
    this.EMPTY_INLINE_INPUT_HEIGHT = 30;
    this.EMPTY_INLINE_INPUT_PADDING = 6;
    this.FIELD_BORDER_RECT_RADIUS = 0;
    this.FIELD_DROPDOWN_BORDER_RECT_HEIGHT = 24;
    this.FIELD_BORDER_RECT_HEIGHT = 24;
    this.FIELD_TEXT_FONTSIZE = 12;
    this.FIELD_TEXT_FONTWEIGHT = "700";
  }

  override makeNotch() {
    const width = 0;
    const height = 0;
    const pathLeft = "";
    const pathRight = "";
    return {
      type: this.SHAPES.NOTCH,
      width,
      height,
      pathLeft,
      pathRight
    };
  }

  override makePuzzleTab() {
    return {
      type: this.SHAPES.PUZZLE_TAB,
      width: 0,
      height: 0,
      pathUp: "",
      pathDown: ""
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
