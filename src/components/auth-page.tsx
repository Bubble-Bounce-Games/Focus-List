"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, CircleCheck, Eye, EyeOff, ListTodo, NotebookPen, Target, Timer, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPage({ configured }: { configured: boolean }) {
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
    if (!supabase) return;
    setTouched({ email: true, password: true });
    if (!emailValid || !passwordValid) return;
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
      if (result.error) {
        setMessageType("error");
        const errorMessage = result.error.message.toLowerCase();
        setMessage(
          errorMessage.includes("email not confirmed")
            ? "Please confirm your email before signing in. Check your inbox or create a new account."
            : errorMessage.includes("invalid login credentials")
              ? "That email and password do not match. Check them and try again."
              : result.error.message
        );
      } else if (mode === "signup") {
        setMessageType("success");
        setMessage("Account created. Check your inbox to confirm your email, then sign in.");
      }
    } catch {
      setMessageType("error");
      setMessage("Unable to reach Supabase. Check your project URL and internet connection.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app px-6">
        <section className="w-full max-w-md border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold text-foreground-strong">Focus List is almost ready</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add your account connection details to start organizing work across your devices.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen md:grid-cols-[1fr_520px]">
      <section className="task-board-backdrop relative hidden overflow-hidden p-12 text-foreground-strong md:flex md:flex-col md:justify-between">
        <div className="task-icon task-icon-one"><ListTodo className="h-7 w-7" /></div>
        <div className="task-icon task-icon-two"><Timer className="h-7 w-7" /></div>
        <div className="task-icon task-icon-three"><CircleCheck className="h-7 w-7" /></div>
        <div className="task-icon task-icon-four"><CalendarDays className="h-6 w-6" /></div>
        <div className="task-icon task-icon-five"><Target className="h-6 w-6" /></div>
        <div className="task-icon task-icon-six"><BarChart3 className="h-6 w-6" /></div>
        <div className="task-icon task-icon-seven"><NotebookPen className="h-6 w-6" /></div>
        <div className="relative z-10 flex items-center gap-3 text-lg font-semibold"><img src="/Favicon.png" alt="" className="h-10 w-10 object-contain" /> Focus List</div>
        <div className="relative z-10 max-w-xl"><p className="text-4xl font-semibold leading-tight">Make space for focused work.</p><p className="mt-5 max-w-lg text-[#525252]">Capture the next step, see your momentum, and finish the work that matters.</p></div>
        <div className="task-preview relative z-10" aria-hidden="true">
          <div className="task-preview-top"><span /> <span /> <span /></div>
          <div className="task-preview-row"><CircleCheck /><div><b>Plan the next release</b><i><em style={{ width: "74%" }} /></i></div><strong>74%</strong></div>
          <div className="task-preview-row"><CircleCheck /><div><b>Review the priority list</b><i><em style={{ width: "46%" }} /></i></div><strong>46%</strong></div>
          <div className="task-preview-row"><CircleCheck /><div><b>Protect time for deep work</b><i><em style={{ width: "22%" }} /></i></div><strong>22%</strong></div>
        </div>
        <p className="relative z-10 text-sm text-[#525252]">A calm home for your daily priorities.</p>
      </section>
      <section className="flex items-center justify-center bg-app px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 text-lg font-semibold text-foreground-strong md:hidden"><img src="/Favicon.png" alt="" className="h-9 w-9 object-contain" /> Focus List</div>
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
