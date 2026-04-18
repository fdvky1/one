export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  
  try {
    const queryString = new URLSearchParams(query as any).toString()
    const url = `${config.baseUrl}/yt/download${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey
      },
      signal: AbortSignal.timeout(60000) // Timeout 60 detik
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error [${response.status}]:`, errorText)
      throw createError({
        statusCode: response.status,
        message: 'Failed to fetch download link from upstream API'
      })
    }
    
    const data = await response.json()
    
    if (data && data.fileUrl) {
      return sendRedirect(event, data.fileUrl, 302)
    }
    
    throw createError({
      statusCode: 404,
      message: 'Download link not found in response'
    })
  } catch (error: any) {
    console.error('Proxy Download Error:', error)
    
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        message: 'Request timeout: antrean di server terlalu penuh atau lambat merespons'
      })
    }
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: 'Internal server error'
    })
  }
})
