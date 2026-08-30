"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, MailCheck, UserRound } from "lucide-react";
import {
  confirmSignUp,
  getCognitoUserPool,
  notifyAuthChanged,
  resendConfirmationCode,
  signIn,
  signUp,
} from "@/lib/cognito/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const faviconPath = `${basePath}/Favicon.png`;

function getAuthErrorMessage(error: unknown) {
  const value = error as { code?: string; name?: string; message?: string };
  const code = value.code ?? value.name ?? "";
  if (code === "UserNotConfirmedException") return "Enter the confirmation code sent to your email.";
  if (code === "NotAuthorizedException") return "That email and password do not match.";
  if (code === "UsernameExistsException") return "An account with this email already exists. Sign in instead.";
  if (code === "CodeMismatchException") return "That confirmation code is incorrect.";
  if (code === "ExpiredCodeException") return "That code has expired. Request a new one.";
  if (code === "LimitExceededException") return "Too many attempts. Wait a moment and try again.";
  return value.message ?? "Unable to complete authentication. Try again.";
}

export function AuthPage() {
  const router = useRouter();
  const configured = Boolean(getCognitoUserPool());
  const [mode, setMode] = useState<"login" | "signup" | "confirm">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const formValid = mode === "confirm"
    ? emailValid && /^\d{6}$/.test(confirmationCode)
    : emailValid && passwordValid;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: mode === "confirm" ? false : true });
    if (!configured) {
      setMessageType("error");
      setMessage("This deployment is missing the Cognito connection settings.");
      return;
    }
    if (!formValid) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const result = await signUp(email, password);
        if (result.userConfirmed) {
          setMode("login");
          setMessageType("success");
          setMessage("Account created. You can now sign in.");
          return;
        }
        setMode("confirm");
        setMessageType("success");
        setMessage("We sent a six-digit confirmation code to your email.");
      } else if (mode === "confirm") {
        await confirmSignUp(email, confirmationCode);
        setMode("login");
        setConfirmationCode("");
        setMessageType("success");
        setMessage("Email confirmed. Sign in to open your workspace.");
      } else {
        await signIn(email, password);
        notifyAuthChanged();
        router.push("/");
      }
    } catch (error) {
      const value = error as { code?: string; name?: string };
      if ((value.code ?? value.name) === "UserNotConfirmedException") setMode("confirm");
      setMessageType("error");
      setMessage(getAuthErrorMessage(error));
    }
    finally { setBusy(false); }
  }

  async function resendCode() {
    if (!emailValid) return;
    setBusy(true);
    try {
      await resendConfirmationCode(email);
      setMessageType("success");
      setMessage("A new confirmation code was sent to your email.");
    } catch (error) {
      setMessageType("error");
      setMessage(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
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
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Confirm your email"}
            </h1>
            <p className="mt-2 text-body-medium text-on-surface-variant">
              {mode === "login"
                ? "Pick up where your best work begins."
                : mode === "signup"
                ? "Build a calmer way to organize your day."
                : "Enter the code Amazon Cognito sent to your inbox."}
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

            {mode !== "confirm" ? <div className="space-y-2">
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
            </div> : (
              <div className="space-y-2">
                <Label htmlFor="confirmation-code">Confirmation code</Label>
                <Input
                  id="confirmation-code"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value.replace(/\D/g, ""))}
                  className="tracking-[0.2em]"
                />
                <Button type="button" variant="ghost" size="sm" onClick={resendCode} disabled={busy} className="px-2">
                  Send a new code
                </Button>
              </div>
            )}

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
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Confirm email"}
              {mode === "confirm" ? <MailCheck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
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
