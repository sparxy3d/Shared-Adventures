import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import type { AvailabilitySlot } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { sessionBookable, sessionDays } from "@/lib/activity-sessions";
import type { Activity } from "@/lib/discovery";

class PublicActivityError extends Error {
  constructor(public status: number) { super("Activity could not be loaded"); }
}
const positiveInteger = (value: string | null) => value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

export function useActivityBooking(id: string) {
  const auth = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [, setNow] = useState(Date.now());
  const now = Date.now();
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const activity = useQuery<Activity>({
    queryKey: [`/api/experiences/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/experiences/${id}`, { credentials: "include" });
      if (!response.ok) throw new PublicActivityError(response.status);
      return response.json();
    },
  });
  const slots = useQuery<AvailabilitySlot[]>({
    queryKey: [`/api/experiences/${id}/slots`], enabled: !!activity.data,
    staleTime: 15000, refetchInterval: 30000,
  });
  const relatedUrl = `/api/experiences?category=${encodeURIComponent(activity.data?.category || "")}`;
  const related = useQuery<Activity[]>({ queryKey: [relatedUrl], enabled: !!activity.data });
  const favorites = useQuery<{ experienceId: number }[]>({ queryKey: ["/api/favorites"], enabled: !!auth.user });
  const capacity = activity.data?.capacity && activity.data.capacity > 0 ? activity.data.capacity : null;
  const qty = Math.min(positiveInteger(params.get("group")) || 1, capacity || Number.MAX_SAFE_INTEGER);
  const selectedSlotId = positiveInteger(params.get("slot"));
  const selectedSlot = slots.data?.find(slot => slot.id === selectedSlotId && sessionBookable(slot, qty, now)) || null;
  const days = sessionDays(slots.data || [], now);
  const nextSessionId = days.flatMap(([, day]) => day).find(slot => sessionBookable(slot, qty, now))?.id ?? null;
  const hasOpenSessions = days.some(([, day]) => day.some(slot => slot.status === "open" && slot.capacity > 0));
  const requestOpen = params.get("booking") === "1";
  const takingBookings = activity.data?.takingBookings !== false;
  useEffect(() => {
    if (activity.data?.takingBookings !== false || params.get("booking") !== "1") return;
    const next = new URLSearchParams(search);
    next.delete("booking");
    navigate(`/activity/${id}${next.toString() ? `?${next.toString()}` : ""}`, { replace: true });
    setSessionSheetOpen(false);
  }, [activity.data?.takingBookings, id, navigate, params, search]);
  function updateChoice(patch: Record<string, string | null>) {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(patch)) value === null ? next.delete(key) : next.set(key, value);
    const query = next.toString();
    navigate(`/activity/${id}${query ? `?${query}` : ""}`, { replace: true });
  }
  function openRequest() { if (!takingBookings) return; setPanelError(""); setSessionSheetOpen(false); updateChoice({ booking: "1", group: String(qty) }); }
  function closeRequest() { updateChoice({ booking: null }); }
  function conflict() {
    setPanelError("That session just filled up");
    updateChoice({ booking: null, slot: null });
    setSessionSheetOpen(true);
    void slots.refetch();
  }
  const isSaved = favorites.data?.some(favorite => favorite.experienceId === Number(id)) || false;
  const favoriteMutation = useMutation({
    mutationFn: () => apiRequest(isSaved ? "DELETE" : "POST", isSaved ? `/api/favorites/${id}` : "/api/favorites", isSaved ? undefined : { experienceId: Number(id) }),
    onSuccess: () => { setSaveError(""); queryClient.invalidateQueries({ queryKey: ["/api/favorites"] }); toast({ title: isSaved ? "Removed from bucket list" : "Saved to bucket list" }); },
    onError: () => setSaveError("Your bucket list couldn’t be updated. Please try again."),
  });
  function toggleSaved() {
    setSaveError("");
    if (auth.error) { setSaveError("Your account couldn’t be checked. Please retry."); return; }
    if (!auth.user) { navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    favoriteMutation.mutate();
  }
  return {
    activity, slots, related, auth, qty, capacity, days, selectedSlotId, selectedSlot, nextSessionId, hasOpenSessions,
    takingBookings, requestOpen: requestOpen && takingBookings, openRequest, closeRequest, conflict, sessionSheetOpen, setSessionSheetOpen, panelError,
    setQty: (value: number) => {
      if (capacity && value >= 1 && value <= capacity) {
        const chosen = slots.data?.find(slot => slot.id === selectedSlotId);
        updateChoice({ group: String(value), slot: chosen && sessionBookable(chosen, value, now) ? String(chosen.id) : null });
      }
    },
    selectSlot: (slot: AvailabilitySlot) => { if (sessionBookable(slot, qty)) updateChoice({ slot: String(slot.id), group: String(qty) }); },
    isSaved, toggleSaved, saveError, favoritesError: favorites.isError,
    retrySave: () => auth.error ? auth.retry() : favorites.isError ? favorites.refetch() : toggleSaved(),
    saving: favoriteMutation.isPending || favorites.isLoading && !!auth.user || auth.isLoading,
    unavailable: activity.error instanceof PublicActivityError && activity.error.status === 404,
    relatedCards: (related.data || []).filter(item => item.id !== Number(id)).slice(0, 4),
  };
}
export type ActivityBooking = ReturnType<typeof useActivityBooking>;
