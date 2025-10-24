<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, FileText, Moon, Sun } from 'lucide-vue-next'
import ProjectCard from '../components/ProjectCard.vue'
import { supabase } from '../lib/supabase.js'

const router = useRouter()

const darkMode = ref(true)
const projects = ref([])
const searchQuery = ref('')
const showToast = ref(false)
const toastMessage = ref('')

// Load projects from Supabase
const loadProjects = async () => {
  try {
    // Try to load from Supabase
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      // Fallback to localStorage if Supabase fails
      loadFromLocalStorage()
    } else {
      projects.value = data || []
    }
  } catch (err) {
    console.error('Error connecting to Supabase:', err)
    // Fallback to localStorage
    loadFromLocalStorage()
  }
}

// Load on mount and when page becomes visible
onMounted(() => {
  loadProjects()

  // Reload when user comes back to this page
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadProjects()
    }
  })
})

// Helper: Load from localStorage
const loadFromLocalStorage = () => {
  const saved = localStorage.getItem('wireframe_projects')
  if (saved) {
    projects.value = JSON.parse(saved)
  }
  // Als geen projects: laat empty state zien
}

// Computed properties
const filteredProjects = computed(() => {
  return projects.value.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.company.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const bg = computed(() => (darkMode.value ? 'bg-zinc-950' : 'bg-gray-50'))
const card = computed(() => (darkMode.value ? 'bg-zinc-900' : 'bg-white'))
const border = computed(() => (darkMode.value ? 'border-zinc-800' : 'border-gray-200'))
const text1 = computed(() => (darkMode.value ? 'text-zinc-100' : 'text-gray-900'))
const text2 = computed(() => (darkMode.value ? 'text-zinc-400' : 'text-gray-600'))
const hover = computed(() => (darkMode.value ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'))

// Methods
const showNotification = (message) => {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
}

const goToNewProject = () => {
  router.push('/new-project')
}

const openProject = (project) => {
  // TODO: Navigate to editor view
  console.log('Opening project:', project)
  // router.push(`/editor/${project.id}`)
}

const deleteProject = async (projectId, e) => {
  if (window.confirm('Weet je zeker dat je dit project wilt verwijderen?')) {
    try {
      // Try to delete from Supabase
      const { error } = await supabase.from('projects').delete().eq('id', projectId)

      if (error) {
        console.error('Supabase delete error:', error)
        // Fallback to localStorage
        const updated = projects.value.filter((p) => p.id !== projectId)
        localStorage.setItem('wireframe_projects', JSON.stringify(updated))
        projects.value = updated
      } else {
        // Successfully deleted from Supabase
        projects.value = projects.value.filter((p) => p.id !== projectId)
        // Also update localStorage backup
        localStorage.setItem('wireframe_projects', JSON.stringify(projects.value))
      }

      showNotification('Project verwijderd')
    } catch (err) {
      console.error('Error deleting project:', err)
      showNotification('Fout bij verwijderen')
    }
  }
}
</script>

<template>
  <div :class="`min-h-screen ${bg} ${text1}`">
    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="showToast"
        class="fixed top-4 right-4 bg-violet-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
      >
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- Header -->
    <div :class="`${card} border-b ${border}`">
      <div class="max-w-7xl mx-auto px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1
              class="text-3xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
            >
              Codigital Wireframe Studio
            </h1>
          </div>
          <div class="flex items-center gap-4">
            <button @click="toggleDarkMode" :class="`p-3 rounded-xl ${hover}`">
              <Sun v-if="darkMode" class="w-5 h-5" />
              <Moon v-else class="w-5 h-5" />
            </button>
            <button
              @click="goToNewProject"
              class="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-medium shadow-lg"
            >
              <Plus class="w-5 h-5" />
              New Project
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="max-w-7xl mx-auto px-8 py-6">
      <div class="relative">
        <Search :class="`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${text2}`" />
        <input
          type="text"
          placeholder="Search projects..."
          v-model="searchQuery"
          :class="`w-full pl-12 pr-4 py-3 ${card} ${text1} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none`"
        />
      </div>
    </div>

    <!-- Projects Grid -->
    <div class="max-w-7xl mx-auto px-8 pb-12">
      <!-- Empty State -->
      <div v-if="filteredProjects.length === 0 && searchQuery === ''" class="text-center py-20">
        <div
          class="w-20 h-20 rounded-full bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-6"
        >
          <FileText class="w-10 h-10 text-violet-400" />
        </div>
        <h3 :class="`text-xl font-semibold mb-2 ${text1}`">No projects yet</h3>
        <p :class="`${text2} mb-6`">Create your first wireframe project</p>
        <button
          @click="goToNewProject"
          class="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg"
        >
          <Plus class="w-5 h-5" />
          Create Project
        </button>
      </div>

      <!-- Projects Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Create New Project Card -->
        <div
          @click="goToNewProject"
          :class="`${card} border-2 border-dashed ${border} rounded-2xl p-6 flex flex-col items-center justify-center ${hover} cursor-pointer group`"
        >
          <div
            class="w-16 h-16 rounded-full bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
          >
            <Plus class="w-8 h-8 text-violet-400" />
          </div>
          <p :class="`text-sm ${text2}`">+ Nieuw project</p>
        </div>

        <ProjectCard
          v-for="project in filteredProjects"
          :key="project.id"
          :project="project"
          :dark-mode="darkMode"
          @click="openProject"
          @delete="deleteProject"
        />
      </div>
    </div>
  </div>
</template>
