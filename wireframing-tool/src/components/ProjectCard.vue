<script setup>
import { Trash2, FileText, Clock, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
  darkMode: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click', 'delete'])

const handleClick = () => {
  emit('click', props.project)
}

const handleDelete = (e) => {
  e.stopPropagation()
  emit('delete', props.project.id, e)
}

const card = props.darkMode ? 'bg-zinc-900' : 'bg-white'
const border = props.darkMode ? 'border-zinc-800' : 'border-gray-200'
const text1 = props.darkMode ? 'text-zinc-100' : 'text-gray-900'
const text2 = props.darkMode ? 'text-zinc-400' : 'text-gray-600'
const hover = props.darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'

const getStatusColor = (status) => {
  switch (status) {
    case 'Complete':
      return 'bg-emerald-500/10 text-emerald-400'
    case 'In Progress':
      return 'bg-violet-500/10 text-violet-400'
    default:
      return 'bg-amber-500/10 text-amber-400'
  }
}
</script>

<template>
  <div
    @click="handleClick"
    :class="`${card} border ${border} rounded-2xl p-6 ${hover} cursor-pointer group hover:shadow-xl hover:scale-[1.02] transition-all`"
  >
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h3 :class="`text-lg font-semibold ${text1} group-hover:text-violet-400`">
          {{ project.name }}
        </h3>
        <p :class="`text-sm ${text2} mt-1`">{{ project.company }}</p>
      </div>
      <button
        @click="handleDelete"
        :class="`p-2 rounded-lg ${hover} opacity-0 group-hover:opacity-100 cursor-pointer`"
      >
        <Trash2 class="w-4 h-4 text-red-400" />
      </button>
    </div>

    <div class="flex items-center gap-4 mb-4">
      <div class="flex items-center gap-2">
        <FileText :class="`w-4 h-4 ${text2}`" />
        <span :class="`text-sm ${text2}`">{{ project.pages.length }} pages</span>
      </div>
      <div class="flex items-center gap-2">
        <Clock :class="`w-4 h-4 ${text2}`" />
        <span :class="`text-sm ${text2}`">{{ project.date }}</span>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <span :class="`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`">
        {{ project.status }}
      </span>
      <ChevronRight :class="`w-5 h-5 ${text2} group-hover:text-violet-400`" />
    </div>
  </div>
</template>
