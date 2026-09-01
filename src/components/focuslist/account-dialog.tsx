"use client";

import { useState, type FormEvent } from "react";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInAccount,
  signOutAccount,
  signUpAccount,
  type AccountSnapshot,
} from "@/lib/focuslist/browser-state";

type AccountDialogProps = {
  open: boolean;
  reason?: string | null;
  account: AccountSnapshot;
  onOpenChange: (open: boolean) => void;
};

export function AccountDialog({
  open,
  reason,
  account,
  onOpenChange,
}: AccountDialogProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || password.length < 4) {
      setError("Use a username and at least 4 password characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signUpAccount(cleanUsername, password);
      } else {
        await signInAccount(cleanUsername, password);
      }
      setPassword("");
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {account.status === "signed-in" ? "Account" : "Sign in to save"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {account.status === "signed-in"
              ? "Your dashboard is saving to your account."
              : reason ?? "Create an account or sign in to save tasks across devices."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {account.status === "signed-in" ? (
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="text-label-medium uppercase tracking-[0.08em] text-on-surface-variant">
              Signed in as
            </p>
            <p className="mt-1 text-title-medium text-on-surface">{account.username}</p>
            <p className="mt-2 text-body-small text-on-surface-variant">
              Sync: {account.syncStatus}
            </p>
            {account.message && (
              <p className="mt-2 text-body-small text-error">{account.message}</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`h-9 rounded-md text-label-large transition-[background-color,color] ${
                  mode === "signin"
                    ? "bg-primary text-primary-foreground"
                    : "text-on-surface-variant hover:bg-on-surface/[0.08]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`h-9 rounded-md text-label-large transition-[background-color,color] ${
                  mode === "signup"
                    ? "bg-primary text-primary-foreground"
                    : "text-on-surface-variant hover:bg-on-surface/[0.08]"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-username">Username</Label>
                <Input
                  id="account-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="your-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-password">Password</Label>
                <Input
                  id="account-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="At least 4 characters"
                />
              </div>
              {!account.apiConfigured && (
                <p className="rounded-md border border-error/30 bg-error-container px-3 py-2 text-body-small text-on-error-container">
                  Cloud account storage is not connected yet.
                </p>
              )}
              {error && (
                <p className="rounded-md border border-error/30 bg-error-container px-3 py-2 text-body-small text-on-error-container">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy || !account.apiConfigured}
                className="w-full gap-2"
              >
                {mode === "signup" ? (
                  <UserPlus className="size-4" />
                ) : (
                  <LogIn className="size-4" />
                )}
                {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </>
        )}

        <AlertDialogFooter>
          {account.status === "signed-in" && (
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              onClick={() => {
                signOutAccount();
                onOpenChange(false);
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          )}
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
