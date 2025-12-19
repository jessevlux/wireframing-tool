<script setup>
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme.js'

const { darkMode } = useTheme()

const props = defineProps({
  block: {
    type: Object,
    required: true,
  },
  pageSimulation: {
    type: Boolean,
    default: false,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
})

// Get variant from props
const variant = computed(() => props.block.props?.['Property 1'] || 'Default')

// Theme-aware colors - pure black/white, gray only for media
// Dark mode: wireframe blocks slightly lighter than page bg for contrast
const colors = computed(() => ({
  bg: darkMode.value ? '#18181b' : '#ffffff',
  card: darkMode.value ? '#18181b' : '#ffffff',
  border: darkMode.value ? '#3f3f46' : '#e4e4e7',
  text: darkMode.value ? '#ffffff' : '#000000',
  textSecondary: darkMode.value ? '#a1a1aa' : '#52525b',
  textMuted: darkMode.value ? '#71717a' : '#a1a1aa',
  // Gray only for media placeholders
  media: darkMode.value ? '#3f3f46' : '#d4d4d8',
  // Buttons are black/white
  button: darkMode.value ? '#ffffff' : '#000000',
  buttonText: darkMode.value ? '#000000' : '#ffffff',
  // Footer gets slightly different bg
  footerBg: darkMode.value ? '#27272a' : '#f4f4f5',
}))

// Component type
const componentType = computed(() => props.block.component || props.block.type)

// Helper to get text from props with fallback
const getText = (key, fallback = '') => {
  return props.block.props?.[key] || fallback
}

// Helper to check if prop is enabled
const hasProp = (key) => {
  return props.block.props?.[key] === true
}

// Get USP texts
const usps = computed(() => {
  const result = []
  if (getText('Usp 1')) result.push(getText('Usp 1'))
  if (getText('Usp 2')) result.push(getText('Usp 2'))
  if (getText('Usp 3')) result.push(getText('Usp 3'))
  return result
})

// Get button texts
const primaryButtonText = computed(() => {
  const btnChild = props.block.children?.find((c) => c.component === 'Button Primary')
  return btnChild?.props?.['Text primary button'] || 'Button'
})

const secondaryButtonText = computed(() => {
  const btnChild = props.block.children?.find((c) => c.component === 'Button Secondary')
  return btnChild?.props?.['Text Secondary Button'] || 'Button'
})

// Truncate text helper
const truncate = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// Grid cards helper
const gridCards = computed(() => {
  const children = props.block.children || []
  const variantValue = variant.value
  const defaultCount = variantValue === 'Default' ? 3 : variantValue === 'Variant2' ? 4 : 2
  if (children.length === 0) {
    return Array.from({ length: defaultCount }, (_, i) => ({
      props: { Title: `Card ${i + 1}`, Description: 'Beschrijving' },
    }))
  }
  return children.slice(0, defaultCount)
})

// Footer column enabled check
const footerColumns = computed(() => {
  const cols = []
  for (let i = 1; i <= 4; i++) {
    if (hasProp(`Has Column ${i}`)) {
      cols.push({
        header: getText(`Header ${i}`, `Kolom ${i}`),
        links: [
          getText(`Link${i}A`, 'Link 1'),
          getText(`Link${i}B`, 'Link 2'),
          getText(`Link${i}C`, 'Link 3'),
        ],
      })
    }
  }
  return cols
})

// Kolommen layout variant: controls media left/right positioning
// Reads from Kolommen block's own Property 1
const getKolommenLayoutVariant = () => {
  return props.block.props?.['Property 1'] || 'Default'
}

// Media variant: controls number of images (1, 2, or 3)
// Reads from Media child's Property 1
const getMediaVariant = () => {
  const mediaChild = props.block.children?.find((c) => c.component === 'Media')
  return mediaChild?.props?.['Property 1'] || 'Default'
}

// Get Content Kolommen Block
const getContentBlock = () => {
  return props.block.children?.find((c) => c.component === 'Content Kolommen Block')
}

// Check if Has Text or Has Accordion is active
const hasKolommenText = computed(() => {
  return getContentBlock()?.props?.['Has Text'] === true
})

const hasKolommenAccordion = computed(() => {
  return getContentBlock()?.props?.['Has Accordion'] === true
})

// Kolommen text block data
const kolommenTextBlock = computed(() => {
  const contentBlock = getContentBlock()
  const textElement = contentBlock?.children?.find((c) => c.component === 'Text Element')

  return {
    title: textElement?.props?.['Title of text Block'] || 'Titel',
    description: textElement?.props?.Description || 'Beschrijving tekst...',
    hasDescription: textElement?.props?.['Has description'] === true,
    hasButton: textElement?.props?.['Has Primary Button'] === true,
    hasSecondButton: textElement?.props?.['Has Second Button'] === true,
    hasList: textElement?.props?.['Has List'] === true,
    buttonText:
      textElement?.children?.find((c) => c.component === 'Button Primary')?.props?.[
        'Text primary button'
      ] || 'Button',
    secondButtonText:
      textElement?.children?.find((c) => c.component === 'Button Secondary')?.props?.[
        'Text Secondary Button'
      ] || 'Secundair',
    usps: [
      textElement?.props?.['Usp Text 1'],
      textElement?.props?.['Usp text 2'],
      textElement?.props?.['Usp Text 3'],
    ].filter(Boolean),
  }
})

// Kolommen accordion data
const kolommenAccordion = computed(() => {
  const contentBlock = getContentBlock()
  const accordion = contentBlock?.children?.find((c) => c.component === 'Accordion list')

  return {
    title: accordion?.props?.Title || 'FAQ',
    items: [
      accordion?.props?.Text || 'Vraag 1',
      accordion?.props?.['Text 2'] || 'Vraag 2',
      accordion?.props?.['Text 3'] || 'Vraag 3',
      accordion?.props?.['Text 4'] || 'Vraag 4',
    ].filter(Boolean),
  }
})
</script>

<template>
  <div
    class="block-preview"
    :class="{ 'page-simulation': pageSimulation, 'is-selected': isSelected && pageSimulation }"
    :style="{
      '--preview-bg': colors.bg,
      '--preview-card': colors.card,
      '--preview-border': colors.border,
      '--preview-text': colors.text,
      '--preview-text-secondary': colors.textSecondary,
      '--preview-text-muted': colors.textMuted,
      '--preview-media': colors.media,
      '--preview-button': colors.button,
      '--preview-button-text': colors.buttonText,
      '--preview-footer-bg': colors.footerBg,
    }"
  >
    <!-- Hero (full background image) -->
    <div v-if="componentType === 'Hero'" class="preview-hero">
      <div class="hero-bg-image">
        <svg
          class="media-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <div class="hero-content">
        <h2 class="hero-title">{{ truncate(getText('Hero Title', 'Hero Titel'), 40) }}</h2>
        <p v-if="hasProp('Has Description')" class="hero-description">
          {{ truncate(getText('Description', 'Beschrijving tekst hier...'), 80) }}
        </p>
        <ul v-if="hasProp('Has Usps') && usps.length > 0" class="hero-usps">
          <li v-for="(usp, i) in usps.slice(0, 3)" :key="i" class="usp-item">
            <span class="usp-bullet"></span>
            <span>{{ usp }}</span>
          </li>
        </ul>
        <div class="hero-buttons">
          <button v-if="hasProp('Has Button Primary')" class="btn btn-primary">
            {{ primaryButtonText }}
          </button>
          <button v-if="hasProp('Has Button Secondary')" class="btn btn-secondary">
            {{ secondaryButtonText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div v-else-if="componentType === 'Footer'" class="preview-footer">
      <div class="footer-logo">
        <div class="logo-placeholder">LOGO</div>
      </div>
      <div class="footer-columns">
        <div v-for="(col, i) in footerColumns" :key="i" class="footer-column">
          <h4 class="column-header">{{ col.header }}</h4>
          <ul class="column-links">
            <li v-for="(link, j) in col.links" :key="j">{{ link }}</li>
          </ul>
        </div>
      </div>
      <div v-if="hasProp('Has Nieuwsbrief')" class="footer-newsletter">
        <div class="newsletter-input">
          <input type="text" placeholder="Email..." disabled />
          <button class="btn btn-primary btn-sm">Aanmelden</button>
        </div>
      </div>
    </div>

    <!-- Call to Action -->
    <div v-else-if="componentType === 'CalltoAction'" class="preview-cta">
      <h2 class="cta-title">{{ truncate(getText('Title', 'Call to Action Titel'), 50) }}</h2>
      <p v-if="hasProp('Has Description')" class="cta-description">
        {{ truncate(getText('Description', 'Beschrijving van de call to action...'), 80) }}
      </p>
      <ul v-if="hasProp('Has Usps') && usps.length > 0" class="cta-usps">
        <li v-for="(usp, i) in usps.slice(0, 3)" :key="i" class="usp-item">
          <span class="usp-bullet"></span>
          <span>{{ usp }}</span>
        </li>
      </ul>
      <div class="cta-buttons">
        <button v-if="hasProp('Has Button Primary')" class="btn btn-primary">
          {{ primaryButtonText }}
        </button>
        <button v-if="hasProp('Has Button Secondary')" class="btn btn-secondary">
          {{ secondaryButtonText }}
        </button>
      </div>
    </div>

    <!-- Contactform (2 columns: text + form) -->
    <div v-else-if="componentType === 'Contactform'" class="preview-contactform">
      <div class="contactform-text">
        <h3 class="form-title">Neem contact op</h3>
        <p class="form-desc">
          Heeft u vragen? Neem gerust contact met ons op via onderstaand formulier.
        </p>
        <div class="contact-info">
          <div class="contact-item">
            <span class="contact-label">Email</span>
            <span class="contact-value">info@example.com</span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Telefoon</span>
            <span class="contact-value">+31 6 12345678</span>
          </div>
        </div>
      </div>
      <div class="contactform-form">
        <div class="form-fields">
          <div class="form-row">
            <div class="form-field">
              <input type="text" placeholder="Naam" disabled />
            </div>
            <div class="form-field">
              <input type="text" placeholder="Email" disabled />
            </div>
          </div>
          <div class="form-field full">
            <textarea placeholder="Bericht..." disabled></textarea>
          </div>
        </div>
        <button class="btn btn-primary">Verstuur</button>
      </div>
    </div>

    <!-- Form -->
    <div v-else-if="componentType === 'Form'" class="preview-form">
      <h3 class="form-title">Formulier</h3>
      <div class="form-fields">
        <div class="form-row">
          <div v-if="hasProp('Has Name')" class="form-field">
            <input type="text" placeholder="Naam" disabled />
          </div>
          <div v-if="hasProp('Has Email')" class="form-field">
            <input type="text" placeholder="Email" disabled />
          </div>
        </div>
        <div v-if="hasProp('Has Phone number')" class="form-field">
          <input type="text" placeholder="Telefoonnummer" disabled />
        </div>
        <div v-if="hasProp('Has Radio Buttons')" class="form-options">
          <label class="radio-option">
            <span class="radio-circle"></span>
            <span>Optie A</span>
          </label>
          <label class="radio-option">
            <span class="radio-circle"></span>
            <span>Optie B</span>
          </label>
        </div>
        <div v-if="hasProp('Has Checkboxes')" class="form-options">
          <label class="checkbox-option">
            <span class="checkbox-box"></span>
            <span>Checkbox 1</span>
          </label>
          <label class="checkbox-option">
            <span class="checkbox-box"></span>
            <span>Checkbox 2</span>
          </label>
        </div>
        <div v-if="hasProp('Has Dropdown')" class="form-field">
          <select disabled>
            <option>Selecteer...</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary">Verstuur</button>
    </div>

    <!-- Grid2Col (2 large cards) -->
    <div v-else-if="componentType === 'Grid2Col'" class="preview-grid grid-2col">
      <h3 class="grid-title">{{ truncate(getText('Title', 'Grid Titel'), 40) }}</h3>
      <div class="grid-cards cols-2">
        <div v-for="(card, i) in gridCards" :key="i" class="grid-card">
          <div class="card-media large"></div>
          <h4 class="card-title">{{ card.props?.Title || `Card ${i + 1}` }}</h4>
          <p class="card-desc">{{ card.props?.Description || 'Beschrijving' }}</p>
        </div>
      </div>
    </div>

    <!-- Grid3Col (3 compact cards) -->
    <div v-else-if="componentType === 'Grid3Col'" class="preview-grid grid-3col">
      <h3 class="grid-title">{{ truncate(getText('Title', 'Grid Titel'), 40) }}</h3>
      <div class="grid-cards cols-3">
        <div v-for="(card, i) in gridCards" :key="i" class="grid-card">
          <div class="card-media">
            <svg
              class="media-icon-sm"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h4 class="card-title">{{ card.props?.Title || `Card ${i + 1}` }}</h4>
          <p class="card-desc">{{ card.props?.Description || 'Beschrijving' }}</p>
          <button v-if="card.props?.['Has button']" class="btn btn-primary btn-sm">
            {{
              card.children?.find((c) => c.component === 'Button Primary')?.props?.[
                'Text primary button'
              ] || 'Lees meer'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Grid - Default (3 cards) -->
    <div
      v-else-if="componentType === 'Grid' && variant === 'Default'"
      class="preview-grid grid-default"
    >
      <h3 class="grid-title">{{ truncate(getText('Title', 'Grid Titel'), 40) }}</h3>
      <div class="grid-cards cols-3">
        <div v-for="(card, i) in gridCards" :key="i" class="grid-card">
          <div class="card-media">
            <svg
              class="media-icon-sm"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h4 class="card-title">{{ card.props?.Title || `Card ${i + 1}` }}</h4>
          <p class="card-desc">{{ card.props?.Description || 'Beschrijving' }}</p>
          <button v-if="card.props?.['Has button']" class="btn btn-primary btn-sm">
            {{
              card.children?.find((c) => c.component === 'Button Primary')?.props?.[
                'Text primary button'
              ] || 'Lees meer'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Grid - Variant2 (4 cards) -->
    <div
      v-else-if="componentType === 'Grid' && variant === 'Variant2'"
      class="preview-grid grid-variant2"
    >
      <h3 class="grid-title">{{ truncate(getText('Title', 'Grid Titel'), 40) }}</h3>
      <div class="grid-cards cols-4">
        <div v-for="(card, i) in gridCards" :key="i" class="grid-card">
          <div class="card-media">
            <svg
              class="media-icon-sm"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h4 class="card-title">{{ card.props?.Title || `Card ${i + 1}` }}</h4>
          <p class="card-desc">{{ card.props?.Description || 'Beschrijving' }}</p>
          <button v-if="card.props?.['Has button']" class="btn btn-primary btn-sm">
            {{
              card.children?.find((c) => c.component === 'Button Primary')?.props?.[
                'Text primary button'
              ] || 'Lees meer'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Grid - Variant3 (2 cards) -->
    <div
      v-else-if="componentType === 'Grid' && variant === 'Variant3'"
      class="preview-grid grid-variant3"
    >
      <h3 class="grid-title">{{ truncate(getText('Title', 'Grid Titel'), 40) }}</h3>
      <div class="grid-cards cols-2">
        <div v-for="(card, i) in gridCards" :key="i" class="grid-card">
          <div class="card-media large">
            <svg
              class="media-icon-sm"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h4 class="card-title">{{ card.props?.Title || `Card ${i + 1}` }}</h4>
          <p class="card-desc">{{ card.props?.Description || 'Beschrijving' }}</p>
          <button v-if="card.props?.['Has button']" class="btn btn-primary btn-sm">
            {{
              card.children?.find((c) => c.component === 'Button Primary')?.props?.[
                'Text primary button'
              ] || 'Lees meer'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Kolommen - Default layout (media left, content right) -->
    <div
      v-else-if="componentType === 'Kolommen' && getKolommenLayoutVariant() === 'Default'"
      class="preview-kolommen kolommen-default"
    >
      <!-- Media section - number of images based on Media child's Property 1 -->
      <div
        :class="[
          'kolommen-media',
          getMediaVariant() === 'Default'
            ? 'single'
            : getMediaVariant() === 'Variant2'
              ? 'double'
              : 'triple',
        ]"
      >
        <div class="media-placeholder">
          <svg
            class="media-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <!-- Second image for Variant2 or Variant3 -->
        <div
          v-if="getMediaVariant() === 'Variant2' || getMediaVariant() === 'Variant3'"
          class="media-placeholder"
        >
          <svg
            class="media-icon-sm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <!-- Third image for Variant3 only -->
        <div v-if="getMediaVariant() === 'Variant3'" class="media-placeholder">
          <svg
            class="media-icon-sm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      </div>
      <div class="kolommen-content">
        <!-- Text content -->
        <template v-if="hasKolommenText">
          <h3 class="kolommen-title">{{ kolommenTextBlock.title }}</h3>
          <p v-if="kolommenTextBlock.hasDescription" class="kolommen-desc">
            {{ kolommenTextBlock.description }}
          </p>
          <ul
            v-if="kolommenTextBlock.hasList && kolommenTextBlock.usps.length > 0"
            class="kolommen-usps"
          >
            <li v-for="(usp, i) in kolommenTextBlock.usps" :key="i">{{ usp }}</li>
          </ul>
          <div class="kolommen-buttons">
            <button v-if="kolommenTextBlock.hasButton" class="btn btn-primary">
              {{ kolommenTextBlock.buttonText }}
            </button>
            <button v-if="kolommenTextBlock.hasSecondButton" class="btn btn-secondary">
              {{ kolommenTextBlock.secondButtonText }}
            </button>
          </div>
        </template>
        <!-- Accordion content -->
        <template v-else-if="hasKolommenAccordion">
          <h3 class="kolommen-title">{{ kolommenAccordion.title }}</h3>
          <div class="accordion-list">
            <div v-for="(item, i) in kolommenAccordion.items" :key="i" class="accordion-item">
              <span class="accordion-icon">▶</span>
              <span class="accordion-text">{{ item }}</span>
            </div>
          </div>
        </template>
        <!-- Fallback -->
        <template v-else>
          <h3 class="kolommen-title">Titel</h3>
          <p class="kolommen-desc">Beschrijving</p>
        </template>
      </div>
    </div>

    <!-- Kolommen - Variant2 layout (content left, media right) -->
    <div
      v-else-if="componentType === 'Kolommen' && getKolommenLayoutVariant() === 'Variant2'"
      class="preview-kolommen kolommen-variant2"
    >
      <div class="kolommen-content">
        <!-- Text content -->
        <template v-if="hasKolommenText">
          <h3 class="kolommen-title">{{ kolommenTextBlock.title }}</h3>
          <p v-if="kolommenTextBlock.hasDescription" class="kolommen-desc">
            {{ kolommenTextBlock.description }}
          </p>
          <ul
            v-if="kolommenTextBlock.hasList && kolommenTextBlock.usps.length > 0"
            class="kolommen-usps"
          >
            <li v-for="(usp, i) in kolommenTextBlock.usps" :key="i">{{ usp }}</li>
          </ul>
          <div class="kolommen-buttons">
            <button v-if="kolommenTextBlock.hasButton" class="btn btn-primary">
              {{ kolommenTextBlock.buttonText }}
            </button>
            <button v-if="kolommenTextBlock.hasSecondButton" class="btn btn-secondary">
              {{ kolommenTextBlock.secondButtonText }}
            </button>
          </div>
        </template>
        <!-- Accordion content -->
        <template v-else-if="hasKolommenAccordion">
          <h3 class="kolommen-title">{{ kolommenAccordion.title }}</h3>
          <div class="accordion-list">
            <div v-for="(item, i) in kolommenAccordion.items" :key="i" class="accordion-item">
              <span class="accordion-icon">▶</span>
              <span class="accordion-text">{{ item }}</span>
            </div>
          </div>
        </template>
        <!-- Fallback -->
        <template v-else>
          <h3 class="kolommen-title">Titel</h3>
          <p class="kolommen-desc">Beschrijving</p>
        </template>
      </div>
      <!-- Media section - number of images based on Media child's Property 1 -->
      <div
        :class="[
          'kolommen-media',
          getMediaVariant() === 'Default'
            ? 'single'
            : getMediaVariant() === 'Variant2'
              ? 'double'
              : 'triple',
        ]"
      >
        <div class="media-placeholder">
          <svg
            class="media-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <!-- Second image for Variant2 or Variant3 -->
        <div
          v-if="getMediaVariant() === 'Variant2' || getMediaVariant() === 'Variant3'"
          class="media-placeholder"
        >
          <svg
            class="media-icon-sm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <!-- Third image for Variant3 only -->
        <div v-if="getMediaVariant() === 'Variant3'" class="media-placeholder">
          <svg
            class="media-icon-sm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Logo Slider -->
    <div v-else-if="componentType === 'LogoSlider'" class="preview-logo-slider">
      <h3 class="slider-title center">{{ truncate(getText('Title', 'Onze Partners'), 30) }}</h3>
      <div class="logo-row">
        <div v-for="i in 5" :key="i" class="logo-item">
          <span>Logo</span>
        </div>
      </div>
    </div>

    <!-- Media Groot -->
    <div v-else-if="componentType === 'MediaGroot'" class="preview-media-groot">
      <div class="media-large">
        <div class="play-button">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Media Slider -->
    <div v-else-if="componentType === 'MediaSlider'" class="preview-media-slider">
      <h3 class="slider-title">{{ truncate(getText('Title', 'Media Slider'), 30) }}</h3>
      <div class="slider-row">
        <div class="slider-item main"></div>
        <div class="slider-item secondary"></div>
        <div class="slider-item tertiary"></div>
      </div>
      <div class="slider-dots">
        <span class="dot active"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>

    <!-- Post Slider / EntryPostSlider -->
    <div
      v-else-if="componentType === 'EntryPostSlider' || componentType === 'PostSlider'"
      class="preview-post-slider"
    >
      <h3 class="slider-title">{{ truncate(getText('Title', 'Laatste Berichten'), 30) }}</h3>
      <div class="post-cards">
        <div v-for="i in 3" :key="i" class="post-card">
          <div class="post-media"></div>
          <h4 class="post-title">Post titel</h4>
          <p class="post-desc">Beschrijving...</p>
        </div>
      </div>
    </div>

    <!-- Detail page -->
    <div v-else-if="componentType === 'Detailpage'" class="preview-detailpage">
      <div class="detail-header">
        <div v-if="hasProp('Has News Header') || hasProp('Has Project Header')" class="detail-tag">
          {{ hasProp('Has Project Header') ? 'Project' : 'Nieuws' }}
        </div>
      </div>
      <h2 class="detail-title">Detail Pagina Titel</h2>
      <p class="detail-meta">15 december 2025 • 5 min leestijd</p>
      <p class="detail-content">Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
      <p class="detail-content">Sed do eiusmod tempor incididunt ut labore et dolore.</p>
      <div
        v-if="block.children?.find((c) => c.component === 'CalltoAction')"
        class="detail-cta-box"
      >
        <h4>
          {{
            truncate(
              block.children?.find((c) => c.component === 'CalltoAction')?.props?.Title ||
                'Contact',
              20,
            )
          }}
        </h4>
        <button class="btn btn-primary btn-sm">Neem contact op</button>
      </div>
    </div>

    <!-- News -->
    <div v-else-if="componentType === 'News'" class="preview-news">
      <h3 class="section-title">{{ truncate(getText('Title', 'Nieuws'), 25) }}</h3>
      <p class="section-desc">
        {{ truncate(getText('Description', 'Laatste nieuws en updates'), 50) }}
      </p>
      <div class="news-cards">
        <div v-for="i in 3" :key="i" class="news-card">
          <div class="news-media"></div>
          <h4 class="news-title">Nieuws item</h4>
          <p class="news-desc">Beschrijving...</p>
        </div>
      </div>
    </div>

    <!-- Projects -->
    <div v-else-if="componentType === 'Projects'" class="preview-projects">
      <h3 class="section-title">{{ truncate(getText('Title', 'Projecten'), 25) }}</h3>
      <p v-if="hasProp('Has description')" class="section-desc">
        {{ truncate(getText('Description', 'Bekijk onze projecten'), 50) }}
      </p>
      <div class="project-cards">
        <div v-for="i in 3" :key="i" class="project-card">
          <div class="project-overlay"></div>
          <div class="project-label">
            {{
              hasProp('Has example project')
                ? truncate(getText('Example header', 'Project'), 15)
                : 'Project'
            }}
          </div>
        </div>
      </div>
    </div>

    <!-- Default / Fallback -->
    <div v-else class="preview-fallback">
      <h3 class="fallback-title">{{ componentType }}</h3>
      <p class="fallback-desc">Block preview beschikbaar</p>
      <div class="fallback-lines">
        <div class="line full"></div>
        <div class="line partial"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-preview {
  width: 100%;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--preview-bg);
}

.block-preview.page-simulation {
  border-radius: 0;
}

/* Selected state in preview mode */
.block-preview.is-selected {
  outline: 2px solid #8b5cf6;
  outline-offset: -2px;
  border-radius: 8px;
}

/* ===== MEDIA ICON ===== */
.media-icon {
  width: 48px;
  height: 48px;
  color: var(--preview-text-muted);
  opacity: 0.5;
}

/* ===== HERO ===== */
.preview-hero {
  position: relative;
  min-height: 400px;
}

.hero-bg-image {
  position: absolute;
  inset: 0;
  background: var(--preview-media);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding: 48px 24px;
  min-height: 400px;
}

.hero-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--preview-text);
  margin: 0;
}

.hero-description {
  font-size: 11px;
  color: var(--preview-text-secondary);
  margin: 0;
  line-height: 1.4;
  max-width: 80%;
}

.hero-usps {
  list-style: none;
  margin: 8px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--preview-text-secondary);
}

.usp-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--preview-button);
  flex-shrink: 0;
}

.hero-buttons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.media-placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  background: var(--preview-media);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== BUTTONS ===== */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary {
  background: var(--preview-button);
  color: var(--preview-button-text);
}

.btn-secondary {
  background: transparent;
  border: 2px solid var(--preview-button);
  color: var(--preview-button);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 10px;
}

/* ===== FOOTER ===== */
.preview-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 20px 24px;
  background: var(--preview-footer-bg);
}

.footer-logo {
  flex: 0 0 100%;
}

.logo-placeholder {
  width: 80px;
  height: 28px;
  background: var(--preview-media);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--preview-text-muted);
}

.footer-columns {
  display: flex;
  flex: 1;
  gap: 32px;
}

.footer-column {
  flex: 1;
}

.column-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 8px 0;
}

.column-links {
  list-style: none;
  margin: 0;
  padding: 0;
}

.column-links li {
  font-size: 10px;
  color: var(--preview-text-secondary);
  padding: 3px 0;
}

.footer-newsletter {
  flex: 0 0 100%;
  margin-top: 8px;
}

.newsletter-input {
  display: flex;
  gap: 8px;
  max-width: 280px;
}

.newsletter-input input {
  flex: 1;
  padding: 8px 12px;
  background: var(--preview-bg);
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  font-size: 10px;
  color: var(--preview-text-muted);
}

/* ===== CALL TO ACTION ===== */
.preview-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding: 48px 24px;
  min-height: 280px;
  background: var(--preview-bg);
}

.cta-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--preview-text);
  margin: 0;
}

.cta-description {
  font-size: 11px;
  color: var(--preview-text-secondary);
  margin: 0;
}

.cta-usps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  list-style: none;
  margin: 8px 0;
  padding: 0;
}

.cta-buttons {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

/* ===== CONTACTFORM (2-column) ===== */
.preview-contactform {
  display: flex;
  gap: 32px;
  padding: 24px;
  background: var(--preview-bg);
}

.contactform-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contactform-form {
  flex: 1;
  max-width: 50%;
}

.form-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--preview-text);
  margin: 0;
}

.form-desc {
  font-size: 11px;
  color: var(--preview-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-label {
  font-size: 9px;
  color: var(--preview-text-muted);
  text-transform: uppercase;
}

.contact-value {
  font-size: 11px;
  color: var(--preview-text);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-field {
  flex: 1;
}

.form-field.full {
  flex: 0 0 100%;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--preview-bg);
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  font-size: 10px;
  color: var(--preview-text-muted);
  box-sizing: border-box;
}

.form-field textarea {
  min-height: 60px;
  resize: none;
}

/* ===== FORM ===== */
.preview-form {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.form-options {
  display: flex;
  gap: 20px;
  margin: 8px 0;
}

.radio-option,
.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--preview-text-secondary);
  cursor: default;
}

.radio-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--preview-border);
}

.checkbox-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 2px solid var(--preview-border);
}

/* ===== GRID ===== */
.preview-grid {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.grid-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 16px 0;
}

.grid-cards {
  display: grid;
  gap: 16px;
}

.grid-cards.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-cards.cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.grid-cards.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-card {
  background: var(--preview-card);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  overflow: hidden;
  padding: 12px;
}

.card-media {
  width: 100%;
  aspect-ratio: 16/10;
  background: var(--preview-media);
  border-radius: 6px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-icon-sm {
  width: 24px;
  height: 24px;
  color: var(--preview-text-muted);
  opacity: 0.4;
}

.card-media.large {
  aspect-ratio: 16/9;
}

.card-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 4px 0;
}

.card-desc {
  font-size: 9px;
  color: var(--preview-text-secondary);
  margin: 0 0 10px 0;
}

/* ===== KOLOMMEN ===== */
.preview-kolommen {
  display: flex;
  gap: 24px;
  padding: 24px;
  background: var(--preview-bg);
}

.kolommen-media {
  flex: 0 0 45%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kolommen-media .media-placeholder {
  background: var(--preview-media);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* All variants maintain consistent total height based on 1:1 ratio */
.kolommen-media.single .media-placeholder {
  aspect-ratio: 1/1;
}

/* 2 images stacked vertically - each roughly half height */
.kolommen-media.double .media-placeholder {
  aspect-ratio: 2/1;
}

/* 3 images stacked vertically - each roughly third height */
.kolommen-media.triple .media-placeholder {
  aspect-ratio: 3/1;
}

.kolommen-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.kolommen-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--preview-text);
  margin: 0;
}

.kolommen-desc {
  font-size: 11px;
  color: var(--preview-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.kolommen-desc.secondary {
  color: var(--preview-text-muted);
}

/* USPs list */
.kolommen-usps {
  list-style: none;
  padding: 0;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kolommen-usps li {
  font-size: 10px;
  color: var(--preview-text-secondary);
  padding-left: 12px;
  position: relative;
}

.kolommen-usps li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--preview-button);
}

/* Buttons container */
.kolommen-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* Accordion styles */
.accordion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.accordion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--preview-card);
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  font-size: 10px;
  color: var(--preview-text);
}

.accordion-icon {
  font-size: 8px;
  color: var(--preview-text-muted);
}

.accordion-text {
  flex: 1;
}

.kolommen-variant2 {
  flex-direction: row;
}

/* ===== LOGO SLIDER ===== */
.preview-logo-slider {
  padding: 16px 24px;
  background: var(--preview-bg);
}

.slider-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 16px 0;
}

.slider-title.center {
  text-align: center;
}

.logo-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.logo-item {
  flex: 1;
  max-width: 70px;
  aspect-ratio: 16/10;
  background: var(--preview-media);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: var(--preview-text-muted);
}

/* ===== MEDIA GROOT ===== */
.preview-media-groot {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.media-large {
  width: 100%;
  aspect-ratio: 16/9;
  background: var(--preview-media);
  border-radius: 10px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--preview-card);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.9;
}

.play-button svg {
  width: 20px;
  height: 20px;
  color: var(--preview-text);
  margin-left: 3px;
}

/* ===== MEDIA SLIDER ===== */
.preview-media-slider {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.slider-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.slider-item {
  background: var(--preview-media);
  border-radius: 8px;
  flex: 1;
  aspect-ratio: 16/10;
}

.slider-item.tertiary {
  /* Third item slides partially out of view - flat right corners */
  flex: 0 0 25%;
  opacity: 0.6;
  border-radius: 8px 0 0 8px;
}

.slider-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--preview-text-muted);
}

.dot.active {
  background: var(--preview-button);
}

/* ===== POST SLIDER ===== */
.preview-post-slider {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.post-cards {
  display: flex;
  gap: 16px;
}

.post-card {
  flex: 1;
  background: var(--preview-card);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  overflow: hidden;
  padding: 12px;
}

.post-media {
  width: 100%;
  aspect-ratio: 16/10;
  background: var(--preview-media);
  border-radius: 6px;
  margin-bottom: 10px;
}

.post-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 4px 0;
}

.post-desc {
  font-size: 8px;
  color: var(--preview-text-secondary);
  margin: 0;
}

/* ===== DETAIL PAGE ===== */
.preview-detailpage {
  padding: 16px 24px;
  background: var(--preview-bg);
}

.detail-header {
  width: 100%;
  aspect-ratio: 4/1;
  background: var(--preview-media);
  border-radius: 8px;
  margin-bottom: 16px;
  position: relative;
}

.detail-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  background: var(--preview-button);
  color: var(--preview-button-text);
  border-radius: 4px;
  font-size: 9px;
  font-weight: 500;
}

.detail-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--preview-text);
  margin: 0 0 6px 0;
}

.detail-meta {
  font-size: 10px;
  color: var(--preview-text-muted);
  margin: 0 0 12px 0;
}

.detail-content {
  font-size: 10px;
  color: var(--preview-text-secondary);
  margin: 0 0 6px 0;
  line-height: 1.5;
}

.detail-cta-box {
  margin-top: 16px;
  padding: 16px;
  background: var(--preview-card);
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-cta-box h4 {
  margin: 0;
  font-size: 11px;
  color: var(--preview-text);
}

/* ===== NEWS ===== */
.preview-news {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 10px;
  color: var(--preview-text-secondary);
  margin: 0 0 16px 0;
}

.news-cards {
  display: flex;
  gap: 16px;
}

.news-card {
  flex: 1;
  background: var(--preview-card);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  overflow: hidden;
  padding: 12px;
}

.news-media {
  width: 100%;
  aspect-ratio: 16/10;
  background: var(--preview-media);
  border-radius: 6px;
  margin-bottom: 10px;
}

.news-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 4px 0;
}

.news-desc {
  font-size: 8px;
  color: var(--preview-text-secondary);
  margin: 0;
}

/* ===== PROJECTS ===== */
.preview-projects {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.project-cards {
  display: flex;
  gap: 16px;
}

.project-card {
  flex: 1;
  aspect-ratio: 16/14;
  background: var(--preview-media);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.project-overlay {
  position: absolute;
  inset: 0;
  background: var(--preview-text-muted);
  opacity: 0.1;
}

.project-label {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  padding: 8px;
  background: var(--preview-card);
  border-radius: 4px;
  text-align: center;
  font-size: 10px;
  font-weight: 500;
  color: var(--preview-text);
}

/* ===== FALLBACK ===== */
.preview-fallback {
  padding: 20px 24px;
  background: var(--preview-bg);
}

.fallback-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--preview-text);
  margin: 0 0 8px 0;
}

.fallback-desc {
  font-size: 11px;
  color: var(--preview-text-secondary);
  margin: 0 0 12px 0;
}

.fallback-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line {
  height: 8px;
  background: var(--preview-media);
  border-radius: 4px;
}

.line.full {
  width: 100%;
}

.line.partial {
  width: 75%;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 400px) {
  .preview-hero {
    flex-direction: column;
  }

  .hero-media {
    flex: 0 0 auto;
  }

  .preview-kolommen {
    flex-direction: column;
  }

  .kolommen-media {
    flex: 0 0 auto;
  }

  .grid-cards.cols-3,
  .grid-cards.cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-columns {
    flex-wrap: wrap;
  }

  .footer-column {
    flex: 0 0 45%;
  }
}
</style>
