import { NextRequest, NextResponse } from "next/server";

import { credentialsMatch, readCredentials } from "@/lib/focuslist/credentials";
import {
  createProject,
  createSession,
  createTask,
  deleteTask,
  duplicateTask,
  isSessionValid,
  readSnapshot,
  setTaskDetail,
  updateTask,
} from "@/lib/focuslist/server-db";
import { DETAIL_FIELDS, type DetailField, type Task } from "@/lib/focuslist/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "focuslist_session";

function authenticated(request: NextRequest) {
  return isSessionValid(request.cookies.get(SESSION_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Sign in to access Focus List." }, { status: 401 });
}

function badRequest(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Invalid request." },
    { status: 400 }
  );
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("auth")) {
    return NextResponse.json({
      authenticated: authenticated(request),
      configured: readCredentials() !== null,
    });
  }
  if (!authenticated(request)) return unauthorized();
  return NextResponse.json(readSnapshot());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest(new Error("Request body must be JSON."));
  }

  if (body.action === "login") {
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!credentialsMatch(username, password)) {
      return NextResponse.json(
        { error: readCredentials() ? "Incorrect username or password." : "Credential CSV is missing or invalid." },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ authenticated: true, configured: true });
    response.cookies.set(SESSION_COOKIE, createSession(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  }

  if (!authenticated(request)) return unauthorized();

  try {
    let result: unknown;
    switch (body.action) {
      case "createProject":
        result = createProject(stringValue(body.name));
        break;
      case "createTask":
        result = createTask({
          title: stringValue(body.title),
          projectId: stringValue(body.projectId),
          tagName: stringValue(body.tagName),
          progress: numberValue(body.progress),
        });
        break;
      case "updateTask":
        result = updateTask(stringValue(body.id), taskPatch(body.patch));
        break;
      case "setTaskDetail": {
        const field = stringValue(body.field);
        if (!DETAIL_FIELDS.includes(field as DetailField)) throw new Error("Invalid task detail field.");
        result = setTaskDetail(stringValue(body.id), field as DetailField, stringValue(body.value));
        break;
      }
      case "deleteTask":
        deleteTask(stringValue(body.id));
        result = null;
        break;
      case "duplicateTask":
        result = duplicateTask(stringValue(body.id));
        break;
      default:
        throw new Error("Unknown data action.");
    }
    return NextResponse.json({ result });
  } catch (error) {
    return badRequest(error);
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number.NaN;
}

function taskPatch(value: unknown): Partial<Pick<Task, "title" | "projectId" | "tagId" | "progress">> & { tagName?: string } {
  if (!value || typeof value !== "object") throw new Error("Task update is missing.");
  const patch = value as Record<string, unknown>;
  const next: Partial<Pick<Task, "title" | "projectId" | "tagId" | "progress">> & { tagName?: string } = {};
  if (typeof patch.title === "string") next.title = patch.title;
  if (typeof patch.projectId === "string") next.projectId = patch.projectId;
  if (typeof patch.tagId === "string") next.tagId = patch.tagId;
  if (typeof patch.tagName === "string") next.tagName = patch.tagName;
  if (typeof patch.progress === "number") next.progress = patch.progress;
  return next;
}
