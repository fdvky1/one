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

    // Import the build-generated secret string dynamically
    // Use AES-256-GCM to encrypt the response body
    const { secretKey } = await import('../utils/secret').catch(() => {
      throw createError({ statusCode: 500, message: 'Server missing crypto key' })
    })

    const crypto = await import('node:crypto')
    const keyBuffer = Buffer.from(secretKey, 'hex')
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')

    // Return the encrypted blob alongside its IV and auth tag
    return {
      t: iv.toString('hex'),       // Token/IV
      d: encrypted,                // Encoded Data
      a: authTag                   // Auth Tag for GCM
    }
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