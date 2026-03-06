<template>
  <div
    class="border-[1.5px] border-dashed border-border rounded-xl py-12 px-8 text-center cursor-pointer bg-surface relative transition-colors hover:border-accent"
    :class="{ 'border-accent': isDragover }"
    @dragover.prevent="isDragover = true"
    @dragleave="isDragover = false"
    @drop.prevent="onDrop"
  >
    <input
      type="file"
      accept=".pdf"
      class="absolute inset-0 opacity-0 cursor-pointer w-full"
      @change="onFileChange"
    />
    <img :src="pdfIcon" alt="PDF" class="w-10 h-10 mx-auto mb-3" />
    <div class="text-muted text-sm">
      Drop PDF here or <span class="text-accent">browse</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import pdfIcon from "../assets/pdf.svg";

const emit = defineEmits<{
  select: [file: File];
}>();

const isDragover = ref(false);

function emitFile(file: File | undefined): void {
  if (file && file.name.toLowerCase().endsWith(".pdf")) {
    emit("select", file);
  }
}

function onFileChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  emitFile(target.files?.[0]);
}

function onDrop(e: DragEvent): void {
  isDragover.value = false;
  emitFile(e.dataTransfer?.files[0]);
}
</script>
