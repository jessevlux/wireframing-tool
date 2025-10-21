<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-100 text-slate-900">
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between"
      >
        <img
          alt="Vue logo"
          class="h-24 w-24 rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm"
          src="@/assets/logo.svg"
          width="125"
          height="125"
        />
        <div class="flex w-full flex-col items-center gap-6 md:w-auto md:items-start">
          <HelloWorld msg="You did it!" />
          <nav
            class="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600 md:justify-start"
          >
            <RouterLink
              to="/"
              class="rounded-full px-4 py-2 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
              exact-active-class="bg-emerald-500 text-white shadow"
            >
              Home
            </RouterLink>
            <RouterLink
              to="/about"
              class="rounded-full px-4 py-2 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
              exact-active-class="bg-emerald-500 text-white shadow"
            >
              About
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>

    <RouterView v-slot="{ Component }">
      <main class="flex-1 w-full">
        <component :is="Component" />
      </main>
    </RouterView>
  </div>
</template>
