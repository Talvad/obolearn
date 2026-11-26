/**
 * Auth helpers for JWT / Cognito claims.
 *
 * API Gateway HTTP API with a JWT authorizer exposes decoded claims
 * under event.requestContext.authorizer.jwt.claims
 */

import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export interface CognitoClaims {
  sub: string;       // userId
  email: string;
  'cognito:groups'?: string;
}

/** Extract the userId (sub) from the JWT claims. Throws if missing. */
export function getUserId(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): string {
  const sub = event.requestContext.authorizer.jwt.claims['sub'];
  if (!sub || typeof sub !== 'string') {
    throw new Error('Missing sub claim in JWT');
  }
  return sub;
}

/** Extract the email from the JWT claims. */
export function getEmail(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): string {
  const email = event.requestContext.authorizer.jwt.claims['email'];
  return typeof email === 'string' ? email : '';
}

/** Check whether the JWT contains the given Cognito group. */
export function hasGroup(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  group: string,
): boolean {
  const groups =
    event.requestContext.authorizer.jwt.claims['cognito:groups'];
  if (!groups) return false;
  // Cognito encodes groups as a space-separated string in JWT claims
  const list = Array.isArray(groups)
    ? (groups as string[])
    : (groups as string).replace(/^\[|\]$/g, '').split(',').map((g) => g.trim());
  return list.includes(group);
}

/** Guard: returns 403 if the caller is not in the admin group. */
export function requireAdmin(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): boolean {
  return hasGroup(event, 'admin');
}
