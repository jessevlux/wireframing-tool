<script setup>
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme.js'
import BlockPreview from './BlockPreview.vue'

const { card, border, hover, darkMode } = useTheme()

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
  isDragOver: {
    type: Boolean,
    default: false,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  pageSimulation: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'select',
  'moveUp',
  'moveDown',
  'delete',
  'dragStart',
  'dragEnd',
  'dragOver',
  'drop',
])

// Helper om een korte beschrijving te maken van de block
const getBlockDescription = () => {
  const block = props.block
  if (!block.props) return 'Geen eigenschappen'

  // Probeer een relevante prop te vinden voor beschrijving
  const relevantProps = [
    'Title',
    'Hero Title',
    'Description',
    'Text primary button',
    'Text Secondary Button',
    'Title of text Block',
  ]

  for (const prop of relevantProps) {
    if (block.props[prop]) {
      return block.props[prop]
    }
  }

  // Toon aantal children als fallback
  if (block.children && block.children.length > 0) {
    return `${block.children.length} child component${block.children.length > 1 ? 's' : ''}`
  }

  return 'Configureer eigenschappen →'
}

// Helper om block type badge te tonen
const getBlockTypeLabel = () => {
  const block = props.block
  if (block.blockType === 'entrySection' || block.fetchesFrom) {
    return 'Entry Section'
  }
  if (block.component === 'Kolommen' || block.component === 'CalltoAction') {
    return 'Column Section'
  }
  if (
    block.component === 'Grid' ||
    block.component === 'LogoSlider' ||
    block.component === 'MediaSlider'
  ) {
    return 'Static Content'
  }
  return null
}

// Badge kleur op basis van type
const getBlockTypeBadgeClass = () => {
  const block = props.block
  if (block.blockType === 'entrySection' || block.fetchesFrom) {
    return 'bg-emerald-500/20 text-emerald-400'
  }
  if (block.component === 'Kolommen' || block.component === 'CalltoAction') {
    return 'bg-blue-500/20 text-blue-400'
  }
  return darkMode.value ? 'bg-zinc-700/50 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
}
</script>

<template>
  <div
    draggable="true"
    @dragstart="emit('dragStart', block.id, $event)"
    @dragend="emit('dragEnd', $event)"
    @dragover.prevent="emit('dragOver', block.id, $event)"
    @drop.prevent="emit('drop', block.id, $event)"
    @click="emit('select', block)"
    :class="[
      pageSimulation ? 'simulation-block border-0 rounded-none' : 'border-2 rounded-xl',
      'cursor-pointer transition-all group relative overflow-hidden',
      isSelected && !pageSimulation ? 'border-violet-500 bg-violet-500/5' : '',
      !isSelected && !pageSimulation ? `${border} ${card} hover:border-zinc-500` : '',
      isDragOver ? 'drag-indicator' : '',
    ]"
  >
    <!-- Block Header (hidden in simulation mode) -->
    <div v-if="!pageSimulation" class="flex items-center gap-4 p-4">
      <div :class="`p-2 rounded-lg align-middle ${hover} cursor-grab active:cursor-grabbing`">
        <GripVertical class="w-5 h-5 text-zinc-400" />
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold">{{ block.component || block.type }}</h3>
            <span
              v-if="getBlockTypeLabel()"
              :class="['text-xs px-2 py-0.5 rounded', getBlockTypeBadgeClass()]"
            >
              {{ getBlockTypeLabel() }}
            </span>
            <span
              v-if="block.fetchesFrom"
              class="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-400"
            >
              → {{ block.fetchesFrom }}
            </span>
          </div>
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="emit('moveUp')"
              :disabled="isFirst"
              :class="[
                `p-2 rounded-lg ${hover}`,
                isFirst ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ]"
            >
              <ChevronUp class="w-4 h-4" />
            </button>
            <button
              @click.stop="emit('moveDown')"
              :disabled="isLast"
              :class="[
                'p-2 rounded-lg hover:bg-zinc-800',
                isLast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ]"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
            <button
              @click.stop="emit('delete')"
              class="p-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
            >
              <Trash2 class="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
        <p class="text-sm text-zinc-400 mt-1">{{ block.content || getBlockDescription() }}</p>
      </div>
    </div>

    <!-- Block Preview -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[500px]"
      leave-from-class="opacity-100 max-h-[500px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-if="!collapsed || pageSimulation"
        :class="pageSimulation ? '' : 'px-4 pb-4'"
        class="overflow-hidden"
      >
        <div :class="pageSimulation ? 'w-full' : 'max-w-md'">
          <BlockPreview
            :block="block"
            :page-simulation="pageSimulation"
            :is-selected="isSelected"
            :key="`${block.id}-${JSON.stringify(block.props)}-${JSON.stringify(block.children)}`"
          />
        </div>
      </div>
    </Transition>

    <!-- Simulation mode hover overlay -->
    <div
      v-if="pageSimulation"
      class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-2 bg-black/70 rounded-lg px-2 py-1"
    >
      <span class="text-xs text-white font-medium">{{ block.component || block.type }}</span>
    </div>
  </div>
</template>

<style scoped>
.drag-indicator::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #a855f7, #d946ef);
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
}
</style>
