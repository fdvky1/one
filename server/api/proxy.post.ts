import { z } from 'zod'

const allowedEndpoints = ['/fb', '/ig', '/yt/query', '/yt/download'] as const

const requestSchema = z.object({
  endpoint: z.enum(allowedEndpoints),
  params: z.record(z.string(), z.unknown()).default({})
}).strict()

const routeParamSchemas = {
  '/fb': z.object({
    url: z.string().trim().url()
  }).strict(),
  '/ig': z.object({
    url: z.string().trim().url()
  }).strict(),
  '/yt/query': z.object({
    url: z.string().trim().url()
  }).strict(),
  '/yt/download': z.object({
    type: z.enum(['video', 'audio']),
    id: z.string().trim().min(1).max(200),
    t: z.string().trim().min(1).max(100),
    q: z.string().trim().min(1).max(100),
    s: z.string().trim().min(1).max(500)
  }).strict()
} as const

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const parsedRequest = requestSchema.safeParse(body)

  if (!parsedRequest.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid proxy request'
    })
  }

  const { endpoint, params } = parsedRequest.data
  const parsedParams = routeParamSchemas[endpoint].safeParse(params)

  if (!parsedParams.success) {
    throw createError({
      statusCode: 400,
      message: 'Route or query parameters are not allowed'
    })
  }

  try {
    const queryString = new URLSearchParams(parsedParams.data).toString()
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

    // Disable encryption in development mode
    if (process.env.NODE_ENV === 'development') {
      return { raw: data }
    }

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
      t: iv.toString('hex'),
      d: encrypted,
      a: authTag
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