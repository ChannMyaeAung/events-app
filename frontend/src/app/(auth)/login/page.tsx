"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, getApiError } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginSchema } from "@/lib/schema";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const DEMO_ACCOUNTS = [
  {
    label: "Demo Account 1",
    email: "johndoe@example.com",
    password: "password123",
  },
  { label: "Demo Account 2", email: "user@example.com", password: "12345678" },
];

// How often to ping /health while the server is cold (ms)
const POLL_INTERVAL = 3000;

type ServerStatus = "checking" | "ready" | "slow";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/events";
  const { login, isAuthed, isLoading: authIsLoading } = useAuth();

  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  // Queued demo credentials to submit once the server is ready
  const pendingDemo = useRef<{ email: string; password: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect already-authenticated users away from the login page
  useEffect(() => {
    if (!authIsLoading && isAuthed) {
      router.replace(from);
    }
  }, [isAuthed, authIsLoading, from, router]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Called once the server has confirmed it is awake
  const handleServerReady = useCallback(() => {
    setServerStatus("ready");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // If a demo login was waiting, fire it automatically
    if (pendingDemo.current) {
      const { email, password } = pendingDemo.current;
      pendingDemo.current = null;
      form.setValue("email", email);
      form.setValue("password", password);
      form.handleSubmit(onSubmit)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Poll /health in the background; mark ready as soon as it responds
  useEffect(() => {
    let slowTimer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        await api.get("/health");
        handleServerReady();
      } catch {
        // still cold — keep polling
      }
    };

    // First ping immediately
    check();

    // After 5 s without a response, surface the "slow" warning
    slowTimer = setTimeout(() => {
      setServerStatus((prev) => (prev === "checking" ? "slow" : prev));
    }, 5000);

    pollRef.current = setInterval(check, POLL_INTERVAL);

    return () => {
      clearTimeout(slowTimer);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [handleServerReady]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const { data } = await api.post("/auth/login", values);
      const token = (data?.token as string) || "";
      await login(token);
      toast.success("Logged in!");
      router.push(from);
    } catch (e) {
      toast.error(getApiError(e));
    }
  }

  function loginAsDemo(email: string, password: string) {
    if (serverStatus !== "ready") {
      // Queue the login — handleServerReady will fire it automatically
      pendingDemo.current = { email, password };
      // Show the user that we are waiting
      toast.info("Waiting for server to wake up, you'll be signed in automatically…");
      return;
    }
    form.setValue("email", email);
    form.setValue("password", password);
    form.handleSubmit(onSubmit)();
  }

  const serverBadge = () => {
    if (serverStatus === "ready") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Server ready
        </span>
      );
    }
    if (serverStatus === "slow") {
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Server waking up — demo will sign in automatically (~30–50 s)
        </span>
      );
    }
    // "checking"
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
        Checking server…
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo account buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Try a demo account — no sign up needed
              </p>
              {serverBadge()}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => loginAsDemo(account.email, account.password)}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or sign in manually
              </span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              No account?{" "}
              <Link
                className="underline hover:text-foreground"
                href="/register"
              >
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
