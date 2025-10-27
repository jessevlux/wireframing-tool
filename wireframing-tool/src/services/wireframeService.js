import { supabase } from '../lib/supabase.js'
//oude dummy data
/**
 *
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
   * @param {Array} wireframeJson - Wireframe JSON array
   * @returns {boolean} Valid of niet
   */
  validateWireframe(wireframeJson) {
    if (!Array.isArray(wireframeJson)) {
      return false
    }

    // Basis validatie - elke pagina moet 'page' en 'blocks' hebben
    return wireframeJson.every((page) => {
      return (
        page &&
        typeof page === 'object' &&
        typeof page.page === 'string' &&
        Array.isArray(page.blocks)
      )
    })
  },

  /**
   * Converteer wireframe JSON naar project pages format
   * @param {Array} wireframeJson - Wireframe JSON array
   * @returns {Array} Pages in project format
   */
  convertToProjectPages(wireframeJson) {
    if (!wireframeJson || !Array.isArray(wireframeJson)) {
      return []
    }

    return wireframeJson.map((page, index) => ({
      id: `page-${Date.now()}-${index}`,
      name: page.page,
      blocks: page.blocks.map((block, blockIndex) => ({
        id: `block-${Date.now()}-${blockIndex}`,
        ...block,
      })),
    }))
  },
}

export default wireframeService
