(function (global) {
  // Scan-derived whole-word templates. No camera pixels leave the device.
  const WIDTH = 48;
  const HEIGHT = 32;
  const decoded = new WeakMap();

  function inkPoints(image) {
    if (!image?.width || !image?.height || !image.data) return [];
    const histogram = new Uint32Array(256);
    for (let i = 0; i < image.data.length; i += 4) {
      const high = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
      const low = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
      if (high - low < 65) histogram[high] += 1;
    }
    const count = histogram.reduce((sum, item) => sum + item, 0);
    let sum = 0;
    let background = 255;
    for (let i = 0; i < 256; i += 1) {
      sum += histogram[i];
      if (sum >= count * 0.75) { background = i; break; }
    }
    const threshold = Math.max(60, Math.min(190, background * 0.72));
    const mask = new Uint8Array(image.width * image.height);
    for (let p = 0, i = 0; p < mask.length; p += 1, i += 4) {
      const high = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
      const low = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
      if (high < threshold && high - low < 80) mask[p] = 1;
    }
    // Remove specks, retaining disconnected i/j dots and the minus sign.
    const components = [];
    const visited = new Uint8Array(mask.length);
    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = 1;
      for (let head = 0; head < queue.length; head += 1) {
        const p = queue[head];
        const x = p % image.width;
        const y = Math.floor(p / image.width);
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
      components.push(queue);
    }
    const largest = Math.max(0, ...components.map((item) => item.length));
    const points = [];
    for (const component of components) {
      if (component.length < Math.max(3, largest * 0.018)) continue;
      for (const p of component) points.push([p % image.width, Math.floor(p / image.width)]);
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

  function decode(template) {
    if (!decoded.has(template)) {
      decoded.set(template, Float32Array.from(template.mask, (value) => parseInt(value, 16) / 15));
    }
    return decoded.get(template);
  }

  function similarity(signature, template) {
    const aspectRatio = Math.abs(Math.log(signature.aspect / template.aspect));
    if (aspectRatio > 0.35) return 0;
    const target = decode(template);
    let product = 0, normA = 0, normB = 0;
    for (let i = 0; i < target.length; i += 1) {
      const a = signature.pixels[i], b = target[i];
      product += a * b; normA += a * a; normB += b * b;
    }
    return product / Math.sqrt(normA * normB || 1) - aspectRatio * 0.16;
  }

  function match(image, kind, category, bank = global.RiscVPrintedLabelTemplates) {
    const points = inkPoints(image);
    const templates = (bank?.samples || []).filter((item) => item.kind === kind);
    if (!points.length || !templates.length) return { value: "", accepted: false, confidence: 0 };
    const scores = new Map();
    // Search camera roll without altering block geometry or layout coordinates.
    for (const angle of [0, -3, 3, -6, 6, -9, 9, -12, 12]) {
      const signature = signatureFromPoints(points, angle);
      if (!signature) continue;
      for (const template of templates) {
        const score = similarity(signature, template);
        if (score > (scores.get(template.value)?.confidence || 0)) {
          scores.set(template.value, { value: template.value, category: template.category, supported: template.supported, confidence: score });
        }
      }
    }
    const ranked = [...scores.values()].sort((a, b) => b.confidence - a.confidence);
    const best = ranked[0] || { value: "", confidence: 0 };
    const margin = best.confidence - (ranked[1]?.confidence || 0);
    const accepted = best.confidence >= 0.82 && margin >= 0.025;
    // A close contest between unsupported words is still an unsupported label.
    const unsupported = best.confidence >= 0.82 && kind === "instruction" && best.supported === false;
    const categoryMismatch = accepted && kind === "instruction" && best.category !== category;
    return { ...best, margin, accepted: accepted && !unsupported && !categoryMismatch, unsupported, categoryMismatch };
  }

  global.RiscVPrintedLabels = { createSignature, encodeSignature, match };
})(typeof window !== "undefined" ? window : globalThis);
