<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { X, Zap, Upload, Trash2, ChevronDown, Sun, Moon } from 'lucide-vue-next'
import { projectService } from '../services/projectService.js'
import { wireframeService } from '../services/wireframeService.js'
import { isDemoAccount } from '../utils/auth.js'
import { compressFilesForAI, getTotalSize } from '../utils/fileCompression.js'
import { useTheme } from '../composables/useTheme.js'

const router = useRouter()
const { darkMode, toggleDarkMode, bg, card, border, text1, text2, hover, inputBg } = useTheme()

const formData = ref({
  projectName: '',
  companyName: '',
  description: '',
  language: 'Nederlands',
  autoNumPages: true, // when true, AI decides; when false, user provides numPages
  numPages: 5,
})

// Select-mode for number of pages (maps to autoNumPages boolean)
const numPagesMode = computed({
  get: () => (formData.value.autoNumPages ? 'auto' : 'manual'),
  set: (mode) => {
    formData.value.autoNumPages = mode === 'auto'
  },
})

const isCreating = ref(false)
const loadingStep = ref('')
const uploadedFiles = ref([])
const isDragging = ref(false)
const expandedDescription = ref(false)

const goBack = () => {
  router.push('/')
}

// File upload handlers
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  addFiles(files)
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  const files = Array.from(event.dataTransfer.files || [])
  addFiles(files)
}

const handleDragOver = (event) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const addFiles = (files) => {
  // Filter voor alleen bepaalde bestandstypes indien nodig
  const validFiles = files.filter(
    (file) =>
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type.includes('document'),
  )

  uploadedFiles.value = [...uploadedFiles.value, ...validFiles]
}

const removeFile = (index) => {
  uploadedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Computed: total original file size
const totalFileSize = computed(() => {
  return uploadedFiles.value.reduce((sum, f) => sum + f.size, 0)
})

// Create project and save to Supabase
const createProject = async () => {
  if (!formData.value.projectName.trim()) {
    alert('Vul een projectnaam in')
    return
  }

  isCreating.value = true

  try {
    // 1. Compress and convert uploaded files (for AI context only, not for storage)
    let filesForAI = []
    if (uploadedFiles.value.length > 0) {
      loadingStep.value = 'Bestanden comprimeren...'
      console.log('Compressing files for AI context...')

      const originalSize = totalFileSize.value
      filesForAI = await compressFilesForAI(uploadedFiles.value, (status) => {
        loadingStep.value = status
      })

      const compressedSize = getTotalSize(filesForAI)
      const savedPercent = Math.round((1 - compressedSize / originalSize) * 100)
      console.log(
        `Files compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${savedPercent}% bespaard)`,
      )
      console.log(`${filesForAI.length} file(s)/pages prepared for AI`)
    }

    // 2. Check if user is demo account (to avoid unnecessary API calls)
    const isDemo = await isDemoAccount()
    if (isDemo) {
      console.log('Demo account detected - using dummy data to avoid API calls')
      loadingStep.value = 'Demo data wordt geladen...'
    } else {
      loadingStep.value = 'AI genereert wireframe...'
    }

    console.log('Genereren wireframe via Edge Function...')
    // Build payload; include numPages only if user opts out of AI deciding
    const payload = {
      projectName: formData.value.projectName,
      companyName: formData.value.companyName,
      description: formData.value.description,
      language: formData.value.language,
      files: filesForAI,
      useDummyData: isDemo,
    }

    if (!formData.value.autoNumPages && Number.isFinite(formData.value.numPages)) {
      payload.numPages = formData.value.numPages
    }

    // Track if we've already redirected
    let hasRedirected = false
    let savedProjectId = null

    // Start wireframe generation with callbacks
    const wireframeResult = await wireframeService.generateWireframe(payload, {
      onProgress: (progress) => {
        if (!hasRedirected) {
          loadingStep.value = progress
        }
      },
      onSitemapReady: async (sitemapData) => {
        // Sitemap is ready - create project and redirect immediately!
        console.log('Sitemap ready, creating project and redirecting...')
        loadingStep.value = 'Sitemap gereed, project aanmaken...'

        try {
          // Convert sitemap to project format
          const projectData = wireframeService.convertToProjectFormat({
            sections: sitemapData.sections,
            pages: sitemapData.pages,
          })

          // Mark pages as pending ONLY if they don't have blocks yet
          // (For dummy data, pages already have blocks and status: 'complete')
          projectData.pages = projectData.pages.map((page) => ({
            ...page,
            status: page.status || (page.blocks?.length > 0 ? 'complete' : 'pending'),
          }))

          // Create project with status 'generating'
          const newProject = {
            name: formData.value.projectName,
            company: formData.value.companyName,
            description: formData.value.description,
            sections: projectData.sections,
            pages: projectData.pages,
            date: new Date().toLocaleDateString('nl-NL'),
            // If all pages already have blocks (dummy data), mark as complete
            status: projectData.pages.every((p) => p.status === 'complete')
              ? 'complete'
              : 'generating',
            language: formData.value.language,
            created_at: new Date().toISOString(),
          }

          const savedProject = await projectService.createProject(newProject)
          savedProjectId = savedProject.id
          console.log('Project created with status generating:', savedProject.id)

          // Store generation state for EditorView to continue listening
          sessionStorage.setItem('generating_project_id', savedProject.id)

          hasRedirected = true
          loadingStep.value = 'Editor openen...'
          router.push(`/editor/${savedProject.id}`)
        } catch (err) {
          console.error('Error creating project from sitemap:', err)
        }
      },
      onPagesGenerated: async (pagesData) => {
        // Pages generated - update project in database
        if (savedProjectId) {
          console.log(`Pages generated: ${pagesData.pages.map((p) => p.page).join(', ')}`)
          try {
            // Get current project
            const currentProject = await projectService.getProject(savedProjectId)
            if (currentProject) {
              // Update pages that match (use .name from project format, .page from wireframe format)
              const updatedPages = currentProject.pages.map((existingPage) => {
                const newPage = pagesData.pages.find((p) => p.page === existingPage.name)
                if (newPage) {
                  console.log(
                    `Updating page "${existingPage.name}" with ${newPage.blocks?.length || 0} blocks`,
                  )
                  // Convert but PRESERVE the original page ID!
                  const converted = wireframeService.convertPageToProjectFormat(newPage)
                  return {
                    ...converted,
                    id: existingPage.id, // Keep original ID
                  }
                }
                return existingPage
              })

              // Final batch? Update project status
              const isComplete = pagesData.percentage >= 100

              await projectService.updateProject(savedProjectId, {
                pages: updatedPages,
                status: isComplete ? 'Draft' : 'generating',
              })
              console.log(`Database updated, isComplete: ${isComplete}`)
            }
          } catch (err) {
            console.error('Error updating pages:', err)
          }
        }
      },
    })

    // If demo account or old behavior (no sitemap_ready event), handle normally
    if (!hasRedirected) {
      loadingStep.value = "Pagina's structureren..."
      const projectData = wireframeService.convertToProjectFormat(wireframeResult.wireframeJson)

      loadingStep.value = 'Project opslaan...'
      const newProject = {
        name: formData.value.projectName,
        company: formData.value.companyName,
        description: formData.value.description,
        sections: projectData.sections,
        pages: projectData.pages,
        date: new Date().toLocaleDateString('nl-NL'),
        status: 'Draft',
        language: formData.value.language,
        created_at: new Date().toISOString(),
      }

      const savedProject = await projectService.createProject(newProject)
      console.log('Project succesvol aangemaakt:', savedProject)

      loadingStep.value = 'Editor openen...'
      router.push(`/editor/${savedProject.id}`)
    }
  } catch (error) {
    console.error('Error creating project:', error)
    alert(`Fout bij aanmaken project: ${error.message}`)
  } finally {
    isCreating.value = false
    loadingStep.value = ''
  }
}
</script>

<template>
  <div :class="`min-h-screen ${bg} ${text1}`">
    <!-- Header -->
    <div :class="`${card} border-b justify-between ${border}`">
      <div class="max-w-4xl mx-auto px-8 py-6">
        <div class="flex items-center justify-between mb-4">
          <button
            @click="goBack"
            :class="`flex items-center gap-2 ${text2} hover:${text1} cursor-pointer`"
          >
            <X class="w-5 h-5" />
            Terug naar Dashboard
          </button>
          <button @click="toggleDarkMode" :class="`p-3 rounded-xl ${hover} cursor-pointer`">
            <Sun v-if="darkMode" class="w-5 h-5" />
            <Moon v-else class="w-5 h-5" />
          </button>
        </div>
        <h1 class="text-3xl font-bold">Nieuw Project Aanmaken</h1>
      </div>
    </div>

    <!-- Form -->
    <div class="max-w-4xl mx-auto px-8 py-12">
      <div :class="`${card} border ${border} rounded-2xl p-8 shadow-xl`">
        <div class="space-y-6">
          <!-- Project Name -->
          <div>
            <label class="block text-sm font-medium mb-2">Projectnaam *</label>
            <input
              v-model="formData.projectName"
              type="text"
              placeholder="E-commerce Platform"
              :class="`w-full px-4 py-3 ${inputBg} ${text2} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none`"
            />
          </div>

          <!-- Company Name -->
          <div>
            <label class="block text-sm font-medium mb-2">Bedrijfsnaam</label>
            <input
              v-model="formData.companyName"
              type="text"
              placeholder="TechShop BV"
              :class="`w-full px-4 py-3 ${inputBg} ${text2} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none`"
            />
          </div>

          <!-- Description (Expandable height) -->
          <div>
            <label class="block text-sm font-medium mb-2">Beschrijving</label>
            <div class="relative">
              <textarea
                v-model="formData.description"
                :rows="expandedDescription ? 12 : 4"
                placeholder="Beschrijf je project..."
                :class="`w-full px-4 py-3 pr-10 ${inputBg} ${text2} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-all`"
              />
              <button
                type="button"
                @click="expandedDescription = !expandedDescription"
                class="absolute top-3 right-3 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                :title="expandedDescription ? 'Kleiner maken' : 'Groter maken'"
              >
                <ChevronDown
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': expandedDescription }"
                />
              </button>
            </div>
          </div>

          <!-- Language & Pages -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Language -->
            <div>
              <label class="block text-sm font-medium mb-2">Taal</label>
              <select
                v-model="formData.language"
                :class="`w-full px-4 py-3 ${inputBg} ${text2} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none`"
              >
                <option>Nederlands</option>
                <option>English</option>
              </select>
            </div>

            <!-- Pages -->
            <div>
              <label class="block text-sm font-medium mb-2">Aantal pagina's</label>
              <select
                v-model="numPagesMode"
                :class="`w-full px-4 py-3 ${inputBg} ${text2} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none`"
              >
                <option value="auto">Automatisch</option>
                <option value="manual">Handmatig</option>
              </select>
              <div v-if="numPagesMode === 'manual'" class="mt-3">
                <input
                  v-model.number="formData.numPages"
                  type="number"
                  min="1"
                  max="20"
                  :class="`w-full px-4 py-3 ${inputBg} ${text2} border ${border} rounded-xl focus:ring-2 focus:ring-violet-500 outline-none`"
                />
              </div>
            </div>
          </div>

          <!-- File Upload -->
          <div>
            <label class="block text-sm font-medium mb-2">Bestanden</label>
            <div
              @drop="handleDrop"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              :class="[
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                isDragging ? 'border-violet-500 bg-violet-500/10' : `border ${border} ${inputBg}`,
              ]"
            >
              <input
                type="file"
                multiple
                @change="handleFileSelect"
                class="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx"
              />
              <label for="file-upload" class="cursor-pointer">
                <Upload :class="`w-12 h-12 mx-auto mb-4 ${text2}`" />
                <p :class="`${text1} mb-2`">Voeg bestanden toe of sleep ze hierheen</p>
                <p :class="`text-sm ${text2}`">Alleen PDF</p>
              </label>
            </div>

            <!-- Uploaded Files List -->
            <div v-if="uploadedFiles.length > 0" class="mt-4 space-y-2">
              <div
                v-for="(file, index) in uploadedFiles"
                :key="index"
                :class="`flex items-center justify-between p-3 ${card} border ${border} rounded-lg`"
              >
                <div class="flex-1 min-w-0">
                  <p :class="`text-sm font-medium ${text1} truncate`">
                    {{ file.name }}
                  </p>
                  <p :class="`text-xs ${text2}`">{{ formatFileSize(file.size) }}</p>
                </div>
                <button
                  @click="removeFile(index)"
                  :class="`ml-4 p-2 hover:${hover} rounded-lg transition-colors cursor-pointer`"
                >
                  <Trash2 class="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex gap-4 mt-8">
          <button
            @click="goBack"
            :class="`flex-1 px-6 py-3 border ${border} rounded-xl font-medium hover:${hover} cursor-pointer`"
          >
            Annuleren
          </button>
          <button
            @click="createProject"
            :disabled="isCreating"
            class="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Zap class="w-5 h-5" />
            {{ isCreating ? 'Bezig met aanmaken...' : 'Genereren' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isCreating"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <div
          class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4"
        >
          <div class="flex flex-col items-center text-center">
            <!-- Animated Spinner -->
            <div class="relative mb-6">
              <div
                class="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-violet-500 animate-spin"
              ></div>
            </div>
            <h3 class="text-xl font-bold text-zinc-100 mb-2">Project Wordt Gegenereerd</h3>
            <p class="text-zinc-400 mb-6">
              {{ loadingStep || 'Voorbereiden...' }}
            </p>
            <!-- Info Text -->
            <p class="text-xs text-zinc-500 mt-4">Dit kan even duren...</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
