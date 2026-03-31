// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'All In One Downloader - Unduh Video dari YouTube, Instagram, Facebook, TikTok',
      meta: [
        { name: 'description', content: 'Unduh video dari berbagai platform seperti YouTube, Instagram, Facebook, dan TikTok dengan mudah menggunakan All In One Downloader.' },
        { name: 'keywords', content: 'video downloader, YouTube downloader, Instagram downloader, Facebook downloader, TikTok downloader, unduh video' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/icon', '@nuxtjs/tailwindcss'],
  runtimeConfig: {
    apiKey: process.env.API_KEY,
    baseUrl: process.env.BASE_URL || 'https://mono.fdvky.me/api/v1'
  }
})