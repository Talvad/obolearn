import {
  getUserId,
  hasGroup,
  requireAdmin,
} from './auth';
import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

function makeEvent(claims: Record<string, unknown>, groups?: string) {
  const event = {
    requestContext: {
      authorizer: {
        jwt: { claims },
      },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

  if (groups !== undefined) {
    (event.requestContext.authorizer.jwt.claims as any)['cognito:groups'] = groups;
  }
  return event;
}

describe('auth helpers', () => {
  describe('getUserId', () => {
    it('extracts sub from JWT claims', () => {
      const event = makeEvent({ sub: 'user-123', email: 'a@b.c' });
      expect(getUserId(event)).toBe('user-123');
    });

    it('throws when sub is missing', () => {
      const event = makeEvent({ email: 'a@b.c' });
      expect(() => getUserId(event)).toThrow('Missing sub claim');
    });
  });

  describe('hasGroup', () => {
    it('returns true for a group in a comma-separated string', () => {
      const event = makeEvent({ sub: 'u' }, 'admin, instructor');
      expect(hasGroup(event, 'admin')).toBe(true);
    });

    it('returns false for a group not present', () => {
      const event = makeEvent({ sub: 'u' }, 'instructor, viewer');
      expect(hasGroup(event, 'admin')).toBe(false);
    });

    it('returns false when there are no groups', () => {
      const event = makeEvent({ sub: 'u' });
      expect(hasGroup(event, 'admin')).toBe(false);
    });

    it('handles array-serialized groups', () => {
      const event = makeEvent({ sub: 'u' });
      (event.requestContext.authorizer.jwt.claims as any)['cognito:groups'] = ['admin'];
      expect(hasGroup(event, 'admin')).toBe(true);
    });
  });

  describe('requireAdmin', () => {
    it('returns true for admin group member', () => {
      const event = makeEvent({ sub: 'u' }, 'admin');
      expect(requireAdmin(event)).toBe(true);
    });

    it('returns false for non-admin', () => {
      const event = makeEvent({ sub: 'u' }, 'learner');
      expect(requireAdmin(event)).toBe(false);
    });
  });
});
