import { supabase } from '../lib/supabase.js'

/**
 * Wireframe Service
 * Roept de Supabase Edge Function aan voor wireframe generatie
 */
export const wireframeService = {
  /**
   * Genereer een wireframe sitemap via Anthropic AI
   * @param {Object} projectData - Project data
   * @param {string} projectData.projectName - Projectnaam
   * @param {string} projectData.companyName - Bedrijfsnaam (optioneel)
   * @param {string} projectData.description - Project beschrijving (optioneel)
   * @param {number} projectData.numPages - Aantal pagina's
   * @param {string} projectData.language - Taal (Nederlands/English)
   * @param {Array} projectData.files - Base64 encoded files voor AI context (niet opgeslagen in DB)
   * @param {string} projectData.additionalContext - Extra context (optioneel)
   * @returns {Promise<Object>} Wireframe data
   */
  async generateWireframe(projectData) {
    try {
      // Files zijn alleen voor AI context, niet voor database storage
      const { data, error } = await supabase.functions.invoke('generate-wireframe', {
        body: projectData, // Bevat ook files array indien aanwezig
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(`Fout bij genereren wireframe: ${error.message}`)
      }

      return data
    } catch (err) {
      console.error('Error calling edge function:', err)
      throw new Error(`Fout bij aanroepen wireframe service: ${err.message}`)
    }
  },

  /**
   * Valideer wireframe JSON tegen het schema
   * Ondersteunt zowel nieuwe structuur (object met sections/pages) als legacy (array)
   * @param {Object|Array} wireframeJson - Wireframe JSON
   * @returns {boolean} Valid of niet
   */
  validateWireframe(wireframeJson) {
    // Nieuwe structuur: object met sections en pages
    if (wireframeJson && typeof wireframeJson === 'object' && !Array.isArray(wireframeJson)) {
      const hasSections = Array.isArray(wireframeJson.sections)
      const hasPages = Array.isArray(wireframeJson.pages)
      
      if (hasSections && hasPages) {
        // Valideer dat elke pagina 'page' en 'blocks' heeft
        return wireframeJson.pages.every((page) => {
          return (
            page &&
            typeof page === 'object' &&
            typeof page.page === 'string' &&
            Array.isArray(page.blocks)
          )
        })
      }
    }

    // Legacy structuur: array van pagina's
    if (Array.isArray(wireframeJson)) {
      return wireframeJson.every((page) => {
        return (
          page &&
          typeof page === 'object' &&
          typeof page.page === 'string' &&
          Array.isArray(page.blocks)
        )
      })
    }

    return false
  },

  /**
   * Converteer wireframe JSON naar project format
   * Ondersteunt zowel nieuwe structuur (met sections) als legacy (array)
   * 
   * @param {Object|Array} wireframeJson - Wireframe JSON
   * @returns {Object} Project data met sections en pages
   */
  convertToProjectFormat(wireframeJson) {
    // Nieuwe structuur: object met sections en pages
    if (wireframeJson && typeof wireframeJson === 'object' && !Array.isArray(wireframeJson)) {
      if (wireframeJson.sections && wireframeJson.pages) {
        return {
          sections: wireframeJson.sections.map((section, index) => ({
            id: `section-${Date.now()}-${index}`,
            name: section.name,
            handle: section.handle,
            type: section.type || 'single',
            slug: section.slug || '',
            template: section.template || `_pages/${section.handle}/entry.twig`,
            entryTypes: section.entryTypes || [section.handle],
            fetchesFrom: section.fetchesFrom || undefined,
            categories: section.categories || [],
          })),
          pages: wireframeJson.pages.map((page, index) => ({
            id: `page-${Date.now()}-${index}`,
            name: page.page,
            section: page.section || '',
            rationale: page.rationale || '',
            blocks: page.blocks.map((block, blockIndex) => ({
              id: `block-${Date.now()}-${index}-${blockIndex}`,
              ...block,
            })),
          })),
        }
      }
    }

    // Legacy structuur: array van pagina's (backward compatibility)
    if (Array.isArray(wireframeJson)) {
      // Genereer sections automatisch uit pagina's
      const sections = wireframeJson.map((page, index) => {
        const handle = this.generateHandleFromName(page.page)
        const isHome = page.page.toLowerCase().includes('home')
        return {
          id: `section-${Date.now()}-${index}`,
          name: page.page,
          handle: handle,
          type: 'single',
          slug: isHome ? '' : handle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          template: `_pages/${handle}/entry.twig`,
          entryTypes: [handle],
        }
      })

      const pages = wireframeJson.map((page, index) => ({
        id: `page-${Date.now()}-${index}`,
        name: page.page,
        section: this.generateHandleFromName(page.page),
        rationale: page.rationale || '',
        blocks: page.blocks.map((block, blockIndex) => ({
          id: `block-${Date.now()}-${index}-${blockIndex}`,
          ...block,
        })),
      }))

      return { sections, pages }
    }

    return { sections: [], pages: [] }
  },

  /**
   * Legacy: Converteer wireframe JSON naar project pages format
   * @deprecated Gebruik convertToProjectFormat voor nieuwe implementaties
   * @param {Object|Array} wireframeJson - Wireframe JSON
   * @returns {Array} Pages in project format
   */
  convertToProjectPages(wireframeJson) {
    const projectData = this.convertToProjectFormat(wireframeJson)
    return projectData.pages
  },

  /**
   * Haal sections uit wireframe JSON
   * @param {Object|Array} wireframeJson - Wireframe JSON
   * @returns {Array} Sections array
   */
  getSections(wireframeJson) {
    const projectData = this.convertToProjectFormat(wireframeJson)
    return projectData.sections
  },

  /**
   * Genereer een handle van een naam
   * @param {string} name - Naam om te converteren
   * @returns {string} Handle in camelCase
   */
  generateHandleFromName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  },
}

export default wireframeService
