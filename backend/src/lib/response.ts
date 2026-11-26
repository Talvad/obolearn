/**
 * HTTP response helpers for Lambda + API Gateway HTTP API (payload format v2).
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

export function ok(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

export function created(body: unknown) {
  return ok(body, 201);
}

export function noContent() {
  return { statusCode: 204, headers: corsHeaders, body: '' };
}

export function badRequest(message: string) {
  return error(400, message);
}

export function unauthorized(message = 'Unauthorized') {
  return error(401, message);
}

export function forbidden(message = 'Forbidden') {
  return error(403, message);
}

export function notFound(message = 'Not found') {
  return error(404, message);
}

export function conflict(message = 'Conflict') {
  return error(409, message);
}

export function internalError(message = 'Internal server error') {
  return error(500, message);
}

export function error(statusCode: number, message: string) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ error: message }),
  };
}
