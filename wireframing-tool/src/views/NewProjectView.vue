<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { X, Zap, Upload, Trash2 } from 'lucide-vue-next'
import { supabase } from '../lib/supabase.js'

const router = useRouter()

const formData = ref({
  projectName: '',
  companyName: '',
  description: '',
  numPages: 5,
  language: 'Nederlands',
})

const isCreating = ref(false)
const uploadedFiles = ref([])
const isDragging = ref(false)

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

// Generate blocks for different page types
const generateBlocks = (pageType) => {
  const templates = {
    Homepage: [
      { type: 'Hero Section', content: 'Hoofdbanner met titel en CTA' },
      { type: 'Feature Grid', content: '3 kolommen met belangrijkste features' },
      { type: 'Testimonials', content: 'Klantreviews en ratings' },
    ],
    About: [
      { type: 'Header', content: 'Bedrijfsintroductie' },
      { type: 'Story Section', content: 'Ons verhaal en missie' },
    ],
    Products: [
      { type: 'Header', content: 'Product catalogus titel' },
      { type: 'Product Grid', content: 'Product kaarten met afbeeldingen' },
    ],
    Contact: [
      { type: 'Header', content: 'Neem contact op' },
      { type: 'Contact Form', content: 'Naam, email, bericht velden' },
    ],
  }

  const template = templates[pageType] || [
    { type: 'Header', content: 'Pagina header' },
    { type: 'Content Section', content: 'Hoofd content gebied' },
  ]

  return template.map((block, i) => ({
    id: `block-${Date.now()}-${i}`,
    ...block,
    props: { height: 'medium', alignment: 'left' },
  }))
}

// Generate pages based on number
const generatePages = (numPages) => {
  const types = [
    'Homepage',
    'About',
    'Products',
    'Services',
    'Contact',
    'Blog',
    'Portfolio',
    'Team',
  ]
  return Array.from({ length: Math.min(numPages, 10) }, (_, i) => ({
    id: `page-${Date.now()}-${i}`,
    name: types[i] || `Pagina ${i + 1}`,
    blocks: generateBlocks(types[i] || 'Generic'),
  }))
}

// Create project and save to Supabase
const createProject = async () => {
  if (!formData.value.projectName.trim()) {
    alert('Vul een projectnaam in')
    return
  }

  isCreating.value = true

  const newProject = {
    id: Date.now(),
    name: formData.value.projectName,
    company: formData.value.companyName,
    description: formData.value.description,
    pages: generatePages(formData.value.numPages),
    date: new Date().toLocaleDateString('nl-NL'),
    status: 'Draft',
    language: formData.value.language,
    // BELANGRIJK: files worden NIET opgeslagen in database
    // Ze blijven alleen lokaal in uploadedFiles voor AI processing
  }

  try {
    // Save to Supabase
    const { error } = await supabase.from('projects').insert([newProject])

    if (error) {
      console.error('Supabase error:', error)
      // Fallback: save to localStorage
      const saved = localStorage.getItem('wireframe_projects')
      const projects = saved ? JSON.parse(saved) : []
      projects.push(newProject)
      localStorage.setItem('wireframe_projects', JSON.stringify(projects))
      alert('Project aangemaakt (lokaal opgeslagen)')
    } else {
      alert('Project succesvol aangemaakt!')
    }

    // Navigate back to dashboard
    router.push('/')
  } catch (err) {
    console.error('Error creating project:', err)
    alert('Fout bij aanmaken project')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <!-- Header -->
    <div class="bg-zinc-900 border-b border-zinc-800">
      <div class="max-w-4xl mx-auto px-8 py-6">
        <button
          @click="goBack"
          class="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-4"
        >
          <X class="w-5 h-5" />
          Terug naar Dashboard
        </button>
        <h1 class="text-3xl font-bold">Nieuw Project Aanmaken</h1>
        <p class="mt-2 text-zinc-400">Geef context voor je sitemap</p>
      </div>
    </div>

    <!-- Form -->
    <div class="max-w-4xl mx-auto px-8 py-12">
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div class="space-y-6">
          <!-- Project Name -->
          <div>
            <label class="block text-sm font-medium mb-2">Projectnaam *</label>
            <input
              v-model="formData.projectName"
              type="text"
              placeholder="E-commerce Platform"
              class="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>

          <!-- Company Name -->
          <div>
            <label class="block text-sm font-medium mb-2">Bedrijfsnaam</label>
            <input
              v-model="formData.companyName"
              type="text"
              placeholder="TechShop BV"
              class="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium mb-2">Beschrijving</label>
            <textarea
              v-model="formData.description"
              rows="4"
              placeholder="Beschrijf je project..."
              class="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none"
            />
          </div>

          <!-- Pages & Language -->
          <div class="grid grid-cols-2 gap-6">
            <!-- Number of Pages -->
            <div>
              <label class="block text-sm font-medium mb-2">Aantal Pagina's</label>
              <input
                v-model.number="formData.numPages"
                type="number"
                min="1"
                max="10"
                class="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            <!-- Language -->
            <div>
              <label class="block text-sm font-medium mb-2">Taal</label>
              <select
                v-model="formData.language"
                class="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option>Nederlands</option>
                <option>English</option>
              </select>
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
                isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-800 bg-zinc-950',
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
                <Upload class="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                <p class="text-zinc-300 mb-2">Voeg bestanden toe of sleep ze hierheen</p>
                <p class="text-sm text-zinc-500">Afbeeldingen, PDF's en documenten</p>
              </label>
            </div>

            <!-- Uploaded Files List -->
            <div v-if="uploadedFiles.length > 0" class="mt-4 space-y-2">
              <div
                v-for="(file, index) in uploadedFiles"
                :key="index"
                class="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-zinc-100 truncate">
                    {{ file.name }}
                  </p>
                  <p class="text-xs text-zinc-500">{{ formatFileSize(file.size) }}</p>
                </div>
                <button
                  @click="removeFile(index)"
                  class="ml-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
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
            class="flex-1 px-6 py-3 border border-zinc-800 rounded-xl font-medium hover:bg-zinc-800"
          >
            Annuleren
          </button>
          <button
            @click="createProject"
            :disabled="isCreating"
            class="flex-1 px-6 py-3 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap class="w-5 h-5" />
            {{ isCreating ? 'Bezig met aanmaken...' : 'Sitemap Genereren' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
