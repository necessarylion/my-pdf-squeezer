<template>
  <div class="mt-5 rounded-[10px] p-5" :style="containerStyle">
    <!-- Error state -->
    <template v-if="result.error">
      <div class="text-error text-[0.85rem]">Error: {{ result.error }}</div>
    </template>

    <!-- Success state -->
    <template v-else>
      <div class="flex justify-between text-[0.85rem] mb-2">
        <span class="text-muted">Original</span>
        <span class="font-mono text-[0.8rem]">{{
          formatSize(result.originalSize)
        }}</span>
      </div>
      <div class="flex justify-between text-[0.85rem] mb-2">
        <span class="text-muted">Compressed</span>
        <span class="font-mono text-[0.8rem]">{{
          formatSize(result.optimizedSize)
        }}</span>
      </div>
      <div class="h-px bg-border my-3"></div>
      <div class="flex justify-between text-[0.85rem] mb-2">
        <span class="text-muted">Saved</span>
        <span class="font-mono text-[0.8rem] text-accent font-bold">{{
          result.saved > 0
            ? `-${formatSize(result.saved)} (${result.pct}%)`
            : "No reduction"
        }}</span>
      </div>
      <a
        class="block mt-4 w-full py-3 bg-transparent border border-accent text-accent rounded-lg font-mono text-[0.8rem] cursor-pointer text-center no-underline transition-colors hover:bg-accent/[0.07]"
        :href="result.downloadUrl"
        :download="result.outName"
        >↓ DOWNLOAD {{ quality.toUpperCase() }} PDF</a
      >
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CompressionResult } from "../types";
import { formatSize } from "../utils";

const props = defineProps<{
  result: CompressionResult;
  quality: string;
}>();

const containerStyle = computed(() =>
  props.result.error
    ? {
        background: "var(--color-error-bg)",
        border: "1px solid var(--color-error-border)",
      }
    : {
        background: "var(--color-success-bg)",
        border: "1px solid var(--color-success-border)",
      },
);
</script>
