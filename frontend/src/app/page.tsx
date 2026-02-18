"use client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { isAuthed } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center space-y-8 w-full max-w-screen-2xl">
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full">
          <Calendar className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Welcome to <span className="text-primary">Events App</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Discover, create, and manage amazing events. Connect with people who
          share your interests.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          size="lg"
          className="text-lg px-8"
          onClick={() => router.push(isAuthed ? "/events" : "/login")}
        >
          Browse Events
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <Button asChild variant={"outline"} size="lg" className="text-lg px-8">
          <Link href="/login">
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Discover Events</h3>
          <p className="text-sm text-muted-foreground">
            Find events that match your interests and location
          </p>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Create Events</h3>
          <p className="text-sm text-muted-foreground">
            Host your own events and bring people together
          </p>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Connect</h3>
          <p className="text-sm text-muted-foreground">
            Meet like-minded people and build meaningful connections
          </p>
        </div>
      </div>
    </div>
  );
}
