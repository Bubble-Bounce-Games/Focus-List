"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, UserRound } from "lucide-react";
import {
  createAccount,
  getCognitoUserPool,
  notifyAuthChanged,
  signIn,
} from "@/lib/cognito/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${basePath}/brand/focus-list-mark.png`;

function getAuthErrorMessage(error: unknown) {
  const value = error as { code?: string; name?: string; message?: string };
  const code = value.code ?? value.name ?? "";
  if (code === "UserNotConfirmedException") return "This older account is not active. Create a new account to continue.";
  if (code === "NotAuthorizedException") return "That email and password do not match.";
  if (code === "UsernameExistsException") return "An account with this email already exists. Sign in instead.";
  if (code === "LimitExceededException") return "Too many attempts. Wait a moment and try again.";
  return value.message ?? "Unable to complete authentication. Try again.";
}

export function AuthPage({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const router = useRouter();
  const configured = Boolean(getCognitoUserPool());
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
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
    if (!configured) {
      setMessageType("error");
      setMessage("This deployment is missing the Cognito connection settings.");
      return;
    }
    if (!formValid) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        await createAccount(email, password);
        await signIn(email, password);
        notifyAuthChanged();
        router.push("/");
      } else {
        await signIn(email, password);
        notifyAuthChanged();
        router.push("/");
      }
    } catch (error) {
      setMessageType("error");
      setMessage(getAuthErrorMessage(error));
    }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-form-surface w-full max-w-[440px]">
        <div className="auth-form-wrap rounded-xl">
          {/* Brand */}
          <div className="mb-10 flex items-center gap-3 text-title-large font-semibold text-on-surface">
            <img src={logoPath} alt="" className="h-9 w-9 object-contain" />
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
              {mode === "login"
                ? "Pick up where your best work begins."
                : "Create your workspace and start immediately."}
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
            {mode === "login" ? "Need an account? Sign up" : "Return to sign in"}
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
