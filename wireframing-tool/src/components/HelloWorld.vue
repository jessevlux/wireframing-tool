<script setup>
defineProps({
  msg: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 text-center md:items-start md:gap-4 md:text-left">
    <h1 class="text-4xl font-semibold text-emerald-600 md:text-xl">
      {{ msg }}
    </h1>
    <h3 class="text-lg text-slate-600 md:text-xl">
      You've successfully created a project with
      <a
        class="font-semibold text-emerald-600 underline-offset-4 transition-colors hover:text-emerald-700 hover:underline"
        href="https://vite.dev/"
        target="_blank"
        rel="noopener"
      >
        Vite
      </a>
      +
      <a
        class="font-semibold text-emerald-600 underline-offset-4 transition-colors hover:text-emerald-700 hover:underline"
        href="https://vuejs.org/"
        target="_blank"
        rel="noopener"
      >
        Vue 3
      </a>
      .
    </h3>
  </div>
</template>
