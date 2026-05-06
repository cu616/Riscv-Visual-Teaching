import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRoot = fileURLToPath(new URL(".", import.meta.url));
const defaultPort = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

export function createTeachingAppServer({ root = defaultRoot, port = defaultPort } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://localhost:${port}`);
      const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = normalize(join(root, requestedPath));

      if (!filePath.startsWith(normalize(root))) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
      });
      response.end(content);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  createTeachingAppServer().listen(defaultPort, () => {
    console.log(`RISC-V teaching app running at http://localhost:${defaultPort}`);
  });
}
