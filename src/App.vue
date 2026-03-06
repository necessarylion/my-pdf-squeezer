<template>
  <div
    class="w-full transition-all duration-300 mt-10"
    :class="selectedFile ? 'max-w-275' : 'max-w-140'"
  >
    <div class="flex items-center justify-between mb-1 -mt-8">
      <h1 class="font-display text-2xl font-bold tracking-tight text-accent">
        MY_PDF_SQUEEZER
      </h1>
      <button
        type="button"
        class="text-muted hover:text-accent bg-transparent border-none cursor-pointer transition-colors text-lg p-1"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        <HugeiconsIcon
          :icon="isDark ? Sun02Icon : Moon02Icon"
          :size="20"
          color="currentColor"
        />
      </button>
    </div>
    <p class="text-muted text-sm mb-6">
      Real PDF compression via Ghostscript WASM — runs entirely in your browser.
    </p>

    <!-- Upload zone (only shown when no file is selected) -->
    <DropZone v-if="!selectedFile" @select="loadFile" />

    <!--
      Two-column layout after file is selected.
      Left: controls + results, Right: PDF preview.
      When no file is selected, controls are shown inline (disabled).
    -->
    <div class="flex gap-8 items-start" :class="{ 'flex-col': !selectedFile }">
      <!-- Left panel — Controls -->
      <div class="w-full" :class="selectedFile ? 'max-w-140 shrink-0' : ''">
        <FileInfo v-if="selectedFile" :file="selectedFile" @change="loadFile" />

        <QualitySelector v-model="quality" :disabled="!selectedFile" />

        <!-- Advanced options -->
        <div class="mt-4">
          <button
            type="button"
            class="flex items-center gap-1 text-xs text-muted font-mono cursor-pointer bg-transparent border-none p-0 hover:text-accent transition-colors"
            @click="showAdvanced = !showAdvanced"
          >
            <HugeiconsIcon
              :icon="showAdvanced ? ArrowDown01Icon : ArrowRight01Icon"
              :size="14"
              color="currentColor"
            />
            Advanced options
          </button>
          <div v-if="showAdvanced" class="mt-3 pl-3 border-l border-border">
            <label
              class="flex items-center gap-2.5 cursor-pointer text-sm text-muted"
            >
              <button
                type="button"
                role="switch"
                :aria-checked="preserveJpeg"
                class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-none cursor-pointer transition-colors duration-200"
                :class="preserveJpeg ? 'bg-accent' : 'bg-border'"
                @click="preserveJpeg = !preserveJpeg"
              >
                <span
                  class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  :class="preserveJpeg ? 'translate-x-4.5' : 'translate-x-0.5'"
                />
              </button>
              <span class="font-mono text-xs">Preserve JPEG images</span>
            </label>
            <p class="mt-1.5 text-[11px] text-muted/60 leading-relaxed">
              Pass through JPEG images without re-encoding. Faster compression
              and keeps original image quality, but may result in larger files.
            </p>
          </div>
        </div>

        <!-- Compress button -->
        <button
          class="mt-5 w-full py-3.5 bg-accent text-black border-none rounded-[10px] font-mono text-sm font-bold cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!selectedFile || compressing"
          @click="compress"
        >
          COMPRESS WITH GHOSTSCRIPT
        </button>

        <!-- Compression progress -->
        <div v-if="compressing" class="mt-5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-muted font-mono">{{ progressMsg }}</span>
            <span class="text-xs text-accent font-mono">{{ progress }}%</span>
          </div>
          <div class="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              class="h-full bg-accent rounded-full transition-all duration-300 ease-out"
              :style="{ width: progress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Compression result -->
        <CompressionResultPanel
          v-if="result && resultVisible"
          :result="result"
          :quality="quality"
        />

        <!-- Privacy notice -->
        <p class="mt-6 text-xs text-muted leading-relaxed">
          Compresses your PDF by re-encoding images at the selected quality
          level — lower quality means smaller file size.
        </p>
        <p class="mt-3 text-xs text-muted leading-relaxed">
          <strong class="text-muted">Privacy:</strong> Your files are never
          uploaded or stored anywhere. The entire compression process runs
          directly in your browser — no servers involved.
        </p>
      </div>

      <!-- Right panel — PDF preview (hidden on mobile) -->
      <Transition name="slide">
        <PdfPreview
          v-if="selectedFile"
          :source="previewSource"
          class="hidden md:block"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Sun02Icon,
  Moon02Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

import type { CompressionResult } from "./types";
import { compressPdf, preloadGhostscript } from "./ghostscript";

import DropZone from "./components/DropZone.vue";
import FileInfo from "./components/FileInfo.vue";
import QualitySelector from "./components/QualitySelector.vue";
import CompressionResultPanel from "./components/CompressionResult.vue";
import PdfPreview from "./components/PdfPreview.vue";

// ─── Reactive state ──────────────────────────────────────────

const selectedFile = ref<File | null>(null);
const quality = ref("EBOOK");
const showAdvanced = ref(true);
const preserveJpeg = ref(false);
const compressing = ref(false);

const progress = ref(0);
const progressMsg = ref("");

const resultVisible = ref(false);
const result = ref<CompressionResult | null>(null);

// Source data for the preview — either the original file or compressed output
const previewSource = ref<File | Uint8Array | null>(null);

let downloadUrl: string | null = null;

// ─── Theme ────────────────────────────────────────────────────

const isDark = ref(
  localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches),
);

function applyTheme(): void {
  document.documentElement.classList.toggle("dark", isDark.value);
}

function toggleTheme(): void {
  isDark.value = !isDark.value;
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
  applyTheme();
}

// Preload Ghostscript WASM in the background on mount
onMounted(() => {
  applyTheme();
  preloadGhostscript();
});

// ─── Helpers ─────────────────────────────────────────────────

function onProgress(pct: number, msg: string): void {
  progress.value = pct;
  progressMsg.value = msg;
}

function loadFile(file: File): void {
  selectedFile.value = file;
  previewSource.value = file;
  resultVisible.value = false;
  result.value = null;
}

// ─── Compression ─────────────────────────────────────────────

async function compress(): Promise<void> {
  if (!selectedFile.value) return;

  compressing.value = true;
  resultVisible.value = false;
  result.value = null;
  progress.value = 0;
  progressMsg.value = "";

  try {
    const { outputBytes, originalSize, optimizedSize } = await compressPdf({
      file: selectedFile.value,
      quality: quality.value,
      preserveJpeg: preserveJpeg.value,
      onProgress,
    });

    // Create downloadable blob
    const blob = new Blob([outputBytes.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(blob);

    const saved = originalSize - optimizedSize;
    const pct = ((saved / originalSize) * 100).toFixed(1);
    const outName = selectedFile.value.name.replace(
      /\.pdf$/i,
      `_${quality.value}.pdf`,
    );

    result.value = {
      originalSize,
      optimizedSize,
      saved,
      pct,
      downloadUrl,
      outName,
      error: "",
    };

    // Update preview with compressed output
    previewSource.value = outputBytes;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.value = {
      error: message,
      originalSize: 0,
      optimizedSize: 0,
      saved: 0,
      pct: "0",
      downloadUrl: "",
      outName: "",
    };
  }

  resultVisible.value = true;
  compressing.value = false;
}
</script>

<style scoped>
.slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
