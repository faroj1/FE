/**
 * Extract a user-facing error message from an API response.
 * Handles Laravel-style 422 validation errors and generic failures.
 *
 * @param {{ ok: boolean, status: number, data: any }} res  — response from safeFetch
 * @param {string} fallbackAction — e.g. "Login" or "Registrasi", used in the fallback message
 * @returns {string}
 */
export default function extractApiError(res, fallbackAction) {
  if (res.status === 422 && res.data?.errors) {
    const messages = Object.values(res.data.errors).flat().join(' ')
    return messages || res.data?.message || 'Validasi gagal'
  }
  return res.data?.message || `${fallbackAction} gagal (status ${res.status})`
}
