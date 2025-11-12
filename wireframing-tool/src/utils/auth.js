import { supabase } from '../lib/supabase.js'

/**
 * Check if the current user is a demo account
 * Demo accounts are identified by email ending with @demo.local
 * or a specific demo email address
 * @returns {Promise<boolean>} True if user is a demo account
 */
export async function isDemoAccount() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return false
    }

    // Check if email is a demo account
    // You can customize this logic (e.g., check user metadata, specific email, etc.)
    const demoEmails = ['demo@wireframing-tool.local', 'demo@example.com']
    const isDemoEmail =
      demoEmails.includes(user.email.toLowerCase()) ||
      user.email.toLowerCase().endsWith('@demo.local')

    // Alternatively, check user metadata if you set it when creating the demo account
    const isDemoMetadata = user.user_metadata?.is_demo === true

    return isDemoEmail || isDemoMetadata
  } catch (error) {
    console.error('Error checking demo account:', error)
    return false
  }
}

/**
 * Get current user email
 * @returns {Promise<string|null>} User email or null
 */
export async function getCurrentUserEmail() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.email || null
  } catch (error) {
    console.error('Error getting user email:', error)
    return null
  }
}
