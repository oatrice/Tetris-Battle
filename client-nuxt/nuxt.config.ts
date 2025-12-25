import pkg from './package.json'
import { gitVersionPlugin } from './plugins/gitVersionPlugin'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'
    }
  },

  vite: {
    plugins: [gitVersionPlugin()],
    server: {
      allowedHosts: true  // Allow ngrok and other tunnels
    }
  },

  css: ['~/assets/css/global.css']
})
