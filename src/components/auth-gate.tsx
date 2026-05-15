import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import {
  getFirebaseAuth,
  getAuthErrorMessage,
  signInWithEmailPassword,
  signInWithGoogle,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

/** Full-bleed login backdrop (override with `VITE_LOGIN_BG_URL` in `.env`). */
const LOGIN_BG_URL =
  (import.meta.env.VITE_LOGIN_BG_URL as string | undefined) ||
  "https://i.ibb.co/dsvWJhgn/Gemini-Generated-Image-heqti6heqti6heqt.png";

function LoginBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${LOGIN_BG_URL})` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/75 via-background/45 to-background/85 dark:from-background/85 dark:via-background/50 dark:to-background/92"
      />
    </>
  );
}

function AuthLoading() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <LoginBackdrop />
      <Loader2
        className="relative z-10 size-10 animate-spin text-primary drop-shadow-md"
        aria-hidden
      />
      <p className="relative z-10 text-sm text-foreground/90 drop-shadow">
        Checking your session…
      </p>
    </div>
  );
}

function LoginScreen({
  onEmailSignIn,
  onGoogleSignIn,
}: {
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy("email");
    try {
      await onEmailSignIn(email, password);
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setBusy("google");
    try {
      await onGoogleSignIn();
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <LoginBackdrop />

      <header className="relative z-10 flex justify-end border-b border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md dark:border-white/5 dark:bg-black/35">
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8">
        <Card className="w-full max-w-md border-border/60 bg-card/90 shadow-2xl shadow-black/25 backdrop-blur-md dark:border-white/10 dark:bg-card/85 dark:shadow-black/50">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-xl font-bold text-primary-foreground shadow-lg">
              F
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Federal Budget Tagging
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Finance Dashboard · 2024–25
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <p className="text-center text-sm text-muted-foreground">
              Sign in with your email and password, or use Google.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={disabled}
                  className="h-11 bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={disabled}
                  className="h-11 bg-background/80"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full gap-2 text-base shadow-md"
                disabled={disabled}
              >
                {busy === "email" ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                ) : (
                  <LogIn className="size-5" aria-hidden />
                )}
                Sign in
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full gap-2 text-base"
              onClick={() => void handleGoogle()}
              disabled={disabled}
            >
              {busy === "google" ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : null}
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

  const signInEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailPassword(email, password);
      toast.success("Signed in successfully");
    } catch (e) {
      console.error(e);
      toast.error(getAuthErrorMessage(e));
    }
  };

  const signInGoogle = async () => {
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google");
    } catch (e) {
      console.error(e);
      toast.error(getAuthErrorMessage(e));
    }
  };

  if (!ready) {
    return <AuthLoading />;
  }

  if (!user) {
    return <LoginScreen onEmailSignIn={signInEmail} onGoogleSignIn={signInGoogle} />;
  }

  return children;
}
