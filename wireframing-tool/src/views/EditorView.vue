<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChevronRight,
  Plus,
  Download,
  Save,
  Edit2,
  Copy,
  Check,
  X,
  Undo2,
  Redo2,
  Loader2,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  RefreshCw,
} from 'lucide-vue-next'
import { projectService } from '../services/projectService.js'
import { wireframeService } from '../services/wireframeService.js'
import BlockItem from '../components/BlockItem.vue'
import { useTheme } from '../composables/useTheme.js'

const router = useRouter()
const route = useRoute()
const {
  darkMode,
  toggleDarkMode,
  bg,
  card,
  border,
  text1,
  text2,
  hover,
  inputBg,
  divider,
  dividerBg,
} = useTheme()

// State
const project = ref(null)
const selectedPageId = ref(null)
const selectedSectionId = ref(null) // Voor section selectie
const selectedBlock = ref(null)
const selectedChildInfo = ref(null) // { parentBlockId, childIndex }
const isSaving = ref(false)
const showBlockTypeMenu = ref(false)
const showJsonModal = ref(false)
const exportedJson = ref('')
const jsonCopied = ref(false)
const showNewPageModal = ref(false)
const showNewSectionModal = ref(false)
const newPageData = ref({
  name: '',
  description: '',
})
const newSectionData = ref({
  name: '',
  handle: '',
  type: 'single',
  slug: '',
  template: '',
  fetchesFrom: '',
  categories: [],
})

// Regenerate page state
const showRegenerateModal = ref(false)
const regeneratePrompt = ref('')
const isRegenerating = ref(false)
const regenerateProgress = ref('')
const regenerateError = ref('')

// AI Section generation state (AI mode is default)
const useAIForSection = ref(true)
const sectionPrompt = ref('')
const isGeneratingSection = ref(false)
const sectionProgress = ref('')
const sectionError = ref('')

// Drag and drop state
const draggedBlockId = ref(null)
const dragOverBlockId = ref(null)

// Undo/Redo history
const history = ref([])
const historyIndex = ref(-1)
const MAX_HISTORY = 50 // Limit history to prevent memory issues

// Undo/Redo history management
const saveToHistory = () => {
  if (!project.value || !selectedPageId.value) return

  // Create a deep copy of the current page state
  const currentPage = project.value.pages.find((p) => p.id === selectedPageId.value)
  if (!currentPage) return

  const snapshot = JSON.parse(JSON.stringify(currentPage))

  // Remove future history if we're not at the end
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // Add new snapshot
  history.value.push(snapshot)

  // Limit history size
  if (history.value.length > MAX_HISTORY) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
}

const undo = () => {
  if (!canUndo.value) return

  historyIndex.value--
  restoreFromHistory()
}

const redo = () => {
  if (!canRedo.value) return

  historyIndex.value++
  restoreFromHistory()
}

const restoreFromHistory = () => {
  if (!project.value || historyIndex.value < 0 || historyIndex.value >= history.value.length) return

  const snapshot = history.value[historyIndex.value]
  const pageIndex = project.value.pages.findIndex((p) => p.id === selectedPageId.value)

  if (pageIndex !== -1) {
    // Deep copy to prevent reference issues
    project.value.pages[pageIndex] = JSON.parse(JSON.stringify(snapshot))

    // Clear selection to avoid stale references
    selectedBlock.value = null
    selectedChildInfo.value = null

    // Save to backend (without adding to history)
    saveProjectWithoutHistory()
  }
}

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// Keyboard shortcuts for undo/redo
onMounted(() => {
  const handleKeyPress = (e) => {
    // Ctrl+Z or Cmd+Z (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    }
    // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z (Mac)
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      redo()
    }
  }

  window.addEventListener('keydown', handleKeyPress)

  // Cleanup on unmount
  return () => {
    window.removeEventListener('keydown', handleKeyPress)
  }
})

// Load project from Supabase or localStorage
onMounted(async () => {
  const projectId = route.params.id // UUID is a string, not a number

  try {
    // Probeer eerst Supabase (voor UUID projecten)
    project.value = await projectService.getProject(projectId)

    // Select first section if available, otherwise first page
    if (project.value?.sections?.length > 0) {
      selectedSectionId.value = project.value.sections[0].id
      // Auto-select first page for this section
      const firstSection = project.value.sections[0]
      const pagesForSection = project.value.pages?.filter((p) => p.section === firstSection.handle)
      if (pagesForSection?.length > 0) {
        selectedPageId.value = pagesForSection[0].id
      } else if (project.value?.pages?.length > 0) {
        selectedPageId.value = project.value.pages[0].id
      }
    } else if (project.value?.pages?.length > 0) {
      selectedPageId.value = project.value.pages[0].id
    }

    // Initialize history with current state
    if (selectedPageId.value) {
      saveToHistory()
    }

    // Start polling if project is still generating
    if (project.value?.status === 'generating') {
      console.log('Project is generating, starting polling...')
      startPolling()
    }
  } catch (err) {
    console.error('Error loading project:', err)
    // Fallback to localStorage (voor oude projecten met number IDs of UUIDs)
    loadFromLocalStorage(projectId)
  }
})

const loadFromLocalStorage = (projectId) => {
  const saved = localStorage.getItem('wireframe_projects')
  if (saved) {
    const projects = JSON.parse(saved)
    // Support both UUID strings and number IDs (for backward compatibility)
    // Convert both to strings for comparison
    project.value = projects.find((p) => String(p.id) === String(projectId))
    if (project.value?.pages?.length > 0) {
      selectedPageId.value = project.value.pages[0].id
      // Initialize history with current state
      saveToHistory()
    }
  }
}

// Check if project is still generating
const isGenerating = computed(() => project.value?.status === 'generating')

// Track generation progress
const generationProgress = computed(() => {
  if (!project.value?.pages) return { total: 0, complete: 0, pending: [], percentage: 0 }

  const pages = project.value.pages
  const complete = pages.filter((p) => p.status === 'complete' || (p.blocks && p.blocks.length > 0))
  const pending = pages.filter((p) => p.status === 'pending' || !p.blocks || p.blocks.length === 0)

  return {
    total: pages.length,
    complete: complete.length,
    pending: pending.map((p) => p.name),
    percentage: pages.length > 0 ? Math.round((complete.length / pages.length) * 100) : 0,
  }
})

// Polling interval for live updates
let pollInterval = null

const startPolling = () => {
  if (pollInterval) return

  pollInterval = setInterval(async () => {
    if (!project.value || !isGenerating.value) {
      stopPolling()
      return
    }

    try {
      const updated = await projectService.getProject(project.value.id)
      if (updated) {
        // Update pages but preserve current selection
        const currentPageId = selectedPageId.value
        const currentSectionId = selectedSectionId.value

        project.value = updated

        // Restore selection
        selectedPageId.value = currentPageId
        selectedSectionId.value = currentSectionId

        // Stop polling if generation is complete
        if (updated.status !== 'generating') {
          stopPolling()
          console.log('Generation complete, polling stopped')
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, 3000) // Poll every 3 seconds
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onUnmounted(() => {
  stopPolling()
})

// Computed
const sections = computed(() => {
  return project.value?.sections || []
})

const selectedSection = computed(() => {
  if (!project.value || !selectedSectionId.value) return null
  return project.value.sections?.find((s) => s.id === selectedSectionId.value)
})

// Get pages for selected section
const pagesForSection = computed(() => {
  if (!selectedSection.value || !project.value?.pages) return []
  return project.value.pages.filter((p) => p.section === selectedSection.value.handle)
})

const selectedPage = computed(() => {
  if (!project.value || !selectedPageId.value) return null
  return project.value.pages.find((p) => p.id === selectedPageId.value)
})

const blocks = computed(() => {
  return selectedPage.value?.blocks || []
})

// Check if selected page is from a channel or structure section (no regenerate allowed)
const canRegeneratePage = computed(() => {
  if (!selectedPage.value || !project.value?.sections) return true
  const pageSection = project.value.sections.find((s) => s.handle === selectedPage.value.section)
  // Hide regenerate for channel and structure sections
  if (pageSection && (pageSection.type === 'channel' || pageSection.type === 'structure')) {
    return false
  }
  return true
})

// Get available sections for entry section dropdown
const availableSectionsForEntrySection = computed(() => {
  if (!project.value?.sections) return []
  return project.value.sections.filter((s) => s.type === 'channel' || s.type === 'structure')
})

// Methods
const goBack = () => {
  router.push('/')
}

const selectSection = (sectionId) => {
  selectedSectionId.value = sectionId
  selectedBlock.value = null
  selectedChildInfo.value = null
  // Auto-select first page for this section
  const section = project.value.sections?.find((s) => s.id === sectionId)
  if (section) {
    const pagesForThisSection = project.value.pages?.filter((p) => p.section === section.handle)
    if (pagesForThisSection?.length > 0) {
      selectedPageId.value = pagesForThisSection[0].id
    } else {
      selectedPageId.value = null
    }
  }
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

// Verwijder een pagina
const deletePage = (pageId) => {
  if (!confirm('Weet je zeker dat je deze pagina wilt verwijderen?')) return

  if (!project.value?.pages) return

  project.value.pages = project.value.pages.filter((p) => p.id !== pageId)

  // Als de verwijderde pagina geselecteerd was, deselecteer
  if (selectedPageId.value === pageId) {
    selectedPageId.value = null
    selectedBlock.value = null
    selectedChildInfo.value = null
  }
}

// Verwijder een section
const deleteSection = (sectionHandle) => {
  if (
    !confirm(
      "Weet je zeker dat je deze section wilt verwijderen? Alle bijbehorende pagina's worden ook verwijderd.",
    )
  )
    return

  if (!project.value?.sections) return

  // Verwijder de section
  project.value.sections = project.value.sections.filter((s) => s.handle !== sectionHandle)

  // Verwijder ook alle pagina's die bij deze section horen
  if (project.value.pages) {
    project.value.pages = project.value.pages.filter((p) => p.section !== sectionHandle)
  }

  // Als de verwijderde section geselecteerd was, deselecteer
  if (selectedSectionId.value === sectionHandle) {
    selectedSectionId.value = null
    selectedPageId.value = null
    selectedBlock.value = null
    selectedChildInfo.value = null
  }
}

// Beschikbare component types
const availableComponents = [
  { value: 'CalltoAction', label: 'Call to Action', icon: '📢' },
  { value: 'Contactform', label: 'Contactform', icon: '✉️' },
  { value: 'Detailpage', label: 'Detail page', icon: '📄' },
  { value: 'EntryPostSlider', label: 'Entry Post Slider', icon: '📰' },
  { value: 'Footer', label: 'Footer', icon: '📄' },
  { value: 'Form', label: 'Form', icon: '📝' },
  { value: 'Grid', label: 'Grid', icon: '📦' },
  { value: 'Hero', label: 'Hero', icon: '🎯' },
  { value: 'Kolommen', label: 'Kolommen', icon: '📋' },
  { value: 'LogoSlider', label: 'Logo Slider', icon: '🏢' },
  { value: 'MediaGroot', label: 'Media Groot', icon: '🖼️' },
  { value: 'MediaSlider', label: 'Media Slider', icon: '🎠' },
  { value: 'News', label: 'News', icon: '📰' },
  { value: 'Projects', label: 'Projects', icon: '💼' },
]

// Genereer default props voor een component type
const getDefaultPropsForComponent = (componentType) => {
  const defaults = {
    CalltoAction: {
      'Has Title': true,
      Title: 'Call to action',
      'Has Description': true,
      Description: 'Beschrijving',
      'Has Usps': false,
      'Has Button Primary': false,
      'Has Button Secondary': false,
    },
    Contactform: {},
    Detailpage: {
      'Has Project Header': false,
      'Has News Header': true,
      'Has Highlight Paragraph': false,
      'Has More Projects': false,
      'Has More News': false,
    },
    EntryPostSlider: {
      Title: 'Slider titel',
    },
    Footer: {
      'Has Column 1': false,
      'Has Column 2': false,
      'Has Column 3': false,
      'Has Column 4': false,
      'Has Nieuwsbrief': false,
    },
    Form: {
      'Has Field 1': false,
      'Has Field 2': false,
      'Has Field 3': false,
      'Has Radio Buttons': false,
      'Has Checkboxes': false,
      'Has Dropdown': false,
      'Has Name': false,
      'Has Email': false,
      'Has Phone number': false,
      'Has Date Timed': false,
    },
    Grid: {
      'Property 1': 'Default',
      Title: 'Grid titel',
    },
    Hero: {
      'Has Title': true,
      'Hero Title': 'Nieuwe hero sectie',
      'Has Description': true,
      Description: 'Beschrijving',
      'Has Usps': false,
      'Has Button Primary': false,
      'Has Button Secondary': false,
    },
    Kolommen: {
      'Property 1': 'Default',
    },
    LogoSlider: {
      Title: 'Logo slider',
    },
    MediaGroot: {},
    MediaSlider: {
      Title: 'Media slider titel',
    },
    News: {
      Title: 'Nieuws',
      Description: 'Laatste nieuws',
    },
    Projects: {
      Title: 'Projecten',
      'Has description': false,
      'Has example project': false,
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

  // Add default children for specific components
  if (componentType === 'Detailpage') {
    // Detailpage always has a CalltoAction as child
    newBlock.children.push({
      component: 'CalltoAction',
      props: {
        'Has Title': true,
        Title: 'Neem contact op',
        'Has Description': true,
        Description: 'Beschrijving',
        'Has Usps': false,
        'Has Button Primary': true,
        'Has Button Secondary': false,
      },
      children: [
        {
          component: 'Button Primary',
          props: {
            'Property 1': 'Default',
            'Text primary button': 'Contact',
          },
        },
      ],
    })
  } else if (componentType === 'Grid') {
    // Grid gets default cards based on variant (Default = 3 cards)
    const variant = newBlock.props['Property 1'] || 'Default'
    const cardCount = variant === 'Default' ? 3 : variant === 'Variant2' ? 4 : 2
    for (let i = 0; i < cardCount; i++) {
      newBlock.children.push({
        component: 'Inner Grid Card',
        index: i,
        props: {
          Title: `Card ${i + 1}`,
          Description: 'Beschrijving',
          'Has button': false,
        },
        children: [],
      })
    }
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

// Drag and drop handlers
const handleDragStart = (blockId, event) => {
  draggedBlockId.value = blockId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', blockId)
  // Add visual feedback
  event.target.style.opacity = '0.5'
}

const handleDragEnd = (event) => {
  draggedBlockId.value = null
  dragOverBlockId.value = null
  // Reset visual feedback
  event.target.style.opacity = '1'
}

const handleDragOver = (blockId) => {
  if (draggedBlockId.value && draggedBlockId.value !== blockId) {
    dragOverBlockId.value = blockId
  }
}

const handleDrop = (targetBlockId) => {
  if (!selectedPage.value || !draggedBlockId.value || draggedBlockId.value === targetBlockId) {
    dragOverBlockId.value = null
    return
  }

  const fromIndex = selectedPage.value.blocks.findIndex((b) => b.id === draggedBlockId.value)
  const toIndex = selectedPage.value.blocks.findIndex((b) => b.id === targetBlockId)

  if (fromIndex === -1 || toIndex === -1) {
    dragOverBlockId.value = null
    return
  }

  // Reorder blocks
  const blocks = [...selectedPage.value.blocks]
  const [movedBlock] = blocks.splice(fromIndex, 1)
  blocks.splice(toIndex, 0, movedBlock)

  selectedPage.value.blocks = blocks
  dragOverBlockId.value = null

  // Save with history
  saveProject()
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

  // Inner Grid Card: Title en Description altijd tonen (geen Has conditie)
  if (selectedBlock.value?.component === 'Inner Grid Card') {
    if (propKey === 'Title' || propKey === 'Description') {
      return true
    }
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

    // Contactform (geen properties)

    // Detail page
    'Paragraph 1': undefined, // Altijd tonen
    'Paragraph 2': undefined, // Altijd tonen
    'Highlight Title': 'Has Highlight Paragraph',
    'Highlight Paragraph': 'Has Highlight Paragraph',
    'Paragraph 3 Title': undefined, // Altijd tonen
    'Paragraph 3': undefined, // Altijd tonen
    'Paragraph 4': undefined, // Altijd tonen

    // Form
    'Field 1': 'Has Field 1',
    'Field 2.1': 'Has Field 2',
    'Field 2.2': 'Has Field 2',
    'Field 3': 'Has Field 3',
    'Radio Button 1': 'Has Radio Buttons',
    'Radio Button 2': 'Has Radio Buttons',
    'Radio Button 3': 'Has Radio Buttons',
    'Checkbox 1': 'Has Checkboxes',
    'Checkbox 2': 'Has Checkboxes',
    'Checkbox 3': 'Has Checkboxes',
    'Dropdown title': 'Has Dropdown',
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

// Update blockType
const updateBlockType = (value) => {
  if (!selectedBlock.value || !selectedPage.value) return

  const block = selectedPage.value.blocks.find((b) => b.id === selectedBlock.value.id)
  if (block) {
    block.blockType = value
    if (value === 'staticContent') {
      delete block.fetchesFrom
    }
    selectedBlock.value = { ...block }
    saveProject()
  }
}

// Update fetchesFrom
const updateFetchesFrom = (value) => {
  if (!selectedBlock.value || !selectedPage.value) return

  const block = selectedPage.value.blocks.find((b) => b.id === selectedBlock.value.id)
  if (block) {
    block.fetchesFrom = value || undefined
    selectedBlock.value = { ...block }
    saveProject()
  }
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

        // Handle children for child blocks too
        handleChildrenForBooleans(child, propKey, value)

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

    // Handle Grid variant changes - adjust number of cards
    if (block.component === 'Grid' && propKey === 'Property 1') {
      const cardCount = value === 'Default' ? 3 : value === 'Variant2' ? 4 : 2
      const currentCount = block.children?.length || 0

      if (!block.children) {
        block.children = []
      }

      // Add or remove cards to match the variant
      if (currentCount < cardCount) {
        // Add cards
        for (let i = currentCount; i < cardCount; i++) {
          block.children.push({
            component: 'Inner Grid Card',
            index: i,
            props: {
              Title: `Card ${i + 1}`,
              Description: 'Beschrijving',
              'Has button': false,
            },
            children: [],
          })
        }
      } else if (currentCount > cardCount) {
        // Remove excess cards
        block.children = block.children.slice(0, cardCount)
        // Update indices
        block.children.forEach((child, idx) => {
          if (child.index !== undefined) {
            child.index = idx
          }
        })
      }
    }

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

  // Content Kolommen Block - Accordion
  if (propKey === 'Has Accordion' && block.component === 'Content Kolommen Block') {
    if (value === true) {
      const hasAccordion = block.children.some((c) => c.component === 'Accordion list')
      if (!hasAccordion) {
        block.children.push({
          component: 'Accordion list',
          props: {
            'Has Title': true,
            Title: 'Accordion titel',
            Text: 'Accordion tekst',
            'Text 2': 'Tekst 2',
            'Text 3': 'Tekst 3',
            'Text 4': 'Tekst 4',
            'Text open item': 'Open item tekst',
          },
        })
      }
    } else {
      block.children = block.children.filter((c) => c.component !== 'Accordion list')
    }
  }

  // Content Kolommen Block - Text Element
  if (propKey === 'Has Text' && block.component === 'Content Kolommen Block') {
    if (value === true) {
      const hasText = block.children.some((c) => c.component === 'Text Element')
      if (!hasText) {
        block.children.push({
          component: 'Text Element',
          props: {
            'Has Primary Button': false,
            'Has Second Button': false,
            'Has List': false,
            'Has description': true,
            'Title of text Block': 'Text blok titel',
            Description: 'Beschrijving',
          },
          children: [],
        })
      }
    } else {
      block.children = block.children.filter((c) => c.component !== 'Text Element')
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

  // Grid - automatisch juiste aantal Inner Grid Cards op basis van variant
  if (propKey === 'Property 1' && block.component === 'Grid') {
    const variantCounts = {
      Default: 3,
      Variant2: 4,
      Variant3: 2,
    }
    const requiredCount = variantCounts[value] || 3
    const currentCount = block.children.filter((c) => c.component === 'Inner Grid Card').length

    if (currentCount < requiredCount) {
      // Voeg extra cards toe
      for (let i = currentCount; i < requiredCount; i++) {
        block.children.push({
          component: 'Inner Grid Card',
          index: i,
          props: {
            Title: `Card ${i + 1}`,
            Description: `Beschrijving ${i + 1}`,
            'Has button': false,
          },
          children: [],
        })
      }
    } else if (currentCount > requiredCount) {
      // Verwijder overtollige cards
      block.children = block.children.filter((c) => {
        if (c.component !== 'Inner Grid Card') return true
        return c.index < requiredCount
      })
    }

    // Update indices
    block.children
      .filter((c) => c.component === 'Inner Grid Card')
      .forEach((c, idx) => {
        c.index = idx
      })
  }
}

const saveProject = async () => {
  if (!project.value) return

  // Save to history before saving to backend
  saveToHistory()

  isSaving.value = true

  try {
    await projectService.updateProject(project.value.id, {
      sections: project.value.sections || [],
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

// Save without adding to history (used when restoring from history)
const saveProjectWithoutHistory = async () => {
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

// Transform project data naar Craft CMS import formaat
const transformToFigmaFormat = () => {
  if (!project.value) return {}

  // Nieuwe structuur met sections en pages
  const result = {
    sections: (project.value.sections || []).map((section) => ({
      name: section.name,
      handle: section.handle,
      type: section.type,
      slug: section.slug,
      template: section.template,
      entryTypes: section.entryTypes || [section.handle],
      ...(section.fetchesFrom ? { fetchesFrom: section.fetchesFrom } : {}),
      ...(section.categories?.length > 0 ? { categories: section.categories } : {}),
    })),
    pages: project.value.pages.map((page) => ({
      page: page.name,
      section: page.section || '',
      rationale: page.rationale || '',
      blocks: page.blocks.map((block) => {
        // Kopieer component, props, children en blockType/fetchesFrom
        const blockData = {
          component: block.component,
          props: block.props,
        }
        if (block.blockType) blockData.blockType = block.blockType
        if (block.fetchesFrom) blockData.fetchesFrom = block.fetchesFrom
        if (block.children && block.children.length > 0) blockData.children = block.children
        return blockData
      }),
    })),
  }

  return result
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

// Add new section
const addNewSection = () => {
  showNewSectionModal.value = true
  newSectionData.value = {
    name: '',
    handle: '',
    type: 'single',
    slug: '',
    template: '',
    fetchesFrom: '',
    categories: [],
  }
}

const createSection = () => {
  if (!newSectionData.value.name.trim() || !newSectionData.value.handle.trim()) return

  // Ensure sections array exists
  if (!project.value.sections) {
    project.value.sections = []
  }

  const newSection = {
    id: `section-${Date.now()}`,
    name: newSectionData.value.name,
    handle: newSectionData.value.handle,
    type: newSectionData.value.type,
    slug: newSectionData.value.slug || newSectionData.value.handle,
    template: newSectionData.value.template || `_pages/${newSectionData.value.handle}/entry.twig`,
    entryTypes: [newSectionData.value.handle],
    fetchesFrom: newSectionData.value.fetchesFrom || undefined,
    categories: newSectionData.value.categories || [],
  }

  project.value.sections.push(newSection)
  selectedSectionId.value = newSection.id
  showNewSectionModal.value = false
  saveProject()
}

const closeNewSectionModal = () => {
  showNewSectionModal.value = false
  newSectionData.value = {
    name: '',
    handle: '',
    type: 'single',
    slug: '',
    template: '',
    fetchesFrom: '',
    categories: [],
  }
}

// Generate handle from name
const generateHandle = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('')
}

// Auto-generate handle when name changes
const onSectionNameChange = () => {
  if (!newSectionData.value.handle) {
    newSectionData.value.handle = generateHandle(newSectionData.value.name)
  }
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
    section: selectedSection.value?.handle || '', // Link to selected section
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

// Regenerate page functions
const openRegenerateModal = () => {
  regeneratePrompt.value = ''
  regenerateError.value = ''
  regenerateProgress.value = ''
  showRegenerateModal.value = true
}

const closeRegenerateModal = () => {
  showRegenerateModal.value = false
  regeneratePrompt.value = ''
  regenerateError.value = ''
  regenerateProgress.value = ''
}

const regeneratePage = async () => {
  if (!selectedPage.value || !regeneratePrompt.value.trim()) return

  isRegenerating.value = true
  regenerateError.value = ''
  regenerateProgress.value = 'Bezig met regenereren...'

  try {
    const pageContext = {
      page: selectedPage.value.name,
      section: selectedPage.value.section || '',
      rationale: selectedPage.value.rationale || '',
      currentBlocks: selectedPage.value.blocks || [],
    }

    const result = await wireframeService.regeneratePage(
      pageContext,
      regeneratePrompt.value,
      project.value.sections || [],
      'Nederlands',
      {
        onProgress: (message) => {
          regenerateProgress.value = message
        },
        onPageRegenerated: (page) => {
          console.log('Page regenerated:', page)
        },
      },
    )

    if (result.success && result.page) {
      // Update page blocks with regenerated content
      const pageIndex = project.value.pages.findIndex((p) => p.id === selectedPage.value.id)
      if (pageIndex !== -1) {
        // Give each block a new ID
        const newBlocks = (result.page.blocks || []).map((block, idx) => ({
          id: `block-${Date.now()}-${idx}`,
          ...block,
        }))
        project.value.pages[pageIndex].blocks = newBlocks
        if (result.page.rationale) {
          project.value.pages[pageIndex].rationale = result.page.rationale
        }
        saveProject()
      }
      closeRegenerateModal()
    }
  } catch (err) {
    console.error('Error regenerating page:', err)
    regenerateError.value = err.message || 'Er is een fout opgetreden'
  } finally {
    isRegenerating.value = false
  }
}

// AI Section generation functions
const toggleAISectionMode = () => {
  useAIForSection.value = !useAIForSection.value
  sectionError.value = ''
  sectionProgress.value = ''
  if (useAIForSection.value) {
    sectionPrompt.value = ''
  }
}

const generateSectionWithAI = async () => {
  if (!sectionPrompt.value.trim()) return

  isGeneratingSection.value = true
  sectionError.value = ''
  sectionProgress.value = 'Section genereren met AI...'

  try {
    const result = await wireframeService.generateSection(
      sectionPrompt.value,
      project.value.sections || [],
      'Nederlands',
      {
        onProgress: (message) => {
          sectionProgress.value = message
        },
        onSectionGenerated: (data) => {
          console.log('Section generated:', data)
        },
      },
    )

    if (result.success && result.section) {
      // Ensure sections array exists
      if (!project.value.sections) {
        project.value.sections = []
      }

      // Create section with unique ID
      const newSection = {
        id: `section-${Date.now()}`,
        name: result.section.name,
        handle: result.section.handle,
        type: result.section.type,
        slug: result.section.slug || result.section.handle,
        template: result.section.template || `_pages/${result.section.handle}/entry.twig`,
        entryTypes: result.section.entryTypes || [result.section.handle],
        fetchesFrom: result.section.fetchesFrom || undefined,
        categories: result.section.categories || [],
      }

      project.value.sections.push(newSection)
      selectedSectionId.value = newSection.id

      // Add pages if returned
      if (result.pages && result.pages.length > 0) {
        if (!project.value.pages) {
          project.value.pages = []
        }
        for (const page of result.pages) {
          const newPage = {
            id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: page.page,
            section: page.section || newSection.handle,
            rationale: page.rationale || '',
            blocks: (page.blocks || []).map((block, idx) => ({
              id: `block-${Date.now()}-${idx}`,
              ...block,
            })),
          }
          project.value.pages.push(newPage)
          selectedPageId.value = newPage.id
        }
      }

      saveProject()
      closeNewSectionModal()
    }
  } catch (err) {
    console.error('Error generating section:', err)
    sectionError.value = err.message || 'Er is een fout opgetreden'
  } finally {
    isGeneratingSection.value = false
  }
}
</script>

<template>
  <div v-if="project" :class="`h-screen flex flex-col ${bg} ${text1}`">
    <!-- Header -->
    <div :class="`${card} border-b ${border} px-6 py-4`">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <button
            @click="goBack"
            class="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <ChevronRight class="w-5 h-5 rotate-180" />
            Projecten
          </button>
          <div :class="`h-6 w-px ${dividerBg}`" />
          <h1 class="text-lg font-semibold">{{ project.name }}</h1>
        </div>

        <div class="flex items-center gap-3">
          <!-- Theme Toggle -->
          <button @click="toggleDarkMode" :class="`p-2 rounded-lg ${hover} cursor-pointer`">
            <Sun v-if="darkMode" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>

          <!-- Undo/Redo buttons -->
          <div class="flex items-center gap-1">
            <button
              @click="undo"
              :disabled="!canUndo"
              :title="'Ongedaan maken (Ctrl+Z)'"
              :class="[
                'p-2 rounded-lg transition-colors',
                canUndo
                  ? 'hover:bg-zinc-800 text-zinc-300 cursor-pointer'
                  : 'text-zinc-600 cursor-not-allowed',
              ]"
            >
              <Undo2 class="w-4 h-4" />
            </button>
            <button
              @click="redo"
              :disabled="!canRedo"
              :title="'Opnieuw (Ctrl+Y)'"
              :class="[
                'p-2 rounded-lg transition-colors',
                canRedo
                  ? 'hover:bg-zinc-800 text-zinc-300 cursor-pointer'
                  : 'text-zinc-600 cursor-not-allowed',
              ]"
            >
              <Redo2 class="w-4 h-4" />
            </button>
          </div>
          <div :class="`h-6 w-px ${dividerBg}`" />
          <div
            :class="[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              isSaving ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400',
            ]"
          >
            <Save class="w-4 h-4" />
            {{ isSaving ? 'Opslaan...' : 'Opgeslagen' }}
          </div>
          <div :class="`h-6 w-px ${dividerBg}`" />
          <button
            @click="exportJSON"
            class="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium shadow-lg cursor-pointer"
          >
            <Download class="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>
    </div>

    <!-- Generating Banner -->
    <div v-if="isGenerating" class="bg-violet-600/20 border-b border-violet-500/30 px-6 py-3">
      <div class="flex items-center gap-3 text-violet-300">
        <Loader2 class="w-5 h-5 animate-spin" />
        <span class="font-medium">Pagina's worden gegenereerd...</span>
        <span class="text-violet-400 text-sm">
          {{ generationProgress.complete }}/{{ generationProgress.total }} gereed ({{
            generationProgress.percentage
          }}%)
        </span>
        <span v-if="generationProgress.pending.length > 0" class="text-violet-400/70 text-xs">
          — Wachten op: {{ generationProgress.pending.slice(0, 3).join(', ')
          }}<span v-if="generationProgress.pending.length > 3">
            en {{ generationProgress.pending.length - 3 }} meer</span
          >
        </span>
      </div>
    </div>

    <!-- 3 Column Layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar: Sections -->
      <div :class="`w-80 ${card} border-r ${border} overflow-y-auto`">
        <div class="p-6">
          <!-- Sections Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold">Sections</h3>
            <button
              @click="addNewSection"
              class="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 cursor-pointer"
              title="Nieuwe section"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>

          <!-- Sections List with Inline Details -->
          <div class="space-y-2 mb-6">
            <div v-for="section in sections" :key="section.id">
              <!-- Section Header Button -->
              <button
                @click="selectSection(section.id)"
                :class="[
                  'w-full text-left px-4 py-3 transition-all cursor-pointer',
                  selectedSectionId === section.id
                    ? 'bg-violet-600 text-white shadow-lg rounded-t-xl'
                    : `${hover} ${text1} rounded-xl`,
                ]"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-medium block">{{ section.name }}</span>
                    <span
                      :class="[
                        'text-xs',
                        selectedSectionId === section.id ? 'text-white/60' : text2,
                      ]"
                    >
                      {{ section.handle }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      :class="[
                        'text-xs px-2 py-1 rounded',
                        selectedSectionId === section.id
                          ? 'bg-white/20 text-white'
                          : section.type === 'single'
                            ? 'bg-blue-500/20 text-blue-400'
                            : section.type === 'channel'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400',
                      ]"
                    >
                      {{ section.type }}
                    </span>
                  </div>
                </div>
              </button>

              <!-- Inline Section Details Dropdown -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                leave-active-class="transition-all duration-150 ease-in"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[800px]"
                leave-from-class="opacity-100 max-h-[800px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="selectedSectionId === section.id"
                  :class="`bg-zinc-50 dark:bg-zinc-950 rounded-b-xl p-4 space-y-4 overflow-hidden border-x border-b ${border}`"
                >
                  <!-- Section Details -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-zinc-400">Section Details</span>
                      <button
                        @click.stop="deleteSection(section.handle)"
                        class="p-1.5 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all cursor-pointer"
                        title="Verwijder section"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div :class="`${inputBg} border ${border} rounded-lg p-4 space-y-3`">
                      <div>
                        <span class="text-xs text-zinc-500 block">Handle</span>
                        <span :class="`text-sm ${text1}`">{{ section.handle }}</span>
                      </div>
                      <div>
                        <span class="text-xs text-zinc-500 block">Type</span>
                        <span :class="`text-sm ${text1} capitalize`">{{ section.type }}</span>
                      </div>
                      <div>
                        <span class="text-xs text-zinc-500 block">Slug</span>
                        <span :class="`text-sm ${text1}`">{{ section.slug }}</span>
                      </div>
                      <div>
                        <span class="text-xs text-zinc-500 block">Template</span>
                        <span :class="`text-sm ${text1} font-mono text-xs`">{{
                          section.template
                        }}</span>
                      </div>
                      <div v-if="section.fetchesFrom">
                        <span :class="`text-xs ${text2} block`">Haalt entries uit</span>
                        <span class="text-sm text-emerald-400">{{ section.fetchesFrom }}</span>
                      </div>
                      <div v-if="section.categories?.length">
                        <span :class="`text-xs ${text2} block`">Categorieën</span>
                        <div class="flex flex-wrap gap-1 mt-1">
                          <span
                            v-for="cat in section.categories"
                            :key="cat"
                            :class="`text-xs ${inputBg} ${text2} border ${divider} px-2 py-0.5 rounded`"
                          >
                            {{ cat }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Pages for this section -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <h4 :class="`text-xs font-medium ${text2}`">Pagina's</h4>
                      <button
                        @click="addNewPage"
                        :class="`p-1 rounded ${inputBg} ${text2} hover:${text1} border ${divider} cursor-pointer`"
                        title="Nieuwe pagina"
                      >
                        <Plus class="w-3 h-3" />
                      </button>
                    </div>
                    <div class="space-y-1">
                      <div
                        v-for="page in pagesForSection"
                        :key="page.id"
                        class="group flex items-center gap-1"
                      >
                        <button
                          @click="selectPage(page.id)"
                          :class="[
                            'flex-1 text-left px-3 py-2 rounded-lg transition-all cursor-pointer text-sm',
                            selectedPageId === page.id
                              ? 'bg-zinc-200 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100'
                              : `${hover} ${text2}`,
                          ]"
                        >
                          {{ page.name }}
                        </button>
                        <button
                          @click.stop="deletePage(page.id)"
                          class="p-1.5 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Verwijder pagina"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p v-if="!pagesForSection.length" :class="`text-xs ${text2} italic px-3`">
                        Geen pagina's voor deze section
                      </p>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Fallback: Pages without sections (backward compatibility) -->
          <div v-if="!sections.length && project.pages?.length" class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 :class="`font-semibold ${text2}`">Pagina's (legacy)</h3>
            </div>
            <div class="space-y-2">
              <button
                v-for="page in project.pages"
                :key="page.id"
                @click="selectPage(page.id)"
                :class="[
                  'w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer',
                  selectedPageId === page.id
                    ? 'bg-zinc-200 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : `${hover} ${text1}`,
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium">{{ page.name }}</span>
                  <span
                    :class="[
                      'text-xs',
                      selectedPageId === page.id ? 'text-zinc-500 dark:text-zinc-400' : text2,
                    ]"
                  >
                    {{ page.blocks?.length || 0 }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- AI Rationale -->
          <div v-if="selectedPage && !selectedSection" :class="`mt-6 pt-6 border-t ${divider}`">
            <div :class="`${inputBg} border ${divider} rounded-lg p-4`">
              <p
                v-if="selectedPage.rationale"
                :class="`text-sm ${text2} leading-relaxed whitespace-pre-wrap`"
              >
                {{ selectedPage.rationale }}
              </p>
              <p v-else :class="`text-sm ${text2} italic`">
                Geen AI rationale beschikbaar voor deze pagina.
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
                v-if="canRegeneratePage"
                @click="openRegenerateModal"
                :class="`text-xs ${text2} hover:text-violet-400 flex items-center gap-1 mb-1 cursor-pointer transition-colors`"
              >
                <RefreshCw class="w-3 h-3" />
                Regenerate met AI
              </button>
              <h2 class="text-2xl font-bold">{{ selectedPage.name }}</h2>
            </div>

            <!-- Dropdown menu voor nieuw blok -->
            <div class="relative">
              <button
                @click="showBlockTypeMenu = !showBlockTypeMenu"
                class="px-4 py-2 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                Nieuw blok
              </button>

              <!-- Dropdown menu -->
              <div
                v-if="showBlockTypeMenu"
                :class="`absolute right-0 mt-2 w-64 ${card} border ${divider} rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto`"
              >
                <button
                  v-for="component in availableComponents"
                  :key="component.value"
                  @click="addBlock(component.value)"
                  :class="`w-full text-left px-4 py-3 hover:${hover} transition-colors flex items-center gap-3 border-b ${divider} last:border-b-0 cursor-pointer`"
                >
                  <span class="text-2xl">{{ component.icon }}</span>
                  <span :class="`text-sm font-medium ${text1}`">{{ component.label }}</span>
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
              :is-drag-over="dragOverBlockId === block.id"
              :is-first="index === 0"
              :is-last="index === blocks.length - 1"
              @select="selectBlock"
              @move-up="moveBlock(block.id, 'up')"
              @move-down="moveBlock(block.id, 'down')"
              @delete="deleteBlock(block.id)"
              @drag-start="handleDragStart"
              @drag-end="handleDragEnd"
              @drag-over="handleDragOver"
              @drop="handleDrop"
            />
          </div>
        </div>
      </div>

      <!-- Right Sidebar: Properties -->
      <div :class="`w-80 ${card} border-l ${border} overflow-y-auto`">
        <div class="p-6">
          <div v-if="selectedBlock">
            <!-- Breadcrumb navigatie -->
            <div v-if="selectedChildInfo" :class="`mb-4 pb-4 border-b ${divider}`">
              <div class="flex items-center gap-2 text-sm mb-3">
                <button
                  @click="goBackToParent"
                  class="text-zinc-400 hover:text-violet-400 transition-colors cursor-pointer"
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
              <button
                @click="closeProperties"
                class="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Component</label>
                <input
                  :value="selectedBlock.component || selectedBlock.type"
                  disabled
                  :class="`w-full px-3 py-2 ${hover} border ${divider} rounded-lg text-sm text-zinc-400 cursor-not-allowed`"
                />
              </div>

              <!-- Block Type (voor Grid, EntryPostSlider, etc.) -->
              <div
                v-if="
                  selectedBlock.component === 'Grid' ||
                  selectedBlock.component === 'EntryPostSlider' ||
                  selectedBlock.component === 'Projects' ||
                  selectedBlock.component === 'News'
                "
                :class="`border-t ${divider} pt-4`"
              >
                <h4 class="text-sm font-medium mb-4">Block Type</h4>

                <div class="mb-4">
                  <label :class="`block text-xs font-medium mb-2 ${text2}`">Type</label>
                  <select
                    :value="selectedBlock.blockType || 'staticContent'"
                    @input="updateBlockType($event.target.value)"
                    :class="`w-full px-3 py-2 ${inputBg} border ${divider} rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer ${text1}`"
                  >
                    <option value="staticContent">Static Content</option>
                    <option value="entrySection">Entry Section</option>
                  </select>
                </div>

                <div v-if="selectedBlock.blockType === 'entrySection'" class="mb-4">
                  <label :class="`block text-xs font-medium mb-2 ${text2}`"
                    >Haalt entries uit</label
                  >
                  <select
                    :value="selectedBlock.fetchesFrom || ''"
                    @input="updateFetchesFrom($event.target.value)"
                    :class="`w-full px-3 py-2 ${inputBg} border ${divider} rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer ${text1}`"
                  >
                    <option value="">- Selecteer section -</option>
                    <option
                      v-for="section in availableSectionsForEntrySection"
                      :key="section.handle"
                      :value="section.handle"
                    >
                      {{ section.name }} ({{ section.handle }})
                    </option>
                  </select>
                  <p class="text-xs text-zinc-500 mt-1">
                    Selecteer een channel section om entries uit op te halen
                  </p>
                </div>
              </div>

              <div
                v-if="selectedBlock.props && Object.keys(selectedBlock.props).length > 0"
                :class="`border-t ${divider} pt-4`"
              >
                <h4 class="text-sm font-medium mb-4">Properties</h4>

                <!-- Loop door alle properties -->
                <template v-for="(value, key) in selectedBlock.props" :key="key">
                  <!-- Alleen tonen als het een "Has X" veld is, of als de bijbehorende "Has X" true is -->
                  <div v-if="shouldShowProperty(key, selectedBlock.props)" class="mb-4">
                    <label :class="`block text-xs font-medium mb-2 ${text2}`">
                      {{ key }}
                    </label>

                    <!-- Boolean property: checkbox -->
                    <div v-if="typeof value === 'boolean'" class="flex items-center">
                      <input
                        type="checkbox"
                        :checked="value"
                        @input="updateBlockProp(key, $event.target.checked)"
                        :class="`w-4 h-4 ${inputBg} border-zinc-700 rounded text-violet-600 focus:ring-2 focus:ring-violet-500`"
                      />
                      <span :class="`ml-2 text-sm ${text2}`">
                        {{ value ? 'Ja' : 'Nee' }}
                      </span>
                    </div>

                    <!-- Property 1 (variant selector): dropdown -->
                    <select
                      v-else-if="key === 'Property 1'"
                      :value="value"
                      @input="updateBlockProp(key, $event.target.value)"
                      :class="`w-full px-3 py-2 ${inputBg} border ${divider} rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer ${text1}`"
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
                      :class="`w-full px-3 py-2 ${inputBg} border ${divider} rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none ${text1}`"
                    />
                  </div>
                </template>
              </div>

              <div
                v-if="selectedBlock.children && selectedBlock.children.length > 0"
                :class="`border-t ${divider} pt-4`"
              >
                <h4 class="text-sm font-medium mb-4">
                  Children ({{ selectedBlock.children.length }})
                </h4>
                <div class="space-y-2">
                  <button
                    v-for="(child, idx) in selectedBlock.children"
                    :key="idx"
                    @click="selectChild(child, getParentBlock(selectedBlock))"
                    :class="`w-full text-left p-3 ${inputBg} rounded-lg border ${divider} hover:border-violet-500 hover:bg-violet-500/5 transition-all cursor-pointer`"
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
      <div :class="`flex items-center justify-between p-6 border-b ${divider}`">
        <div>
          <h2 :class="`text-xl font-bold ${text1}`">Exporteer JSON</h2>
          <p :class="`text-sm ${text2} mt-1`">Plak deze JSON in de Figma plugin</p>
        </div>
        <button
          @click="closeJsonModal"
          class="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <!-- JSON Content -->
      <div class="flex-1 overflow-auto p-6">
        <pre
          :class="`${inputBg} border ${divider} rounded-lg p-4 text-sm text-zinc-300 font-mono overflow-x-auto`"
          >{{ exportedJson }}</pre
        >
      </div>

      <!-- Footer -->
      <div :class="`flex items-center justify-between p-6 border-t ${divider}`">
        <p :class="`text-xs ${text2}`">
          {{ project?.pages?.length || 0 }} pagina's • {{ exportedJson.length }} characters
        </p>
        <div class="flex gap-3">
          <button
            @click="closeJsonModal"
            class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Sluiten
          </button>
          <button
            @click="copyJsonToClipboard"
            class="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all cursor-pointer"
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

  <!-- New Section Modal -->
  <div
    v-if="showNewSectionModal"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
    @click.self="closeNewSectionModal"
  >
    <div
      class="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl flex flex-col max-h-[90vh]"
    >
      <!-- Header -->
      <div :class="`flex items-center justify-between p-6 border-b ${divider}`">
        <div>
          <h2 :class="`text-xl font-bold ${text1}`">Nieuwe Section</h2>
          <p :class="`text-sm ${text2} mt-1`">
            {{ useAIForSection ? 'Genereer met AI' : 'Maak handmatig een nieuwe CMS section' }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="toggleAISectionMode"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer',
              useAIForSection
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200',
            ]"
          >
            <Sparkles class="w-3.5 h-3.5" />
            {{ useAIForSection ? 'AI Aan' : 'Gebruik AI' }}
          </button>
          <button
            @click="closeNewSectionModal"
            class="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X class="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>

      <!-- Form Content -->
      <div class="p-6 space-y-5 overflow-y-auto">
        <!-- AI Mode: Prompt Input -->
        <template v-if="useAIForSection">
          <div>
            <label :class="`block text-sm font-medium mb-2 ${text2}`">
              Beschrijf de section die je wilt maken
              <span class="text-red-400 ml-1">*</span>
            </label>
            <textarea
              v-model="sectionPrompt"
              rows="4"
              placeholder="Bijv. 'Een portfolio section met case studies en projecten' of 'Een nieuws section voor blog posts met categorieën'"
              :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none resize-none`"
            ></textarea>
            <p class="text-xs text-zinc-500 mt-1">
              De AI bepaalt automatisch het type, de handle, en maakt optioneel een startpagina aan
            </p>
          </div>

          <!-- Progress & Error -->
          <div v-if="sectionProgress" class="flex items-center gap-2 text-violet-400">
            <Loader2 class="w-4 h-4 animate-spin" />
            <span class="text-sm">{{ sectionProgress }}</span>
          </div>
          <div
            v-if="sectionError"
            class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm"
          >
            {{ sectionError }}
          </div>
        </template>

        <!-- Manual Mode: Regular Form Fields -->
        <template v-else>
          <!-- Section Naam -->
          <div>
            <label :class="`block text-sm font-medium mb-2 ${text2}`">
              Section Naam<span class="text-red-400 ml-1">*</span>
            </label>
            <input
              v-model="newSectionData.name"
              @input="onSectionNameChange"
              type="text"
              placeholder="Bijv. Nieuws, Projecten, Over ons..."
              :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none`"
            />
          </div>

          <!-- Handle -->
          <div>
            <label :class="`block text-sm font-medium mb-2 ${text2}`">
              Handle<span class="text-red-400 ml-1">*</span>
            </label>
            <input
              v-model="newSectionData.handle"
              type="text"
              placeholder="bijv. news, projects, aboutUs..."
              :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none font-mono`"
            />
            <p class="text-xs text-zinc-500 mt-1">Technische identifier in camelCase</p>
          </div>

          <!-- Type -->
          <div>
            <label :class="`block text-sm font-medium mb-2 ${text2}`">Type</label>
            <select
              v-model="newSectionData.type"
              :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer`"
            >
              <option value="single">Single (unieke pagina)</option>
              <option value="channel">Channel (meerdere entries)</option>
              <option value="structure">Structure (hiërarchisch)</option>
            </select>
          </div>

          <!-- Slug -->
          <div>
            <label class="block text-sm font-medium mb-2 text-zinc-300">URL Slug</label>
            <input
              v-model="newSectionData.slug"
              type="text"
              placeholder="bijv. nieuws of nieuws/{slug}"
              :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none font-mono`"
            />
            <p class="text-xs text-zinc-500 mt-1">
              Gebruik {slug} voor dynamische delen bij channels
            </p>
          </div>

          <!-- Template -->
          <div>
            <label class="block text-sm font-medium mb-2 text-zinc-300">Template Pad</label>
            <input
              v-model="newSectionData.template"
              type="text"
              placeholder="_pages/news/entry.twig"
              :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none font-mono`"
            />
          </div>

          <!-- Fetches From (voor overview sections) -->
          <div v-if="newSectionData.type === 'single'">
            <label class="block text-sm font-medium mb-2 text-zinc-300"
              >Haalt entries uit (optioneel)</label
            >
            <select
              v-model="newSectionData.fetchesFrom"
              class="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
            >
              <option value="">- Geen -</option>
              <option
                v-for="section in sections.filter((s) => s.type === 'channel')"
                :key="section.handle"
                :value="section.handle"
              >
                {{ section.name }} ({{ section.handle }})
              </option>
            </select>
            <p class="text-xs text-zinc-500 mt-1">
              Voor overview pagina's die entries uit een channel tonen
            </p>
          </div>

          <!-- Info -->
          <div class="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <p class="text-sm text-zinc-400">
              <span class="font-medium text-zinc-300">Tip:</span>
              <span v-if="newSectionData.type === 'single'">
                Single sections zijn voor unieke pagina's zoals Home of Contact.
              </span>
              <span v-else-if="newSectionData.type === 'channel'">
                Channel sections zijn voor collecties zoals nieuws of projecten.
              </span>
              <span v-else>
                Structure sections zijn voor hiërarchische content zoals documentatie.
              </span>
            </p>
          </div>
        </template>
      </div>

      <!-- Footer: Conditional based on mode -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
        <button
          @click="closeNewSectionModal"
          class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Annuleer
        </button>
        <!-- AI Mode Button -->
        <button
          v-if="useAIForSection"
          @click="generateSectionWithAI"
          :disabled="!sectionPrompt.trim() || isGeneratingSection"
          class="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Loader2 v-if="isGeneratingSection" class="w-4 h-4 animate-spin" />
          <Sparkles v-else class="w-4 h-4" />
          {{ isGeneratingSection ? 'Genereren...' : 'Genereer Section' }}
        </button>
        <!-- Manual Mode Button -->
        <button
          v-else
          @click="createSection"
          :disabled="!newSectionData.name.trim() || !newSectionData.handle.trim()"
          class="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          Maak Section
        </button>
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
          class="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
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
          class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Annuleer
        </button>
        <button
          @click="createPage"
          :disabled="!newPageData.name.trim()"
          class="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          Maak Pagina
        </button>
      </div>
    </div>
  </div>

  <!-- Regenerate Page Modal -->
  <div
    v-if="showRegenerateModal"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
    @click.self="closeRegenerateModal"
  >
    <div class="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl flex flex-col">
      <!-- Header -->
      <div :class="`flex items-center justify-between p-6 border-b ${divider}`">
        <div>
          <h2 :class="`text-xl font-bold ${text1}`">Regenereer pagina</h2>
          <p :class="`text-sm ${text2} mt-1`">
            Geef nieuwe instructies om de blokken opnieuw te genereren
          </p>
        </div>
        <button
          @click="closeRegenerateModal"
          class="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-5">
        <!-- Current Page Info -->
        <div v-if="selectedPage" :class="`${inputBg} border ${divider} rounded-lg p-4`">
          <p :class="`text-xs ${text2} mb-1`">Huidige pagina</p>
          <p :class="`font-medium ${text1}`">{{ selectedPage.name }}</p>
          <p :class="`text-sm ${text2} mt-1`">{{ selectedPage.blocks?.length || 0 }} blokken</p>
        </div>

        <!-- New Prompt -->
        <div>
          <label :class="`block text-sm font-medium mb-2 ${text2}`">
            Nieuwe instructies
            <span class="text-red-400 ml-1">*</span>
          </label>
          <textarea
            v-model="regeneratePrompt"
            rows="4"
            placeholder="Bijv. 'Maak de pagina korter' of 'Voeg een testimonials sectie toe' of 'Focus meer op de diensten'"
            :class="`w-full px-4 py-3 ${inputBg} border ${divider} rounded-lg ${text1} placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none resize-none`"
          ></textarea>
          <p class="text-xs text-zinc-500 mt-1">
            De AI genereert nieuwe blokken op basis van deze instructies
          </p>
        </div>

        <!-- Progress -->
        <div v-if="regenerateProgress" class="flex items-center gap-2 text-violet-400">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span class="text-sm">{{ regenerateProgress }}</span>
        </div>

        <!-- Error -->
        <div
          v-if="regenerateError"
          class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm"
        >
          {{ regenerateError }}
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
        <button
          @click="closeRegenerateModal"
          class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Annuleer
        </button>
        <button
          @click="regeneratePage"
          :disabled="!regeneratePrompt.trim() || isRegenerating"
          class="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Loader2 v-if="isRegenerating" class="w-4 h-4 animate-spin" />
          <RefreshCw v-else class="w-4 h-4" />
          {{ isRegenerating ? 'Genereren...' : 'Regenereer' }}
        </button>
      </div>
    </div>
  </div>
</template>
