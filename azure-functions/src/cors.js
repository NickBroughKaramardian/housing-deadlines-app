// CORS allowlist helpers shared by all HTTP handlers.
// The request Origin is echoed back only when it is on the allowlist;
// otherwise no Access-Control-Allow-Origin header is emitted and the
// browser blocks the cross-origin response.

const DEFAULT_ALLOWED_ORIGINS = [
  'https://ccprojectmanager.web.app',
  'https://ccprojectmanager.firebaseapp.com',
  'http://localhost:3000',
];

function getAllowedOrigins() {
  const extra = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

/**
 * Build CORS response headers for a v4 HttpRequest.
 * Safe to call with a missing/absent Origin header (same-origin or server-to-server calls).
 */
function corsHeaders(request) {
  const origin =
    request && request.headers && typeof request.headers.get === 'function'
      ? request.headers.get('origin')
      : null;

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (origin && getAllowedOrigins().has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/**
 * Response for a CORS preflight OPTIONS request. Must NOT require auth.
 */
function preflightResponse(request) {
  return {
    status: 204,
    headers: { ...corsHeaders(request), 'Access-Control-Max-Age': '86400' },
  };
}

module.exports = { corsHeaders, preflightResponse, getAllowedOrigins };
