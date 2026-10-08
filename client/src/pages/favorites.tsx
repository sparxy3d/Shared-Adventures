import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Experience } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import ExperienceCard from "@/components/experience-card";
import MemberLayout, { MemberError, MemberLoading } from "@/components/member-layout";

interface SavedActivity { id: number; experienceId: number; experience: Experience }
export default function Favorites() {
  const { isMember } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const query = useQuery<SavedActivity[]>({ queryKey: ["/api/favorites"], enabled: isMember });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/favorites/${id}`),
    onSuccess: () => { setError(""); queryClient.invalidateQueries({ queryKey: ["/api/favorites"] }); toast({ title: "Removed from your bucket list" }); },
    onError: () => setError("We couldn’t remove that activity. Please try again."),
  });
  return <MemberLayout title="Bucket list">
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-white p-4">{error}<Button variant="outline" className="ml-2" onClick={() => { if (remove.variables) remove.mutate(remove.variables); }}>Retry</Button></div>}
    {query.isLoading ? <MemberLoading /> : query.isError ? <MemberError retry={() => query.refetch()} message="We couldn’t load your bucket list." /> : query.data?.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {query.data.map(saved => <ExperienceCard key={saved.id} experience={saved.experience} saved onRemove={() => remove.mutate(saved.experienceId)} removePending={remove.isPending} memberView />)}
    </div> : <div className="rounded-2xl bg-white p-8 text-center shadow-sm"><p className="mb-4 text-xl font-semibold">Save activities you want to try</p><Link href="/search"><Button>Explore</Button></Link></div>}
  </MemberLayout>;
}
