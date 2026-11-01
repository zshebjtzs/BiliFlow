import { createApp } from 'vue'
import App from './App.vue'
import { initDesktopRuntime } from './utils/neutralino'
import './style.css'

createApp(App).mount('#app')
initDesktopRuntime()
