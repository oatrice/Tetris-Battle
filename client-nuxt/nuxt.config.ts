import pkg from './package.json'
import { gitVersionPlugin } from './plugins/gitVersionPlugin'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      appVersion: pkg.version
    }
  },

  vite: {
    plugins: [gitVersionPlugin()]
  },

  css: ['~/assets/css/global.css']
})
