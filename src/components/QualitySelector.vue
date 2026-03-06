<template>
  <div
    class="mt-5 bg-surface border border-border rounded-[10px] p-5"
    :class="{ 'opacity-50': disabled }"
  >
    <h3 class="text-xs uppercase tracking-widest text-muted mb-4">
      Compression Quality
    </h3>
    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="q in QUALITIES"
        :key="q.val"
        :disabled="disabled"
        class="py-2.5 px-2 border border-border bg-transparent text-muted rounded-lg font-mono text-[0.72rem] text-center transition-all"
        :class="[
          modelValue === q.val ? 'border-accent! bg-accent/8 text-accent!' : '',
          disabled
            ? 'cursor-not-allowed'
            : 'cursor-pointer hover:border-accent hover:text-text',
        ]"
        @click="$emit('update:modelValue', q.val)"
      >
        {{ q.val
        }}<small
          class="block text-[0.65rem] mt-0.5 font-sans"
          :class="modelValue === q.val ? 'text-accent/70' : 'text-muted'"
          v-html="q.label"
        ></small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QUALITIES } from "../types";

defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>
