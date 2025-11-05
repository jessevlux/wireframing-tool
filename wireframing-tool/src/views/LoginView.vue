<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const afterLogin = async () => {
  const redirect = route.query.redirect || '/'
  router.replace(String(redirect))
}

const loginEmailPassword = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    if (!email.value || !password.value) throw new Error('Vul e-mail en wachtwoord in')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error
    await afterLogin()
  } catch (e) {
    errorMsg.value = e?.message || 'Login mislukt'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
    <div class="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      <h1 class="text-2xl font-bold mb-6">Inloggen</h1>

      <div v-if="errorMsg" class="mb-4 text-red-400 text-sm">{{ errorMsg }}</div>

      <div class="space-y-4">
        <input
          v-model="email"
          type="email"
          placeholder="E-mail"
          class="w-full px-4 py-3 bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-xl"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Wachtwoord"
          class="w-full px-4 py-3 bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-xl"
        />

        <button
          @click="loginEmailPassword"
          :disabled="loading"
          class="w-full py-3 bg-violet-600 rounded-xl disabled:opacity-50"
        >
          Inloggen
        </button>
      </div>
    </div>
  </div>
</template>
