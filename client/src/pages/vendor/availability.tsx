import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { AvailabilitySlot, Experience } from "@shared/schema";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";

export default function Availability() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: experience } = useQuery<Experience>({
    queryKey: ["/api/vendor/experiences", id],
  });

  const { data: slots, isLoading } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/vendor/experiences", id, "slots"],
  });

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [capacity, setCapacity] = useState("10");

  const addSlot = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/vendor/experiences/${id}/slots`, {
        date,
        startTime,
        endTime,
        capacity: Number(capacity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/experiences", id, "slots"] });
      toast({ title: "Slot added" });
      setDate("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteSlot = useMutation({
    mutationFn: (slotId: number) =>
      apiRequest("DELETE", `/api/vendor/slots/${slotId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/experiences", id, "slots"] });
      toast({ title: "Slot removed" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/vendor/experiences">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Experiences
          </button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Availability</h1>
        {experience && (
          <p className="text-muted-foreground mb-8">{experience.title}</p>
        )}

        <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 mb-8">
          <h3 className="font-semibold mb-4">Add Time Slot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-xl mt-1"
                data-testid="input-slot-date"
              />
            </div>
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="h-10 rounded-xl mt-1"
              />
            </div>
          </div>
          <Button
            className="mt-4 rounded-xl gap-2"
            onClick={() => addSlot.mutate()}
            disabled={!date || addSlot.isPending}
            data-testid="button-add-slot"
          >
            {addSlot.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Slot
          </Button>
        </div>

        <div className="space-y-2">
          {slots?.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between rounded-xl border border-border p-4"
              data-testid={`slot-${slot.id}`}
            >
              <div>
                <span className="font-medium">{slot.date}</span>
                <span className="text-muted-foreground ml-3">
                  {slot.startTime} - {slot.endTime}
                </span>
                <span className="text-muted-foreground ml-3">
                  {slot.capacity} spots
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={slot.status === "open" ? "bg-emerald-50 text-emerald-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                  {slot.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => deleteSlot.mutate(slot.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {slots?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No availability slots yet</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
