<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronRight, Plus, Download, Save, Edit2, Copy, Check, X } from 'lucide-vue-next'
import { projectService } from '../services/projectService.js'
import BlockItem from '../components/BlockItem.vue'

const router = useRouter()
const route = useRoute()

// State
const project = ref(null)
const selectedPageId = ref(null)
const selectedBlock = ref(null)
const selectedChildInfo = ref(null) // { parentBlockId, childIndex }
const isSaving = ref(false)
const showBlockTypeMenu = ref(false)
const showJsonModal = ref(false)
const exportedJson = ref('')
const jsonCopied = ref(false)
const showNewPageModal = ref(false)
const newPageData = ref({
  name: '',
  description: '',
})

// Load project from Supabase or localStorage
onMounted(async () => {
  const projectId = parseInt(route.params.id)

  try {
    project.value = await projectService.getProject(projectId)
    // Select first page by default
    if (project.value?.pages?.length > 0) {
      selectedPageId.value = project.value.pages[0].id
    }
  } catch (err) {
    console.error('Error loading project:', err)
    // Fallback to localStorage
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
  selectedChildInfo.value = null
}

const selectBlock = (block) => {
  selectedBlock.value = block
  selectedChildInfo.value = null
}

// Haal variant opties op voor een component
const getVariantOptions = (componentType) => {
  const variantMap = {
    Kolommen: ['Default', 'Variant2'],
    Media: ['Default', 'Variant2', 'Variant3'],
    Grid: ['Default', 'Variant2', 'Variant3'],
    'Button Primary': ['Default'],
    'Button Secondary': ['Default'],
  }
  return variantMap[componentType] || []
}

// Haal beschrijving voor een variant op
const getVariantLabel = (componentType, variant) => {
  const labels = {
    Kolommen: {
      Default: 'Default (Media links, Content rechts)',
      Variant2: 'Variant2 (Content links, Media rechts)',
    },
    Media: {
      Default: 'Default (1 image)',
      Variant2: 'Variant2 (2 horizontale images)',
      Variant3: 'Variant3 (1 horizontaal + 2 squares)',
    },
    Grid: {
      Default: 'Default (3 kaarten)',
      Variant2: 'Variant2 (4 kaarten)',
      Variant3: 'Variant3 (2 kaarten)',
    },
    'Button Primary': {
      Default: 'Default',
    },
    'Button Secondary': {
      Default: 'Default',
    },
  }
  return labels[componentType]?.[variant] || variant
}

const selectChild = (child, parentBlock) => {
  // Vind de index van dit child in de parent
  const childIndex = parentBlock.children.findIndex((c) => c === child)
  selectedBlock.value = child
  selectedChildInfo.value = {
    parentBlockId: parentBlock.id,
    childIndex: childIndex,
  }
}

// Helper om parent block te vinden voor het huidige geselecteerde block
const getParentBlock = (currentBlock) => {
  // Als we al child info hebben, gebruik die
  if (selectedChildInfo.value) {
    return selectedPage.value.blocks.find((b) => b.id === selectedChildInfo.value.parentBlockId)
  }
  // Anders zoek het block op basis van ID
  return selectedPage.value.blocks.find((b) => b.id === currentBlock.id)
}

// Ga terug naar parent block
const goBackToParent = () => {
  if (selectedChildInfo.value) {
    const parentBlock = selectedPage.value.blocks.find(
      (b) => b.id === selectedChildInfo.value.parentBlockId,
    )
    if (parentBlock) {
      selectBlock(parentBlock)
    }
  }
}

// Sluit properties panel
const closeProperties = () => {
  selectedBlock.value = null
  selectedChildInfo.value = null
}

// Beschikbare component types
const availableComponents = [
  { value: 'Hero', label: 'Hero', icon: '🎯' },
  { value: 'MediaGroot', label: 'Media Groot', icon: '🖼️' },
  { value: 'Kolommen', label: 'Kolommen', icon: '📋' },
  { value: 'MediaSlider', label: 'Media Slider', icon: '🎠' },
  { value: 'Grid', label: 'Grid', icon: '📦' },
  { value: 'EntryPostSlider', label: 'Entry Post Slider', icon: '📰' },
  { value: 'LogoSlider', label: 'Logo Slider', icon: '🏢' },
  { value: 'CalltoAction', label: 'Call to Action', icon: '📢' },
  { value: 'Footer', label: 'Footer', icon: '📄' },
  { value: 'Projects', label: 'Projects', icon: '💼' },
  { value: 'News', label: 'News', icon: '📰' },
]

// Genereer default props voor een component type
const getDefaultPropsForComponent = (componentType) => {
  const defaults = {
    Hero: {
      'Has Title': true,
      'Hero Title': 'Nieuwe hero sectie',
      'Has Description': true,
      Description: 'Beschrijving',
      'Has Usps': false,
      'Has Button Primary': false,
      'Has Button Secondary': false,
    },
    MediaGroot: {},
    Kolommen: {
      'Property 1': 'Default',
    },
    MediaSlider: {
      Title: 'Media slider titel',
    },
    Grid: {
      'Property 1': 'Default',
      Title: 'Grid titel',
    },
    EntryPostSlider: {
      Title: 'Slider titel',
    },
    LogoSlider: {
      Title: 'Logo slider',
    },
    CalltoAction: {
      'Has Title': true,
      Title: 'Call to action',
      'Has Description': true,
      Description: 'Beschrijving',
      'Has Usps': false,
      'Has Button Primary': false,
      'Has Button Secondary': false,
    },
    Footer: {
      'Has Column 1': false,
      'Has Column 2': false,
      'Has Column 3': false,
      'Has Column 4': false,
      'Has Nieuwsbrief': false,
    },
    Projects: {
      Title: 'Projecten',
      'Has description': false,
      'Has example project': false,
    },
    News: {
      Title: 'Nieuws',
      Description: 'Laatste nieuws',
    },
  }
  return defaults[componentType] || {}
}

const addBlock = (componentType = 'Hero') => {
  if (!selectedPage.value) return

  const newBlock = {
    id: `block-${Date.now()}`,
    component: componentType,
    props: getDefaultPropsForComponent(componentType),
    children: [],
  }

  // Add to page
  selectedPage.value.blocks.push(newBlock)
  selectedBlock.value = newBlock
  showBlockTypeMenu.value = false

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

// Bepaal of een property getoond moet worden op basis van conditielogica
const shouldShowProperty = (propKey, allProps) => {
  // Alle "Has X" velden altijd tonen
  if (propKey.startsWith('Has ')) {
    return true
  }

  // Property 1 altijd tonen (voor enums)
  if (propKey === 'Property 1') {
    return true
  }

  // Mapping van properties naar hun "Has X" conditie (exact zoals in schema)
  const conditionalFields = {
    // Hero & CalltoAction (Has Title, Has Description, Has Usps, Has Button Primary/Secondary)
    'Hero Title': 'Has Title',
    Title: 'Has Title', // Voor CalltoAction, Accordion, Projects, etc.
    Description: 'Has Description', // Voor Hero, CalltoAction
    'Usp 1': 'Has Usps',
    'Usp 2': 'Has Usps',
    'Usp 3': 'Has Usps',

    // Text Element (Has Primary Button, Has Second Button, Has List, Has description - lowercase!)
    'Title of text Block': undefined, // Altijd tonen (geen conditie in schema)
    'Usp Text 1': 'Has List',
    'Usp text 2': 'Has List',
    'Usp Text 3': 'Has List',

    // Entry Post Inner (Has title - lowercase!, Has description - lowercase!)
    'Title of this block': 'Has title', // lowercase!
    'Category Name': 'Has Category',
    Popular: 'Has Popular',

    // Projects (Has description - lowercase!)
    'Example category': 'Has example project',
    'Example header': 'Has example project',
    'Example description': 'Has example project',

    // Footer (Has Column 1/2/3/4, Has Nieuwsbrief)
    'Header 1': 'Has Column 1',
    Link1A: 'Has Column 1',
    Link1B: 'Has Column 1',
    Link1C: 'Has Column 1',
    Link1D: 'Has Column 1',
    Link1E: 'Has Column 1',
    Link1F: 'Has Column 1',
    Link1G: 'Has Column 1',

    'Header 2': 'Has Column 2',
    Link2A: 'Has Column 2',
    Link2B: 'Has Column 2',
    Link2C: 'Has Column 2',
    Link2D: 'Has Column 2',
    Link2E: 'Has Column 2',
    Link2F: 'Has Column 2',
    Link2G: 'Has Column 2',

    'Header 3': 'Has Column 3',
    Link3A: 'Has Column 3',
    Link3B: 'Has Column 3',
    Link3C: 'Has Column 3',
    Link3D: 'Has Column 3',
    Link3E: 'Has Column 3',
    Link3F: 'Has Column 3',
    Link3G: 'Has Column 3',

    'Header 4': 'Has Column 4',
    Link4A: 'Has Column 4',
    Link4B: 'Has Column 4',
    Link4C: 'Has Column 4',
    Link4D: 'Has Column 4',
    Link4E: 'Has Column 4',
    Link4F: 'Has Column 4',
    Link4G: 'Has Column 4',

    // Accordion (Text velden hebben GEEN conditie behalve Has Title voor Title)
    Text: undefined, // Altijd tonen
    'Text 2': undefined, // Altijd tonen
    'Text 3': undefined, // Altijd tonen
    'Text 4': undefined, // Altijd tonen
    'Text open item': undefined, // Altijd tonen

    // Buttons (Property 1 en text velden altijd verplicht)
    'Text primary button': undefined, // Altijd tonen (verplicht in schema)
    'Text Secondary Button': undefined, // Altijd tonen (verplicht in schema)
  }

  // Als het veld expliciet undefined heeft, altijd tonen
  if (propKey in conditionalFields && conditionalFields[propKey] === undefined) {
    return true
  }

  // Als het veld een conditie heeft, check of die "Has X" true is
  const requiredCondition = conditionalFields[propKey]
  if (requiredCondition) {
    return allProps[requiredCondition] === true
  }

  // Check ook voor "Has description" en "Has title" (lowercase) voor Description velden
  if (propKey === 'Description') {
    // Kan "Has Description" (Hero, CalltoAction) of "Has description" (TextElement, Projects, EntryPost) zijn
    return allProps['Has Description'] === true || allProps['Has description'] === true
  }

  // Anders altijd tonen (bijv. voor velden zonder conditie)
  return true
}

// Update een property binnen block.props (voor schema-conforme blocks en children)
const updateBlockProp = (propKey, value) => {
  if (!selectedBlock.value) return

  // Als het een child is (we hebben child info)
  if (selectedChildInfo.value) {
    const parentBlock = selectedPage.value.blocks.find(
      (b) => b.id === selectedChildInfo.value.parentBlockId,
    )
    if (parentBlock && parentBlock.children) {
      const child = parentBlock.children[selectedChildInfo.value.childIndex]
      if (child && child.props) {
        child.props[propKey] = value
        selectedBlock.value = { ...child }
        saveProject()
        return
      }
    }
  }

  // Anders is het een top-level block
  const block = selectedPage.value.blocks.find((b) => b.id === selectedBlock.value.id)
  if (block && block.props) {
    block.props[propKey] = value
    selectedBlock.value = { ...block }

    // Automatisch children toevoegen/verwijderen op basis van boolean properties
    handleChildrenForBooleans(block, propKey, value)

    saveProject()
  }
}

// Automatisch children toevoegen of verwijderen op basis van boolean properties
const handleChildrenForBooleans = (block, propKey, value) => {
  if (!block.children) {
    block.children = []
  }

  // Button Primary
  if (propKey === 'Has Button Primary' || propKey === 'Has Primary Button') {
    if (value === true) {
      // Voeg Button Primary toe als die er nog niet is
      const hasButton = block.children.some((c) => c.component === 'Button Primary')
      if (!hasButton) {
        block.children.push({
          component: 'Button Primary',
          props: {
            'Property 1': 'Default',
            'Text primary button': 'Button text',
          },
        })
      }
    } else {
      // Verwijder Button Primary
      block.children = block.children.filter((c) => c.component !== 'Button Primary')
    }
  }

  // Button Secondary
  if (propKey === 'Has Button Secondary' || propKey === 'Has Second Button') {
    if (value === true) {
      // Voeg Button Secondary toe als die er nog niet is
      const hasButton = block.children.some((c) => c.component === 'Button Secondary')
      if (!hasButton) {
        block.children.push({
          component: 'Button Secondary',
          props: {
            'Property 1': 'Default',
            'Text Secondary Button': 'Button text',
          },
        })
      }
    } else {
      // Verwijder Button Secondary
      block.children = block.children.filter((c) => c.component !== 'Button Secondary')
    }
  }

  // Inner Grid Card button
  if (propKey === 'Has button' && block.component === 'Inner Grid Card') {
    if (value === true) {
      const hasButton = block.children.some((c) => c.component === 'Button Primary')
      if (!hasButton) {
        block.children.push({
          component: 'Button Primary',
          props: {
            'Property 1': 'Default',
            'Text primary button': 'Lees meer',
          },
        })
      }
    } else {
      block.children = block.children.filter((c) => c.component !== 'Button Primary')
    }
  }

  // Entry Post Inner button (altijd verplicht maar voor consistentie)
  if (propKey === 'Has title' && block.component === 'Entry Post Inner' && value === true) {
    const hasButton = block.children.some((c) => c.component === 'Button Primary')
    if (!hasButton) {
      block.children.push({
        component: 'Button Primary',
        props: {
          'Property 1': 'Default',
          'Text primary button': 'Lees meer',
        },
      })
    }
  }
}

const saveProject = async () => {
  if (!project.value) return

  isSaving.value = true

  try {
    await projectService.updateProject(project.value.id, {
      pages: project.value.pages,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error saving project:', err)
    // Fallback to localStorage
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

// Transform project data naar Figma plugin formaat
const transformToFigmaFormat = () => {
  if (!project.value) return []

  // Converteer pages naar het schema formaat (array van page objecten)
  // ZONDER rationale (is alleen voor interne gebruik)
  return project.value.pages.map((page) => ({
    page: page.name,
    // rationale wordt bewust NIET meegenomen in Figma export
    blocks: page.blocks.map((block) => {
      // Kopieer alleen component, props en children (zonder 'id')
      return {
        component: block.component,
        props: block.props,
        ...(block.children && block.children.length > 0 ? { children: block.children } : {}),
      }
    }),
  }))
}

const exportJSON = () => {
  if (!project.value) return

  const transformedData = transformToFigmaFormat()
  exportedJson.value = JSON.stringify(transformedData, null, 2)
  showJsonModal.value = true
  jsonCopied.value = false
}

const copyJsonToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(exportedJson.value)
    jsonCopied.value = true
    setTimeout(() => {
      jsonCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const closeJsonModal = () => {
  showJsonModal.value = false
  exportedJson.value = ''
  jsonCopied.value = false
}

// Add new page
const addNewPage = () => {
  showNewPageModal.value = true
  newPageData.value = {
    name: '',
    description: '',
  }
}

const createPage = () => {
  if (!newPageData.value.name.trim()) return

  const newPage = {
    id: `page-${Date.now()}`,
    name: newPageData.value.name,
    description: newPageData.value.description || '',
    rationale: '', // Lege rationale voor handmatig aangemaakte pagina's
    blocks: [],
    created_at: new Date().toISOString(),
  }

  project.value.pages.push(newPage)
  selectedPageId.value = newPage.id
  showNewPageModal.value = false
  saveProject()
}

const closeNewPageModal = () => {
  showNewPageModal.value = false
  newPageData.value = {
    name: '',
    description: '',
  }
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
            JSON
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
            <button
              @click="addNewPage"
              class="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
            >
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

          <!-- AI Rationale -->
          <div v-if="selectedPage" class="mt-6 pt-6 border-t border-zinc-800">
            <div class="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <p
                v-if="selectedPage.rationale"
                class="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap"
              >
                {{ selectedPage.rationale }}
              </p>
              <p v-else class="text-sm text-zinc-500 italic">
                Geen AI rationale beschikbaar voor deze pagina. Rationale wordt automatisch
                gegenereerd bij nieuwe projecten via AI.
              </p>
            </div>
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

            <!-- Dropdown menu voor nieuw blok -->
            <div class="relative">
              <button
                @click="showBlockTypeMenu = !showBlockTypeMenu"
                class="px-4 py-2 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Plus class="w-4 h-4" />
                Nieuw blok
              </button>

              <!-- Dropdown menu -->
              <div
                v-if="showBlockTypeMenu"
                class="absolute right-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
              >
                <button
                  v-for="component in availableComponents"
                  :key="component.value"
                  @click="addBlock(component.value)"
                  class="w-full text-left px-4 py-3 hover:bg-zinc-700 transition-colors flex items-center gap-3 border-b border-zinc-700/50 last:border-b-0"
                >
                  <span class="text-2xl">{{ component.icon }}</span>
                  <span class="text-sm font-medium text-zinc-100">{{ component.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Click outside to close dropdown -->
          <div
            v-if="showBlockTypeMenu"
            @click="showBlockTypeMenu = false"
            class="fixed inset-0 z-40"
          ></div>

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
            <!-- Breadcrumb navigatie -->
            <div v-if="selectedChildInfo" class="mb-4 pb-4 border-b border-zinc-800">
              <div class="flex items-center gap-2 text-sm mb-3">
                <button
                  @click="goBackToParent"
                  class="text-zinc-400 hover:text-violet-400 transition-colors"
                >
                  {{ getParentBlock(selectedBlock)?.component }}
                </button>
                <ChevronRight class="w-4 h-4 text-zinc-600" />
                <span class="text-violet-400 font-medium">
                  {{ selectedBlock.component || selectedBlock.type }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between mb-6">
              <h3 class="font-semibold">Properties</h3>
              <button @click="closeProperties" class="text-zinc-500 hover:text-zinc-300">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Component</label>
                <input
                  :value="selectedBlock.component || selectedBlock.type"
                  disabled
                  class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div
                v-if="selectedBlock.props && Object.keys(selectedBlock.props).length > 0"
                class="border-t border-zinc-800 pt-4"
              >
                <h4 class="text-sm font-medium mb-4">Properties</h4>

                <!-- Loop door alle properties -->
                <template v-for="(value, key) in selectedBlock.props" :key="key">
                  <!-- Alleen tonen als het een "Has X" veld is, of als de bijbehorende "Has X" true is -->
                  <div v-if="shouldShowProperty(key, selectedBlock.props)" class="mb-4">
                    <label class="block text-xs font-medium mb-2 text-zinc-300">
                      {{ key }}
                    </label>

                    <!-- Boolean property: checkbox -->
                    <div v-if="typeof value === 'boolean'" class="flex items-center">
                      <input
                        type="checkbox"
                        :checked="value"
                        @input="updateBlockProp(key, $event.target.checked)"
                        class="w-4 h-4 bg-zinc-950 border-zinc-700 rounded text-violet-600 focus:ring-2 focus:ring-violet-500"
                      />
                      <span class="ml-2 text-sm text-zinc-400">
                        {{ value ? 'Ja' : 'Nee' }}
                      </span>
                    </div>

                    <!-- Property 1 (variant selector): dropdown -->
                    <select
                      v-else-if="key === 'Property 1'"
                      :value="value"
                      @input="updateBlockProp(key, $event.target.value)"
                      class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                    >
                      <option
                        v-for="variant in getVariantOptions(selectedBlock.component)"
                        :key="variant"
                        :value="variant"
                      >
                        {{ getVariantLabel(selectedBlock.component, variant) }}
                      </option>
                    </select>

                    <!-- String property: text input -->
                    <input
                      v-else
                      :value="value"
                      @input="updateBlockProp(key, $event.target.value)"
                      class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                </template>
              </div>

              <div
                v-if="selectedBlock.children && selectedBlock.children.length > 0"
                class="border-t border-zinc-800 pt-4"
              >
                <h4 class="text-sm font-medium mb-4">
                  Children ({{ selectedBlock.children.length }})
                </h4>
                <div class="space-y-2">
                  <button
                    v-for="(child, idx) in selectedBlock.children"
                    :key="idx"
                    @click="selectChild(child, getParentBlock(selectedBlock))"
                    class="w-full text-left p-3 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-violet-500 hover:bg-violet-500/5 transition-all cursor-pointer"
                  >
                    <div class="text-xs font-medium text-violet-400">
                      {{ child.component }}
                    </div>
                    <div v-if="child.index !== undefined" class="text-xs text-zinc-500 mt-1">
                      Index: {{ child.index }}
                    </div>
                    <div
                      v-if="child.props?.['Text primary button']"
                      class="text-xs text-zinc-400 mt-1"
                    >
                      "{{ child.props['Text primary button'] }}"
                    </div>
                    <div
                      v-if="child.props?.['Text Secondary Button']"
                      class="text-xs text-zinc-400 mt-1"
                    >
                      "{{ child.props['Text Secondary Button'] }}"
                    </div>
                  </button>
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

  <!-- JSON Export Modal -->
  <div
    v-if="showJsonModal"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
    @click.self="closeJsonModal"
  >
    <div
      class="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-4xl max-h-[80vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-zinc-800">
        <div>
          <h2 class="text-xl font-bold text-zinc-100">Exporteer JSON</h2>
          <p class="text-sm text-zinc-400 mt-1">Kopieer deze JSON voor de Figma plugin</p>
        </div>
        <button @click="closeJsonModal" class="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <X class="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <!-- JSON Content -->
      <div class="flex-1 overflow-auto p-6">
        <pre
          class="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 font-mono overflow-x-auto"
          >{{ exportedJson }}</pre
        >
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-6 border-t border-zinc-800">
        <p class="text-xs text-zinc-500">
          {{ project?.pages?.length || 0 }} pagina's • {{ exportedJson.length }} characters
        </p>
        <div class="flex gap-3">
          <button
            @click="closeJsonModal"
            class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            Sluiten
          </button>
          <button
            @click="copyJsonToClipboard"
            class="px-4 py-2 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all"
            :class="jsonCopied ? 'from-emerald-600 to-emerald-600' : ''"
          >
            <Check v-if="jsonCopied" class="w-4 h-4" />
            <Copy v-else class="w-4 h-4" />
            {{ jsonCopied ? 'Gekopieerd!' : 'Kopieer JSON' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- New Page Modal -->
  <div
    v-if="showNewPageModal"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
    @click.self="closeNewPageModal"
  >
    <div class="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-zinc-800">
        <div>
          <h2 class="text-xl font-bold text-zinc-100">Nieuwe pagina</h2>
          <p class="text-sm text-zinc-400 mt-1">Maak een nieuwe pagina voor dit project</p>
        </div>
        <button
          @click="closeNewPageModal"
          class="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X class="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <!-- Form Content -->
      <div class="p-6 space-y-6">
        <!-- Pagina Naam -->
        <div>
          <label class="block text-sm font-medium mb-2 text-zinc-300">
            Pagina Naam<span class="text-red-400 ml-1">*</span>
          </label>
          <input
            v-model="newPageData.name"
            type="text"
            placeholder="Bijv. Cases, Services, Portfolio..."
            class="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>

        <!-- Beschrijving -->
        <div>
          <label class="block text-sm font-medium mb-2 text-zinc-300">
            Beschrijving<span class="text-red-400 ml-1">*</span>
          </label>
          <textarea
            v-model="newPageData.description"
            placeholder="Beschrijf de pagina..."
            rows="4"
            class="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
          ></textarea>
        </div>

        <!-- Info -->
        <div class="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <p class="text-sm text-zinc-400">
            <span class="font-medium text-zinc-300">Tip:</span> Je kunt na het aanmaken van de
            pagina blokken toevoegen om de inhoud te structureren.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
        <button
          @click="closeNewPageModal"
          class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          Annuleer
        </button>
        <button
          @click="createPage"
          :disabled="!newPageData.name.trim()"
          class="px-6 py-2 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus class="w-4 h-4" />
          Maak Pagina
        </button>
      </div>
    </div>
  </div>
</template>
