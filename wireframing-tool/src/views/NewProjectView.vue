<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Placeholder component - will implement the full form later
const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-4">New Project View</h1>
      <p class="text-zinc-400 mb-6">Coming soon...</p>
      <button
        @click="goBack"
        class="px-6 py-3 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium shadow-lg"
      >
        Back to Dashboard
      </button>
    </div>
  </div>
</template>
