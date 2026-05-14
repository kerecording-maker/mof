import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

import { getFirebaseAuth, googleAuthProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GoogleAuthButton() {
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
      await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
      toast.success("Signed in with Google");
    } catch (e) {
      console.error(e);
      toast.error(
        "Google sign-in failed. Check Firebase Auth settings (Google provider, authorized domains).",
      );
    }
  };

  const doSignOut = async () => {
    try {
      await signOut(getFirebaseAuth());
      toast.success("Signed out");
    } catch (e) {
      console.error(e);
      toast.error("Could not sign out");
    }
  };

  if (!ready) {
    return (
      <Button type="button" variant="outline" size="icon" disabled aria-label="Loading account">
        <span className="size-4 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button type="button" variant="outline" className="gap-2" onClick={signIn}>
        <LogIn className="size-4" />
        <span className="hidden sm:inline">Google</span>
      </Button>
    );
  }

  const initial = (user.displayName || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Account menu"
        >
          <Avatar className="size-8">
            {user.photoURL ? <AvatarImage src={user.photoURL} alt="" /> : null}
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || "Google user"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={doSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
