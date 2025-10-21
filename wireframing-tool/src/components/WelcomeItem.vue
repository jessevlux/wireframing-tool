<template>
  <div
    class="relative flex gap-5 rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm shadow-slate-200/40 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100/60"
  >
    <div
      class="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200/60 bg-emerald-50 text-emerald-600"
    >
      <slot name="icon"></slot>
    </div>
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">
        <slot name="heading"></slot>
      </h3>
      <div class="space-y-1 text-sm leading-relaxed text-slate-600">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
