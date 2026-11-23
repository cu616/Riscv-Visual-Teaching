(function (global) {
  // Scan-derived whole-word templates. No camera pixels leave the device.
  const WIDTH = 48;
  const HEIGHT = 32;
  const decoded = new WeakMap();
  const coarseMasks = new WeakMap();

  function inkPoints(image, softer = false, clippedBottom = false) {
    if (!image?.width || !image?.height || !image.data) return [];
    const histogram = new Uint32Array(256);
    for (let i = 0; i < image.data.length; i += 4) {
      const high = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
      const low = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
      if (high - low <= high * (image.data[i] >= image.data[i + 2] ? 0.42 : 0.29)) histogram[high] += 1;
    }
    const count = histogram.reduce((sum, item) => sum + item, 0);
    let sum = 0;
    let background = 255;
    for (let i = 0; i < 256; i += 1) {
      sum += histogram[i];
      if (sum >= count * 0.75) { background = i; break; }
    }
    const threshold = Math.max(60, Math.min(softer ? 223 : 195, background * (softer ? 0.86 : 0.76)));
    const { width, height } = image;
    const left = new Int32Array(height).fill(width), right = new Int32Array(height).fill(-1);
    const top = new Int32Array(width).fill(height), bottom = new Int32Array(width).fill(-1);
    for (let p = 0, i = 0; p < width * height; p += 1, i += 4) {
      const high = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
      const low = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
      const red = image.data[i], blue = image.data[i + 2];
      if (high < background * 0.80 || high - low > high * (red >= blue ? 0.42 : 0.29)) continue;
      const x = p % width, y = Math.floor(p / width);
      left[y] = Math.min(left[y], x); right[y] = x;
      top[x] = Math.min(top[x], y); bottom[x] = y;
    }
    const mask = new Uint8Array(image.width * image.height);
    for (let p = 0, i = 0; p < mask.length; p += 1, i += 4) {
      const x = p % width, y = Math.floor(p / width);
      if (x <= left[y] || x >= right[y] || (!clippedBottom && (y <= top[x] || y >= bottom[x]))) continue;
      const high = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
      const low = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
      const red = image.data[i], blue = image.data[i + 2];
      if (high < threshold && high - low <= (red >= blue ? 115 : Math.max(18, high * 0.32))) mask[p] = 1;
    }
    // Remove specks, retaining disconnected i/j dots and the minus sign.
    const components = [];
    const visited = new Uint8Array(mask.length);
    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      let minX = width, maxX = 0, minY = height, maxY = 0;
      visited[start] = 1;
      for (let head = 0; head < queue.length; head += 1) {
        const p = queue[head];
        const x = p % image.width;
        const y = Math.floor(p / image.width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
            const next = ny * image.width + nx;
            if (mask[next] && !visited[next]) { visited[next] = 1; queue.push(next); }
          }
        }
      }
      components.push({ pixels: queue, minX, maxX, minY, maxY });
    }
    const largest = components.reduce((size, item) => Math.max(size, item.pixels.length), 0);
    const strokes = components.filter((item) => item.pixels.length >= largest * 0.075
      && item.maxY - item.minY >= height * (clippedBottom ? 0.10 : 0.15)
      && item.maxX - item.minX + 1 >= (item.maxY - item.minY) * 0.12);
    const points = [];
    for (const component of components) {
      if (component.pixels.length < Math.max(3, largest * 0.018)) continue;
      const { minX, maxX, minY, maxY } = component;
      // Retain an i/j dot directly over its stem and a minus sign just left
      // of a digit. Other small marks are often tape reflections or dirt.
      const dot = strokes.some((stroke) => stroke.minY > maxY && stroke.minY - maxY <= height * 0.22
        && maxX >= stroke.minX - height * 0.06 && minX <= stroke.maxX + height * 0.06);
      const foot = strokes.some((stroke) => minY > stroke.maxY && minY - stroke.maxY < height * 0.12
        && Math.abs((minX + maxX) - (stroke.minX + stroke.maxX)) < height * 0.14
        && maxX - minX <= (stroke.maxX - stroke.minX + 1) * 1.55
        && component.pixels.length >= stroke.pixels.length * 0.16);
      const minus = maxX - minX >= height * 0.14 && maxX - minX > (maxY - minY) * 2.5
        && strokes.some((stroke) => stroke.minX > maxX && stroke.minX - maxX < height * 0.19
          && minY > stroke.minY && maxY < stroke.maxY);
      if (!strokes.includes(component) && !dot && !foot && !minus) continue;
      for (const p of component.pixels) points.push([p % width, Math.floor(p / width)]);
    }
    return points;
  }

  function signatureFromPoints(points, angle = 0) {
    if (points.length < 8) return null;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const rotated = points.map(([x, y]) => {
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      minX = Math.min(minX, rx); minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx); maxY = Math.max(maxY, ry);
      return [rx, ry];
    });
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (height < 4 || width < 2) return null;
    const bins = new Float32Array(WIDTH * HEIGHT);
    const pixelArea = (WIDTH - 4) * (HEIGHT - 4) / (width * height);
    for (const [x, y] of rotated) {
      const gx = 2 + (x - minX) / width * (WIDTH - 4);
      const gy = 2 + (y - minY) / height * (HEIGHT - 4);
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy;
      bins[iy * WIDTH + ix] += pixelArea * (1 - fx) * (1 - fy);
      bins[iy * WIDTH + ix + 1] += pixelArea * fx * (1 - fy);
      bins[(iy + 1) * WIDTH + ix] += pixelArea * (1 - fx) * fy;
      bins[(iy + 1) * WIDTH + ix + 1] += pixelArea * fx * fy;
    }
    return { aspect: width / height, pixels: bins.map((value) => Math.min(1, value)) };
  }

  function createSignature(image, angle = 0) {
    return signatureFromPoints(inkPoints(image), angle);
  }

  function encodeSignature(signature) {
    return {
      aspect: Number(signature.aspect.toFixed(4)),
      mask: Array.from(signature.pixels, (value) => Math.round(value * 15).toString(16)).join("")
    };
  }

  function decode(template, coarse) {
    if (!decoded.has(template)) {
      decoded.set(template, smoothPixels(Float32Array.from(template.mask, (value) => parseInt(value, 16) / 15)));
    }
    const pixels = decoded.get(template);
    if (!coarse) return pixels;
    if (!coarseMasks.has(template)) coarseMasks.set(template, smoothPixels(smoothPixels(pixels)));
    return coarseMasks.get(template);
  }

  // Tolerate subpixel shifts in thin serifs on downsampled camera frames.
  function smoothPixels(pixels) {
    const result = new Float32Array(pixels.length);
    for (let y = 1; y < HEIGHT - 1; y += 1) {
      for (let x = 1; x < WIDTH - 1; x += 1) {
        const i = y * WIDTH + x;
        result[i] = (4 * pixels[i] + pixels[i - 1] + pixels[i + 1] + pixels[i - WIDTH] + pixels[i + WIDTH]) / 8;
      }
    }
    return result;
  }

  function similarity(signature, pixels, template, coarse) {
    const aspectRatio = Math.abs(Math.log(signature.aspect / template.aspect));
    if (aspectRatio > 0.35) return 0;
    const target = decode(template, coarse);
    let product = 0, normA = 0, normB = 0;
    for (let i = 0; i < target.length; i += 1) {
      const a = pixels[i], b = target[i];
      product += a * b; normA += a * a; normB += b * b;
    }
    return product / Math.sqrt(normA * normB || 1) - aspectRatio * 0.16;
  }

  function match(image, kind, category, bank = kind === "label" ? global.RiscVNamedLabelTemplates : global.RiscVPrintedLabelTemplates,
    { softer = false, clippedBottom = false, coarse = false } = {}) {
    const points = inkPoints(image, softer, clippedBottom);
    const templates = (bank?.samples || []).filter((item) => item.kind === kind);
    if (!templates.length) return { value: "", accepted: false, confidence: 0 };
    const scores = new Map();
    function scoreAngle(angle) {
      const signature = signatureFromPoints(points, angle);
      if (!signature) return;
      let pixels = smoothPixels(signature.pixels);
      if (coarse) pixels = smoothPixels(smoothPixels(pixels));
      for (const template of templates) {
        const score = similarity(signature, pixels, template, coarse);
        if (score > (scores.get(template.value)?.confidence || 0)) {
          scores.set(template.value, { value: template.value, category: template.category, supported: template.supported, confidence: score });
        }
      }
    }
    const rank = () => [...scores.values()].sort((a, b) => b.confidence - a.confidence);
    // Search larger tilts only when the first pass is uncertain.
    [0, -3, 3, -6, 6, -9, 9, -12, 12].forEach(scoreAngle);
    let ranked = rank();
    const firstScore = ranked[0]?.confidence || 0;
    if (firstScore < 0.91 || firstScore - (ranked[1]?.confidence || 0) < 0.05) {
      [-16, 16, -20, 20, -24, 24].forEach(scoreAngle);
      ranked = rank();
    }
    const best = ranked[0] || { value: "", confidence: 0 };
    const margin = best.confidence - (ranked[1]?.confidence || 0);
    const accepted = best.confidence >= 0.82 && margin >= 0.025;
    // A close contest between unsupported words is still an unsupported label.
    const unsupported = best.confidence >= 0.82 && kind === "instruction" && best.supported === false;
    const categoryMismatch = accepted && kind === "instruction" && best.category !== category;
    if (!softer && !accepted && !unsupported) {
      const alternative = match(image, kind, category, bank, { softer: true, clippedBottom, coarse });
      if (alternative.accepted || alternative.unsupported) return alternative;
    }
    return { ...best, margin, accepted: accepted && !unsupported && !categoryMismatch, unsupported, categoryMismatch };
  }

  global.RiscVPrintedLabels = { createSignature, encodeSignature, match };
})(typeof window !== "undefined" ? window : globalThis);
