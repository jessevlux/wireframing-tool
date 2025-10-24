import { supabase } from '../lib/supabase.js'

/**
 * Project Service
 * Handles alle project-gerelateerde Supabase calls
 */
export const projectService = {
  /**
   * Maak een nieuw project aan
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectData) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Fout bij aanmaken project: ${error.message}`)
      }

      return data
    } catch (err) {
      console.error('Error creating project:', err)
      throw err
    }
  },

  /**
   * Haal alle projecten op
   * @returns {Promise<Array>} Array van projecten
   */
  async getAllProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Fout bij ophalen projecten: ${error.message}`)
      }

      return data || []
    } catch (err) {
      console.error('Error fetching projects:', err)
      throw err
    }
  },

  /**
   * Haal een specifiek project op
   * @param {number|string} projectId - Project ID
   * @returns {Promise<Object>} Project object
   */
  async getProject(projectId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Fout bij ophalen project: ${error.message}`)
      }

      return data
    } catch (err) {
      console.error('Error fetching project:', err)
      throw err
    }
  },

  /**
   * Update een bestaand project
   * @param {number|string} projectId - Project ID
   * @param {Object} projectData - Nieuwe project data
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, projectData) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Fout bij updaten project: ${error.message}`)
      }

      return data
    } catch (err) {
      console.error('Error updating project:', err)
      throw err
    }
  },

  /**
   * Verwijder een project
   * @param {number|string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Fout bij verwijderen project: ${error.message}`)
      }
    } catch (err) {
      console.error('Error deleting project:', err)
      throw err
    }
  },
}

export default projectService
