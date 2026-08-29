"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, UserRound } from "lucide-react";
import type { AuthError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const faviconPath = `${basePath}/Favicon.png`;

function getEmailRedirectUrl() {
  return `${window.location.origin}${basePath}/login`;
}

function getAuthErrorMessage(error: AuthError) {
  if (error.code === "email_not_confirmed") {
    return "Check your email and confirm your account before signing in.";
  }
  if (error.code === "invalid_credentials") {
    return "That email and password do not match.";
  }
  if (error.code === "user_already_exists") {
    return "An account with this email already exists. Sign in instead.";
  }

  const text = error.message.toLowerCase();
  if (text.includes("email not confirmed")) {
    return "Check your email and confirm your account before signing in.";
  }
  if (text.includes("invalid login credentials")) {
    return "That email and password do not match.";
  }
  if (text.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }

  return error.message;
}

export function AuthPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const formValid = emailValid && passwordValid;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!supabase) {
      setMessageType("error");
      setMessage("This deployment is missing the Supabase connection settings.");
      return;
    }
    if (!emailValid || !passwordValid) return;
    setBusy(true); setMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getEmailRedirectUrl() } });
      if (result.error) {
        setMessageType("error");
        setMessage(getAuthErrorMessage(result.error));
      } else if (mode === "signup" && !result.data.session) {
        setMessageType("success");
        setMessage("Check your email and confirm your account before signing in.");
        setMode("login");
      } else {
        router.push("/");
      }
    } catch { setMessageType("error"); setMessage("Unable to reach the service. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-form-surface w-full max-w-[440px]">
        <div className="auth-form-wrap rounded-xl">
          {/* Brand */}
          <div className="mb-10 flex items-center gap-3 text-title-large font-semibold text-on-surface">
            <img src={faviconPath} alt="" className="h-9 w-9 object-contain" />
            Focus List
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="mb-4 text-label-small font-semibold uppercase tracking-[0.16em] text-primary">
              Focus List workspace
            </p>
            <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-primary-container text-on-primary-container">
              <UserRound className="h-5 w-5" />
            </div>
            <h1 className="text-headline-small font-semibold text-on-surface">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-body-medium text-on-surface-variant">
              {mode === "login" ? "Pick up where your best work begins." : "Build a calmer way to organize your day."}
            </p>
          </div>

          <form onSubmit={submit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                required
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                aria-invalid={touched.email && !emailValid}
              />
              {touched.email && !emailValid && (
                <p className="text-label-medium text-error">
                  Enter a valid email address.
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <span className="relative block">
                <Input
                  id="auth-password"
                  required
                  minLength={8}
                  name="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  aria-invalid={touched.password && !passwordValid}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-md text-on-surface-variant transition-[background-color,color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              <p className={`text-label-medium ${touched.password && !passwordValid ? "text-error" : "text-on-surface-variant"}`}>
                Use 8+ characters with at least one letter and one number.
              </p>
            </div>

            {/* Status message */}
            {message && (
              <p
                className={`text-body-medium ${messageType === "success" ? "text-success" : "text-destructive"}`}
                role={messageType === "error" ? "alert" : "status"}
              >
                {message}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={busy || !formValid}
              className="h-12 w-full gap-2"
            >
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Toggle */}
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
              setMessageType("error");
            }}
            className="mt-6 h-auto px-3 py-1 text-body-medium text-primary hover:underline"
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Button>

          {/* Footer reassurance */}
          <p className="mt-10 flex gap-2 border-t border-outline-variant pt-5 text-label-medium leading-5 text-on-surface-variant">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            Your focused workspace is ready whenever you are.
          </p>
        </div>
      </section>
    </main>
  );
}
