import { useEffect, useState } from "react";
import { projectsApi, type Project, type ProjectActivity, type ProjectComment, type ProjectDocument, type ProjectSetupOptions, type ProjectTeamMember } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { FileText, MessageSquare, Paperclip, RefreshCw, Shield, Users } from "lucide-react";

const formatBytes = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
const roles: ProjectTeamMember["role"][] = ["owner", "manager", "contributor", "viewer"];

export default function ProjectCollaborationPanel({ project }: { project: Project }) {
  const [team, setTeam] = useState<ProjectTeamMember[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [setup, setSetup] = useState<ProjectSetupOptions | null>(null);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ProjectTeamMember["role"]>("contributor");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [teamRes, commentRes, activityRes, docRes, setupRes] = await Promise.all([projectsApi.getTeam(project._id), projectsApi.getComments(project._id), projectsApi.getActivity(project._id), projectsApi.getDocuments(project._id), projectsApi.getSetupOptions()]);
      setTeam(teamRes.data || []); setComments(commentRes.data || []); setActivity(activityRes.data || []); setDocuments(docRes.data || []); setSetup(setupRes.data);
    } catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not load project collaboration data"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [project._id]);

  const addMember = async () => {
    if (!userId) return toast.error("Choose a team member");
    setSaving(true);
    try { await projectsApi.addTeamMember(project._id, userId, role); setUserId(""); await refresh(); toast.success("Project team updated"); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not update project team"); }
    finally { setSaving(false); }
  };
  const removeMember = async (member: ProjectTeamMember) => {
    try { await projectsApi.removeTeamMember(project._id, member._id); await refresh(); toast.success(`${member.name} removed from project`); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not remove team member"); }
  };
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault(); if (!comment.trim()) return;
    setSaving(true);
    try { await projectsApi.addComment(project._id, comment.trim()); setComment(""); await refresh(); toast.success("Comment added"); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not add comment"); }
    finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    try { await projectsApi.uploadDocument(project._id, file); await refresh(); toast.success("Document uploaded"); }
    catch (error: any) { toast.error(error?.response?.data?.error || error?.message || "Could not upload document"); }
    finally { setSaving(false); }
  };
  const download = async (doc: ProjectDocument) => {
    try { const blob = await projectsApi.downloadDocument(project._id, doc._id); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = doc.file_name; anchor.click(); URL.revokeObjectURL(url); }
    catch (error: any) { toast.error(error?.message || "Could not download document"); }
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950 dark:text-white">Project collaboration</h3><p className="text-sm text-slate-500 dark:text-slate-400">Manage project membership, discussion, documents, and activity.</p></div><Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <Tabs defaultValue="team"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger><TabsTrigger value="comments"><MessageSquare className="mr-2 h-4 w-4" />Comments</TabsTrigger><TabsTrigger value="activity"><Shield className="mr-2 h-4 w-4" />Activity</TabsTrigger><TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" />Documents</TabsTrigger></TabsList>
      <TabsContent value="team" className="space-y-4 pt-3"><div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_180px_auto]"><div className="space-y-2"><Label>Add a company user</Label><Select value={userId || "__none__"} onValueChange={(value) => setUserId(value === "__none__" ? "" : value)}><SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger><SelectContent><SelectItem value="__none__">Choose user</SelectItem>{(setup?.users || []).map((user) => <SelectItem key={user._id} value={user._id}>{user.name} · {user.email}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Project role</Label><Select value={role} onValueChange={(value: ProjectTeamMember["role"]) => setRole(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><Button className="self-end" disabled={saving || !userId} onClick={() => void addMember()}>Add to team</Button></div>{loading ? <p className="py-6 text-center text-sm text-slate-500">Loading team…</p> : team.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No project team members yet.</p> : <div className="divide-y rounded-lg border dark:divide-slate-800">{team.map((member) => <div key={member._id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div><p className="font-medium">{member.name}</p><p className="text-xs text-slate-500">{member.email}</p></div><div className="flex items-center gap-2"><Select value={member.role} onValueChange={(next: ProjectTeamMember["role"]) => void projectsApi.addTeamMember(project._id, member.user_id, next).then(refresh).catch((error: any) => toast.error(error?.message || "Could not change role"))}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent>{roles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" onClick={() => void removeMember(member)}>Remove</Button></div></div>)}</div>}</TabsContent>
      <TabsContent value="comments" className="space-y-4 pt-3"><form onSubmit={addComment} className="space-y-2"><Label htmlFor="project-comment">Add a comment</Label><Textarea id="project-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={10000} rows={3} placeholder="Share an update with the project team…" /><div className="flex justify-end"><Button disabled={saving || !comment.trim()}>Post comment</Button></div></form>{loading ? <p className="py-4 text-center text-sm text-slate-500">Loading comments…</p> : comments.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No comments yet.</p> : <div className="space-y-3">{comments.map((item) => <article key={item.id} className="rounded-lg border p-4"><div className="flex justify-between gap-2"><span className="font-medium">{item.authorName}</span><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{item.body}</p></article>)}</div>}</TabsContent>
      <TabsContent value="activity" className="space-y-3 pt-3">{loading ? <p className="py-4 text-center text-sm text-slate-500">Loading activity…</p> : activity.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">Project activity will appear here as the team collaborates.</p> : <div className="space-y-3">{activity.map((item) => <div key={item.id} className="flex gap-3 rounded-lg border p-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><div className="min-w-0"><p className="text-sm"><span className="font-medium">{item.actorName}</span> {item.message}</p><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div></div>)}</div>}</TabsContent>
      <TabsContent value="documents" className="space-y-4 pt-3"><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4"><div><p className="font-medium">Project files</p><p className="text-xs text-slate-500">PDF, office documents, CSV, text, and common images; up to 15 MB each.</p></div><Label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"><Paperclip className="mr-2 h-4 w-4" />{saving ? "Uploading…" : "Upload document"}<Input type="file" className="hidden" disabled={saving} accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></Label></div>{loading ? <p className="py-4 text-center text-sm text-slate-500">Loading documents…</p> : documents.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No documents attached.</p> : <div className="divide-y rounded-lg border dark:divide-slate-800">{documents.map((doc) => <div key={doc._id} className="flex flex-wrap items-center justify-between gap-2 p-3"><div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-slate-500" /><div className="min-w-0"><p className="truncate font-medium">{doc.file_name}</p><p className="text-xs text-slate-500">{formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleString()}</p></div></div><Button size="sm" variant="outline" onClick={() => void download(doc)}>Download</Button></div>)}</div>}</TabsContent>
    </Tabs>
  </div>;
}
