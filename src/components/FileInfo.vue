<template>
  <div
    class="bg-surface border border-border rounded-xl p-4 flex items-center justify-between"
  >
    <div class="flex items-center gap-3 min-w-0">
      <img :src="pdfIcon" alt="PDF" class="w-5 h-5" />
      <div class="min-w-0">
        <div class="text-sm text-text truncate">{{ file.name }}</div>
        <div class="text-xs text-muted">{{ formatSize(file.size) }}</div>
      </div>
    </div>
    <label
      class="text-muted text-xs hover:text-text cursor-pointer transition-colors"
    >
      Change file
      <input type="file" accept=".pdf" class="hidden" @change="onFileChange" />
    </label>
  </div>
</template>

<script setup lang="ts">
import pdfIcon from "../assets/pdf.svg";
import { formatSize } from "../utils";

defineProps<{
  file: File;
}>();

const emit = defineEmits<{
  change: [file: File];
}>();

function onFileChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.name.toLowerCase().endsWith(".pdf")) {
    emit("change", file);
  }
}
</script>
