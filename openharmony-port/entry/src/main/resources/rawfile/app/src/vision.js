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

  function hasHandwriting(imageData, imageWidth, imageHeight, rect) {
    const left = clamp(Math.floor(rect.x), 0, imageWidth - 1);
    const top = clamp(Math.floor(rect.y), 0, imageHeight - 1);
    const right = clamp(Math.ceil(rect.x + rect.width), left + 1, imageWidth);
    const bottom = clamp(Math.ceil(rect.y + rect.height), top + 1, imageHeight);
    const brightnessSamples = [];
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const source = (y * imageWidth + x) * 4;
        const hsv = rgbToHsv(imageData.data[source], imageData.data[source + 1], imageData.data[source + 2]);
        if (hsv.s < 0.7) brightnessSamples.push(hsv.v);
      }
    }
    brightnessSamples.sort((leftValue, rightValue) => leftValue - rightValue);
    const background = brightnessSamples.length
      ? brightnessSamples[Math.floor(brightnessSamples.length * 0.78)]
      : 0.9;
    const inkThreshold = clamp(background - 0.14, 0.58, 0.78);
    let darkPixels = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const source = (y * imageWidth + x) * 4;
        const hsv = rgbToHsv(imageData.data[source], imageData.data[source + 1], imageData.data[source + 2]);
        if (hsv.v < inkThreshold && hsv.s < 0.7) darkPixels += 1;
      }
    }
    const area = Math.max(1, (right - left) * (bottom - top));
    return darkPixels >= Math.max(8, Math.round(area * 0.005));
  }

  function findStickerRect(imageData, imageWidth, imageHeight, block) {
    const left = clamp(Math.floor(block.x), 0, imageWidth - 1);
    const right = clamp(Math.ceil(block.x + block.width), left + 1, imageWidth);
    const blockTop = block.kind === "instruction"
      ? block.y + block.height * 0.26
      : block.y + block.height * 0.12;
    const top = clamp(Math.floor(blockTop), 0, imageHeight - 1);
    const bottom = clamp(Math.ceil(block.y + block.height), top + 1, imageHeight);
    const regionWidth = right - left;
    const regionHeight = bottom - top;
    const mask = new Uint8Array(regionWidth * regionHeight);

    for (let y = 0; y < regionHeight; y += 1) {
      for (let x = 0; x < regionWidth; x += 1) {
        const source = ((top + y) * imageWidth + left + x) * 4;
        const red = imageData.data[source];
        const green = imageData.data[source + 1];
        const blue = imageData.data[source + 2];
        const hsv = rgbToHsv(red, green, blue);
        const brightness = (red + green + blue) / 3;
        if (brightness > 132 && hsv.s < 0.34) mask[y * regionWidth + x] = 1;
      }
    }

    const candidates = findComponents(mask, regionWidth, regionHeight, 1, Math.max(35, regionWidth * regionHeight * 0.012))
      .filter((item) => item.width / item.height > 1.15 && item.width > regionWidth * 0.16)
      .sort((a, b) => b.area - a.area);
    const sticker = candidates.find((candidate) => hasHandwriting(imageData, imageWidth, imageHeight, {
      x: left + candidate.x,
      y: top + candidate.y,
      width: candidate.width,
      height: candidate.height
    }));
    if (!sticker) return null;
    const paddingX = Math.max(2, Math.round(sticker.width * 0.05));
    const paddingY = Math.max(2, Math.round(sticker.height * 0.12));
    return {
      x: clamp(left + sticker.x + paddingX, 0, imageWidth - 1),
      y: clamp(top + sticker.y + paddingY, 0, imageHeight - 1),
      width: Math.max(1, sticker.width - paddingX * 2),
      height: Math.max(1, sticker.height - paddingY * 2)
    };
  }

  function findStickerCandidatesInImage(imageData, width, height) {
    const mask = new Uint8Array(width * height);
    for (let pixel = 0, source = 0; pixel < mask.length; pixel += 1, source += 4) {
      const red = imageData.data[source];
      const green = imageData.data[source + 1];
      const blue = imageData.data[source + 2];
      const hsv = rgbToHsv(red, green, blue);
      const brightness = (red + green + blue) / 3;
      if (brightness > 132 && hsv.s < 0.34) mask[pixel] = 1;
    }
    return findComponents(mask, width, height, 1, Math.max(80, width * height * 0.00015))
      .filter((item) => {
        const aspect = item.width / item.height;
        const insideImage = item.x > 1 && item.y > 1 && item.x + item.width < width - 1 && item.y + item.height < height - 1;
        return insideImage
          && aspect > 1.15
          && aspect < 6
          && item.width > width * 0.05
          && item.width < width * 0.36
          && item.height > height * 0.03
          && item.height < height * 0.3
          && item.fill > 0.35
          && hasHandwriting(imageData, width, height, item);
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function colorFamily(colorClass) {
    if (colorClass === 1) return "red";
    if (colorClass === 2) return "yellow";
    if (colorClass === 3) return "green";
    if (colorClass === 4 || colorClass === 5) return "blue";
    return "";
  }

  function matchesColorFamily(colorClass, family) {
    return colorFamily(colorClass) === family;
  }

  function dominantColorFamilyAroundSticker(imageData, width, height, sticker) {
    const paddingX = Math.round(sticker.width * 0.35);
    const paddingY = Math.round(sticker.height * 0.7);
    const left = clamp(sticker.x - paddingX, 0, width - 1);
    const top = clamp(sticker.y - paddingY, 0, height - 1);
    const right = clamp(sticker.x + sticker.width + paddingX, left + 1, width);
    const bottom = clamp(sticker.y + sticker.height + paddingY, top + 1, height);
    const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        if (x >= sticker.x && x < sticker.x + sticker.width && y >= sticker.y && y < sticker.y + sticker.height) continue;
        const source = (y * width + x) * 4;
        const family = colorFamily(classifyColor(imageData.data[source], imageData.data[source + 1], imageData.data[source + 2]));
        if (family) counts[family] += 1;
      }
    }
    return Object.entries(counts).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0] || "";
  }

  function horizontalColorSpan(imageData, width, height, sticker, family) {
    const top = clamp(Math.floor(sticker.y - sticker.height * 0.15), 0, height - 1);
    const bottom = clamp(Math.ceil(sticker.y + sticker.height * 1.15), top + 1, height);
    let best = { x: sticker.x, width: sticker.width };
    for (let y = top; y < bottom; y += 1) {
      let minX = width;
      let maxX = -1;
      for (let x = 0; x < width; x += 1) {
        const source = (y * width + x) * 4;
        const colorClass = classifyColor(imageData.data[source], imageData.data[source + 1], imageData.data[source + 2]);
        if (!matchesColorFamily(colorClass, family)) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      if (maxX >= minX && maxX - minX + 1 > best.width) best = { x: minX, width: maxX - minX + 1 };
    }
    return best;
  }

  function insetStickerRect(sticker, width, height) {
    const paddingX = Math.max(2, Math.round(sticker.width * 0.05));
    const paddingY = Math.max(2, Math.round(sticker.height * 0.12));
    return {
      x: clamp(sticker.x + paddingX, 0, width - 1),
      y: clamp(sticker.y + paddingY, 0, height - 1),
      width: Math.max(1, sticker.width - paddingX * 2),
      height: Math.max(1, sticker.height - paddingY * 2)
    };
  }

  function fallbackDetectionFromSticker(imageData, width, height, sticker, allStickers) {
    const family = dominantColorFamilyAroundSticker(imageData, width, height, sticker);
    if (!family) return null;
    const centerY = sticker.y + sticker.height / 2;
    const rowPeers = allStickers.filter((other) => {
      const otherCenterY = other.y + other.height / 2;
      return Math.abs(centerY - otherCenterY) <= Math.max(sticker.height, other.height) * 0.75;
    });
    const span = horizontalColorSpan(imageData, width, height, sticker, family);
    const isInstruction = rowPeers.length === 1 && span.width >= width * 0.28;
    if (family === "red" && !isInstruction) return null;
    const kind = isInstruction ? "instruction" : family === "blue" ? "register" : family === "yellow" ? "immediate" : "label";
    const category = isInstruction
      ? ({ red: "jump", yellow: "branch", green: "memory", blue: "arithmetic" }[family])
      : kind;
    const blockHeight = isInstruction
      ? sticker.height * 2.25
      : sticker.height * (kind === "label" ? 1.55 : 1.9);
    const blockWidth = isInstruction ? span.width : sticker.width * 1.4;
    const x = clamp(isInstruction ? span.x : sticker.x - sticker.width * 0.2, 0, width - 1);
    const y = clamp(sticker.y - sticker.height * (isInstruction ? 0.75 : 0.45), 0, height - 1);
    const clippedWidth = Math.max(1, Math.min(blockWidth, width - x));
    const clippedHeight = Math.max(1, Math.min(blockHeight, height - y));
    return {
      x,
      y,
      width: clippedWidth,
      height: clippedHeight,
      area: clippedWidth * clippedHeight * 0.5,
      fill: 0.5,
      kind,
      category,
      colorName: family,
      centerX: x + clippedWidth / 2,
      centerY: y + clippedHeight / 2,
      rawText: "",
      value: "",
      confidence: 0,
      stickerRect: insetStickerRect(sticker, width, height),
      recoveredFromSticker: true
    };
  }

  function detectStickeredBlocksFromImageData(imageData, width, height) {
    const candidates = detectBlocksFromImageData(imageData, width, height);
    candidates.forEach((detection) => {
      detection.stickerRect = findStickerRect(imageData, width, height, detection);
    });
    const detections = candidates.filter((detection) => detection.stickerRect);
    const globalStickers = findStickerCandidatesInImage(imageData, width, height);
    globalStickers.forEach((sticker) => {
      const centerX = sticker.x + sticker.width / 2;
      const centerY = sticker.y + sticker.height / 2;
      const alreadyMapped = detections.some((detection) => {
        const mappedSticker = detection.stickerRect;
        if (!mappedSticker) return false;
        return centerX >= mappedSticker.x && centerX <= mappedSticker.x + mappedSticker.width
          && centerY >= mappedSticker.y && centerY <= mappedSticker.y + mappedSticker.height;
      });
      if (alreadyMapped) return;
      const fallback = fallbackDetectionFromSticker(imageData, width, height, sticker, globalStickers);
      if (fallback) detections.push(fallback);
    });
    return {
      detections: removeOverlaps(detections),
      ignoredDetections: candidates.filter((detection) => !detection.stickerRect)
    };
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

  async function recognizeDetections(sourceCanvas, analysis, detections, onProgress) {
    const pending = [];
    // Complete local matching first, so an unavailable OCR network cannot erase it.
    for (let index = 0; index < detections.length; index += 1) {
      const detection = detections[index];
      if (!detection.stickerRect) continue;
      detection.recognitionMode = "printed";
      detection.unresolvedPrintedText = detection.kind === "instruction";
      onProgress?.(`正在匹配打印标签 ${index + 1} / ${detections.length}`);
      const crop = cropForOcr(sourceCanvas, detection.stickerRect, analysis.scale, true);
      if (!crop) continue;
      const image = crop.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, crop.width, crop.height);
      const match = global.RiscVPrintedLabels?.match(image, detection.kind, detection.category);
      if (match?.accepted || match?.unsupported) {
        detection.rawText = match.value;
        detection.confidence = match.confidence;
        detection.templateMatched = match.accepted;
        detection.unsupportedOpcode = match.unsupported;
        detection.unresolvedPrintedText = false;
        normalizeDetection(detection);
      } else {
        pending.push(detection);
      }
      // Allow progress and cancel UI to paint between blocks.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
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
    if (!detections.some((item) => item.kind === "instruction")) {
      warnings.push("没有检测到长条指令积木，请调整光线、角度或裁剪范围后重试。");
    }
    if (stickeredBlocks.ignoredDetections.length) {
      warnings.push(`已忽略 ${stickeredBlocks.ignoredDetections.length} 个没有检测到文字贴纸的背景色块。`);
    }

    if (options.runOcr !== false && detections.length) {
      try {
        await recognizeDetections(sourceCanvas, analysis, detections, onProgress);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "补充 OCR 暂时不可用，请手动校正未识别标签。");
      }
    }

    detections.forEach(normalizeDetection);
    detections.filter((item) => item.unsupportedOpcode).forEach((item) => {
      warnings.push(`打印标签 ${item.rawText.toUpperCase()} 暂不支持，请删除该指令或手动选择支持的指令。`);
    });
    const drafts = mapLayout(detections, options.instructionDefinitions || {});
    onProgress("识别完成，请核对结果。");
    return {
      analysisWidth: analysis.canvas.width,
      analysisHeight: analysis.canvas.height,
      detections,
      drafts,
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
