// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'One — Unduh Video dari YouTube, Instagram, TikTok & Facebook',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Tempel tautan, langsung unduh. Unduh video dan audio dari YouTube, Instagram, TikTok, dan Facebook — gratis, cepat, tanpa iklan.' },
        { name: 'keywords', content: 'download video, unduh video, youtube downloader, instagram downloader, tiktok downloader, facebook downloader, video downloader gratis, unduh video online' },
        { name: 'author', content: 'fdvky' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#181818' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'One — Unduh Video dari YouTube, Instagram, TikTok & Facebook' },
        { property: 'og:description', content: 'Tempel tautan, langsung unduh. Unduh video dan audio dari YouTube, Instagram, TikTok, dan Facebook — gratis, cepat, tanpa iklan.' },
        { property: 'og:image', content: 'https://one.fdvky.me/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'id_ID' },
        { property: 'og:site_name', content: 'One' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'One — Unduh Video dari YouTube, Instagram, TikTok & Facebook' },
        { name: 'twitter:description', content: 'Tempel tautan, langsung unduh. Gratis, cepat, tanpa iklan.' },
        { name: 'twitter:image', content: '/og-image.png' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap' },
        { rel: 'canonical', href: 'https://one.fdvky.me' },
      ],
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/icon'],
  runtimeConfig: {
    apiKey: process.env.API_KEY,
    baseUrl: process.env.BASE_URL || 'https://mono.fdvky.me/api/v1'
  },
  routeRules: {
    '/wasm/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/og-image.png': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})