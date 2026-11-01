<script setup lang="ts">
import { NTag } from 'naive-ui'
import BrandMark from '../components/BrandMark.vue'
import { isNeutralinoRuntime } from '../utils/neutralino'

const appVersion = __APP_VERSION__
const isDesktop = isNeutralinoRuntime()
const runtimeLabel = isDesktop ? 'Neutralino Desktop' : 'Browser Preview'
</script>

<template>
  <main class="home-shell">
    <div class="app-window">
      <header class="app-header">
        <div class="brand-lockup">
          <BrandMark />
          <div class="brand-copy">
            <span class="brand-name">BiliFlow</span>
            <span class="brand-subtitle">Local-first video downloader</span>
          </div>
        </div>

        <div class="header-meta">
          <span
            class="runtime-pill"
            :class="isDesktop ? 'runtime-pill--desktop' : 'runtime-pill--browser'"
          >
            <span class="runtime-dot" />
            {{ runtimeLabel }}
          </span>
          <NTag size="small" :bordered="false" round>v{{ appVersion }}</NTag>
        </div>
      </header>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">LOCAL-FIRST · WINDOWS DESKTOP</p>
          <h1>轻量下载，<br /><span>从容收藏。</span></h1>
          <p class="lead">
            BiliFlow 是一个基于 yt-dlp 与 FFmpeg 的本地视频下载工具。处理过程都在你的电脑上完成，简单、安静、可控。
          </p>

          <div class="readiness">
            <span class="readiness-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m7 12.5 3.2 3.2L17 8.8"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <div>
              <strong>桌面基础框架已就绪</strong>
              <p>下载与音视频处理能力将在后续版本接入。</p>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="hero-panel">
            <div class="panel-glow" aria-hidden="true" />

            <div class="panel-topline">
              <span>PROJECT STATUS</span>
              <span class="panel-version">v{{ appVersion }}</span>
            </div>

            <div class="panel-brand">
              <div class="panel-mark" aria-hidden="true">B</div>
              <div>
                <strong>BiliFlow</strong>
                <p>Portable desktop workspace</p>
              </div>
            </div>

            <div class="status-list">
              <div class="status-row">
                <span class="status-label">Frontend</span>
                <strong class="status-value status-value--ready">Ready</strong>
              </div>
              <div class="status-row">
                <span class="status-label">Desktop runtime</span>
                <strong
                  class="status-value"
                  :class="isDesktop ? 'status-value--ready' : 'status-value--preview'"
                >
                  {{ isDesktop ? 'Ready' : 'Preview' }}
                </strong>
              </div>
              <div class="status-row">
                <span class="status-label">Download engine</span>
                <strong class="status-value status-value--next">Next</strong>
              </div>
            </div>

            <div class="panel-footer">
              <span class="panel-footer-dot" />
              Built on Neutralinojs
            </div>
          </div>

          <span class="floating-chip floating-chip--vue">Vue 3</span>
          <span class="floating-chip floating-chip--neutralino">Neutralinojs</span>
        </div>
      </section>

      <footer class="app-footer">
        <div class="tech-stack">
          <span>Vue 3</span>
          <i />
          <span>TypeScript</span>
          <i />
          <span>Vite</span>
          <i />
          <span>Naive UI</span>
          <i />
          <span>Neutralinojs</span>
        </div>
        <span class="footer-note">Made for Windows · v{{ appVersion }}</span>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.home-shell {
  position: relative;
  isolation: isolate;
  display: flex;
  min-height: 100svh;
  padding: 22px;
  background:
    radial-gradient(circle at 8% 0%, rgba(251, 114, 153, 0.2), transparent 32%),
    radial-gradient(circle at 95% 100%, rgba(124, 143, 255, 0.16), transparent 34%),
    linear-gradient(145deg, #f8f5f2 0%, #f0f2f6 100%);
}

.home-shell::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image: radial-gradient(rgba(45, 42, 52, 0.12) 0.8px, transparent 0.8px);
  background-size: 20px 20px;
  content: '';
  mask-image: linear-gradient(120deg, rgba(0, 0, 0, 0.7), transparent 58%);
}

.app-window {
  display: flex;
  width: min(1180px, 100%);
  min-height: calc(100svh - 44px);
  margin: 0 auto;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  outline: 1px solid rgba(46, 42, 54, 0.08);
  background: rgba(255, 255, 255, 0.74);
  box-shadow:
    0 32px 90px rgba(50, 42, 56, 0.13),
    0 2px 8px rgba(50, 42, 56, 0.04);
  backdrop-filter: blur(24px);
}

.app-header {
  display: flex;
  padding: 22px 30px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid rgba(46, 42, 54, 0.08);
}

.brand-lockup {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 13px;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  color: #232128;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.brand-subtitle {
  overflow: hidden;
  color: #96919b;
  font-size: 11px;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
}

.runtime-pill {
  display: inline-flex;
  padding: 7px 11px;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(46, 42, 54, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #77727d;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.runtime-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: #aaa5af;
}

.runtime-pill--desktop .runtime-dot {
  background: #31b77c;
  box-shadow: 0 0 0 3px rgba(49, 183, 124, 0.12);
}

.runtime-pill--browser .runtime-dot {
  background: #d18a2f;
  box-shadow: 0 0 0 3px rgba(209, 138, 47, 0.12);
}

.hero {
  display: grid;
  flex: 1;
  padding: clamp(40px, 5.5vw, 76px) clamp(30px, 5vw, 64px);
  align-items: center;
  gap: clamp(36px, 5vw, 70px);
  grid-template-columns: minmax(0, 1.12fr) minmax(330px, 0.88fr);
}

.hero-copy {
  animation: rise-in 520ms ease-out both;
}

.eyebrow {
  display: flex;
  margin: 0 0 20px;
  align-items: center;
  gap: 10px;
  color: #938e98;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.17em;
  line-height: 1.4;
}

.eyebrow::before {
  width: 24px;
  height: 1px;
  background: #fb7299;
  content: '';
}

h1 {
  margin: 0;
  color: #232128;
  font-size: clamp(48px, 5.8vw, 76px);
  font-weight: 700;
  letter-spacing: -0.065em;
  line-height: 1.03;
}

h1 span {
  background: linear-gradient(120deg, #f45f8d 8%, #ff9d6d 92%);
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
}

.lead {
  max-width: 530px;
  margin: 25px 0 0;
  color: #716d78;
  font-size: 15px;
  line-height: 1.8;
}

.readiness {
  display: flex;
  max-width: 530px;
  margin-top: 32px;
  padding: 16px 18px;
  align-items: flex-start;
  gap: 13px;
  border: 1px solid rgba(251, 114, 153, 0.16);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.07), rgba(255, 255, 255, 0.62));
}

.readiness-icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #fff;
  color: #f45f8d;
  box-shadow: 0 5px 12px rgba(244, 95, 141, 0.12);
}

.readiness-icon svg {
  width: 18px;
  height: 18px;
}

.readiness strong {
  display: block;
  color: #332f38;
  font-size: 13px;
  font-weight: 650;
}

.readiness p {
  margin: 4px 0 0;
  color: #918c96;
  font-size: 12px;
  line-height: 1.55;
}

.hero-visual {
  position: relative;
  min-width: 0;
  animation: rise-in 620ms 80ms ease-out both;
}

.hero-panel {
  position: relative;
  min-height: 366px;
  padding: 26px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background:
    radial-gradient(circle at 85% 0%, rgba(251, 114, 153, 0.24), transparent 36%),
    linear-gradient(145deg, #2a2731 0%, #37313b 100%);
  box-shadow:
    0 26px 50px rgba(37, 32, 43, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: #fff;
}

.panel-glow {
  position: absolute;
  right: -70px;
  bottom: -95px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(251, 114, 153, 0.22);
  filter: blur(40px);
}

.panel-topline {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.46);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.17em;
}

.panel-version {
  letter-spacing: 0.04em;
}

.panel-brand {
  position: relative;
  display: flex;
  margin-top: 26px;
  align-items: center;
  gap: 13px;
}

.panel-mark {
  display: flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 15px;
  background: linear-gradient(135deg, #fb7299, #f25a86);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.16);
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -0.08em;
}

.panel-brand strong {
  display: block;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.panel-brand p {
  margin: 3px 0 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
}

.status-list {
  position: relative;
  margin-top: 28px;
}

.status-row {
  display: flex;
  padding: 14px 0;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  gap: 16px;
}

.status-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12.5px;
}

.status-value {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.status-value--ready {
  color: #7ee2b3;
}

.status-value--preview {
  color: #f2c07b;
}

.status-value--next {
  color: rgba(255, 255, 255, 0.4);
}

.panel-footer {
  position: relative;
  display: flex;
  margin-top: 12px;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 10.5px;
}

.panel-footer-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fb7299;
}

.floating-chip {
  position: absolute;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 24px rgba(57, 48, 63, 0.12);
  color: #696470;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.01em;
  backdrop-filter: blur(12px);
}

.floating-chip--vue {
  top: 34px;
  left: -18px;
}

.floating-chip--neutralino {
  right: -15px;
  bottom: 38px;
}

.app-footer {
  display: flex;
  padding: 17px 30px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid rgba(46, 42, 54, 0.08);
  color: #9b96a0;
  font-size: 10.5px;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tech-stack span {
  color: #77727d;
}

.tech-stack i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #c9c4cc;
}

.footer-note {
  white-space: nowrap;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .home-shell {
    padding: 12px;
  }

  .app-window {
    min-height: calc(100svh - 24px);
    border-radius: 20px;
  }

  .app-header,
  .app-footer {
    padding-right: 22px;
    padding-left: 22px;
  }

  .hero {
    padding: 42px 26px;
    grid-template-columns: 1fr;
  }

  .hero-panel {
    min-height: 340px;
  }

  .floating-chip--vue {
    left: 14px;
  }

  .floating-chip--neutralino {
    right: 14px;
  }
}

@media (max-width: 620px) {
  .app-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .header-meta {
    width: 100%;
    justify-content: space-between;
  }

  .brand-subtitle,
  .footer-note {
    display: none;
  }

  h1 {
    font-size: 44px;
  }

  .lead {
    font-size: 14px;
  }

  .app-footer {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-copy,
  .hero-visual {
    animation: none;
  }
}
</style>
