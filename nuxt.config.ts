// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/icon', '@nuxtjs/tailwindcss'],
  runtimeConfig: {
    apiKey: process.env.API_KEY,
    baseUrl: process.env.BASE_URL || 'https://mono.fdvky.me/api/v1'
  }
})