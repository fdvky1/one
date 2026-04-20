<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const url = ref('')
const loading = ref(false)
const result = ref<any>(null)
const toast = ref({ show: false, message: '', type: 'error' })

// Theme
const isDark = ref(true)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
})

const platforms = [
  { id: 'youtube', name: 'YouTube', icon: 'mdi:youtube', accent: '#ff4444', regex: /(?:youtube\.com|youtu\.be)/i, endpoint: '/yt/query' },
  { id: 'instagram', name: 'Instagram', icon: 'mdi:instagram', accent: '#e1306c', regex: /instagram\.com/i, endpoint: '/ig' },
  { id: 'facebook', name: 'Facebook', icon: 'mdi:facebook', accent: '#4267b2', regex: /facebook\.com|fb\.watch/i, endpoint: '/fb' },
  { id: 'tiktok', name: 'TikTok', icon: 'mdi:music-note', accent: '#fe2c55', regex: /tiktok\.com/i, endpoint: '/tiktok' }
]

const isUrlValid = computed(() => url.value.trim().length > 0)

const showToast = (message: string, type: 'success' | 'error' = 'error') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

const detectPlatform = (inputUrl: string) => {
  for (const platform of platforms) {
    if (platform.regex.test(inputUrl)) {
      return platform
    }
  }
  return null
}

const callApi = async (endpoint: string, inputUrl: string) => {
  loading.value = true
  result.value = null
  
  try {
    const response: any = await $fetch('/api/proxy', {
      method: 'POST',
      body: {
        endpoint,
        params: { url: inputUrl }
      }
    })
    
    if (response.raw) {
      // Direct unencrypted response in development mode
      result.value = response.raw
    } else {
      // Initialize WASM file from fingerprinted URL (from utils/wasmConfig.ts)
      const { WASM_JS_URL, WASM_FILE_URL } = await import('~/utils/wasmConfig')
      const wasm: any = await import(/* @vite-ignore */ WASM_JS_URL)
      const init = wasm.default || wasm
      
      // Initialize wasm instance
      await init(WASM_FILE_URL)
      
      // Server returns { d: encryptedData, t: iv, a: authTag }
      // Let's decrypt these parameters using WASM
      const decryptedString = wasm.decrypt(response.d, response.t, response.a)
      
      // Parse back into JSON and set to state
      result.value = JSON.parse(decryptedString)
    }
    
    showToast('Tautan berhasil diproses! Siap untuk diunduh.', 'success')
  } catch (error: any) {
    showToast(error.data?.message || 'Gagal memproses tautan, silakan coba lagi.')
    console.error('API Error:', error)
  } finally {
    loading.value = false
  }
}

const handleGo = async () => {
  if (!isUrlValid.value) return
  
  const platform = detectPlatform(url.value)
  if (!platform) {
    showToast('Tautan tidak didukung, silakan periksa kembali.')
    return
  }
  
  router.push({ path: `/${platform.id}`, query: { url: url.value } })
  await callApi(platform.endpoint, url.value)
}

const handlePlatformClick = async (platform: any) => {
  if (!isUrlValid.value) return
  
  if (!platform.regex.test(url.value)) {
    showToast(`Pastikan tautan yang dimasukkan dari ${platform.name}.`)
    return
  }
  
  router.push({ path: `/${platform.id}`, query: { url: url.value } })
  await callApi(platform.endpoint, url.value)
}

onMounted(async () => {
  if (route.query.url) {
    url.value = route.query.url as string
    
    const pathId = route.path.replace('/', '')
    const platform = platforms.find(p => p.id === pathId)
    
    if (platform) {
      await callApi(platform.endpoint, url.value)
    } else {
      const detected = detectPlatform(url.value)
      if (detected) {
        router.replace({ path: `/${detected.id}`, query: { url: url.value } })
        await callApi(detected.endpoint, url.value)
      }
    }
  }
})

const getDownloadLinks = computed(() => {
  if (!result.value) return []
  
  const links: Array<{ label: string; url: string; type: 'video' | 'audio' | 'image' | 'link' }> = []
  
  // YouTube
  if (result.value.videoFormats) {
    result.value.videoFormats.forEach((format: any, index: number) => {
      let proxyUrl = format.url
      try {
        const u = new URL(format.url)
        proxyUrl = '/api/yt-download' + u.search
      } catch(e) {}
      links.push({
        label: `Video ${format.resolution || format.formatId} (${format.ext})`,
        url: proxyUrl,
        type: 'link'
      })
    })
  }
  if (result.value.audioFormats) {
    result.value.audioFormats.forEach((format: any, index: number) => {
      let proxyUrl = format.url
      try {
        const u = new URL(format.url)
        proxyUrl = '/api/yt-download' + u.search
      } catch(e) {}
      links.push({
        label: `Audio ${format.formatId} (${format.ext})`,
        url: proxyUrl,
        type: 'link'
      })
    })
  }
  
  // Facebook
  if (result.value.hd || result.value.sd) {
    if (result.value.hd) links.push({ label: 'HD', url: result.value.hd, type: 'video' })
    if (result.value.sd) links.push({ label: 'SD', url: result.value.sd, type: 'video' })
  }
  
  // Instagram
  if (result.value.images) {
    result.value.images.forEach((img: string, index: number) => {
      links.push({ label: `Image ${index + 1}`, url: img, type: 'image' })
    })
  }
  if (result.value.videos) {
    result.value.videos.forEach((video: any, index: number) => {
      links.push({ label: `Video ${index + 1}`, url: video.src, type: 'video' })
    })
  }
  
  // TikTok
  if (result.value.video_url) {
    if (Array.isArray(result.value.video_url)) {
      result.value.video_url.forEach((url: string, index: number) => {
        links.push({ label: `Video ${index + 1}`, url, type: 'video' })
      })
    } else {
      links.push({ label: 'Video', url: result.value.video_url, type: 'video' })
    }
  }
  if (result.value.image_url && Array.isArray(result.value.image_url)) {
    result.value.image_url.forEach((url: string, index: number) => {
      links.push({ label: `Image ${index + 1}`, url, type: 'image' })
    })
  }
  
  return links
})

/*
const downloadAll = async () => {
  const links = getDownloadLinks.value
  if (links.length === 0) return
  
  showToast(`Starting download of ${links.length} files...`, 'success')
  
  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (!link) continue
    
    try {
      // Fetch the file
      const response = await fetch(link.url)
      const blob = await response.blob()
      
      // Create download link
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${link.label}.${link.type === 'video' ? 'mp4' : link.type === 'audio' ? 'mp3' : link.type === 'image' ? 'jpg' : 'file'}`
      a.click()
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      
      // Delay between downloads to avoid browser blocking
      if (i < links.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`Failed to download ${link.label}:`, error)
    }
  }
}
*/
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 px-4 lg:p-10 max-sm:items-start max-sm:pt-14">
    <div class="w-full max-w-2xl lg:max-w-3xl">
      <!-- Header -->
      <header class="mb-12 max-sm:mb-8">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <Icon name="mdi:arrow-down-circle" class="text-[32px] lg:text-[36px] text-txt" />
            <span class="font-mono text-2xl lg:text-[28px] font-medium tracking-tight text-txt">one</span>
          </div>
          <button
            class="w-10 h-10 flex items-center justify-center bg-transparent border border-border rounded-full cursor-pointer transition-colors duration-200 text-txt-2 hover:border-border-hover hover:text-txt"
            @click="toggleTheme"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Icon :name="isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'" class="text-xl" />
          </button>
        </div>
        <p class="text-base lg:text-lg text-txt-2 pl-[44px] lg:pl-[48px]">Paste a link. Get the file.</p>
      </header>
      
      <!-- Input -->
      <div class="flex gap-1 md:gap-3 mb-5">
        <input
          v-model="url"
          type="text"
          placeholder="https://..."
          class="url-input"
          @keyup.enter="handleGo"
        />
        <button
          @click="handleGo"
          :disabled="!isUrlValid || loading"
          class="w-14 h-14 flex items-center justify-center bg-btn-bg rounded-xl border-none cursor-pointer transition-all duration-150 shrink-0 hover:not-disabled:opacity-85 active:not-disabled:scale-95 disabled:bg-surface-2 disabled:cursor-not-allowed"
        >
          <Icon v-if="loading" name="mdi:loading" class="text-2xl text-btn-fg animate-spin" />
          <Icon v-else name="mdi:arrow-right" class="text-2xl text-btn-fg" />
        </button>
      </div>
      
      <!-- Platforms -->
      <div class="flex gap-2.5 flex-wrap mb-8 max-sm:gap-2">
        <button
          v-for="platform in platforms"
          :key="platform.id"
          @click="handlePlatformClick(platform)"
          :disabled="!isUrlValid || loading"
          class="platform-chip"
          :style="{ '--accent': platform.accent }"
        >
          <Icon :name="platform.icon" class="text-lg" />
          <span>{{ platform.name }}</span>
        </button>
      </div>
      
      <!-- Results -->
      <div v-if="result" class="border-t border-border pt-7 mt-3">
        <div class="flex items-center justify-between mb-5">
          <span class="text-sm font-semibold uppercase tracking-wider text-txt-2">Results</span>
          <span v-if="getDownloadLinks.length" class="font-mono text-sm text-txt-3">
            {{ getDownloadLinks.length }} file{{ getDownloadLinks.length > 1 ? 's' : '' }}
          </span>
        </div>
        
        <!-- Metadata -->
        <div v-if="result.title || result.description || result.thumbnail" class="bg-surface border border-border rounded-xl overflow-hidden mb-5">
          <img 
            v-if="result.thumbnail" 
            :src="result.thumbnail" 
            :alt="result.title || 'Thumbnail'" 
            class="w-full aspect-video object-cover block"
          />
          <div class="p-4 lg:p-5">
            <h4 v-if="result.title" class="text-base font-semibold text-txt mb-1.5 leading-snug">{{ result.title }}</h4>
            <p v-if="result.description" class="text-sm text-txt-2 leading-relaxed line-clamp-2">{{ result.description }}</p>
            <p v-if="result.username" class="font-mono text-sm text-txt-3 mt-2">@{{ result.username }}</p>
          </div>
        </div>
        
        <!-- Download Links -->
        <div v-if="getDownloadLinks.length > 0" class="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          <div
            v-for="(link, index) in getDownloadLinks"
            :key="index"
            class="bg-surface border border-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-border-hover"
          >
            <!-- Video Preview -->
            <video
              v-if="link.type === 'video'"
              :src="link.url"
              controls
              class="w-full aspect-video bg-black block"
              preload="metadata"
            />
            
            <!-- Image Preview -->
            <img
              v-else-if="link.type === 'image'"
              :src="link.url"
              :alt="link.label"
              class="w-full object-contain bg-black max-h-96"
            />
            
            <!-- Audio Preview -->
            <div v-else-if="link.type === 'audio'" class="p-5 bg-surface-2">
              <audio
                :src="link.url"
                controls
                class="w-full"
                preload="metadata"
              />
            </div>
            
            <!-- Download Button -->
            <a
              :href="link.url"
              target="_blank"
              download
              class="flex items-center justify-between py-3.5 px-5 text-txt no-underline transition-colors duration-150 hover:bg-surface-2"
            >
              <span class="text-sm font-medium break-all mr-3">{{ link.label }}</span>
              <Icon name="mdi:download" class="text-xl text-txt-2 shrink-0" />
            </a>
          </div>
        </div>
        
        <!-- Raw Data (fallback) -->
        <div v-else class="bg-surface border border-border rounded-xl p-5">
          <pre class="font-mono text-xs text-txt-2 overflow-auto whitespace-pre-wrap break-all">{{ JSON.stringify(result, null, 2) }}</pre>
        </div>
      </div>
      
    </div>
    
    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-6 right-6 py-3.5 px-5 rounded-xl text-sm font-medium flex items-center gap-2.5 max-w-[calc(100vw-48px)] z-50 max-sm:bottom-4 max-sm:right-4 max-sm:left-4 max-sm:max-w-none',
          toast.type === 'success'
            ? 'bg-th-green/12 border border-th-green/25 text-th-green'
            : 'bg-th-red/12 border border-th-red/25 text-th-red'
        ]"
      >
        <Icon
          :name="toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'"
          class="text-xl shrink-0"
        />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
  <!-- Footer -->
  <footer class="text-center mt-12 mb-6 text-sm text-txt-3 flex flex-col items-center gap-2">
    <div class="flex items-center gap-2">
      <span>YouTube · Instagram · Facebook · TikTok</span>
    </div>
    <div class="flex items-center gap-2">
      <a href="https://mono.fdvky.me" target="_blank" class="font-mono text-txt-2 no-underline transition-colors duration-200 hover:text-txt">mono</a>
      <span class="text-txt-3">·</span>
      <a href="https://github.com/fdvky1/one" target="_blank" class="font-mono text-txt-2 no-underline transition-colors duration-200 hover:text-txt inline-flex items-center gap-1">
        <Icon name="mdi:github" class="text-base" />github
      </a>
    </div>
  </footer>
</template>

<style scoped>
/* Only styles that can't be expressed with Tailwind utilities */
.url-input {
  flex: 1;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 16px;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
  transition: border-color 0.2s;
}

.url-input::placeholder {
  color: var(--text-3);
}

.url-input:focus {
  border-color: var(--border-hover);
}

.platform-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.platform-chip:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.platform-chip:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .url-input {
    padding: 12px 14px;
    font-size: 14px;
  }
  
  .platform-chip {
    padding: 8px 14px;
    font-size: 13px;
  }
}
</style>
