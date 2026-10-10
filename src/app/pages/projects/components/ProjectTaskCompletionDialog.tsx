import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { Project } from "@/lib/api";

type Props = {
  task: Project | null;
  saving: boolean;
  mode?: "complete" | "record";
  onCancel: () => void;
  onConfirm: (actualHours: number) => void;
};

export function ProjectTaskCompletionDialog({ task, saving, mode = "complete", onCancel, onConfirm }: Props) {
  const [actualHours, setActualHours] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const suggestedHours = task?.actual_hours || task?.estimated_hours || "";
    setActualHours(suggestedHours ? String(suggestedHours) : "");
    setError("");
  }, [task]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const hours = Number(actualHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      setError("Enter actual hours greater than zero.");
      return;
    }
    onConfirm(hours);
  };

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "record" ? "Record actual hours" : "Complete task"}</DialogTitle>
          <DialogDescription>
            {mode === "record"
              ? `${task?.name} is completed but has no recorded actual hours. The estimate is suggested below; adjust it to match the hours worked.`
              : `${task?.name} has no approved timesheet hours. Record the actual hours worked to complete this task.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-actual-hours">Actual hours</Label>
            <Input
              id="task-actual-hours"
              type="number"
              min="0.01"
              step="0.25"
              required
              value={actualHours}
              onChange={(event) => { setActualHours(event.target.value); setError(""); }}
              autoFocus
            />
            {task && Number(task.estimated_hours || 0) > 0 && !task.actual_hours && (
              <p className="text-xs text-muted-foreground">
                Estimated hours: {task.estimated_hours}. Confirm or change this to the actual hours worked.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? (mode === "record" ? "Saving…" : "Completing…") : (mode === "record" ? "Save actual hours" : "Complete task")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
