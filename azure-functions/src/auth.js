// Entra ID (Azure AD) JWT validation + role resolution for Azure Functions v4.
//
// The frontend sends the user's Microsoft Entra ID *ID token* as
// `Authorization: Bearer <idToken>`. We validate issuer, audience, signature
// (against the tenant JWKS) and expiry before trusting any claim.

const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const db = require('./database');
const { corsHeaders } = require('./cors');

// Fallback defaults match the real tenant/SPA client IDs in src/azureConfig.js
// so the deployed app works without new app settings.
const DEFAULT_TENANT_ID = 'ef2d00a3-af23-40a6-b9cb-3f7b009b729f';
const DEFAULT_CLIENT_ID = 'd34dc476-5d84-47b9-aef5-cf7705bb1d65';

const VALID_ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'];

function getTenantId() {
  return process.env.AAD_TENANT_ID || DEFAULT_TENANT_ID;
}

function getClientId() {
  return process.env.AAD_CLIENT_ID || DEFAULT_CLIENT_ID;
}

let cachedJwksClient = null;
let cachedJwksUri = null;

function getJwksClient() {
  const jwksUri = `https://login.microsoftonline.com/${getTenantId()}/discovery/v2.0/keys`;
  if (!cachedJwksClient || cachedJwksUri !== jwksUri) {
    cachedJwksClient = jwksRsa({
      jwksUri,
      cache: true,
      cacheMaxAge: 24 * 60 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
    cachedJwksUri = jwksUri;
  }
  return cachedJwksClient;
}

class AuthError extends Error {}

/**
 * Validate a raw JWT string. Returns the verified claims or throws AuthError.
 */
async function validateToken(token) {
  if (!token || typeof token !== 'string') {
    throw new AuthError('Missing token');
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new AuthError('Malformed token');
  }

  let publicKey;
  try {
    const key = await getJwksClient().getSigningKey(decoded.header.kid);
    publicKey = key.getPublicKey();
  } catch (err) {
    throw new AuthError(`Unable to resolve signing key: ${err.message}`);
  }

  try {
    // jwt.verify checks the signature and `exp` by default.
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: `https://login.microsoftonline.com/${getTenantId()}/v2.0`,
      audience: getClientId(),
    });
  } catch (err) {
    throw new AuthError(`Token validation failed: ${err.message}`);
  }
}

/**
 * Authenticate a v4 HttpRequest. Returns { userId, email, name } from
 * validated claims, or throws AuthError.
 */
async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    throw new AuthError('Missing bearer token');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const claims = await validateToken(token);

  return {
    userId: claims.oid || claims.sub,
    email: String(claims.preferred_username || claims.email || '').toLowerCase(),
    name: claims.name || '',
  };
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve role + departments for a validated user.
 * 1. ADMIN_EMAILS env allowlist -> ADMIN
 * 2. userAssignments doc (id = lowercased email)
 * 3. Compatibility fallback: no ADMIN_EMAILS configured AND no assignments
 *    exist -> everyone is ADMIN (with a warning). Otherwise MEMBER.
 */
async function resolveUserAccess(user, context) {
  const adminEmails = getAdminEmails();
  if (user.email && adminEmails.includes(user.email)) {
    return { role: 'ADMIN', departments: [] };
  }

  const assignment = user.email ? await db.getUserAssignment(user.email) : null;
  if (assignment) {
    const role = VALID_ROLES.includes(assignment.role) ? assignment.role : 'MEMBER';
    return { role, departments: Array.isArray(assignment.departments) ? assignment.departments : [] };
  }

  if (adminEmails.length === 0 && (await db.userAssignmentsIsEmpty())) {
    const warning =
      'no admin configured; defaulting all users to ADMIN — set ADMIN_EMAILS or create assignments';
    if (context && typeof context.warn === 'function') context.warn(warning);
    else console.warn(warning);
    return { role: 'ADMIN', departments: [] };
  }

  return { role: 'MEMBER', departments: [] };
}

/**
 * Wrap a v4 handler with authentication (and role gating).
 * The wrapped handler is invoked as handler(request, context, user) where
 * user = { userId, email, name, role, departments }.
 *
 * Options:
 *   adminOnly: true  -> 403 unless role === 'ADMIN'
 *
 * VIEWER role is always restricted to GET requests (403 on mutations).
 */
function requireAuth(handler, options = {}) {
  return async (request, context) => {
    let user;
    try {
      user = await authenticateRequest(request);
    } catch (err) {
      if (context && typeof context.log === 'function') {
        context.log(`Authentication failed: ${err.message}`);
      }
      return {
        status: 401,
        headers: corsHeaders(request),
        jsonBody: { error: 'Unauthorized' },
      };
    }

    try {
      const access = await resolveUserAccess(user, context);
      user.role = access.role;
      user.departments = access.departments;
    } catch (err) {
      if (context && typeof context.error === 'function') {
        context.error('Role resolution failed:', err);
      }
      return {
        status: 500,
        headers: corsHeaders(request),
        jsonBody: { error: 'Internal server error', correlationId: context && context.invocationId },
      };
    }

    if (options.adminOnly && user.role !== 'ADMIN') {
      return {
        status: 403,
        headers: corsHeaders(request),
        jsonBody: { error: 'Forbidden: admin role required' },
      };
    }

    if (user.role === 'VIEWER' && request.method !== 'GET') {
      return {
        status: 403,
        headers: corsHeaders(request),
        jsonBody: { error: 'Forbidden: viewers have read-only access' },
      };
    }

    return handler(request, context, user);
  };
}

module.exports = {
  authenticateRequest,
  validateToken,
  resolveUserAccess,
  requireAuth,
  AuthError,
  VALID_ROLES,
};
