import { execSync } from 'child_process'

// Get git info at build time
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const commitDate = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim()
    return { commitHash, commitDate }
  } catch {
    return { commitHash: 'dev', commitDate: new Date().toISOString() }
  }
}

const gitInfo = getGitInfo()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      appVersion: '3.0.0',
      commitHash: gitInfo.commitHash,
      commitDate: gitInfo.commitDate
    }
  }
})
