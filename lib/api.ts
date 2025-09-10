/**
 * Safely parse JSON from a fetch response
 * Prevents "Unexpected end of JSON input" errors
 */
export async function safeJsonParse(response: Response) {
  const text = await response.text()
  
  if (!text || text.trim() === '') {
    return null
  }
  
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to parse JSON:', error)
    throw new Error('Invalid JSON response')
  }
}

/**
 * Enhanced fetch with automatic JSON parsing and error handling
 */
export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const errorData = await safeJsonParse(response)
    throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  return safeJsonParse(response)
}