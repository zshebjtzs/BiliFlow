<script setup lang="ts">
import { computed, reactive } from 'vue'
import { NButton, NInput, NSelect, NSwitch, NTag, useMessage } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import BrandMark from '../components/BrandMark.vue'
import { DEFAULT_DOWNLOAD_CONFIG } from '../types/config'
import type { CookieSource, DownloadConfig, VideoCodec, VideoQuality } from '../types/config'
import { isNeutralinoRuntime } from '../utils/neutralino'

interface ConfigOption<T extends string> {
  label: string
  value: T
}

const qualityChoices = [
  { value: 'best', label: '最佳画质' },
  { value: '1080p', label: '1080P 优先' },
  { value: '720p', label: '720P 优先' },
  { value: '480p', label: '480P 优先' },
] as const satisfies readonly ConfigOption<VideoQuality>[]

const codecChoices = [
  { value: 'auto', label: '自动选择' },
  { value: 'h264', label: 'H.264' },
  { value: 'hevc', label: 'HEVC (H.265)' },
  { value: 'av1', label: 'AV1' },
] as const satisfies readonly ConfigOption<VideoCodec>[]

const cookieChoices = [
  { value: 'none', label: '不使用 Cookie' },
  { value: 'edge', label: 'Microsoft Edge' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'firefox', label: 'Firefox' },
] as const satisfies readonly ConfigOption<CookieSource>[]

const qualityOptions: SelectOption[] = qualityChoices.map(({ label, value }) => ({ label, value }))
const codecOptions: SelectOption[] = codecChoices.map(({ label, value }) => ({ label, value }))
const cookieOptions: SelectOption[] = cookieChoices.map(({ label, value }) => ({ label, value }))

const config = reactive<DownloadConfig>({ ...DEFAULT_DOWNLOAD_CONFIG })
const message = useMessage()

const appVersion = __APP_VERSION__
const isDesktop = isNeutralinoRuntime()
const runtimeLabel = isDesktop ? 'Neutralino Desktop' : 'Browser Preview'

const qualityLabel = computed(() => findLabel(qualityChoices, config.quality))
const codecLabel = computed(() => findLabel(codecChoices, config.codec))
const cookieLabel = computed(() => findLabel(cookieChoices, config.cookieSource))

function findLabel<T extends string>(options: readonly ConfigOption<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function isOptionValue<T extends string>(
  value: string | number | null,
  options: readonly ConfigOption<T>[],
): value is T {
  return typeof value === 'string' && options.some((option) => option.value === value)
}

function updateUrl(value: string): void {
  config.url = value
}

function updateSavePath(value: string): void {
  config.savePath = value
}

function updateQuality(value: string | number | null): void {
  if (isOptionValue(value, qualityChoices)) {
    config.quality = value
  }
}

function updateCodec(value: string | number | null): void {
  if (isOptionValue(value, codecChoices)) {
    config.codec = value
  }
}

function updateCookieSource(value: string | number | null): void {
  if (isOptionValue(value, cookieChoices)) {
    config.cookieSource = value
  }
}

function updateMergeAudioVideo(value: string | number | boolean): void {
  config.mergeAudioVideo = value === true
}

function handleDownload(): void {
  message.info('下载功能尚未接入，当前页面仅用于配置预览。', { duration: 3500 })
}
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

      <section class="workspace">
        <div class="workspace-heading">
          <div>
            <p class="eyebrow">NEW DOWNLOAD</p>
            <h1>新建下载</h1>
            <p class="heading-copy">粘贴视频链接，设置好画质与保存选项。</p>
          </div>
          <span class="heading-mode">
            <span class="heading-mode-dot" />
            配置模式
          </span>
        </div>

        <div class="workspace-grid">
          <section class="config-card">
            <form class="download-form" @submit.prevent="handleDownload">
              <div class="field">
                <label class="field-label" for="video-url">
                  视频链接
                  <span class="required-badge">必填</span>
                </label>
                <NInput
                  :value="config.url"
                  size="large"
                  clearable
                  placeholder="粘贴 Bilibili 或其他 yt-dlp 支持的视频链接"
                  :input-props="{ id: 'video-url', spellcheck: false }"
                  @update:value="updateUrl"
                >
                  <template #prefix>
                    <svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M10.6 13.4a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66l-1.41 1.42m1.38 4.27a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.41-1.42"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                      />
                    </svg>
                  </template>
                </NInput>
                <p class="field-hint">输入内容会保留在当前页面中，粘贴后可直接继续设置。</p>
              </div>

              <div class="field-grid">
                <div class="field">
                  <span class="field-label">画质</span>
                  <NSelect
                    :value="config.quality"
                    :options="qualityOptions"
                    size="large"
                    aria-label="画质"
                    @update:value="updateQuality"
                  />
                </div>

                <div class="field">
                  <span class="field-label">编码</span>
                  <NSelect
                    :value="config.codec"
                    :options="codecOptions"
                    size="large"
                    aria-label="视频编码"
                    @update:value="updateCodec"
                  />
                </div>

                <div class="field">
                  <span class="field-label">Cookie 来源</span>
                  <NSelect
                    :value="config.cookieSource"
                    :options="cookieOptions"
                    size="large"
                    aria-label="Cookie 来源"
                    @update:value="updateCookieSource"
                  />
                </div>
              </div>

              <div class="field">
                <label class="field-label" for="save-path">保存目录</label>
                <NInput
                  :value="config.savePath"
                  size="large"
                  clearable
                  placeholder="手动输入本机目录，例如 D:\Videos\BiliFlow"
                  :input-props="{ id: 'save-path', spellcheck: false }"
                  @update:value="updateSavePath"
                >
                  <template #prefix>
                    <svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3.5 8.5v8.25A2.25 2.25 0 0 0 5.75 19h12.5a2.25 2.25 0 0 0 2.25-2.25V9.75A2.25 2.25 0 0 0 18.25 7.5h-5.4l-1.7-2H5.75A2.25 2.25 0 0 0 3.5 7.75v.75Z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </template>
                </NInput>
              </div>

              <div class="merge-row">
                <div class="merge-copy">
                  <span class="merge-title">音视频自动合并</span>
                  <span class="merge-description">
                    分别下载画面与声音后，合并为一个完整文件。
                  </span>
                </div>
                <NSwitch
                  :value="config.mergeAudioVideo"
                  aria-label="音视频自动合并"
                  @update:value="updateMergeAudioVideo"
                />
              </div>

              <div class="form-actions">
                <p class="action-note">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 3.8 5.25 6.7v5.05c0 4.06 2.8 7.3 6.75 8.45 3.95-1.15 6.75-4.39 6.75-8.45V6.7L12 3.8Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                    />
                    <path
                      d="m9.30 11.9 1.9 1.9 3.5-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  当前仅保存界面配置，不会发起下载
                </p>
                <NButton type="primary" size="large" attr-type="submit" class="download-button">
                  <template #icon>
                    <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </template>
                  开始下载
                </NButton>
              </div>
            </form>
          </section>

          <aside class="summary-column" aria-label="当前配置摘要">
            <section class="summary-card">
              <div class="summary-heading">
                <span class="summary-title">CONFIG SUMMARY</span>
                <span class="summary-badge">待接入</span>
              </div>

              <div class="summary-block">
                <span class="summary-label">视频链接</span>
                <p
                  class="summary-value summary-value--clamp"
                  :class="{ 'is-empty': !config.url.trim() }"
                  :title="config.url.trim() || undefined"
                >
                  {{ config.url.trim() || '尚未填写' }}
                </p>
              </div>

              <dl class="summary-list">
                <div class="summary-row">
                  <dt>画质</dt>
                  <dd>{{ qualityLabel }}</dd>
                </div>
                <div class="summary-row">
                  <dt>编码</dt>
                  <dd>{{ codecLabel }}</dd>
                </div>
                <div class="summary-row">
                  <dt>Cookie</dt>
                  <dd>{{ cookieLabel }}</dd>
                </div>
                <div class="summary-row">
                  <dt>自动合并</dt>
                  <dd :class="{ 'summary-value--muted': !config.mergeAudioVideo }">
                    {{ config.mergeAudioVideo ? '已开启' : '已关闭' }}
                  </dd>
                </div>
              </dl>

              <div class="summary-block summary-block--path">
                <span class="summary-label">保存目录</span>
                <p
                  class="summary-value summary-value--clamp"
                  :class="{ 'is-empty': !config.savePath.trim() }"
                  :title="config.savePath.trim() || undefined"
                >
                  {{ config.savePath.trim() || '尚未填写' }}
                </p>
              </div>
            </section>

            <div class="tip-card">
              <span class="tip-icon" aria-hidden="true">i</span>
              <div>
                <strong>前端配置预览</strong>
                <p>不会读取链接、调用下载器或写入磁盘。</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer class="app-footer">
        <span class="footer-state">
          <i />
          配置仅保存在当前页面会话中
        </span>
        <span>BiliFlow v{{ appVersion }}</span>
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
    radial-gradient(circle at 8% 0%, rgba(251, 114, 153, 0.19), transparent 32%),
    radial-gradient(circle at 95% 100%, rgba(124, 143, 255, 0.14), transparent 34%),
    linear-gradient(145deg, #f8f5f2 0%, #f0f2f6 100%);
}

.home-shell::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image: radial-gradient(rgba(45, 42, 52, 0.11) 0.8px, transparent 0.8px);
  background-size: 20px 20px;
  content: '';
  mask-image: linear-gradient(120deg, rgba(0, 0, 0, 0.65), transparent 58%);
}

.app-window {
  display: flex;
  width: min(1180px, 100%);
  height: calc(100svh - 44px);
  max-height: 760px;
  margin: auto;
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
  padding: 14px 28px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid rgba(46, 42, 54, 0.08);
  flex: none;
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

.workspace {
  flex: 1;
  min-height: 0;
  padding: 22px 30px 18px;
  overflow-y: auto;
  scrollbar-color: rgba(121, 113, 126, 0.28) transparent;
  scrollbar-width: thin;
}

.workspace::-webkit-scrollbar {
  width: 8px;
}

.workspace::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(121, 113, 126, 0.25);
  background-clip: content-box;
}

.workspace-heading {
  display: flex;
  margin-bottom: 14px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  display: flex;
  margin: 0 0 5px;
  align-items: center;
  gap: 8px;
  color: #938e98;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.17em;
  line-height: 1.4;
}

.eyebrow::before {
  width: 20px;
  height: 1px;
  background: #fb7299;
  content: '';
}

h1 {
  margin: 0;
  color: #232128;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.25;
}

.heading-copy {
  margin: 4px 0 0;
  color: #89848e;
  font-size: 12px;
  line-height: 1.5;
}

.heading-mode {
  display: inline-flex;
  padding: 6px 10px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(46, 42, 54, 0.09);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  color: #89838e;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.heading-mode-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fb7299;
  box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.12);
}

.workspace-grid {
  display: grid;
  align-items: start;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) 286px;
}

.config-card {
  min-width: 0;
  padding: 20px 22px;
  border: 1px solid rgba(46, 42, 54, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 16px 36px rgba(57, 48, 63, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  animation: rise-in 320ms ease-out both;
}

.download-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  min-width: 0;
}

.field-label {
  display: flex;
  margin-bottom: 6px;
  align-items: center;
  gap: 8px;
  color: #3d3844;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
}

.required-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(251, 114, 153, 0.1);
  color: #c45174;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.field-hint {
  margin: 5px 0 0;
  color: #9d97a1;
  font-size: 10.5px;
  line-height: 1.5;
}

.field-icon {
  width: 16px;
  height: 16px;
  color: #a39da8;
}

.field-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.merge-row {
  display: flex;
  padding: 10px 12px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid rgba(46, 42, 54, 0.07);
  border-radius: 12px;
  background: #fbf9fa;
}

.merge-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.merge-title {
  color: #3d3844;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
}

.merge-description {
  color: #9b95a0;
  font-size: 10.5px;
  line-height: 1.45;
}

.form-actions {
  display: flex;
  padding-top: 13px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid rgba(46, 42, 54, 0.07);
}

.action-note {
  display: flex;
  margin: 0;
  align-items: center;
  gap: 7px;
  color: #98929c;
  font-size: 10.5px;
  line-height: 1.45;
}

.action-note svg {
  width: 15px;
  height: 15px;
  flex: none;
  color: #b3adb7;
}

.download-button {
  min-width: 146px;
  flex: none;
  font-weight: 650;
}

.button-icon {
  width: 17px;
  height: 17px;
}

.summary-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
  animation: rise-in 360ms 50ms ease-out both;
}

.summary-card {
  padding: 17px 17px 16px;
  border: 1px solid rgba(46, 42, 54, 0.08);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 251, 252, 0.9));
  box-shadow:
    0 16px 36px rgba(57, 48, 63, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.summary-heading {
  display: flex;
  margin-bottom: 12px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-title {
  color: #938d98;
  font-size: 9.5px;
  font-weight: 750;
  letter-spacing: 0.14em;
}

.summary-badge {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(251, 114, 153, 0.1);
  color: #c45174;
  font-size: 9.5px;
  font-weight: 700;
}

.summary-block {
  padding: 9px 11px;
  border: 1px solid rgba(46, 42, 54, 0.07);
  border-radius: 11px;
  background: #fbf9fa;
}

.summary-block--path {
  margin-top: 10px;
}

.summary-label {
  display: block;
  color: #a29ca6;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.summary-value {
  margin: 3px 0 0;
  color: #3f3946;
  font-size: 11.5px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.summary-value--clamp {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.summary-value.is-empty {
  color: #b0aab4;
}

.summary-value--muted {
  color: #9b95a0;
}

.summary-list {
  margin: 10px 0 0;
  padding: 0;
}

.summary-row {
  display: flex;
  padding: 7px 1px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid rgba(46, 42, 54, 0.065);
}

.summary-row:first-child {
  border-top: 0;
}

.summary-row dt {
  color: #99939d;
  font-size: 10.5px;
}

.summary-row dd {
  margin: 0;
  overflow: hidden;
  color: #49434f;
  font-size: 10.5px;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tip-card {
  display: flex;
  padding: 11px 13px;
  align-items: flex-start;
  gap: 9px;
  border: 1px solid rgba(251, 114, 153, 0.16);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.06), rgba(255, 255, 255, 0.58));
}

.tip-icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(251, 114, 153, 0.12);
  color: #c45174;
  font-size: 10px;
  font-style: normal;
  font-weight: 750;
}

.tip-card strong {
  display: block;
  color: #5a5360;
  font-size: 10.5px;
  font-weight: 650;
}

.tip-card p {
  margin: 2px 0 0;
  color: #9c96a0;
  font-size: 10px;
  line-height: 1.5;
}

.app-footer {
  display: flex;
  padding: 11px 30px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid rgba(46, 42, 54, 0.08);
  color: #9b96a0;
  font-size: 10px;
  flex: none;
}

.footer-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.footer-state i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fb7299;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .summary-column {
    display: none;
  }
}

@media (max-width: 960px) {
  .heading-mode {
    display: none;
  }
}

@media (max-height: 690px) {
  .home-shell {
    padding: 12px;
  }

  .app-window {
    height: calc(100svh - 24px);
    border-radius: 20px;
  }

  .app-header {
    padding: 10px 20px;
  }

  .workspace {
    padding: 14px 20px 16px;
  }

  .workspace-heading {
    margin-bottom: 10px;
  }

  .eyebrow,
  .heading-copy,
  .heading-mode {
    display: none;
  }

  h1 {
    font-size: 22px;
  }

  .config-card {
    padding: 16px 18px;
    border-radius: 16px;
  }

  .download-form {
    gap: 11px;
  }

  .field-label {
    margin-bottom: 5px;
  }

  .field-hint {
    display: none;
  }

  .merge-row {
    padding: 8px 10px;
  }

  .merge-description {
    display: none;
  }

  .form-actions {
    padding-top: 10px;
  }

  .app-footer {
    display: none;
  }
}

@media (max-width: 720px) {
  .home-shell {
    padding: 0;
  }

  .app-window {
    width: 100%;
    height: 100svh;
    max-height: none;
    border: 0;
    border-radius: 0;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .download-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .config-card,
  .summary-column {
    animation: none;
  }
}
</style>
