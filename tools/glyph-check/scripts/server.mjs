// Static server for public/ plus POST /report, which stores the page's self-check JSON.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT ?? 8000);
const outDir = process.env.OUT_DIR ?? "artifacts";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "POST" && url.pathname === "/report") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const platform = (url.searchParams.get("platform") ?? "unknown").replace(/[^\w-]/g, "");
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, `report-${platform}.json`), Buffer.concat(chunks));
    res.writeHead(204).end();
    console.log(`report received: ${platform}`);
    return;
  }
  const rel = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join("public", rel));
    res.writeHead(200, { "content-type": types[extname(rel)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, "0.0.0.0", () => console.log(`listening on ${port}`));
