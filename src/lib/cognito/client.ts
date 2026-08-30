import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
  type ISignUpResult,
} from "amazon-cognito-identity-js";

export type FocusListUser = {
  id: string;
  email?: string;
};

export const AUTH_CHANGED_EVENT = "focus-list-auth-changed";

let userPool: CognitoUserPool | null | undefined;

export function getCognitoUserPool(): CognitoUserPool | null {
  if (userPool !== undefined) return userPool;

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim();
  const clientId = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID?.trim();
  userPool = userPoolId && clientId
    ? new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId })
    : null;
  return userPool;
}

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getCurrentSession(): Promise<CognitoUserSession | null> {
  const user = getCognitoUserPool()?.getCurrentUser();
  if (!user) return Promise.resolve(null);

  return new Promise((resolve) => {
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      resolve(error || !session?.isValid() ? null : session);
    });
  });
}

export async function getCurrentUser(): Promise<FocusListUser | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const claims = session.getIdToken().decodePayload() as Record<string, unknown>;
  return {
    id: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}

export async function getCognitoIdToken(): Promise<string> {
  const session = await getCurrentSession();
  if (!session) throw new Error("A valid login session is required");
  return session.getIdToken().getJwtToken();
}

export function signUp(email: string, password: string): Promise<ISignUpResult> {
  const pool = getCognitoUserPool();
  if (!pool) return Promise.reject(new Error("Cognito authentication is not configured"));

  return new Promise((resolve, reject) => {
    const attributes = [new CognitoUserAttribute({ Name: "email", Value: email })];
    pool.signUp(email, password, attributes, [], (error, result) => {
      if (error || !result) reject(error ?? new Error("Unable to create account"));
      else resolve(result);
    });
  });
}

function cognitoUser(email: string): CognitoUser {
  const pool = getCognitoUserPool();
  if (!pool) throw new Error("Cognito authentication is not configured");
  return new CognitoUser({ Username: email, Pool: pool });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).confirmRegistration(code, true, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).resendConfirmationCode((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = cognitoUser(email);
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: () => resolve(),
        onFailure: reject,
        newPasswordRequired: () => reject(new Error("A new password is required")),
      },
    );
  });
}

export function signOut(): void {
  getCognitoUserPool()?.getCurrentUser()?.signOut();
  notifyAuthChanged();
}
