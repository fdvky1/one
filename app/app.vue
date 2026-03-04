<script setup lang="ts">
const url = ref('')
const loading = ref(false)
const result = ref<any>(null)
const toast = ref({ show: false, message: '', type: 'error' })

const platforms = [
  { name: 'YouTube', icon: 'mdi:youtube', color: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-700', regex: /(?:youtube\.com|youtu\.be)/i, endpoint: '/yt/download' },
  { name: 'Instagram', icon: 'mdi:instagram', color: 'bg-pink-100 hover:bg-pink-200 text-pink-700 border-pink-700', regex: /instagram\.com/i, endpoint: '/ig' },
  { name: 'Facebook', icon: 'mdi:facebook', color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-700', regex: /facebook\.com|fb\.watch/i, endpoint: '/fb' },
  { name: 'TikTok', icon: 'mdi:music-note', color: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-800', regex: /tiktok\.com/i, endpoint: '/tiktok' }
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
    const response = await $fetch('/api/proxy', {
      method: 'POST',
      body: {
        endpoint,
        params: { url: inputUrl }
      }
    })
    
    result.value = response
    showToast('Got it! Ready to download', 'success')
  } catch (error: any) {
    showToast(error.data?.message || 'Oops, something went wrong')
    console.error('API Error:', error)
  } finally {
    loading.value = false
  }
}

const handleGo = async () => {
  if (!isUrlValid.value) return
  
  const platform = detectPlatform(url.value)
  if (!platform) {
    showToast('URL not recognized. Please select platform manually.')
    return
  }
  
  await callApi(platform.endpoint, url.value)
}

const handlePlatformClick = async (platform: any) => {
  if (!isUrlValid.value) return
  
  if (!platform.regex.test(url.value)) {
    showToast(`This doesn't look like a ${platform.name} link`)
    return
  }
  
  await callApi(platform.endpoint, url.value)
}

const getDownloadLinks = computed(() => {
  if (!result.value) return []
  
  const links: Array<{ label: string; url: string; type: 'video' | 'audio' | 'image' | 'link' }> = []
  
  // YouTube
  if (result.value.videoFormats) {
    result.value.videoFormats.forEach((format: any, index: number) => {
      links.push({
        label: `Video ${format.quality || format.formatId} (${format.ext})`,
        url: format.url,
        type: 'video'
      })
    })
  }
  if (result.value.audioFormats) {
    result.value.audioFormats.forEach((format: any, index: number) => {
      links.push({
        label: `Audio ${format.quality || format.formatId} (${format.ext})`,
        url: format.url,
        type: 'audio'
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
</script>

<template>
  <div class="min-h-screen bg-amber-50 flex items-center justify-center p-3 sm:p-4">
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-6 sm:mb-8">
        <h1 class="text-3xl sm:text-4xl font-black text-gray-900 mb-2">Downloader</h1>
        <p class="text-sm sm:text-base text-gray-700 font-medium">Save your favorite content from anywhere</p>
      </div>
      
      <!-- Main Card -->
      <div class="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6 md:p-8">
        <!-- URL Input -->
        <div class="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
          <input
            v-model="url"
            type="text"
            placeholder="Paste your link here..."
            class="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm sm:text-base text-gray-900 font-medium placeholder:text-gray-500"
            @keyup.enter="handleGo"
          />
          <button
            @click="handleGo"
            :disabled="!isUrlValid || loading"
            class="px-4 py-2.5 sm:px-6 sm:py-3 bg-gray-900 text-white rounded-lg font-bold border-2 border-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] sm:hover:translate-x-[2px] sm:hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] sm:active:translate-x-[4px] sm:active:translate-y-[4px]"
          >
            <Icon v-if="loading" name="mdi:loading" class="text-xl sm:text-2xl animate-spin" />
            <Icon v-else name="mdi:arrow-right" class="text-xl sm:text-2xl" />
          </button>
        </div>
        
        <!-- Platform Buttons -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            v-for="platform in platforms"
            :key="platform.name"
            @click="handlePlatformClick(platform)"
            :disabled="!isUrlValid || loading"
            :class="[
              platform.color,
              'p-4 sm:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 sm:gap-3 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] sm:hover:translate-x-[2px] sm:hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] sm:active:translate-x-[4px] sm:active:translate-y-[4px]'
            ]"
          >
            <Icon :name="platform.icon" class="text-4xl sm:text-5xl" />
            <span class="text-xs sm:text-sm">{{ platform.name }}</span>
          </button>
        </div>
        
        <!-- Results -->
        <div v-if="result" class="border-t-2 border-gray-900 pt-4 sm:pt-6">
          <div class="flex items-center justify-between mb-3 sm:mb-4">
            <h3 class="text-lg sm:text-xl font-black text-gray-900">📦 Results</h3>
            <button
              v-if="getDownloadLinks.length > 1"
              @click="downloadAll"
              class="px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-bold border-2 border-blue-700 transition-all shadow-[2px_2px_0px_0px_rgba(29,78,216,1)] hover:shadow-[1px_1px_0px_0px_rgba(29,78,216,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2"
            >
              <Icon name="mdi:download-multiple" class="text-lg sm:text-xl" />
              <span class="text-xs sm:text-sm">Download All ({{ getDownloadLinks.length }})</span>
            </button>
          </div>
          
          <!-- Metadata -->
          <div v-if="result.title || result.description || result.thumbnail" class="mb-3 sm:mb-4 bg-amber-50 rounded-lg border-2 border-gray-900 overflow-hidden">
            <img 
              v-if="result.thumbnail" 
              :src="result.thumbnail" 
              :alt="result.title || 'Thumbnail'" 
              class="w-full aspect-video object-cover bg-gray-900"
            />
            <div class="p-3 sm:p-4">
              <h4 v-if="result.title" class="font-bold text-sm sm:text-base text-gray-900 mb-1">{{ result.title }}</h4>
              <p v-if="result.description" class="text-xs sm:text-sm text-gray-700 line-clamp-2">{{ result.description }}</p>
              <p v-if="result.username" class="text-xs sm:text-sm text-gray-700 mt-1 font-medium">@{{ result.username }}</p>
            </div>
          </div>
          
          <!-- Download Links -->
          <div v-if="getDownloadLinks.length > 0" :class="'grid grid-cols-1 gap-3 sm:gap-4 ' + (getDownloadLinks.length > 1 ? 'md:grid-cols-2 xl:grid-cols-3' : '')">
            <div
              v-for="(link, index) in getDownloadLinks"
              :key="index"
              class="bg-green-50 rounded-lg border-2 border-green-700 overflow-hidden shadow-[2px_2px_0px_0px_rgba(21,128,61,1)] sm:shadow-[3px_3px_0px_0px_rgba(21,128,61,1)]"
            >
              <!-- Video Preview -->
              <video
                v-if="link.type === 'video'"
                :src="link.url"
                controls
                class="w-full aspect-video bg-black"
                preload="metadata"
              />
              
              <!-- Image Preview -->
              <img
                v-else-if="link.type === 'image'"
                :src="link.url"
                :alt="link.label"
                class="w-full object-contain bg-gray-900 max-h-96"
              />
              
              <!-- Audio Preview -->
              <div v-else-if="link.type === 'audio'" class="p-4 bg-gray-900">
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
                class="flex items-center justify-between p-3 sm:p-4 bg-green-100 hover:bg-green-200 transition-colors"
              >
                <span class="text-green-900 font-bold text-sm sm:text-base break-all mr-2">{{ link.label }}</span>
                <Icon name="mdi:download" class="text-xl sm:text-2xl text-green-700 flex-shrink-0" />
              </a>
            </div>
          </div>
          
          <!-- Raw Data (fallback) -->
          <div v-else class="p-3 sm:p-4 bg-gray-100 rounded-lg border-2 border-gray-900">
            <pre class="text-[10px] sm:text-xs text-gray-700 overflow-auto font-mono">{{ JSON.stringify(result, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-700 space-y-2 px-2">
        <p class="font-medium">✨ Support: YouTube • Instagram • Facebook • TikTok</p>
        <p class="font-medium">
          Powered by 
          <a 
            href="https://mono.fdvky.me" 
            target="_blank" 
            class="text-gray-900 underline decoration-2 hover:text-gray-700 transition-colors font-bold"
          >
            Mono
          </a>
        </p>
      </div>
    </div>
    
    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 py-3 sm:px-6 sm:py-4 rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-[calc(100vw-2rem)] sm:max-w-md',
          toast.type === 'success' 
            ? 'bg-green-100 text-green-900' 
            : 'bg-red-100 text-red-900'
        ]"
      >
        <div class="flex items-center gap-2 sm:gap-3">
          <Icon
            :name="toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'"
            class="text-xl sm:text-2xl font-bold flex-shrink-0"
          />
          <span class="font-bold text-sm sm:text-base">{{ toast.message }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>
