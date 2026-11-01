<template>
  <span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 48 48" role="presentation">
      <defs>
        <linearGradient id="brand-mark-gradient" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ff9ab7" />
          <stop offset="1" stop-color="#f45f8d" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#brand-mark-gradient)" />
      <path d="M24 11.5v17" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
      <path
        d="m16.5 23 7.5 7.5 7.5-7.5"
        fill="none"
        stroke="#fff"
        stroke-width="3.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M16 36h16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".66" />
    </svg>
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: none;
  filter: drop-shadow(0 8px 14px rgba(244, 95, 141, 0.2));
}

.brand-mark svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
