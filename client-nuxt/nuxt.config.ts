import { execSync } from 'child_process'
import pkg from './package.json'

// Get git info at build time
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const commitDate = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim()
    // Check for uncommitted changes (dirty state)
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim()
    const isDirty = status.length > 0
    return { commitHash, commitDate, isDirty }
  } catch {
    return { commitHash: 'dev', commitDate: new Date().toISOString(), isDirty: true }
  }
}

const gitInfo = getGitInfo()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
      commitHash: gitInfo.commitHash,
      commitDate: gitInfo.commitDate,
      isDirty: gitInfo.isDirty
    }
  },

  css: ['~/assets/css/global.css']
})
