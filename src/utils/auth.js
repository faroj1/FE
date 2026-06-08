/**
 * JWT Token Utility
 * Handles storing, reading, decoding, and validating JWT tokens.
 */

const TOKEN_KEY = 'jwt_token'
const USER_KEY = 'jwt_user'

/** Save JWT token to localStorage */
export const saveToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    console.error('[Auth] Failed to save token:', e)
  }
}

/** Get JWT token from localStorage */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (e) {
    return null
  }
}

/** Remove JWT token (and user data) from localStorage */
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch (e) {}
}

/**
 * Decode JWT payload without verification (client-side only, for reading claims).
 * Returns null if token is invalid or missing.
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payload)
  } catch (e) {
    return null
  }
}

/**
 * Check if the JWT token is expired.
 * Returns true if expired or invalid.
 */
export const isTokenExpired = (token) => {
  const payload = decodeToken(token)
  if (!payload) return true
  // `exp` is in seconds (Unix timestamp)
  if (!payload.exp) return false // no expiry set
  return Date.now() >= payload.exp * 1000
}

/**
 * Returns true if there is a valid, non-expired token.
 */
export const isAuthenticated = () => {
  const token = getToken()
  if (!token) return false
  return !isTokenExpired(token)
}

/** Save user info extracted from JWT or API response */
export const saveUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (e) {}
}

/** Get saved user info */
export const getUser = () => {
  try {
    const u = localStorage.getItem(USER_KEY)
    return u ? JSON.parse(u) : null
  } catch (e) {
    return null
  }
}

/** Returns Authorization header object with Bearer token */
export const authHeader = () => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
