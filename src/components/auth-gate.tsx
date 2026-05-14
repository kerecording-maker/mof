import { useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { getFirebaseAuth, signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const shellBg =
  "min-h-dvh bg-gradient-to-b from-primary/[0.06] via-background to-muted/30 dark:from-primary/[0.12] dark:via-background dark:to-muted/20";

function AuthLoading() {
  return (
    <div className={cn(shellBg, "flex flex-col items-center justify-center gap-4 px-4")}>
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    </div>
  );
}

function LoginScreen({ onGoogleSignIn }: { onGoogleSignIn: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await onGoogleSignIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(shellBg, "relative flex min-h-dvh flex-col")}>
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/8" />
        <div className="absolute -right-16 bottom-1/4 size-64 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-400/8" />
        <div className="absolute left-1/2 top-12 size-48 -translate-x-1/2 rounded-full bg-orange-500/8 blur-2xl dark:bg-orange-400/6" />
      </div>

      <header className="relative z-10 flex justify-end border-b border-border/50 bg-card/40 px-4 py-3 backdrop-blur-sm">
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8">
        <Card className="w-full max-w-md border-border/80 shadow-xl shadow-cyan-950/10 dark:border-cyan-500/20 dark:shadow-cyan-950/30">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-xl font-bold text-primary-foreground shadow-lg">
              F
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Federal Budget Tagging
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Climate Finance Dashboard · 2024–25
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <p className="text-center text-sm text-muted-foreground">
              Sign in with your Google account to open the dashboard and tagging tools.
            </p>
            <Button
              type="button"
              size="lg"
              className="h-12 w-full gap-2 text-base shadow-md"
              onClick={handleSignIn}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <LogIn className="size-5" aria-hidden />
              )}
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google");
    } catch (e) {
      console.error(e);
      toast.error(
        "Google sign-in failed. Check Firebase Auth settings (Google provider, authorized domains).",
      );
    }
  };

  if (!ready) {
    return <AuthLoading />;
  }

  if (!user) {
    return <LoginScreen onGoogleSignIn={signIn} />;
  }

  return children;
}
