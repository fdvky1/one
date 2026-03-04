export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { endpoint, params } = body
  
  if (!endpoint) {
    throw createError({
      statusCode: 400,
      message: 'Endpoint is required'
    })
  }
  
  try {
    const queryString = new URLSearchParams(params).toString()
    const url = `${config.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error [${response.status}]:`, errorText)
      throw createError({
        statusCode: response.status,
        message: 'Failed to fetch data from upstream API'
      })
    }
    
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Proxy API Error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: 'Internal server error'
    })
  }
})