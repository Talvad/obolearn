/**
 * Cognito auth helpers — runs only on the client side.
 *
 * Uses amazon-cognito-identity-js which handles SRP auth flow,
 * token refresh, and secure local storage.
 *
 * The userPool is lazily initialised to avoid module-eval failures
 * during Next.js build-time prerendering when env vars aren't present.
 */
"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

let _userPool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool {
  if (!_userPool) {
    _userPool = new CognitoUserPool({
      UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    });
  }
  return _userPool;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  session?: CognitoUserSession;
}

/** Sign up a new user. */
export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  return new Promise((resolve) => {
    const attributes: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    if (name) {
      attributes.push(new CognitoUserAttribute({ Name: "name", Value: name }));
    }

    getPool().signUp(email, password, attributes, [], (err) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}

/** Confirm signup with the verification code sent to email. */
export async function confirmSignUp(
  email: string,
  code: string,
): Promise<AuthResult> {
  return new Promise((resolve) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmRegistration(code, true, (err) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}

/** Sign in and return the session tokens. */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  return new Promise((resolve) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({ success: true, session });
      },
      onFailure: (err) => {
        resolve({ success: false, error: err.message });
      },
      newPasswordRequired: () => {
        resolve({ success: false, error: "New password required" });
      },
    });
  });
}

/** Sign out the current user. */
export function signOut(): void {
  const user = getPool().getCurrentUser();
  if (user) user.signOut();
}

/** Get the current session (refreshes tokens if needed). Returns null if not signed in. */
export async function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = getPool().getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session);
    });
  });
}

/** Get the current user's ID token JWT string. */
export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.getIdToken().getJwtToken() ?? null;
}

/** Resend the confirmation code. */
export async function resendConfirmationCode(
  email: string,
): Promise<AuthResult> {
  return new Promise((resolve) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.resendConfirmationCode((err) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true });
    });
  });
}

/** Initiate forgot-password flow. */
export async function forgotPassword(email: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.forgotPassword({
      onSuccess: () => resolve({ success: true }),
      onFailure: (err) => resolve({ success: false, error: err.message }),
    });
  });
}

/** Confirm a new password with the reset code. */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<AuthResult> {
  return new Promise((resolve) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve({ success: true }),
      onFailure: (err) => resolve({ success: false, error: err.message }),
    });
  });
}
