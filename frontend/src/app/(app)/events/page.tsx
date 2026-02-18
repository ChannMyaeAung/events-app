"use client";
import { api, getApiError } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Event } from "@/lib/types";
import { toast } from "sonner";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function EventsPage() {
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { isAuthed } = useAuth();
  const router = useRouter();
  const { data, error, mutate, isLoading } = useSWR<Event[]>(
    isAuthed ? `/events` : null,
    fetcher
  );

  useEffect(() => {
    if (!isLoading && !isAuthed) {
      router.push("/login");
    }
  }, [isLoading, isAuthed, router]);

  useEffect(() => {
    if (error && isAuthed) {
      toast.error(getApiError(error));
    }
  }, [error, isAuthed]);

  const events = useMemo(() => {
    return (data || []).filter((e) =>
      e.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [data, q]);

  const handleDelete = async (eventId: number) => {
    try {
      setDeletingId(eventId);
      await api.delete(`/events/${eventId}`);
      toast.success("Event deleted successfully");
      mutate();
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Format date to human-readable format
   */
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Determine if event is upcoming, ongoing, or past
   */
  const getEventStatus = (
    dateString: string
  ): {
    status: "past" | "live" | "soon" | "upcoming";
    color: "secondary" | "destructive" | "default" | "outline";
  } => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < -2) return { status: "past", color: "secondary" };
    if (diffHours < 2) return { status: "live", color: "destructive" };
    if (diffHours < 24) return { status: "soon", color: "default" };
    return { status: "upcoming", color: "outline" };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Discover and manage your upcoming events
          </p>
        </div>

        <Button asChild size="lg" className="sm:w-auto">
          <Link href="/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Search Section */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events by name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        {q && (
          <Button variant="ghost" size="sm" onClick={() => setQ("")}>
            Clear
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading events...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {q ? `No events found for "${q}"` : "No events yet"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            {q
              ? "Try searching with different keywords or check your spelling."
              : "Get started by creating your first event."}
          </p>
          {!q && (
            <Button asChild>
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Event
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && events.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {events.length} event{events.length !== 1 ? "s" : ""} found
              {q && ` for "${q}"`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((ev) => {
              const eventStatus = getEventStatus(ev.date);

              return (
                <Card
                  key={ev.id}
                  className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                        {ev.name}
                      </CardTitle>
                      <Badge variant={eventStatus.color} className="shrink-0">
                        {eventStatus.status === "live"
                          ? "🔴 Live"
                          : eventStatus.status === "soon"
                          ? "⏰ Soon"
                          : eventStatus.status === "past"
                          ? "✓ Past"
                          : "📅 Upcoming"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {ev.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">
                          {formatEventDate(ev.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Link href={`/events/${ev.id}`}>View Details</Link>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size={"sm"} variant={"destructive"}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deletingId === ev.id ? "Deleting..." : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete &ldquo;{ev.name}&rdquo;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will premanently remove the event and its
                              attendees.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === ev.id}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(ev.id)}
                              className="bg-destructive text-foreground hover:bg-destructive/90 focus:ring-destructive"
                              disabled={deletingId === ev.id}
                            >
                              Confirm delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
