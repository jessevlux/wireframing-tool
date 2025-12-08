// Wireframe Service - SSE streaming support

// Get Supabase config for direct fetch
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Wireframe Service
 * Roept de Supabase Edge Function aan voor wireframe generatie (met SSE streaming)
 */
export const wireframeService = {
  /**
   * Genereer een wireframe sitemap via Anthropic AI (met streaming)
   * @param {Object} projectData - Project data
   * @param {string} projectData.projectName - Projectnaam
   * @param {string} projectData.companyName - Bedrijfsnaam (optioneel)
   * @param {string} projectData.description - Project beschrijving (optioneel)
   * @param {number} projectData.numPages - Aantal pagina's
   * @param {string} projectData.language - Taal (Nederlands/English)
   * @param {Array} projectData.files - Base64 encoded files voor AI context
   * @param {string} projectData.additionalContext - Extra context (optioneel)
   * @param {Object} callbacks - Callback functies
   * @param {Function} callbacks.onProgress - Callback voor progressie updates
   * @param {Function} callbacks.onSitemapReady - Callback wanneer sitemap klaar is (sections + lege pages)
   * @param {Function} callbacks.onPagesGenerated - Callback per batch gegenereerde pagina's
   * @returns {Promise<Object>} Wireframe data
   */
  async generateWireframe(projectData, callbacks = {}) {
    // Support old signature: generateWireframe(projectData, onProgress)
    const { onProgress, onSitemapReady, onPagesGenerated } =
      typeof callbacks === 'function' ? { onProgress: callbacks } : callbacks

    try {
      // Use direct fetch for SSE streaming support
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-wireframe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(projectData),
      })

      if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
        const errorText = await response.text()
        try {
          const errorJson = JSON.parse(errorText)
          throw new Error(errorJson.message || errorJson.error || `HTTP ${response.status}`)
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
      }

      const contentType = response.headers.get('content-type') || ''

      // Handle SSE streaming response
      if (contentType.includes('text/event-stream')) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let result = null
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          let currentEvent = null
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                console.log('SSE Event:', currentEvent, data)

                if (currentEvent === 'progress' && onProgress) {
                  onProgress(data.message)
                } else if (currentEvent === 'heartbeat') {
                  // Keep connection alive, optionally update UI
                  if (onProgress) {
                    onProgress(`Genereren... (${data.elapsed}s)`)
                  }
                } else if (currentEvent === 'sitemap_ready' && onSitemapReady) {
                  // Sitemap is ready - frontend can create project and redirect
                  onSitemapReady(data)
                } else if (currentEvent === 'pages_generated' && onPagesGenerated) {
                  // Pages batch generated - update in frontend
                  onPagesGenerated(data)
                } else if (currentEvent === 'complete' || data.success === true) {
                  // Handle complete event (also fallback if event type is missing)
                  result = data
                } else if (currentEvent === 'error') {
                  throw new Error(data.message || data.error)
                }
              } catch (e) {
                if (e.message && !e.message.includes('JSON')) {
                  throw e // Re-throw non-JSON errors
                }
              }
              currentEvent = null
            }
          }
        }

        if (!result) {
          throw new Error('Stream ended without result')
        }

        return result
      }

      // Fallback: JSON response (for dummy data or legacy)
      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || data.error)
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
   * Converteer een enkele wireframe page naar project format
   * Gebruikt voor live page updates
   * @param {Object} page - Wireframe page
   * @returns {Object} Page in project format
   */
  convertPageToProjectFormat(page) {
    return {
      id: page.id || `page-${Date.now()}`,
      name: page.page,
      section: page.section || '',
      rationale: page.rationale || '',
      status: page.status || 'complete',
      blocks: (page.blocks || []).map((block, blockIndex) => ({
        id: block.id || `block-${Date.now()}-${blockIndex}`,
        ...block,
      })),
    }
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
      .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join('')
  },
}

export default wireframeService
