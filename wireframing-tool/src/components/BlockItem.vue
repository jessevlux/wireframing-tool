<script setup>
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  block: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  isFirst: {
    type: Boolean,
    default: false,
  },
  isLast: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'moveUp', 'moveDown', 'delete'])
</script>

<template>
  <div
    @click="emit('select', block)"
    :class="[
      'border-2 rounded-xl p-5 cursor-pointer transition-all group',
      isSelected
        ? 'border-violet-500 bg-violet-500/5'
        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
    ]"
  >
    <div class="flex items-start gap-4">
      <div class="p-2 rounded-lg align-middle bg-zinc-800 hover:bg-zinc-700 cursor-grab">
        <GripVertical class="w-5 h-5 text-zinc-400" />
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">{{ block.type }}</h3>
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="emit('moveUp')"
              :disabled="isFirst"
              :class="[
                'p-2 rounded-lg hover:bg-zinc-800',
                isFirst ? 'opacity-40 cursor-not-allowed' : '',
              ]"
            >
              <ChevronUp class="w-4 h-4" />
            </button>
            <button
              @click.stop="emit('moveDown')"
              :disabled="isLast"
              :class="[
                'p-2 rounded-lg hover:bg-zinc-800',
                isLast ? 'opacity-40 cursor-not-allowed' : '',
              ]"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
            <button @click.stop="emit('delete')" class="p-2 rounded-lg hover:bg-zinc-800">
              <Trash2 class="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
        <p class="text-sm text-zinc-400">{{ block.content }}</p>
      </div>
    </div>
  </div>
</template>
