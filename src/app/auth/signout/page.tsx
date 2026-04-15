"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Signing you out...</p>
      </div>
    </div>
  );
}
