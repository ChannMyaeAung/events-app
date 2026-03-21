"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, getApiError } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/events";
  const { login, isAuthed, isLoading: authIsLoading } = useAuth();
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  // Ping the backend on mount so Render starts waking up immediately
  useEffect(() => {
    api.get("/health").catch(() => {});
  }, []);

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

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    const slowTimer = setTimeout(() => setIsSlowLoading(true), 3000);
    try {
      const { data } = await api.post("/auth/login", values);
      const token = (data?.token as string) || "";
      await login(token);
      toast.success("Logged in!");
      router.push(from);
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      clearTimeout(slowTimer);
      setIsSlowLoading(false);
    }
  }

  function loginAsDemo(email: string, password: string) {
    form.setValue("email", email);
    form.setValue("password", password);
    form.handleSubmit(onSubmit)();
  }

  const isSubmitting = form.formState.isSubmitting;
  const submitLabel = isSlowLoading
    ? "Server waking up (~50s)..."
    : isSubmitting
      ? "Signing in..."
      : "Sign in";

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo account buttons */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center py-1">
              Try a demo account, no sign up needed
            </p>
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
              {submitLabel}
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
