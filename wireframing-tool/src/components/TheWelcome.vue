<script setup>
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'

const openReadmeInEditor = () => fetch('/__open-in-editor?file=README.md')
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <WelcomeItem>
      <template #icon>
        <DocumentationIcon />
      </template>
      <template #heading>Documentation</template>

      Vue’s
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://vuejs.org/" target="_blank" rel="noopener"
        >official documentation</a
      >
      covers everything you need to kick things off.
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <ToolingIcon />
      </template>
      <template #heading>Tooling</template>

      This project is built and bundled with
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://vite.dev/guide/features.html" target="_blank" rel="noopener"
        >Vite</a
      >.
      Use
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://code.visualstudio.com/" target="_blank" rel="noopener"
        >VS Code</a
      >
      with the
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://github.com/vuejs/language-tools" target="_blank" rel="noopener"
        >Vue - Official</a
      >
      extension for the best DX. Need tests? Try
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://vitest.dev/" target="_blank" rel="noopener"
        >Vitest</a
      >
      with
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://www.cypress.io/" target="_blank" rel="noopener"
        >Cypress</a
      >
      or
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://playwright.dev/" target="_blank" rel="noopener"
        >Playwright</a
      >.

      <div>
        More tips live in
        <a class="font-medium text-emerald-600 hover:text-emerald-700" href="javascript:void(0)" @click="openReadmeInEditor">
          <code>README.md</code>
        </a>
        .
      </div>
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <EcosystemIcon />
      </template>
      <template #heading>Ecosystem</template>

      Reach for the official Vue ecosystem:
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://pinia.vuejs.org/" target="_blank" rel="noopener">Pinia</a>,
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://router.vuejs.org/" target="_blank" rel="noopener">Vue Router</a>,
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://test-utils.vuejs.org/" target="_blank" rel="noopener">Vue Test Utils</a>,
      and
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://github.com/vuejs/devtools" target="_blank" rel="noopener">Vue Dev Tools</a>.
      For even more gems, explore
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">Awesome Vue</a
      >.
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <CommunityIcon />
      </template>
      <template #heading>Community</template>

      Stuck on something? Drop into
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://chat.vuejs.org" target="_blank" rel="noopener">Vue Land</a>,
      ask on
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://stackoverflow.com/questions/tagged/vue.js" target="_blank" rel="noopener"
        >StackOverflow</a
      >,
      or follow
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://bsky.app/profile/vuejs.org" target="_blank" rel="noopener">@vuejs.org</a>
      and
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://x.com/vuejs" target="_blank" rel="noopener">@vuejs</a>
      for news.
    </WelcomeItem>

    <WelcomeItem class="lg:col-span-2">
      <template #icon>
        <SupportIcon />
      </template>
      <template #heading>Support Vue</template>

      Vue thrives thanks to community backing. Consider
      <a class="font-medium text-emerald-600 hover:text-emerald-700" href="https://vuejs.org/sponsor/" target="_blank" rel="noopener"
        >becoming a sponsor</a
      >
      to keep the project healthy.
    </WelcomeItem>
  </div>
</template>
