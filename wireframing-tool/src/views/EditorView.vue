<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronRight, Plus, Undo2, Redo2, Download, Save, Edit2 } from 'lucide-vue-next'
import { supabase } from '../lib/supabase.js'
import BlockItem from '../components/BlockItem.vue'

const router = useRouter()
const route = useRoute()

// State
const project = ref(null)
const selectedPageId = ref(null)
const selectedBlock = ref(null)
const isSaving = ref(false)

// Load project from Supabase or localStorage
onMounted(async () => {
  const projectId = parseInt(route.params.id)

  try {
    // Try to load from Supabase
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single()

    if (error) {
      console.error('Supabase error:', error)
      // Fallback to localStorage
      loadFromLocalStorage(projectId)
    } else {
      project.value = data
      // Select first page by default
      if (project.value?.pages?.length > 0) {
        selectedPageId.value = project.value.pages[0].id
      }
    }
  } catch (err) {
    console.error('Error loading project:', err)
    loadFromLocalStorage(projectId)
  }
})

const loadFromLocalStorage = (projectId) => {
  const saved = localStorage.getItem('wireframe_projects')
  if (saved) {
    const projects = JSON.parse(saved)
    project.value = projects.find((p) => p.id === projectId)
    if (project.value?.pages?.length > 0) {
      selectedPageId.value = project.value.pages[0].id
    }
  }
}

// Computed
const selectedPage = computed(() => {
  if (!project.value || !selectedPageId.value) return null
  return project.value.pages.find((p) => p.id === selectedPageId.value)
})

const blocks = computed(() => {
  return selectedPage.value?.blocks || []
})

// Methods
const goBack = () => {
  router.push('/')
}

const selectPage = (pageId) => {
  selectedPageId.value = pageId
  selectedBlock.value = null
}

const selectBlock = (block) => {
  selectedBlock.value = block
}

const addBlock = () => {
  if (!selectedPage.value) return

  const newBlock = {
    id: `block-${Date.now()}`,
    type: 'Nieuw Blok',
    content: 'Blok inhoud',
    props: {},
  }

  // Add to page
  selectedPage.value.blocks.push(newBlock)
  selectedBlock.value = newBlock

  // Auto-save
  saveProject()
}

const deleteBlock = (blockId) => {
  if (!selectedPage.value) return

  selectedPage.value.blocks = selectedPage.value.blocks.filter((b) => b.id !== blockId)

  if (selectedBlock.value?.id === blockId) {
    selectedBlock.value = null
  }

  saveProject()
}

const moveBlock = (blockId, direction) => {
  if (!selectedPage.value) return

  const index = selectedPage.value.blocks.findIndex((b) => b.id === blockId)
  if (index === -1) return

  const canMove =
    (direction === 'up' && index > 0) ||
    (direction === 'down' && index < selectedPage.value.blocks.length - 1)

  if (canMove) {
    const offset = direction === 'up' ? -1 : 1
    const blocks = [...selectedPage.value.blocks]
    ;[blocks[index], blocks[index + offset]] = [blocks[index + offset], blocks[index]]
    selectedPage.value.blocks = blocks
    saveProject()
  }
}

const updateBlock = (field, value) => {
  if (!selectedBlock.value) return

  const block = selectedPage.value.blocks.find((b) => b.id === selectedBlock.value.id)
  if (block) {
    if (field === 'type' || field === 'content') {
      block[field] = value
    } else {
      // Custom property
      if (!block.props) block.props = {}
      block.props[field] = value
    }
    // Update selected block reference
    selectedBlock.value = { ...block }
    saveProject()
  }
}

const saveProject = async () => {
  if (!project.value) return

  isSaving.value = true

  try {
    const { error } = await supabase
      .from('projects')
      .update({ pages: project.value.pages, updated_at: new Date().toISOString() })
      .eq('id', project.value.id)

    if (error) {
      console.error('Supabase save error:', error)
      // Fallback to localStorage
      saveToLocalStorage()
    }
  } catch (err) {
    console.error('Error saving:', err)
    saveToLocalStorage()
  } finally {
    setTimeout(() => {
      isSaving.value = false
    }, 500)
  }
}

const saveToLocalStorage = () => {
  const saved = localStorage.getItem('wireframe_projects')
  if (saved) {
    const projects = JSON.parse(saved)
    const index = projects.findIndex((p) => p.id === project.value.id)
    if (index !== -1) {
      projects[index] = project.value
      localStorage.setItem('wireframe_projects', JSON.stringify(projects))
    }
  }
}

const exportJSON = () => {
  if (!project.value) return

  const data = {
    project: project.value.name,
    company: project.value.company,
    exportDate: new Date().toISOString(),
    pages: project.value.pages,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.value.name.replace(/\s+/g, '-').toLowerCase()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div v-if="project" class="h-screen flex flex-col bg-zinc-950 text-zinc-100">
    <!-- Header -->
    <div class="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <button @click="goBack" class="flex items-center gap-2 text-zinc-400 hover:text-zinc-100">
            <ChevronRight class="w-5 h-5 rotate-180" />
            Projecten
          </button>
          <div class="h-6 w-px bg-zinc-800" />
          <h1 class="text-lg font-semibold">{{ project.name }}</h1>
        </div>

        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              isSaving ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400',
            ]"
          >
            <Save class="w-4 h-4" />
            {{ isSaving ? 'Opslaan...' : 'Opgeslagen' }}
          </div>
          <div class="h-6 w-px bg-zinc-800" />
          <button
            @click="exportJSON"
            class="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg font-medium shadow-lg"
          >
            <Download class="w-4 h-4" />
            Export naar JSON
          </button>
        </div>
      </div>
    </div>

    <!-- 3 Column Layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar: Pages -->
      <div class="w-72 bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-semibold">Pagina's</h3>
            <button class="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20">
              <Plus class="w-4 h-4" />
            </button>
          </div>
          <div class="space-y-2">
            <button
              v-for="page in project.pages"
              :key="page.id"
              @click="selectPage(page.id)"
              :class="[
                'w-full text-left px-4 py-3 rounded-xl transition-all',
                selectedPageId === page.id
                  ? 'bg-linear-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg'
                  : 'hover:bg-zinc-800 text-zinc-100',
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium">{{ page.name }}</span>
                <span
                  :class="[
                    'text-xs',
                    selectedPageId === page.id ? 'text-white/70' : 'text-zinc-500',
                  ]"
                >
                  {{ page.blocks?.length || 0 }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Middle: Blocks -->
      <div class="flex-1 overflow-y-auto p-8">
        <div v-if="selectedPage" class="max-w-4xl mx-auto">
          <div class="flex items-center justify-between mb-6">
            <div>
              <button
                class="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-1"
              >
                Regenerate
              </button>
              <h2 class="text-2xl font-bold">{{ selectedPage.name }}</h2>
            </div>
            <button
              @click="addBlock"
              class="px-4 py-2 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-lg text-sm font-medium"
            >
              + Nieuw blok
            </button>
          </div>

          <div v-if="blocks.length === 0" class="text-center py-20">
            <p class="text-zinc-500">Geen blokken. Klik op "+ Nieuw blok" om te beginnen.</p>
          </div>

          <div class="space-y-4">
            <BlockItem
              v-for="(block, index) in blocks"
              :key="block.id"
              :block="block"
              :index="index"
              :is-selected="selectedBlock?.id === block.id"
              :is-first="index === 0"
              :is-last="index === blocks.length - 1"
              @select="selectBlock"
              @move-up="moveBlock(block.id, 'up')"
              @move-down="moveBlock(block.id, 'down')"
              @delete="deleteBlock(block.id)"
            />
          </div>
        </div>
      </div>

      <!-- Right Sidebar: Properties -->
      <div class="w-80 bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
        <div class="p-6">
          <div v-if="selectedBlock">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-semibold">Properties {{ selectedBlock.type }}</h3>
              <button @click="selectedBlock = null" class="text-zinc-500 hover:text-zinc-300">
                <Edit2 class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Block Type</label>
                <input
                  :value="selectedBlock.type"
                  @input="updateBlock('type', $event.target.value)"
                  class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Content</label>
                <textarea
                  :value="selectedBlock.content"
                  @input="updateBlock('content', $event.target.value)"
                  rows="3"
                  class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                />
              </div>

              <div
                v-if="selectedBlock.props && Object.keys(selectedBlock.props).length > 0"
                class="border-t border-zinc-800 pt-4"
              >
                <h4 class="text-sm font-medium mb-4">Custom Properties</h4>
                <div v-for="(value, key) in selectedBlock.props" :key="key" class="mb-4">
                  <label class="block text-xs font-medium mb-1 text-zinc-400 capitalize">
                    {{ key }}
                  </label>
                  <input
                    :value="value"
                    @input="updateBlock(key, $event.target.value)"
                    class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 text-zinc-500">
            <Edit2 class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p class="text-sm">Selecteer een blok om properties te bewerken</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
    <div class="text-center">
      <div
        class="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"
      ></div>
      <p class="text-zinc-400">Project laden...</p>
    </div>
  </div>
</template>
