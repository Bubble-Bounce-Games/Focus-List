import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME;
const sessionDays = 30;
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function cleanUsername(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function hashPassword(password, salt) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function sameText(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function getUser(username) {
  const result = await db.send(new GetItemCommand({
    TableName: tableName,
    Key: { pk: { S: `USER#${username}` }, sk: { S: "PROFILE" } },
  }));
  return result.Item;
}

async function createSession(username) {
  const token = randomBytes(32).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  await db.send(new PutItemCommand({
    TableName: tableName,
    Item: {
      pk: { S: `SESSION#${token}` },
      sk: { S: "SESSION" },
      username: { S: username },
      expiresAt: { N: String(now + sessionDays * 24 * 60 * 60) },
    },
  }));
  return { username, token };
}

async function requireSession(event) {
  const header = event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sign in first.");
  const result = await db.send(new GetItemCommand({
    TableName: tableName,
    Key: { pk: { S: `SESSION#${token}` }, sk: { S: "SESSION" } },
  }));
  const item = result.Item;
  const now = Math.floor(Date.now() / 1000);
  if (!item?.username?.S || Number(item.expiresAt?.N ?? 0) < now) {
    throw new Error("Session expired. Sign in again.");
  }
  return item.username.S;
}

async function signup(body) {
  const username = cleanUsername(body.username);
  const password = String(body.password ?? "");
  if (username.length < 3 || password.length < 4) {
    return json(400, { error: "Use a username and at least 4 password characters." });
  }
  const salt = randomBytes(16).toString("base64url");
  try {
    await db.send(new PutItemCommand({
      TableName: tableName,
      Item: {
        pk: { S: `USER#${username}` },
        sk: { S: "PROFILE" },
        username: { S: username },
        salt: { S: salt },
        passwordHash: { S: hashPassword(password, salt) },
        createdAt: { S: new Date().toISOString() },
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }));
  } catch {
    return json(409, { error: "That username already exists." });
  }
  return json(200, await createSession(username));
}

async function signin(body) {
  const username = cleanUsername(body.username);
  const password = String(body.password ?? "");
  const user = await getUser(username);
  if (!user?.salt?.S || !user?.passwordHash?.S) {
    return json(401, { error: "Username or password is wrong." });
  }
  const candidate = hashPassword(password, user.salt.S);
  if (!sameText(candidate, user.passwordHash.S)) {
    return json(401, { error: "Username or password is wrong." });
  }
  return json(200, await createSession(username));
}

async function getState(event) {
  const username = await requireSession(event);
  const result = await db.send(new GetItemCommand({
    TableName: tableName,
    Key: { pk: { S: `STATE#${username}` }, sk: { S: "WORKSPACE" } },
  }));
  const state = result.Item?.state?.S ? JSON.parse(result.Item.state.S) : null;
  return json(200, { state });
}

async function putState(event, body) {
  const username = await requireSession(event);
  await db.send(new UpdateItemCommand({
    TableName: tableName,
    Key: { pk: { S: `STATE#${username}` }, sk: { S: "WORKSPACE" } },
    UpdateExpression: "SET #state = :state, updatedAt = :updatedAt",
    ExpressionAttributeNames: { "#state": "state" },
    ExpressionAttributeValues: {
      ":state": { S: JSON.stringify(body.state ?? null) },
      ":updatedAt": { S: new Date().toISOString() },
    },
  }));
  return json(200, { ok: true });
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, { ok: true });
  try {
    const method = event.requestContext?.http?.method;
    const path = event.rawPath ?? "/";
    const body = event.body ? JSON.parse(event.body) : {};
    if (method === "POST" && path === "/signup") return await signup(body);
    if (method === "POST" && path === "/signin") return await signin(body);
    if (method === "GET" && path === "/state") return await getState(event);
    if (method === "PUT" && path === "/state") return await putState(event, body);
    return json(404, { error: "Not found." });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Request failed." });
  }
}
