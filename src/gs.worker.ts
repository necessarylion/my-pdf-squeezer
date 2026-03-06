import loadWASM, { type GhostscriptModule } from "@okathira/ghostpdl-wasm";
import wasmUrl from "@okathira/ghostpdl-wasm/gs.wasm?url";
import { elapsed } from "./utils";

let gsModule: GhostscriptModule | null = null;
let totalPages = 0;
let processedPages = 0;

function onGsOutput(text: string): void {
  console.log("[GS]", text);
  // Ghostscript outputs "Processing pages 1 through N." to get total
  const totalMatch = text.match(/Processing pages \d+ through (\d+)/);
  if (totalMatch?.[1]) {
    totalPages = parseInt(totalMatch[1], 10);
    processedPages = 0;
    return;
  }

  // Ghostscript outputs "Page N" for each page processed
  const pageMatch = text.match(/^Page (\d+)$/);
  if (pageMatch?.[1]) {
    processedPages = parseInt(pageMatch[1], 10);
    if (totalPages > 0) {
      const pct = Math.round(30 + (processedPages / totalPages) * 55);
      postProgress(pct, `Compressing page ${processedPages}/${totalPages}...`);
    }
  }
}

async function loadGhostscript(): Promise<GhostscriptModule> {
  if (gsModule) return gsModule;

  console.log("Worker: Loading Ghostscript WASM...");
  const t0 = performance.now();
  const mod = await loadWASM({
    locateFile: (path: string) => (path.endsWith(".wasm") ? wasmUrl : path),
    print: onGsOutput,
    printErr: onGsOutput,
  });
  gsModule = mod;
  console.log(`Worker: Ghostscript ready. (${elapsed(t0)}s)`);

  return mod;
}

function unlinkSafe(mod: GhostscriptModule, path: string): void {
  try {
    mod.FS.unlink(path);
  } catch {
    /* file may not exist */
  }
}

function buildGsArgs(qualityValue: string): string[] {
  return [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=/${qualityValue.toLowerCase()}`,
    "-dNOPAUSE",
    "-dBATCH",
    "-sOutputFile=/output.pdf",
    "/input.pdf",
  ];
}

function postProgress(pct: number, msg: string): void {
  self.postMessage({ type: "progress", pct, msg });
}

async function handleCompress(
  fileBuffer: ArrayBuffer,
  quality: string,
): Promise<void> {
  postProgress(0, "Loading Ghostscript engine...");
  const mod = await loadGhostscript();

  postProgress(15, "Reading file...");
  const inputBytes = new Uint8Array(fileBuffer);
  const originalSize = inputBytes.byteLength;

  postProgress(25, "Writing to virtual filesystem...");
  mod.FS.writeFile("/input.pdf", inputBytes);

  totalPages = 0;
  processedPages = 0;

  postProgress(30, `Compressing (${quality.toLowerCase()})...`);

  const t1 = performance.now();
  const exitCode = mod.callMain(buildGsArgs(quality));

  if (exitCode !== 0) {
    self.postMessage({ type: "error", message: `Ghostscript exited with code ${exitCode}` });
    return;
  }

  postProgress(90, `Done in ${elapsed(t1)}s. Reading output...`);
  const outputBytes = mod.FS.readFile("/output.pdf");

  unlinkSafe(mod, "/input.pdf");
  unlinkSafe(mod, "/output.pdf");

  postProgress(100, "Complete!");

  const buffer = outputBytes.buffer.slice(
    outputBytes.byteOffset,
    outputBytes.byteOffset + outputBytes.byteLength,
  );

  self.postMessage(
    {
      type: "result",
      outputBuffer: buffer,
      originalSize,
      optimizedSize: outputBytes.byteLength,
    },
    [buffer] as never,
  );
}

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === "init") {
    try {
      await loadGhostscript();
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  } else if (type === "compress") {
    try {
      await handleCompress(e.data.fileBuffer, e.data.quality);
    } catch (err) {
      self.postMessage({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
