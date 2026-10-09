import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { Project } from "@/lib/api";

type Props = {
  task: Project | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (actualHours: number) => void;
};

export function ProjectTaskCompletionDialog({ task, saving, onCancel, onConfirm }: Props) {
  const [actualHours, setActualHours] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setActualHours(task?.actual_hours ? String(task.actual_hours) : "");
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
          <DialogTitle>Complete task</DialogTitle>
          <DialogDescription>
            {task?.name} has no approved timesheet hours. Record the actual hours worked to complete this task.
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Completing…" : "Complete task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
