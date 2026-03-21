"use client";
import { useAuth } from "@/contexts/AuthContext";
import { api, getApiError } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";

const DEMO_EMAILS = ["johndoe@example.com", "user@example.com"];

const settingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.email("Invalid email address"),
  profile_picture: z.url("Invalid URL").or(z.literal("")).optional(),
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type SettingsForm = z.infer<typeof settingsSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const SettingsPage = () => {
  const router = useRouter();
  const { isAuthed, isLoading, user, refreshUser, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDemoAccount = user?.email ? DEMO_EMAILS.includes(user.email) : false;

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await api.put("/auth/me", {
        current_password: values.current_password,
        password: values.new_password,
      });
      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error) {
      toast.error(getApiError(error));
    }
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      email: "",
      profile_picture: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        email: user.email ?? "",
        profile_picture: user.profile_picture ?? "",
      });
      setFilePreview(user.profile_picture || null);
    }
  }, [user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.put("/auth/me", {
        name: values.name.trim(),
        email: values.email.trim(),
        profile_picture: values.profile_picture?.trim() || null,
      });
      toast.success("Profile updated successfully");
      await refreshUser();
      router.refresh();
    } catch (error) {
      toast.error(getApiError(error));
    }
  });

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await api.delete("/auth/me");
      toast.success("Account deleted successfully");
      logout();
      router.replace("/register");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isAuthed && !isLoading) {
      router.replace("/login");
    }
  }, [isAuthed, isLoading, router]);

  if (!isAuthed && !isLoading) {
    return null;
  }

  // handleFileChange uploads the selected file immediately so the backend can
  // return a canonical URL; we then stuff that URL into the form state, keeping
  // a preview in sync so the user sees what will be saved.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setFilePreview(preview);

    const data = new FormData();
    data.append("file", file);

    try {
      setIsUploading(true);
      const response = await api.post<{ url: string }>(
        "/auth/me/avatar",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      form.setValue("profile_picture", response.data.url, {
        shouldDirty: true,
      });
      toast.success("Profile picture uploaded successfully.");
    } catch (error) {
      setFilePreview(user?.profile_picture ?? null);
      toast.error(getApiError(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Account settings</h1>
          <p className="text-muted-foreground">
            Update your profile or delete your account.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile picture</CardTitle>
          <CardDescription>Upload a photo or paste a URL.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border">
              {filePreview ? (
                <Image
                  src={filePreview}
                  alt="Avatar preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
            <Input
              type="url"
              placeholder="https://example.com/avatar.jpg"
              {...form.register("profile_picture")}
            />
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? "Uploading..." : "Choose image"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <CardDescription>
            Change your display name, email, or profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            {isDemoAccount
              ? "Demo accounts cannot change their password."
              : "Choose a strong password with at least 8 characters."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDemoAccount ? (
            <p className="text-sm text-muted-foreground">
              This is a demo account. Password changes are disabled to keep
              credentials available for everyone.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={onChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="current_password">Current password</Label>
                <Input
                  id="current_password"
                  type="password"
                  placeholder="Enter current password"
                  {...passwordForm.register("current_password")}
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Enter new password"
                  {...passwordForm.register("new_password")}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Repeat new password"
                  {...passwordForm.register("confirm_password")}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting
                  ? "Updating..."
                  : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Once you delete your account, there is no going back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your user record, events, and attendees. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-foreground hover:bg-destructive/90 focus:ring-destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
