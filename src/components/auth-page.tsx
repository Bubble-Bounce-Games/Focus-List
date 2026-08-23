"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, UserRound } from "lucide-react";
import type { AuthError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
      <section className="auth-form-surface w-full max-w-[520px]">
        <div className="auth-form-wrap">
          <div className="mb-10 flex items-center gap-3 text-lg font-semibold text-foreground-strong"><img src={faviconPath} alt="" className="h-9 w-9 object-contain" /> Focus List</div>
          <div className="mb-8"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Focus List workspace</p><div className="mb-4 flex h-10 w-10 items-center justify-center bg-[#d0e2ff] text-primary"><UserRound className="h-5 w-5" /></div><h1 className="text-3xl font-semibold text-foreground-strong">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-2 text-sm text-muted-foreground">{mode === "login" ? "Pick up where your best work begins." : "Build a calmer way to organize your day."}</p></div>
          <form onSubmit={submit} noValidate className="space-y-5">
            <label className="block text-sm font-medium text-foreground-strong">Email<input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} aria-invalid={touched.email && !emailValid} className="mt-2 h-11 w-full border border-[#8d8d8d] bg-card px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />{touched.email && !emailValid && <span className="mt-1 block text-xs text-destructive">Enter a valid email address.</span>}</label>
            <label className="block text-sm font-medium text-foreground-strong">Password<span className="relative mt-2 block"><input required minLength={8} type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} aria-invalid={touched.password && !passwordValid} className="h-11 w-full border border-[#8d8d8d] bg-card px-3 pr-11 outline-none focus:border-primary focus:ring-1 focus:ring-primary" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground-strong">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span><span className={`mt-1 block text-xs ${touched.password && !passwordValid ? "text-destructive" : "text-muted-foreground"}`}>Use 8+ characters with at least one letter and one number.</span></label>
            {message && <p className={`text-sm ${messageType === "success" ? "text-[#198038]" : "text-destructive"}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-[0_8px_20px_rgb(15_98_254_/_22%)] hover:bg-[#0353e9] disabled:opacity-50">{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" /></button>
          </form>
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); setMessageType("error"); }} className="mt-6 text-sm text-primary hover:underline">{mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
          <p className="mt-10 flex gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Your focused workspace is ready whenever you are.</p>
        </div>
      </section>
    </main>
  );
}
