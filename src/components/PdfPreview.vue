<template>
  <div
    class="flex-1 bg-surface border border-border rounded-xl p-4 max-h-[85vh] overflow-y-auto sticky top-8"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs uppercase tracking-widest text-muted">Preview</h3>
      <span v-if="pageCount > 0" class="text-xs text-muted font-mono">
        {{ pageCount }} page{{ pageCount > 1 ? "s" : "" }}
      </span>
    </div>

    <!-- Loading spinner -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center py-16 gap-3 w-120"
    >
      <div
        class="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin"
      ></div>
      <p class="text-muted text-sm">Rendering preview...</p>
    </div>

    <!-- Error state -->
    <div v-if="error" class="text-center text-muted text-sm py-12">
      Could not load preview
    </div>

    <!-- Rendered pages -->
    <div
      v-show="!loading && !error"
      ref="container"
      class="flex flex-col gap-2"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import * as pdfjsLib from "pdfjs-dist";

const MAX_PREVIEW_PAGES = 20;
const PREVIEW_SCALE = 1.5;

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).href;

const props = defineProps<{
  source: File | ArrayBuffer | Uint8Array | null;
}>();

const container = ref<HTMLDivElement | null>(null);
const pageCount = ref(0);
const loading = ref(false);
const error = ref(false);

async function render(source: File | ArrayBuffer | Uint8Array): Promise<void> {
  loading.value = true;
  pageCount.value = 0;
  error.value = false;
  await nextTick();

  const el = container.value;
  if (!el) return;
  el.innerHTML = "";

  try {
    const data =
      source instanceof ArrayBuffer || source instanceof Uint8Array
        ? source
        : await source.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data }).promise;
    pageCount.value = pdf.numPages;

    const pagesToRender = Math.min(pdf.numPages, MAX_PREVIEW_PAGES);
    for (let i = 1; i <= pagesToRender; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: PREVIEW_SCALE });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = "w-full rounded-lg";
      el.appendChild(canvas);

      await page.render({ canvas, viewport }).promise;
    }

    if (pdf.numPages > MAX_PREVIEW_PAGES) {
      const more = document.createElement("div");
      more.className = "text-center text-muted text-xs py-2";
      more.textContent = `+ ${pdf.numPages - MAX_PREVIEW_PAGES} more pages`;
      el.appendChild(more);
    }
  } catch (err) {
    console.error("PDF preview error:", err);
    error.value = true;
  }

  loading.value = false;
}

watch(
  () => props.source,
  (source) => {
    if (source) render(source);
  },
  { immediate: true },
);

defineExpose({ render });
</script>
