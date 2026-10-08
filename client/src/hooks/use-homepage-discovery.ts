import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { SUPPORTED_CITIES } from "@shared/catalog";
import { discoveryParams, sessionInstant, type Activity, type DiscoveryChoices } from "@/lib/discovery";

export const defaultChoices: DiscoveryChoices = { city: "", group: "2", time: "now", date: "" };
async function activities(url: string): Promise<Activity[]> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("Couldn’t load activities. Please try again.");
  return response.json();
}
export function useHomepageDiscovery() {
  const { user } = useAuth();
  const [choices, setChoices] = useState<DiscoveryChoices>(defaultChoices);
  const [submitted, setSubmitted] = useState<DiscoveryChoices | null>(null);
  const [cityStorageError, setCityStorageError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`free-spirit-home-city-${user.id}`);
      if (SUPPORTED_CITIES.some(c => c.name === saved)) setChoices(c => c.city ? c : { ...c, city: saved! });
    } catch { setCityStorageError("Your saved city couldn’t be loaded. Pick a city."); }
  }, [user?.id]);
  const liveUrl = `/api/experiences?${discoveryParams(choices)}`;
  const live = useQuery<Activity[]>({ queryKey: [liveUrl], queryFn: () => activities(liveUrl), staleTime: 30_000 });
  const resultsUrl = `/api/experiences?${discoveryParams(submitted ?? choices)}`;
  const results = useQuery<Activity[]>({ queryKey: [resultsUrl], queryFn: () => activities(resultsUrl), enabled: !!submitted, staleTime: 30_000 });
  const fallbackUrl = `/api/experiences?${discoveryParams(submitted ?? choices, true)}`;
  const fallback = useQuery<Activity[]>({ queryKey: [fallbackUrl], queryFn: () => activities(fallbackUrl), enabled: !!submitted && !!results.data && results.data.length === 0 });
  const nowParams = new URLSearchParams({ time: "now" });
  if (choices.city.trim()) nowParams.set("city", choices.city.trim());
  const nowUrl = `/api/experiences?${nowParams}`;
  const openNow = useQuery<Activity[]>({ queryKey: [nowUrl], queryFn: () => activities(nowUrl), staleTime: 30_000 });
  const featured = useQuery<Activity[]>({ queryKey: ["/api/experiences/featured"], queryFn: () => activities("/api/experiences/featured"), staleTime: 30_000 });
  const surprise = useMutation<Activity | null, Error, { filters: DiscoveryChoices; exclude?: number }>({
    mutationFn: async ({ filters, exclude }) => {
      const params = discoveryParams(filters);
      if (exclude) params.set("exclude", String(exclude));
      const response = await fetch(`/api/experiences/surprise?${params}`, { credentials: "include" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Couldn’t pick an activity. Please try again.");
      const activity: Activity = await response.json();
      // The existing endpoint can return the same ID when it is the only match.
      // Never present that as a different suggestion.
      return activity.id === exclude ? null : activity;
    },
  });
  const showIdeas = (next = choices) => { setChoices(next); setSubmitted({ ...next }); };
  const clearFilters = () => showIdeas({ ...defaultChoices });
  const fallbackCards = (fallback.data ?? []).filter(a => a.nextSession && a.nextSession.spotsLeft > 0)
    .sort((a, b) => sessionInstant(a.nextSession!) - sessionInstant(b.nextSession!)).slice(0, 3);
  const ideas = submitted ? results.data ?? [] : [];
  const nowCards = (openNow.data ?? []).filter(a => a.nextSession && a.nextSession.spotsLeft > 0).slice(0, 4);
  const alreadyShown = new Set([...ideas, ...nowCards, ...(submitted && ideas.length === 0 ? fallbackCards : [])].map(a => a.id));
  const moreCards = (featured.data ?? []).filter(a => a.nextSession && a.nextSession.spotsLeft > 0 && !alreadyShown.has(a.id))
    .sort((a, b) => sessionInstant(a.nextSession!) - sessionInstant(b.nextSession!)).slice(0, 8);
  return { choices, setChoices, submitted, showIdeas, clearFilters, live, results, fallback, fallbackCards, openNow, nowCards, featured, moreCards, surprise, cityStorageError };
}
