(function (global) {
  const TESSERACT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  const CATEGORY_OPCODES = {
    arithmetic: ["addi", "add", "sub", "and", "or", "xor", "andi", "ori", "xori", "sll", "srl", "sra", "slli", "srli", "srai"],
    memory: ["lw", "sw"],
    branch: ["beq", "bne", "blt", "bge", "bltu", "bgeu", "bltz"],
    jump: ["jal", "jalr", "j"]
  };

  const BLOCK_COLORS = {
    instruction: "#ffffff",
    register: "#38bdf8",
    immediate: "#fbbf24",
    label: "#4ade80"
  };
  const PHYSICAL_LABEL_NAMES = ["main", "loop", "done", "target", "start", "end"];
  const PHYSICAL_LABEL_OCR_ALIASES = {
    avp: "main",
    moa: "main",
    maln: "main",
    mand: "main",
    man: "main",
    maind: "main",
    moin: "main",
    moun: "main",
    mount: "main",
    omun: "main",
    rnain: "main"
  };
  const REGISTER_FIELDS = ["rd", "rs1", "rs2", "rs3"];

  let ocrWorker = null;
  let ocrScriptPromise = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rgbToHsv(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;

    if (delta) {
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
    }
    if (hue < 0) hue += 360;

    return {
      h: hue,
      s: max === 0 ? 0 : delta / max,
      v: max
    };
  }

  function classifyColor(red, green, blue) {
    const hsv = rgbToHsv(red, green, blue);
    if (hsv.s < 0.28 || hsv.v < 0.18) return 0;
    if ((hsv.h <= 18 || hsv.h >= 345) && red > 78) return 1;
    if (hsv.h >= 36 && hsv.h <= 68 && hsv.s > 0.5 && hsv.v > 0.38) return 2;
    if (hsv.h >= 70 && hsv.h <= 178 && hsv.s > 0.32 && hsv.v > 0.25) return 3;
    if (hsv.h >= 180 && hsv.h <= 258 && hsv.v > 0.24) {
      return hsv.h < 214 && hsv.v > 0.42 ? 5 : 4;
    }
    return 0;
  }

  function createAnalysisCanvas(sourceCanvas, maxWidth = 960, maxHeight = 760) {
    const scale = Math.min(1, maxWidth / sourceCanvas.width, maxHeight / sourceCanvas.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
    canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    return { canvas, context, scale };
  }

  function findComponents(classMap, width, height, targetClass, minArea) {
    const visited = new Uint8Array(classMap.length);
    const components = [];
    const queue = new Int32Array(classMap.length);

    for (let start = 0; start < classMap.length; start += 1) {
      if (visited[start] || classMap[start] !== targetClass) continue;

      let head = 0;
      let tail = 0;
      let area = 0;
      let minX = start % width;
      let maxX = minX;
      let minY = Math.floor(start / width);
      let maxY = minY;
      queue[tail] = start;
      tail += 1;
      visited[start] = 1;

      while (head < tail) {
        const current = queue[head];
        head += 1;
        const currentX = current % width;
        const currentY = Math.floor(current / width);
        area += 1;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        const left = current - 1;
        if (currentX > 0 && !visited[left] && classMap[left] === targetClass) {
          visited[left] = 1;
          queue[tail] = left;
          tail += 1;
        }
        const right = current + 1;
        if (currentX + 1 < width && !visited[right] && classMap[right] === targetClass) {
          visited[right] = 1;
          queue[tail] = right;
          tail += 1;
        }
        const above = current - width;
        if (currentY > 0 && !visited[above] && classMap[above] === targetClass) {
          visited[above] = 1;
          queue[tail] = above;
          tail += 1;
        }
        const below = current + width;
        if (currentY + 1 < height && !visited[below] && classMap[below] === targetClass) {
          visited[below] = 1;
          queue[tail] = below;
          tail += 1;
        }
      }

      if (area < minArea) continue;
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const fill = area / (boxWidth * boxHeight);
      if (fill < 0.13) continue;
      components.push({ x: minX, y: minY, width: boxWidth, height: boxHeight, area, fill });
    }
    return components;
  }

  function mergeNearbyComponents(components, width, height) {
    const merged = components.map((component) => ({ ...component }));
    let changed = true;

    while (changed) {
      changed = false;
      for (let leftIndex = 0; leftIndex < merged.length && !changed; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < merged.length; rightIndex += 1) {
          const left = merged[leftIndex];
          const right = merged[rightIndex];
          const horizontalGap = Math.max(0, Math.max(left.x, right.x) - Math.min(left.x + left.width, right.x + right.width));
          const verticalGap = Math.max(0, Math.max(left.y, right.y) - Math.min(left.y + left.height, right.y + right.height));
          const minX = Math.min(left.x, right.x);
          const minY = Math.min(left.y, right.y);
          const maxX = Math.max(left.x + left.width, right.x + right.width);
          const maxY = Math.max(left.y + left.height, right.y + right.height);
          const boxWidth = maxX - minX;
          const boxHeight = maxY - minY;
          const isNearby = horizontalGap <= width * 0.055 && verticalGap <= height * 0.04;
          const isSmallBlock = boxWidth <= width * 0.32 && boxHeight <= height * 0.28;
          if (!isNearby || !isSmallBlock) continue;

          const area = left.area + right.area;
          merged[leftIndex] = {
            x: minX,
            y: minY,
            width: boxWidth,
            height: boxHeight,
            area,
            fill: area / (boxWidth * boxHeight)
          };
          merged.splice(rightIndex, 1);
          changed = true;
          break;
        }
      }
    }

    return merged;
  }

  function componentInRegion(classMap, width, targetClass, left, top, right, bottom) {
    let minX = right;
    let minY = bottom;
    let maxX = -1;
    let maxY = -1;
    let area = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        if (classMap[y * width + x] !== targetClass) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        area += 1;
      }
    }
    if (!area) return null;
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    return { x: minX, y: minY, width: boxWidth, height: boxHeight, area, fill: area / (boxWidth * boxHeight) };
  }

  function splitAttachedSmallBlocks(component, classMap, width, height, targetClass, minArea) {
    if (component.width < width * 0.28 || component.height < height * 0.18) return [component];

    const bottom = component.y + component.height;
    const right = component.x + component.width;
    const rowCounts = [];
    let peakCount = 0;
    let peakRow = component.y;
    for (let y = component.y; y < bottom; y += 1) {
      let count = 0;
      for (let x = component.x; x < right; x += 1) {
        if (classMap[y * width + x] === targetClass) count += 1;
      }
      rowCounts[y] = count;
      if (count > peakCount) {
        peakCount = count;
        peakRow = y;
      }
    }

    const strongRowThreshold = peakCount * 0.35;
    let lastStrongRow = peakRow;
    let weakRows = 0;
    for (let y = peakRow; y < bottom; y += 1) {
      if (rowCounts[y] >= strongRowThreshold) {
        lastStrongRow = y;
        weakRows = 0;
      } else {
        weakRows += 1;
        if (weakRows > 2) break;
      }
    }

    const splitY = Math.min(bottom - 1, lastStrongRow + 1);
    if (bottom - splitY < height * 0.035) return [component];

    const remainderMap = new Uint8Array(classMap.length);
    for (let y = splitY + 1; y < bottom; y += 1) {
      for (let x = component.x; x < right; x += 1) {
        const index = y * width + x;
        if (classMap[index] === targetClass) remainderMap[index] = targetClass;
      }
    }
    const attachments = findComponents(remainderMap, width, height, targetClass, minArea)
      .filter((item) => {
        const aspect = item.width / item.height;
        return item.width >= width * 0.045
          && item.width <= width * 0.32
          && item.height >= height * 0.035
          && item.height <= height * 0.28
          && aspect >= 0.55
          && aspect <= 2.2;
      });
    if (!attachments.length) return [component];

    const instruction = componentInRegion(
      classMap,
      width,
      targetClass,
      component.x,
      component.y,
      right,
      splitY + 1
    );
    return instruction ? [instruction, ...attachments] : [component];
  }

  function intersectionOverUnion(a, b) {
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    const area = Math.max(0, right - left) * Math.max(0, bottom - top);
    const union = a.width * a.height + b.width * b.height - area;
    return union ? area / union : 0;
  }

  function removeOverlaps(items) {
    const result = [];
    for (const item of [...items].sort((a, b) => b.area - a.area)) {
      if (result.some((existing) => intersectionOverUnion(item, existing) > 0.62)) continue;
      result.push(item);
    }
    return result;
  }

  function detectBlocksFromImageData(imageData, width, height) {
    const classMap = new Uint8Array(width * height);
    for (let pixel = 0, index = 0; pixel < classMap.length; pixel += 1, index += 4) {
      classMap[pixel] = classifyColor(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]);
    }

    const minArea = Math.max(90, Math.round(width * height * 0.00042));
    const detections = [];
    const colorDefinitions = [
      { id: 1, name: "red", category: "jump" },
      { id: 2, name: "yellow", category: "branch" },
      { id: 3, name: "green", category: "memory" },
      { id: 4, name: "dark-blue", category: "arithmetic" },
      { id: 5, name: "light-blue", category: "register" }
    ];

    for (const color of colorDefinitions) {
      const componentMinArea = color.id === 3 ? Math.max(40, Math.round(minArea * 0.12)) : minArea;
      let components = findComponents(classMap, width, height, color.id, componentMinArea);
      if (color.id === 3) {
        components = mergeNearbyComponents(components, width, height)
          .filter((component) => component.area >= minArea);
      }
      if (color.id === 2) {
        components = components.flatMap((component) => (
          splitAttachedSmallBlocks(component, classMap, width, height, color.id, minArea)
        ));
      }
      for (const component of components) {
        const aspect = component.width / component.height;
        const isLong = component.width >= width * 0.28 && aspect >= 3;
        const isSmall = component.width >= width * 0.045
          && component.width <= width * 0.32
          && component.height >= height * 0.035
          && component.height <= height * 0.28;
        const isSquareish = aspect >= 0.55 && aspect <= 2.2;
        let kind = "";
        let category = color.category;

        if (isLong && color.id !== 5) {
          kind = "instruction";
        } else if (isSmall && isSquareish && (color.id === 5 || color.id === 4)) {
          kind = "register";
          category = "register";
        } else if (isSmall && isSquareish && color.id === 2) {
          kind = "immediate";
          category = "immediate";
        } else if (isSmall && aspect >= 0.7 && aspect <= 4.5 && color.id === 3) {
          kind = "label";
          category = "label";
        }

        if (!kind) continue;
        detections.push({
          ...component,
          kind,
          category,
          colorName: color.name,
          centerX: component.x + component.width / 2,
          centerY: component.y + component.height / 2,
          rawText: "",
          value: "",
          confidence: 0
        });
      }
    }

    return removeOverlaps(detections);
  }

  const STICKER_CATEGORIES = ["", "jump", "branch", "memory", "arithmetic"];
  const STICKER_COLORS = ["", "red", "yellow", "green", "blue"];
  const FAINT_GREEN = 5;

  function hasStickerInk(image, imageWidth, sticker) {
    const { x, y, width, height } = sticker;
    const light = new Uint32Array(256);
    let total = 0;
    // Only inspect the center. The bounding box of a tilted sticker contains
    // colored corners and can overlap the shadow or the block underneath.
    for (let row = y + Math.ceil(height * 0.12); row < y + height * 0.88; row += 1) {
      for (let col = x + Math.ceil(width * 0.1); col < x + width * 0.9; col += 1) {
        const i = (row * imageWidth + col) * 4;
        const high = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
        const low = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
        if (high - low <= (image.data[i] >= image.data[i + 2] ? 115 : 60)) { light[high] += 1; total += 1; }
      }
    }
    let bright = 0, paper = 255;
    while (paper > 0 && bright < total * 0.25) bright += light[paper--];
    let ink = 0;
    for (let i = 0; i < paper - 34; i += 1) ink += light[i];
    return ink >= Math.max(8, width * height * 0.007);
  }

  function colorSupport(colorMap, width, height, sticker, recovery) {
    const { x, y, width: w, height: h } = sticker;
    const padding = Math.max(3, Math.round(h * (recovery ? 0.48 : 0.24)));
    const counts = new Uint32Array(5);
    let total = 0;
    for (let row = Math.max(0, y - padding); row < Math.min(height, y + h + padding); row += 1) {
      for (let col = Math.max(0, x - padding); col < Math.min(width, x + w + padding); col += 1) {
        if (row >= y && row < y + h && col >= x && col < x + w) continue;
        const color = colorMap[row * width + col];
        counts[color === FAINT_GREEN ? (recovery ? 3 : 0) : color] += 1;
        total += 1;
      }
    }
    let family = 1;
    for (let i = 2; i < counts.length; i += 1) if (counts[i] > counts[family]) family = i;
    return counts[family] >= total * (recovery ? 0.22 : 0.36) ? family : 0;
  }

  function stickerColorSpan(colorMap, width, sticker, family, recovery) {
    const { x, y, width: w, height: h } = sticker;
    const maxGap = Math.max(2, Math.round(h * 0.22));
    const spans = [];
    for (const position of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const row = Math.floor(y + h * position) * width;
      const extend = (start, direction) => {
        let edge = start;
        for (let col = start + direction; col >= 0 && col < width; col += direction) {
          const color = colorMap[row + col];
          if (color === family || (recovery && family === 3 && color === FAINT_GREEN)) edge = col;
          if (Math.abs(col - edge) > (recovery && edge === start ? h * 0.7 : maxGap)) break;
        }
        return edge;
      };
      spans.push({ left: extend(x, -1), right: extend(x + w - 1, 1) });
    }
    return spans.sort((a, b) => (a.right - a.left) - (b.right - b.left))[2];
  }

  function stickerComponents(paper, width, height, paperClass = 1) {
    // Remove thin connections made by reflections or bright edges so adjoining
    // paper candidates do not turn into one oversized connected component.
    const core = new Uint8Array(paper.length);
    const radius = Math.max(1, Math.round(Math.min(width, height) / 340));
    const vertical = radius * width;
    for (let y = radius; y < height - radius; y += 1) {
      for (let x = radius; x < width - radius; x += 1) {
        const p = y * width + x;
        core[p] = paper[p] === paperClass && paper[p - radius] === paperClass && paper[p + radius] === paperClass
          && paper[p - vertical] === paperClass && paper[p + vertical] === paperClass;
      }
    }
    return findComponents(core, width, height, 1, Math.max(40, width * height * 0.00010))
      .map(({ x, y, width: w, height: h, fill }) => ({
        x: x - radius, y: y - radius, width: w + radius * 2, height: h + radius * 2, fill
      }));
  }

  function detectStickeredBlocksFromImageData(imageData, width, height, { includeIgnored = false } = {}) {
    const paper = new Uint8Array(width * height);
    const separatedPaper = new Uint8Array(paper.length);
    const brightPaper = new Uint8Array(paper.length);
    const colors = new Uint8Array(paper.length);
    for (let p = 0, i = 0; p < paper.length; p += 1, i += 4) {
      const r = imageData.data[i], g = imageData.data[i + 1], b = imageData.data[i + 2];
      const high = Math.max(r, g, b);
      const low = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      const neutral = high - low <= high * (r >= b ? 0.32 : 0.26);
      // Glare desaturates green plastic, but it often still has a green bias.
      // Keep that surface from joining a white sticker to the background.
      const greenBias = g - Math.max(r, b) > Math.max(5, g * 0.022);
      if (neutral && brightness > 132) paper[p] = 1;
      if (paper[p] && !greenBias) separatedPaper[p] = 1;
      if (r > 200 && g > 165 && r - b > r * 0.29 && r - b < r * 0.44) brightPaper[p] = 2;
      else if (neutral && brightness > 200) brightPaper[p] = 1;
      const color = classifyColor(r, g, b);
      colors[p] = Math.min(color, 4) || (greenBias && high - low > high * 0.12 ? FAINT_GREEN : 0);
    }
    const detected = [];
    function makeDetection(sticker, recovery) {
      const { x, y, width: w, height: h, fill } = sticker;
      if (w < 18 || h < 12 || w > width * 0.36 || h > height * 0.25
        || w / h < 0.55 || w / h > 5.5 || fill < (recovery ? 0.32 : 0.52)
        || x < 1 || y < 1 || x + w >= width || y + h >= height) return null;
      const family = colorSupport(colors, width, height, sticker, recovery);
      if (!family || !hasStickerInk(imageData, width, sticker)) return null;
      const span = stickerColorSpan(colors, width, sticker, family, recovery);
      const spanWidth = span.right - span.left + 1;
      // Measure only the color run touching this sticker. Pixels in the next
      // column or in a mouse-pad drawing cannot extend the width of this block.
      const isInstruction = spanWidth >= 4.3 * h && spanWidth >= 2.0 * w;
      if (!isInstruction && family === 1) return null;
      if (!isInstruction && family === 3 && spanWidth < h * 1.65) return null;
      const kind = isInstruction ? "instruction" : ["", "", "immediate", "label", "register"][family];
      const category = isInstruction ? STICKER_CATEGORIES[family] : kind;
      const blockHeight = Math.min(h * 1.75, height);
      const blockY = clamp(y + h / 2 - blockHeight / 2, 0, height - blockHeight);
      return {
        x: span.left, y: blockY, width: spanWidth, height: blockHeight,
        centerX: isInstruction ? (span.left + span.right) / 2 : x + w / 2, centerY: y + h / 2,
        area: spanWidth * blockHeight,
        kind, category, colorName: STICKER_COLORS[family],
        rawText: "", value: "", confidence: 0,
        stickerRect: { x, y, width: w, height: h }
      };
    }
    for (const sticker of findComponents(paper, width, height, 1, Math.max(55, width * height * 0.00012))) {
      const detection = makeDetection(sticker, false);
      if (detection) detected.push(detection);
    }
    // Extra masks can separate thin bridges or isolate washed-out labels.
    // Candidates need confirmation from text or an attached operand row.
    const recoveryDetections = [];
    const separatedStickers = stickerComponents(separatedPaper, width, height);
    const brighterStickers = stickerComponents(brightPaper, width, height);
    const warmStickers = stickerComponents(brightPaper, width, height, 2);
    for (const sticker of [...separatedStickers, ...brighterStickers, ...warmStickers]) {
      const detection = makeDetection(sticker, true);
      if (detection && ![...detected, ...recoveryDetections].some((item) => intersectionOverUnion(item.stickerRect, detection.stickerRect) > 0.95)) {
        recoveryDetections.push(detection);
      }
    }
    const ignoredDetections = includeIgnored ? detectBlocksFromImageData(imageData, width, height)
      .filter((candidate) => !detected.some((item) => intersectionOverUnion(candidate, item) > 0.25)) : [];
    return { detections: detected, recoveryDetections, ignoredDetections };
  }

  function levenshtein(left, right) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      let diagonal = previous[0];
      previous[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const above = previous[j];
        previous[j] = Math.min(
          previous[j] + 1,
          previous[j - 1] + 1,
          diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
        );
        diagonal = above;
      }
    }
    return previous[right.length];
  }

  function closestCandidate(value, candidates) {
    if (!value || !candidates.length) return { value: "", distance: Infinity };
    return candidates
      .map((candidate) => ({
        value: candidate,
        distance: levenshtein(value, candidate),
        keepsOrder: isSubsequence(value, candidate)
      }))
      .sort((a, b) => a.distance - b.distance || Number(b.keepsOrder) - Number(a.keepsOrder) || Math.abs(a.value.length - value.length) - Math.abs(b.value.length - value.length))[0];
  }

  function isSubsequence(value, candidate) {
    let index = 0;
    for (const character of candidate) if (character === value[index]) index += 1;
    return index === value.length;
  }

  function normalizeOpcode(rawText, category) {
    const cleaned = String(rawText || "")
      .toLowerCase()
      .replace(/0/g, "o")
      .replace(/2/g, "z")
      .replace(/[1|]/g, "i")
      .replace(/5/g, "s")
      .replace(/8/g, "b")
      .replace(/[^a-z]/g, "");
    const candidates = CATEGORY_OPCODES[category] || Object.values(CATEGORY_OPCODES).flat();
    if (candidates.includes(cleaned)) return cleaned;
    const closest = closestCandidate(cleaned, candidates);
    const allowance = cleaned.length <= 2 ? 1 : Math.max(1, Math.floor(cleaned.length * 0.34));
    return closest.distance <= allowance ? closest.value : "";
  }

  function normalizeRegister(rawText) {
    const cleaned = String(rawText || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[|il]/g, "1")
      .replace(/o/g, "0")
      .replace(/z/g, "2")
      .replace(/s/g, "5")
      .replace(/b/g, "8")
      .replace(/g/g, "9")
      .replace(/[^x0-9]/g, "");
    const match = cleaned.match(/x?(\d{1,2})/);
    if (!match) return "";
    const number = Number(match[1]);
    return number >= 0 && number <= 31 ? `x${number}` : "";
  }

  function normalizeImmediate(rawText) {
    const cleaned = String(rawText || "")
      .toLowerCase()
      .replace(/[o]/g, "0")
      .replace(/[|il]/g, "1")
      .replace(/z/g, "2")
      .replace(/s/g, "5")
      .replace(/b/g, "8")
      .replace(/g/g, "9")
      .replace(/[—–−]/g, "-")
      .replace(/[^0-9-]/g, "");
    const match = cleaned.match(/^-?\d+/);
    return match ? Number(match[0]) : "";
  }

  function normalizeLabel(rawText) {
    const cleaned = String(rawText || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 24);
    if (!cleaned) return "";
    const lowered = cleaned.toLowerCase();
    if (PHYSICAL_LABEL_NAMES.includes(lowered)) return lowered;
    if (PHYSICAL_LABEL_OCR_ALIASES[lowered]) return PHYSICAL_LABEL_OCR_ALIASES[lowered];
    const ocrCleaned = lowered
      .replace(/0/g, "o")
      .replace(/[1|]/g, "i")
      .replace(/5/g, "s");
    const closest = closestCandidate(ocrCleaned, PHYSICAL_LABEL_NAMES);
    if (closest.distance <= 1) return closest.value;
    return cleaned;
  }

  function normalizePhysicalLabel(rawText) {
    const cleaned = String(rawText || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase();
    if (!cleaned) return "";
    if (PHYSICAL_LABEL_NAMES.includes(cleaned)) return cleaned;
    if (PHYSICAL_LABEL_OCR_ALIASES[cleaned]) return PHYSICAL_LABEL_OCR_ALIASES[cleaned];
    const ocrCleaned = cleaned
      .replace(/0/g, "o")
      .replace(/[1|]/g, "i")
      .replace(/5/g, "s");
    return closestCandidate(ocrCleaned, PHYSICAL_LABEL_NAMES).value || "";
  }

  function normalizeDetection(detection) {
    if (detection.recognitionMode === "printed") {
      detection.value = detection.unsupportedOpcode ? "" : normalizePrintedText(detection.rawText, detection.kind, detection.category);
      return detection;
    }
    if (detection.kind === "instruction") {
      detection.value = normalizeOpcode(detection.rawText, detection.category);
    } else if (detection.kind === "register") {
      detection.value = normalizeRegister(detection.rawText);
    } else if (detection.kind === "immediate") {
      detection.value = normalizeImmediate(detection.rawText);
    } else if (detection.kind === "label") {
      detection.value = normalizePhysicalLabel(detection.rawText);
    }
    return detection;
  }

  function normalizePrintedText(rawText, kind, category) {
    const text = String(rawText || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
    if (kind === "instruction") {
      const candidates = CATEGORY_OPCODES[category] || Object.values(CATEGORY_OPCODES).flat();
      if (candidates.includes(text)) return text;
      // Unsupported scan words must not turn into similar supported instructions.
      const unsupported = (global.RiscVPrintedLabelTemplates?.samples || []).some((sample) => sample.kind === "instruction" && !sample.supported && sample.value === text);
      if (unsupported || !/^[a-z0-9|]+$/.test(text)) return "";
      const corrected = text.replace(/0/g, "o").replace(/5/g, "s").replace(/8/g, "b");
      const alternatives = [corrected.replace(/[1|]/g, "l"), corrected.replace(/[1|]/g, "i")];
      const matches = candidates.filter((candidate) => alternatives.includes(candidate));
      return matches.length === 1 ? matches[0] : "";
    }
    if (kind === "register") {
      const match = text.replace(/[il|]/g, "1").replace(/o/g, "0").match(/^x(\d{1,2})$/);
      return match && Number(match[1]) <= 31 ? `x${Number(match[1])}` : "";
    }
    if (kind === "immediate") {
      const corrected = text.replace(/[−–—]/g, "-").replace(/o/g, "0").replace(/[il|]/g, "1");
      return /^-?\d+$/.test(corrected) && Number.isSafeInteger(Number(corrected)) ? Number(corrected) : "";
    }
    if (kind === "label") {
      const corrected = text.replace(/0/g, "o").replace(/[1|]/g, "i").replace(/^rn/, "m");
      if (PHYSICAL_LABEL_NAMES.includes(corrected)) return corrected;
      const ranked = PHYSICAL_LABEL_NAMES.map((value) => ({ value, distance: levenshtein(corrected, value) })).sort((a, b) => a.distance - b.distance);
      return ranked[0].distance <= 1 && ranked[0].distance < ranked[1].distance ? ranked[0].value : "";
    }
    return "";
  }

  function fieldValueFromDetection(field, detection) {
    if (!detection) return "";
    if (REGISTER_FIELDS.includes(field)) return normalizeRegister(detection.value || detection.rawText);
    if (["imm", "shamt"].includes(field)) return normalizeImmediate(detection.value || detection.rawText);
    if (field === "label") return normalizePhysicalLabel(detection.value || detection.rawText);
    return detection.value || "";
  }

  function fieldKind(field) {
    if (REGISTER_FIELDS.includes(field)) return "register";
    if (["imm", "shamt"].includes(field)) return "immediate";
    if (field === "label") return "label";
    return "";
  }

  function mapFieldsFromOperands(fields, operands) {
    const used = new Set();
    const values = {};
    fields.forEach((field) => {
      const expectedKind = fieldKind(field);
      const operandIndex = operands.findIndex((operand, index) => !used.has(index) && operand.kind === expectedKind);
      if (operandIndex < 0) {
        values[field] = "";
        return;
      }
      used.add(operandIndex);
      values[field] = fieldValueFromDetection(field, operands[operandIndex]);
    });
    return {
      values,
      unmatchedOperands: operands.filter((operand, index) => !used.has(index))
    };
  }

  function validateDraftOperands(opcode, definition, operands, values) {
    if (!definition) return [`语法错误：无法确认指令 ${String(opcode || "").toUpperCase()} 的参数格式。`];
    const fields = definition.fields || [];
    const mappedFields = mapFieldsFromOperands(fields, operands);
    const errors = [];
    const displayOpcode = String(opcode || "指令").toUpperCase();
    if (fields.length !== operands.length) {
      errors.push(`结构警示：${displayOpcode} 需要 ${fields.length} 个下挂积木，但检测到 ${operands.length} 个。`);
    }
    mappedFields.unmatchedOperands.forEach((operand) => {
      const kindName = operand.kind === "register" ? "寄存器" : operand.kind === "immediate" ? "立即数" : "标签";
      const value = operand.value !== "" && operand.value !== undefined ? `“${operand.value}”` : "";
      errors.push(`结构警示：多出的${kindName}积木${value}不会写入 ${displayOpcode}。`);
    });
    fields.forEach((field) => {
      if (values[field] === "" || values[field] === undefined || values[field] === null) {
        errors.push(`语法错误：${displayOpcode} 缺少 ${field}。`);
      }
    });
    return errors;
  }

  function isBlockingDraftIssue(issue) {
    return Boolean(issue) && !String(issue).startsWith("结构警示：");
  }

  function canApplyDrafts(drafts) {
    return Array.isArray(drafts)
      && drafts.length > 0
      && drafts.every((draft) => !(draft.errors || []).some(isBlockingDraftIssue));
  }

  function definitionMatchesOperands(definition, operands) {
    const fields = definition?.fields || [];
    return fields.length === operands.length
      && fields.every((field, index) => fieldKind(field) === operands[index]?.kind);
  }

  function scoreDefinitionForOperands(definition, operands) {
    const fields = definition?.fields || [];
    const used = new Set();
    let matched = 0;
    fields.forEach((field) => {
      const expectedKind = fieldKind(field);
      const operandIndex = operands.findIndex((operand, index) => !used.has(index) && operand.kind === expectedKind);
      if (operandIndex >= 0) {
        used.add(operandIndex);
        matched += 1;
      }
    });
    const missing = fields.length - matched;
    const extra = operands.length - matched;
    return matched * 6 - missing * 7 - extra * 3;
  }

  function selectOpcodeForOperands(instruction, operands, instructionDefinitions) {
    if (instruction.unsupportedOpcode || instruction.unresolvedPrintedText) return "";
    const categoryCandidates = CATEGORY_OPCODES[instruction.category] || [];
    const recognized = instruction.value && categoryCandidates.includes(instruction.value)
      ? instruction.value
      : "";
    if (hasReliableInstructionText(instruction, recognized)) return recognized;
    if (recognized && definitionMatchesOperands(instructionDefinitions[recognized], operands)) return recognized;
    const ranked = categoryCandidates
      .map((opcode, index) => ({
        opcode,
        index,
        score: scoreDefinitionForOperands(instructionDefinitions[opcode], operands) + (opcode === recognized ? 1 : 0)
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    return ranked[0]?.opcode || recognized || categoryCandidates[0] || "addi";
  }

  function hasReliableInstructionText(instruction, recognized) {
    if (!recognized) return false;
    if (instruction.templateMatched) return true;
    const rawLetters = String(instruction.rawText || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    return rawLetters === recognized
      && (rawLetters.length >= 4 || Number(instruction.confidence || 0) >= 0.55);
  }

  function mapLayout(detections, instructionDefinitions) {
    const instructions = detections
      .filter((item) => item.kind === "instruction")
      .sort((a, b) => a.centerY - b.centerY || a.centerX - b.centerX);
    const smallBlocks = detections.filter((item) => item.kind !== "instruction");
    const assignedAsDefinition = new Set();
    const definitionByInstruction = new Map();

    instructions.forEach((instruction, instructionIndex) => {
      const candidates = smallBlocks
        .filter((item) => item.kind === "label" && item.value)
        .filter((item) => !assignedAsDefinition.has(item))
        .filter((item) => {
          const verticalGap = instruction.y - (item.y + item.height);
          const isAbove = item.centerY < instruction.centerY;
          const isAtLeftEdge = item.centerX < instruction.x + instruction.width * 0.18;
          return isAbove && isAtLeftEdge && verticalGap > -instruction.height * 0.75 && verticalGap < Math.max(item.height * 1.8, instruction.height);
        })
        .sort((a, b) => Math.abs(instruction.y - (a.y + a.height)) - Math.abs(instruction.y - (b.y + b.height)));
      if (!candidates.length) return;
      definitionByInstruction.set(instructionIndex, candidates[0]);
      assignedAsDefinition.add(candidates[0]);
    });

    const drafts = instructions.map((instruction, instructionIndex) => {
      const nextInstruction = instructions[instructionIndex + 1];
      const lowerBoundary = nextInstruction ? nextInstruction.centerY : Infinity;
      const operands = smallBlocks
        .filter((item) => !assignedAsDefinition.has(item))
        .filter((item) => item.centerY > instruction.centerY + instruction.height * 0.2)
        .filter((item) => item.centerY < lowerBoundary)
        .filter((item) => item.centerX > instruction.x - instruction.width * 0.06 && item.centerX < instruction.x + instruction.width * 1.06)
        .sort((a, b) => a.centerX - b.centerX);
      const opcode = selectOpcodeForOperands(instruction, operands, instructionDefinitions);
      const definition = instructionDefinitions[opcode];
      const mappedFields = mapFieldsFromOperands(definition?.fields || [], operands);
      const values = mappedFields.values;
      const errors = validateDraftOperands(opcode, definition, operands, values);

      return {
        opcode,
        category: instruction.category,
        labelTag: definitionByInstruction.get(instructionIndex)?.value || "",
        values,
        sequenceValues: operands.map((operand) => operand.value),
        operands,
        source: instruction,
        confidence: instruction.confidence || 0,
        errors
      };
    });

    return drafts;
  }

  function cropForOcr(sourceCanvas, analysisRect, analysisScale, preservePixels = false) {
    if (!analysisRect) return null;
    const sourceRect = {
      x: analysisRect.x / analysisScale,
      y: analysisRect.y / analysisScale,
      width: analysisRect.width / analysisScale,
      height: analysisRect.height / analysisScale
    };
    const scale = Math.min(5, 420 / Math.max(1, sourceRect.width));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceRect.width * scale));
    canvas.height = Math.max(1, Math.round(sourceRect.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      sourceCanvas,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (preservePixels) return canvas;
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const brightnessSamples = [];
    const inkMask = new Uint8Array(canvas.width * canvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const red = image.data[index];
      const green = image.data[index + 1];
      const blue = image.data[index + 2];
      const hsv = rgbToHsv(red, green, blue);
      if (hsv.s < 0.42) brightnessSamples.push(hsv.v);
    }
    brightnessSamples.sort((left, right) => left - right);
    const background = brightnessSamples.length
      ? brightnessSamples[Math.floor(brightnessSamples.length * 0.72)]
      : 0.9;
    const inkThreshold = clamp(background - 0.18, 0.42, 0.72);
    for (let pixel = 0, index = 0; pixel < inkMask.length; pixel += 1, index += 4) {
      const hsv = rgbToHsv(image.data[index], image.data[index + 1], image.data[index + 2]);
      if (hsv.v < inkThreshold && hsv.s < 0.58) inkMask[pixel] = 1;
    }
    for (let pixel = 0, index = 0; pixel < inkMask.length; pixel += 1, index += 4) {
      // Preserve fine printed serifs and spaces; handwriting dilation merges them.
      const value = inkMask[pixel] ? 0 : 255;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }

  function darkInkComponents(imageData) {
    const width = imageData?.width || 0;
    const height = imageData?.height || 0;
    if (!width || !height || !imageData?.data) return [];
    const dark = new Uint8Array(width * height);
    for (let pixel = 0, index = 0; pixel < dark.length; pixel += 1, index += 4) {
      if (imageData.data[index] < 128 && imageData.data[index + 1] < 128 && imageData.data[index + 2] < 128) {
        dark[pixel] = 1;
      }
    }
    const visited = new Uint8Array(dark.length);
    const components = [];
    for (let start = 0; start < dark.length; start += 1) {
      if (!dark[start] || visited[start]) continue;
      const stack = [start];
      visited[start] = 1;
      let count = 0;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      while (stack.length) {
        const pixel = stack.pop();
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        count += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (!offsetX && !offsetY) continue;
            const nextX = x + offsetX;
            const nextY = y + offsetY;
            if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
            const next = nextY * width + nextX;
            if (dark[next] && !visited[next]) {
              visited[next] = 1;
              stack.push(next);
            }
          }
        }
      }
      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      components.push({
        count,
        minX,
        minY,
        maxX,
        maxY,
        width: componentWidth,
        height: componentHeight,
        density: count / Math.max(1, componentWidth * componentHeight)
      });
    }
    return components;
  }

  function isOneLikeComponent(component, imageWidth, imageHeight) {
    const minimumPixels = Math.max(5, Math.floor(imageWidth * imageHeight * 0.0008));
    return component.count >= minimumPixels
      && component.height >= imageHeight * 0.14
      && component.width / component.height <= 0.72
      && component.density >= 0.07;
  }

  function imageDataHasHandwrittenOne(imageData) {
    const width = imageData?.width || 0;
    const height = imageData?.height || 0;
    return darkInkComponents(imageData).some((component) => isOneLikeComponent(component, width, height));
  }

  function imageDataHasTrailingHandwrittenOne(imageData) {
    const width = imageData?.width || 0;
    const height = imageData?.height || 0;
    const minimumPixels = Math.max(5, Math.floor(width * height * 0.0008));
    const components = darkInkComponents(imageData);
    return components.some((component) => (
      isOneLikeComponent(component, width, height)
      && component.minX >= width * 0.52
      && components.some((other) => (
        other !== component
        && other.count >= minimumPixels
        && other.maxX < component.minX - width * 0.035
      ))
    ));
  }
  function canvasHasHandwrittenOne(canvas) {
    const context = canvas?.getContext?.("2d", { willReadFrequently: true });
    if (!context) return false;
    return imageDataHasHandwrittenOne(context.getImageData(0, 0, canvas.width, canvas.height));
  }

  function resolveRegisterOcr(fullText, digitText, digitImageData) {
    const fullValue = normalizeRegister(fullText);
    const digits = String(digitText || "").replace(/[^0-9]/g, "");
    const registerNumber = /^\d{1,2}$/.test(digits) ? Number(digits) : NaN;
    const fullDigits = fullValue ? fullValue.slice(1) : "";
    const hasTrailingOne = imageDataHasTrailingHandwrittenOne(digitImageData);
    if (registerNumber >= 0 && registerNumber <= 31) {
      if (!fullValue || fullValue === "x1" || digits.length > fullDigits.length) return `x${registerNumber}`;
      if (digits === fullDigits && hasTrailingOne && !fullDigits.endsWith("1")) {
        const expandedNumber = Number(`${fullDigits}1`);
        if (expandedNumber <= 31) return `x${expandedNumber}`;
      }
      return fullValue;
    }
    if (fullValue && hasTrailingOne && !fullDigits.endsWith("1")) {
      const expandedNumber = Number(`${fullDigits}1`);
      if (expandedNumber <= 31) return `x${expandedNumber}`;
    }
    if (imageDataHasHandwrittenOne(digitImageData)) return "x1";
    return fullValue;
  }

  function resolveImmediateOcr(fullText, digitText) {
    const digitValue = normalizeImmediate(digitText);
    if (Number.isInteger(digitValue)) return digitValue;
    return normalizeImmediate(fullText);
  }

  function loadOcrScript() {
    if (global.Tesseract) return Promise.resolve(global.Tesseract);
    if (ocrScriptPromise) return ocrScriptPromise;
    ocrScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TESSERACT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(global.Tesseract);
      script.onerror = () => {
        ocrScriptPromise = null;
        script.remove();
        reject(new Error("补充 OCR 组件加载失败，已保留本机模板识别结果，请手动校正未识别标签。"));
      };
      document.head.appendChild(script);
    });
    return ocrScriptPromise;
  }

  async function getOcrWorker(onProgress) {
    if (ocrWorker) return ocrWorker;
    const Tesseract = await loadOcrScript();
    ocrWorker = await Tesseract.createWorker("eng", 1, {
      logger(message) {
        if (message.status === "recognizing text" && onProgress) {
          onProgress(`正在识别打印标签 ${Math.round((message.progress || 0) * 100)}%`);
        }
      }
    });
    return ocrWorker;
  }

  function ocrWhitelistForKind(kind) {
    if (kind === "instruction") return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    if (kind === "register") return "xX0123456789";
    if (kind === "immediate") return "-0123456789";
    return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
  }

  function matchPrintedDetection(sourceCanvas, analysis, detection, retryCrop = false) {
    const printed = global.RiscVPrintedLabels;
    if (!printed || !detection.stickerRect) return false;
    const sticker = detection.stickerRect;
    const readCrop = (rect) => {
      const crop = cropForOcr(sourceCanvas, rect, analysis.scale, true);
      return crop.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, crop.width, crop.height);
    };
    const image = readCrop(sticker);
    let match = printed.match(image, detection.kind, detection.category);
    if (retryCrop && detection.kind === "instruction" && !match.accepted && !match.unsupported) {
      // A recovered sticker can include reflective tape or lose the pale edge
      // below the ink. Retry with an inset and with the lower edge trimmed.
      const h = sticker.height;
      const inset = { x: sticker.x + h * 0.14, y: sticker.y + h * 0.08, width: sticker.width - h * 0.23, height: Math.min(h, analysis.canvas.height - sticker.y - h * 0.08) };
      const attempts = [
        printed.match(readCrop(inset), detection.kind, detection.category),
        ...[0.78, 0.83].map((fraction) => printed.match(readCrop({ ...sticker, height: h * fraction }),
          detection.kind, detection.category, undefined, { softer: true, clippedBottom: true }))
      ];
      const strong = attempts.filter((item) => item.accepted || item.unsupported);
      if (strong.length && strong.every((item) => item.value === strong[0].value)) match = strong[0];
    }
    if (!match.accepted && !match.unsupported && detection.colorName === "blue" && detection.kind === "instruction") {
      // Adjacent blue registers can share a continuous color run. Require a
      // readable x-number before overriding the geometric classification.
      const register = printed.match(image, "register", "register");
      if (register.accepted) {
        match = register;
        detection.kind = detection.category = "register";
        detection.centerX = sticker.x + sticker.width / 2;
        detection.width = Math.min(detection.width, sticker.height * 3.2);
        detection.x = clamp(detection.centerX - detection.width / 2, 0, analysis.canvas.width - detection.width);
        detection.area = detection.width * detection.height;
      }
    }
    if (!match.accepted && !match.unsupported) return false;
    detection.rawText = match.value;
    detection.confidence = match.confidence;
    detection.templateMatched = match.accepted;
    detection.unsupportedOpcode = match.unsupported;
    detection.unresolvedPrintedText = false;
    normalizeDetection(detection);
    return true;
  }

  function hasOperandRowBelow(instruction, detections) {
    const bottom = instruction.centerY + instruction.height * 1.55;
    const right = instruction.x + instruction.width;
    const row = detections.filter((item) => (item.kind === "register" || item.kind === "immediate")
      && item.templateMatched && item.centerX >= instruction.x && item.centerX <= right
      && item.centerY > instruction.centerY + instruction.height * 0.55 && item.centerY <= bottom);
    return row.some((item, index) => row.slice(index + 1).some((peer) =>
      Math.abs(item.centerY - peer.centerY) < instruction.height * 0.45
      && Math.abs(item.centerX - peer.centerX) > instruction.width * 0.22));
  }

  async function recognizeDetections(sourceCanvas, analysis, detections, recoveryDetections, onProgress) {
    // Complete local matching first, so an unavailable OCR network cannot erase it.
    for (let index = 0; index < detections.length; index += 1) {
      const detection = detections[index];
      if (!detection.stickerRect) continue;
      detection.recognitionMode = "printed";
      detection.unresolvedPrintedText = detection.kind === "instruction";
      onProgress?.(`正在匹配打印标签 ${index + 1} / ${detections.length}`);
      matchPrintedDetection(sourceCanvas, analysis, detection);
      // Allow progress and cancel UI to paint between blocks.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const unreadableInstructions = [];
    for (const candidate of recoveryDetections) {
      const existing = detections.findIndex((item) => intersectionOverUnion(item.stickerRect, candidate.stickerRect) > 0.30);
      if (existing >= 0 && (detections[existing].templateMatched || detections[existing].unsupportedOpcode)) continue;
      candidate.recognitionMode = "printed";
      if (!matchPrintedDetection(sourceCanvas, analysis, candidate, true)) {
        if (candidate.kind === "instruction" && existing < 0) unreadableInstructions.push(candidate);
        continue;
      }
      if (existing < 0) detections.push(candidate);
      else detections[existing] = candidate;
    }
    // Keep a clearly supported row available for manual review even when a
    // damaged label has no reliable match. Do not guess an opcode from its color.
    for (const candidate of unreadableInstructions) {
      if (detections.some((item) => item.kind === "instruction" && intersectionOverUnion(item, candidate) > 0.45)
        || !hasOperandRowBelow(candidate, detections)) continue;
      candidate.unresolvedPrintedText = true;
      detections.push(candidate);
    }
    const pending = detections.filter((item) => !item.templateMatched && !item.unsupportedOpcode);
    if (!pending.length) return;
    const worker = await getOcrWorker(onProgress);
    for (let index = 0; index < pending.length; index += 1) {
      const detection = pending[index];
      onProgress?.(`正在补充识别打印标签 ${index + 1} / ${pending.length}`);
      const crop = cropForOcr(sourceCanvas, detection.stickerRect, analysis.scale);
      await worker.setParameters({
        tessedit_pageseg_mode: "7",
        tessedit_char_whitelist: ocrWhitelistForKind(detection.kind),
        preserve_interword_spaces: "0",
        user_defined_dpi: "300"
      });
      let result = await worker.recognize(crop);
      let rawText = String(result.data?.text || "").trim();
      // Single printed digits can use the single-character mode. Keep '-' intact.
      if (detection.kind === "immediate" && /^\d$/.test(rawText)) {
        await worker.setParameters({ tessedit_pageseg_mode: "10", tessedit_char_whitelist: "-0123456789" });
        const single = await worker.recognize(crop);
        if (Number(single.data?.confidence || 0) > Number(result.data?.confidence || 0)
          && /^-?\d$/.test(String(single.data?.text || "").trim())) {
          result = single;
          rawText = String(single.data.text).trim();
        }
      }
      detection.rawText = rawText;
      detection.confidence = clamp(Number(result.data?.confidence || 0) / 100, 0, 1);
      detection.unsupportedOpcode = detection.kind === "instruction" && (global.RiscVPrintedLabelTemplates?.samples || []).some((sample) =>
        sample.kind === "instruction" && !sample.supported && sample.value === rawText.toLowerCase().replace(/\s+/g, ""));
      normalizeDetection(detection);
      detection.unresolvedPrintedText = detection.kind === "instruction" && !detection.value;
    }
  }

  async function analyzeCanvas(sourceCanvas, options = {}) {
    if (!sourceCanvas?.width || !sourceCanvas?.height) {
      throw new Error("请先拍照或选择一张积木照片。");
    }
    const onProgress = options.onProgress || (() => {});
    onProgress("正在分析积木颜色和轮廓…");
    const analysis = createAnalysisCanvas(sourceCanvas);
    const imageData = analysis.context.getImageData(0, 0, analysis.canvas.width, analysis.canvas.height);
    const stickeredBlocks = detectStickeredBlocksFromImageData(imageData, analysis.canvas.width, analysis.canvas.height);
    const detections = stickeredBlocks.detections;
    const warnings = [];
    if (options.runOcr !== false && (detections.length || stickeredBlocks.recoveryDetections.length)) {
      try {
        await recognizeDetections(sourceCanvas, analysis, detections, stickeredBlocks.recoveryDetections, onProgress);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "补充 OCR 暂时不可用，请手动校正未识别标签。");
      }
    }

    if (!detections.length) warnings.push("没有找到带文字贴纸的积木，请调整光线或角度后重试。");

    detections.forEach(normalizeDetection);
    detections.filter((item) => item.unsupportedOpcode).forEach((item) => {
      warnings.push(`打印标签 ${item.rawText.toUpperCase()} 暂不支持，请删除该指令或手动选择支持的指令。`);
    });
    const drafts = mapLayout(detections, options.instructionDefinitions || {});
    const attached = new Set(drafts.flatMap((draft) => draft.operands));
    const detached = detections.filter((item) => (item.kind === "register" || item.kind === "immediate") && !attached.has(item));
    // A detached row above the first instruction or two clearly separated
    // operand rows under one instruction can indicate a missed instruction.
    const first = drafts[0]?.source;
    const above = first ? detached.filter((item) => item.centerY < first.centerY
      && item.centerY > first.centerY - first.height * 2.5
      && item.centerX >= first.x && item.centerX <= first.x + first.width) : [];
    const missingFirstInstruction = above.some((item, index) => above.slice(index + 1)
      .some((peer) => Math.abs(peer.centerY - item.centerY) < Math.max(peer.height, item.height) * 0.45));
    const missingLaterInstruction = drafts.some(({ operands }) => {
      const rows = operands.filter((item) => item.kind === "register" || item.kind === "immediate")
        .sort((a, b) => a.centerY - b.centerY);
      return rows.some((item, index) => index >= 2 && index < rows.length - 1
        && item.centerY - rows[index - 1].centerY > Math.max(item.height, rows[index - 1].height) * 1.1);
    });
    const missingInstructionRow = missingFirstInstruction || missingLaterInstruction;
    if (missingInstructionRow) warnings.push("检测到多出的一排操作数，可能漏识别了一条指令。请调整角度或光线后重拍。");
    else if (drafts.length && detached.length) warnings.push(`有 ${detached.length} 块操作数未对应到指令，请核对照片与程序是否一致。`);
    onProgress("识别完成，请核对结果。");
    return {
      analysisWidth: analysis.canvas.width,
      analysisHeight: analysis.canvas.height,
      detections,
      drafts,
      missingInstructionRow,
      warnings
    };
  }

  function drawDetections(canvas, result) {
    const context = canvas.getContext("2d");
    const scaleX = canvas.width / result.analysisWidth;
    const scaleY = canvas.height / result.analysisHeight;
    context.save();
    context.lineWidth = Math.max(2, canvas.width / 420);
    context.font = `${Math.max(13, Math.round(canvas.width / 70))}px "Segoe UI", sans-serif`;
    result.detections.forEach((detection, index) => {
      const x = detection.x * scaleX;
      const y = detection.y * scaleY;
      const width = detection.width * scaleX;
      const height = detection.height * scaleY;
      const color = BLOCK_COLORS[detection.kind] || "#ffffff";
      context.strokeStyle = color;
      context.fillStyle = "rgba(15, 23, 42, 0.78)";
      context.strokeRect(x, y, width, height);
      const text = `${index + 1}. ${detection.value || detection.rawText || detection.kind}`;
      const textWidth = context.measureText(text).width + 12;
      const textY = Math.max(20, y);
      context.fillRect(x, textY - 20, textWidth, 20);
      context.fillStyle = color;
      context.fillText(text, x + 6, textY - 5);
    });
    context.restore();
  }

  global.RiscVVision = {
    CATEGORY_OPCODES,
    PHYSICAL_LABEL_NAMES,
    analyzeCanvas,
    canApplyDrafts,
    detectBlocksFromImageData,
    detectStickeredBlocksFromImageData,
    drawDetections,
    fieldValueFromDetection,
    imageDataHasHandwrittenOne,
    imageDataHasTrailingHandwrittenOne,
    isBlockingDraftIssue,
    mapFieldsFromOperands,
    mapLayout,
    normalizeImmediate,
    normalizeLabel,
    normalizePhysicalLabel,
    normalizeOpcode,
    normalizeRegister,
    normalizePrintedText,
    resolveImmediateOcr,
    resolveRegisterOcr,
    scoreDefinitionForOperands,
    validateDraftOperands
  };
})(typeof window !== "undefined" ? window : globalThis);
