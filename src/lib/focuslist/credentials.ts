import { readFileSync } from "node:fs";
import path from "node:path";

export type Credentials = { username: string; password: string };

function credentialPath() {
  const dataDirectory = process.env.FOCUS_LIST_DATA_DIR ?? path.join(process.cwd(), "data");
  return process.env.FOCUS_LIST_CREDENTIAL_PATH ?? path.join(dataDirectory, "no-credentials", "credential.csv");
}

export function readCredentials(): Credentials | null {
  try {
    const [header, row] = readFileSync(/* turbopackIgnore: true */ credentialPath(), "utf8")
      .trim()
      .split(/\r?\n/, 2);
    if (header !== "username,password" || !row) return null;
    const comma = row.indexOf(",");
    if (comma < 1) return null;
    const username = row.slice(0, comma).trim();
    const password = row.slice(comma + 1).trim();
    return username && password ? { username, password } : null;
  } catch {
    return null;
  }
}

export function credentialsMatch(username: string, password: string): boolean {
  const credentials = readCredentials();
  return credentials?.username === username && credentials.password === password;
}
