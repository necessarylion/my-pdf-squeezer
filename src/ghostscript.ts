import GsWorker from "./gs.worker?worker";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new GsWorker();
  }
  return worker;
}

/** Preload Ghostscript WASM in the worker thread */
export function preloadGhostscript(): Promise<void> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === "ready") {
        w.removeEventListener("message", handler);
        resolve();
      } else if (e.data.type === "error") {
        w.removeEventListener("message", handler);
        reject(new Error(e.data.message));
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "init" });
  });
}

export interface CompressOptions {
  file: File;
  quality: string;
  onProgress: (pct: number, msg: string) => void;
}

export interface CompressResult {
  outputBytes: Uint8Array;
  originalSize: number;
  optimizedSize: number;
}

/** Compress a PDF file using Ghostscript WASM in a Web Worker */
export function compressPdf(options: CompressOptions): Promise<CompressResult> {
  const { file, quality, onProgress } = options;
  const w = getWorker();

  return new Promise((resolve, reject) => {
    let animating = false;
    let animStart = 0;
    let animFrameId = 0;
    let lastWorkerPct = 0;
    let lastWorkerMsg = "";

    // Smoothly animate progress from 30% to 85% while callMain runs.
    // Worker postMessage calls during synchronous callMain are buffered,
    // so we animate on the main thread to keep the UI responsive.
    function startCompressAnimation() {
      animating = true;
      animStart = performance.now();
      const from = 30;
      const to = 85;
      const duration = 30_000; // assume max 30s

      function tick() {
        if (!animating) return;
        const elapsed = performance.now() - animStart;
        // Ease-out: fast at start, slows down toward the end
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - t) ** 3;
        const pct = Math.round(from + (to - from) * eased);
        const display = Math.max(pct, lastWorkerPct);
        onProgress(
          display,
          lastWorkerMsg || `Compressing (${quality.toLowerCase()})...`,
        );
        animFrameId = requestAnimationFrame(tick);
      }
      tick();
    }

    function stopAnimation() {
      animating = false;
      cancelAnimationFrame(animFrameId);
    }

    const handler = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === "progress") {
        lastWorkerPct = msg.pct;
        lastWorkerMsg = msg.msg;

        if (msg.pct >= 30 && msg.pct < 85 && !animating) {
          startCompressAnimation();
        } else if (msg.pct >= 85) {
          stopAnimation();
          onProgress(msg.pct, msg.msg);
        } else {
          onProgress(msg.pct, msg.msg);
        }
      } else if (msg.type === "result") {
        stopAnimation();
        w.removeEventListener("message", handler);
        resolve({
          outputBytes: new Uint8Array(msg.outputBuffer),
          originalSize: msg.originalSize,
          optimizedSize: msg.optimizedSize,
        });
      } else if (msg.type === "error") {
        stopAnimation();
        w.removeEventListener("message", handler);
        reject(new Error(msg.message));
      }
    };

    w.addEventListener("message", handler);

    file.arrayBuffer().then((fileBuffer) => {
      w.postMessage({ type: "compress", fileBuffer, quality }, [fileBuffer]);
    });
  });
}
