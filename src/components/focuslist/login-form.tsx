"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

type LoginFormProps = {
  configured: boolean;
  onSubmit: (username: string, password: string) => Promise<void>;
};

export function LoginForm({ configured, onSubmit }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6252e8] text-white">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-foreground-strong">Focus List</h1>
            <p className="text-sm text-muted-foreground">Sign in to your saved task list.</p>
          </div>
        </div>
        {!configured ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Add a valid <code>data/no-credentials/credential.csv</code> file before signing in.
          </p>
        ) : (
          <>
            <label className="mb-4 block text-sm font-medium text-foreground-strong">
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-[#6252e8]" />
            </label>
            <label className="mb-4 block text-sm font-medium text-foreground-strong">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-[#6252e8]" />
            </label>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl bg-[#6252e8] text-white hover:bg-[#5444d6]">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </>
        )}
      </form>
    </main>
  );
}
