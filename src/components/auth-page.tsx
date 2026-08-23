"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPage({ configured }: { configured: boolean }) {
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setTouched({ email: true, password: true });
    if (!emailValid || !passwordValid) return;
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) setMessage(result.error.message);
      else if (mode === "signup") setMessage("Check your email to confirm your account.");
    } catch {
      setMessage("Unable to reach Supabase. Check your project URL and internet connection.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app px-6">
        <section className="w-full max-w-md border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold text-foreground-strong">Connect Supabase</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment to enable accounts.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_520px]">
      <section className="hidden bg-primary p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold"><img src="/logo.png" alt="" className="h-10 w-10 object-contain" /> Focus List</div>
        <div className="max-w-md"><p className="text-4xl font-semibold leading-tight">Your work, wherever you are.</p><p className="mt-5 text-blue-100">Sign in to keep tasks synchronized across browsers and devices.</p></div>
        <p className="text-sm text-blue-100">Private by default. Your account owns your data.</p>
      </section>
      <section className="flex items-center justify-center bg-app px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 text-lg font-semibold text-foreground-strong lg:hidden"><img src="/logo.png" alt="" className="h-9 w-9 object-contain" /> Focus List</div>
          <div className="mb-8"><div className="mb-4 flex h-10 w-10 items-center justify-center bg-[#d0e2ff] text-primary"><UserRound className="h-5 w-5" /></div><h1 className="text-3xl font-semibold text-foreground-strong">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-2 text-sm text-muted-foreground">{mode === "login" ? "Sign in to continue to your task list." : "Start organizing your work across every device."}</p></div>
          <form onSubmit={submit} noValidate className="space-y-5">
            <label className="block text-sm font-medium text-foreground-strong">Email
              <input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} aria-invalid={touched.email && !emailValid} className="mt-2 h-11 w-full border border-[#8d8d8d] bg-card px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              {touched.email && !emailValid && <span className="mt-1 block text-xs text-destructive">Enter a valid email address, such as you@example.com.</span>}
            </label>
            <label className="block text-sm font-medium text-foreground-strong">Password
              <span className="relative mt-2 block"><input required minLength={8} type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} aria-invalid={touched.password && !passwordValid} className="h-11 w-full border border-[#8d8d8d] bg-card px-3 pr-11 outline-none focus:border-primary focus:ring-1 focus:ring-primary" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground-strong">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
              <span className={`mt-1 block text-xs ${touched.password && !passwordValid ? "text-destructive" : "text-muted-foreground"}`}>Use 8+ characters with at least one letter and one number.</span>
            </label>
            {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 bg-primary text-sm font-semibold text-white hover:bg-[#0353e9] disabled:opacity-50">{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" /></button>
          </form>
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} className="mt-6 text-sm text-primary hover:underline">{mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
          <p className="mt-10 flex gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Data is private to your account and protected by Supabase row-level security.</p>
        </div>
      </section>
    </main>
  );
}
