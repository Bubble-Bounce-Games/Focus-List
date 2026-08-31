import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
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

export function hasCurrentCognitoUser(): boolean {
  return Boolean(getCognitoUserPool()?.getCurrentUser());
}

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getCurrentSession(): Promise<CognitoUserSession | null> {
  const user = getCognitoUserPool()?.getCurrentUser();
  if (!user) return Promise.resolve(null);

  return new Promise((resolve) => {
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error || !session?.isValid()) {
        user.signOut();
        resolve(null);
        return;
      }
      resolve(session);
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

export async function createAccount(email: string, password: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Account service is not configured");

  const response = await fetch(`${baseUrl}/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({})) as {
    code?: string;
    error?: string;
  };
  if (!response.ok) {
    const error = new Error(payload.error ?? "Unable to create account") as Error & {
      code?: string;
    };
    error.code = payload.code;
    throw error;
  }
}

function cognitoUser(email: string): CognitoUser {
  const pool = getCognitoUserPool();
  if (!pool) throw new Error("Cognito authentication is not configured");
  return new CognitoUser({ Username: email, Pool: pool });
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
