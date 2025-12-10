// Theme composable - global dark mode state with localStorage persistence
import { ref, computed, watch } from 'vue'

// Global reactive state (singleton pattern)
const darkMode = ref(true)

// Initialize from localStorage
const savedTheme = localStorage.getItem('wireframe_theme')
if (savedTheme !== null) {
  darkMode.value = savedTheme === 'dark'
}

// Persist to localStorage on change
watch(darkMode, (value) => {
  localStorage.setItem('wireframe_theme', value ? 'dark' : 'light')
})

export function useTheme() {
  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value
  }

  // Computed style classes
  const bg = computed(() => (darkMode.value ? 'bg-zinc-950' : 'bg-gray-50'))
  const card = computed(() => (darkMode.value ? 'bg-zinc-900' : 'bg-white'))
  const border = computed(() => (darkMode.value ? 'border-zinc-800' : 'border-gray-200'))
  const text1 = computed(() => (darkMode.value ? 'text-zinc-100' : 'text-gray-900'))
  const text2 = computed(() => (darkMode.value ? 'text-zinc-400' : 'text-gray-600'))
  const hover = computed(() => (darkMode.value ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'))
  const inputBg = computed(() => (darkMode.value ? 'bg-zinc-950' : 'bg-white'))
  const divider = computed(() => (darkMode.value ? 'border-zinc-800' : 'border-gray-200'))
  const dividerBg = computed(() => (darkMode.value ? 'bg-zinc-800' : 'bg-gray-200'))

  return {
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
  }
}
