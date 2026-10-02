import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { projectsApi, type Project, type ProjectCreateRequest, type ProjectSetupOptions, type ProjectTypeSetting } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FolderTree,
  ShieldCheck,
} from "lucide-react";
import { Layout } from "@/app/layout/Layout";
import { useFormatCurrency } from '@/lib/currencyUtils';

const PROJECT_TYPES = [
  { value: "project", label: "Project" },
  { value: "job", label: "Job" },
  { value: "phase", label: "Phase" },
  { value: "work_package", label: "Work Package" },
  { value: "task", label: "Task" },
];

const PROJECT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "planned", label: "Planned" },
  { value: "planning", label: "Planning (legacy)" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const BILLING_TYPES = [
  { value: "fixed_price", label: "Fixed Price" },
  { value: "time_material", label: "Time and Materials" },
  { value: "milestone", label: "Milestone Billing" },
  { value: "cost_plus", label: "Cost Plus" },
  { value: "non_billable", label: "Non-billable" },
  { value: "none", label: "Not Set" },
];

const PROJECT_CATEGORIES = [
  { value: "client_job", label: "Client Job" },
  { value: "internal", label: "Internal" },
  { value: "construction", label: "Construction" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
] as const;

const REQUIRED_PROJECT_FIELDS = [
  ["purpose", "Purpose"], ["client_id", "Client"], ["manager_id", "Project Manager"],
  ["sponsor_id", "Sponsor"], ["start_date", "Start Date"], ["end_date", "Target End Date"],
  ["budget_allocated", "Initial Budget"], ["contract_value", "Contract Value"],
  ["scope", "Scope"], ["currency_code", "Currency"],
] as const;

export default function ProjectFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Project[]>([]);
  const [setupOptions, setSetupOptions] = useState<ProjectSetupOptions | null>(null);
  const [typeSettings, setTypeSettings] = useState<ProjectTypeSetting[]>([]);
  const [settingsCategory, setSettingsCategory] = useState<Project["project_category"]>("client_job");
  const [savingTypeSettings, setSavingTypeSettings] = useState(false);
  const [formData, setFormData] = useState<ProjectCreateRequest>({
    project_code: "",
    name: "",
    description: "",
    purpose: "",
    project_category: "client_job",
    parent_id: searchParams.get("parent_id") || "",
    type: (searchParams.get("type") as ProjectCreateRequest["type"]) || "project",
    status: "planned",
    priority: "medium",
    budget_allocated: 0,
    start_date: "",
    end_date: "",
    billing_type: "none",
    contract_value: 0,
    sponsor_id: "",
    team_member_ids: [],
    currency_code: "RWF",
    tax_rate_id: "",
    tax_rate_pct: 0,
    tax_inclusive: false,
    scope: "",
    exclusions: "",
    assumptions: "",
    constraints: "",
    is_template: false,
  });

  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    fetchProjects();
    fetchSetupOptions();
    fetchTypeSettings();
    if (isEditing && id) {
      fetchProject();
    }
  }, [id]);

  const fetchSetupOptions = async () => {
    try {
      const [optionsResponse, templatesResponse] = await Promise.all([
        projectsApi.getSetupOptions(),
        projectsApi.getAll({ is_template: true, is_active: "true" }),
      ]);
      setSetupOptions(optionsResponse.data);
      setTemplates(templatesResponse.data || []);
      if (!isEditing) setFormData((current) => ({ ...current, currency_code: optionsResponse.data.base_currency || "RWF" }));
    } catch (error) {
      console.error("Failed to load project setup options:", error);
      toast.error("Some project setup options could not be loaded");
    }
  };

  const fetchTypeSettings = async () => {
    try {
      const response = await projectsApi.getTypeSettings();
      setTypeSettings(response.data || []);
    } catch (error) {
      console.error("Failed to load project type requirements:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response: any = await projectsApi.getAll({ is_active: "true" });
      if (response.success) {
        setProjects(response.data || []);
        const parentId = searchParams.get("parent_id");
        const parent = (response.data || []).find((item: Project) => item._id === parentId);
        if (!isEditing && parent) {
          setFormData((current) => ({
            ...current,
            project_category: parent.project_category,
            client_id: typeof parent.client_id === "string" ? parent.client_id : parent.client_id?._id || "",
            manager_id: typeof parent.manager_id === "string" ? parent.manager_id : parent.manager_id?._id || "",
            sponsor_id: parent.sponsor_id || "",
            team_member_ids: parent.team_member_ids || [],
            currency_code: parent.currency_code || current.currency_code,
            start_date: parent.start_date?.slice(0, 10) || "",
            end_date: parent.end_date?.slice(0, 10) || "",
            scope: parent.scope || "",
            purpose: parent.purpose || "",
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchProject = async () => {
    try {
      const response: any = await projectsApi.getById(id!);
      if (response.success && response.data) {
        const p = response.data;
        setFormData({
          project_code: p.project_code,
          name: p.name,
          description: p.description || "",
          purpose: p.purpose || "",
          project_category: p.project_category || "internal",
          parent_id: p.parent_id ? (typeof p.parent_id === "string" ? p.parent_id : p.parent_id._id) : "",
          type: p.type,
          status: p.status,
          priority: p.priority,
          budget_allocated: p.budget_allocated,
          start_date: p.start_date ? p.start_date.split("T")[0] : "",
          end_date: p.end_date ? p.end_date.split("T")[0] : "",
          client_id: typeof p.client_id === "string" ? p.client_id : p.client_id?._id || "",
          manager_id: typeof p.manager_id === "string" ? p.manager_id : p.manager_id?._id || "",
          billing_type: p.billing_type,
          contract_value: p.contract_value,
          actual_end_date: p.actual_end_date ? p.actual_end_date.split("T")[0] : "",
          sponsor_id: typeof p.sponsor_id === "string" ? p.sponsor_id : p.sponsor_id?._id || "",
          team_member_ids: p.team_member_ids || [],
          currency_code: p.currency_code || "RWF",
          tax_rate_id: p.tax_rate_id || "",
          tax_rate_pct: p.tax_rate_pct || 0,
          tax_inclusive: Boolean(p.tax_inclusive),
          scope: p.scope || "",
          exclusions: p.exclusions || "",
          assumptions: p.assumptions || "",
          constraints: p.constraints || "",
          is_template: Boolean(p.is_template),
        });
      }
    } catch (error) {
      toast.error(t("projects.fetchError", "Failed to fetch project"));
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Project name is required");
      return;
    }

    const configuredRequiredFields = typeSettings.find((item) => item.category === formData.project_category)?.required_fields || [];
    const requiredFields = new Set(configuredRequiredFields);
    if (formData.project_category === "client_job" && !formData.is_template) requiredFields.add("client_id");
    const missingLabels = REQUIRED_PROJECT_FIELDS
      .filter(([field]) => requiredFields.has(field))
      .filter(([field]) => !String(formData[field as keyof ProjectCreateRequest] ?? "").trim())
      .map(([, label]) => label);
    if (missingLabels.length) {
      toast.error(`Complete required project fields: ${missingLabels.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const dataToSubmit = {
        ...formData,
        project_code: formData.project_code || undefined,
        parent_id: formData.parent_id || undefined,
        client_id: formData.client_id || undefined,
        manager_id: formData.manager_id || undefined,
        sponsor_id: formData.sponsor_id || undefined,
        tax_rate_id: formData.tax_rate_id || undefined,
        actual_end_date: formData.actual_end_date || undefined,
      };

      const response: any = isEditing
        ? await projectsApi.update(id!, dataToSubmit)
        : await projectsApi.create(dataToSubmit);

      if (response.success) {
        toast.success(
          isEditing
            ? t("projects.updated", "Project updated successfully")
            : t("projects.created", "Project created successfully")
        );
        navigate(!isEditing && dataToSubmit.is_template ? "/projects?include_templates=true" : "/projects");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          t("projects.saveError", "Failed to save project")
      );
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item._id === templateId);
    if (!template) return;
    setFormData((current) => ({
      ...current,
      project_code: "",
      name: `${template.name} (Copy)`,
      description: template.description || "",
      purpose: template.purpose || "",
      project_category: template.project_category,
      type: template.type,
      priority: template.priority,
      budget_allocated: template.budget_allocated,
      start_date: template.start_date?.split("T")[0] || "",
      end_date: template.end_date?.split("T")[0] || "",
      billing_type: template.billing_type,
      contract_value: template.contract_value,
      currency_code: template.currency_code,
      tax_rate_id: template.tax_rate_id || "",
      tax_rate_pct: template.tax_rate_pct,
      tax_inclusive: template.tax_inclusive,
      scope: template.scope,
      exclusions: template.exclusions,
      assumptions: template.assumptions,
      constraints: template.constraints,
      is_template: false,
    }));
    toast.success("Template applied. Review the details and choose project-specific members and client.");
  };

  const saveRequiredFields = async () => {
    const setting = typeSettings.find((item) => item.category === settingsCategory);
    setSavingTypeSettings(true);
    try {
      await projectsApi.saveTypeSettings(settingsCategory, setting?.required_fields || []);
      toast.success("Required fields saved for this project category");
      fetchTypeSettings();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save required fields");
    } finally {
      setSavingTypeSettings(false);
    }
  };

  const toggleRequiredField = (field: string) => {
    setTypeSettings((current) => {
      const existing = current.find((item) => item.category === settingsCategory) || { category: settingsCategory, required_fields: [] };
      const required_fields = existing.required_fields.includes(field)
        ? existing.required_fields.filter((item) => item !== field)
        : [...existing.required_fields, field];
      return [...current.filter((item) => item.category !== settingsCategory), { ...existing, required_fields }];
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  const selectedParent = projects.find((project) => project._id === formData.parent_id);
  const projectedMargin = (formData.contract_value || 0) - (formData.budget_allocated || 0);

  return (
    <Layout>
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/projects")} className="mt-1 h-9 w-9 shrink-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-950/20">
                  <Briefcase className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
                  {isEditing
                    ? t("projects.edit", "Edit Project")
                    : t("projects.add", "Create Project")}
                </h1>
              </div>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Register project governance, WBS ownership, budget controls, dates, and billing rules in one structured record.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-lg" onClick={() => navigate("/projects")} type="button">
              {t("common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" form="project-form" type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing
                ? t("common.save", "Save Changes")
                : t("common.create", "Create Project")}
            </Button>
          </div>
        </div>
        </div>

        <form id="project-form" onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
          {/* Basic Info */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15">
                  <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                </span>
                {t("projects.basicInfo", "Project Identity")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("projects.basicInfoDesc", "Define the master project record used by budgets, WBS, and reporting.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              {!isEditing && templates.length > 0 && (
                <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <Label>Start from a project template</Label>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choose a saved template (optional)" /></SelectTrigger>
                    <SelectContent>{templates.map((template) => <SelectItem key={template._id} value={template._id}>{template.name} · {template.project_code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="project_code">
                    {t("projects.projectCode", "Project Code")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-11"
                    id="project_code"
                    value={formData.project_code || (isEditing ? "" : "Generated when saved")}
                    readOnly
                    placeholder="Generated automatically"
                    disabled
                  />
                  {!isEditing && <p className="text-xs text-slate-500">A unique company project code is assigned when you save.</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="name">
                    {t("projects.name", "Name")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-11"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("projects.namePlaceholder", "e.g., Kigali Distribution Center Phase 1")}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="description">{t("projects.description", "Description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("projects.descriptionPlaceholder", "Optional description")}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Project Category</Label>
                  <Select value={formData.project_category} onValueChange={(value: any) => setFormData({ ...formData, project_category: value })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{PROJECT_CATEGORIES.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("projects.type", "Type")}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("projects.status", "Status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("projects.priority", "Priority")}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("projects.parentProject", "Parent Project (Optional)")}</Label>
                <Select
                  value={formData.parent_id || "__none__"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parent_id: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t("projects.noParent", "No parent (top level)")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("projects.noParent", "No parent (top level)")}
                    </SelectItem>
                    {projects
                      .filter((p) => p._id !== id)
                      .map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          <span className="font-mono text-xs">{p.wbs_code}</span> {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div className="space-y-2">
                  <Label>Client / Customer{(formData.project_category === "client_job" && !formData.is_template || typeSettings.find((item) => item.category === formData.project_category)?.required_fields.includes("client_id")) && <span className="ml-1 text-red-500">*</span>}</Label>
                  <Select value={formData.client_id || "__none__"} onValueChange={(value) => setFormData({ ...formData, client_id: value === "__none__" ? "" : value })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No client</SelectItem>
                      {(setupOptions?.clients || []).map((client) => <SelectItem key={client._id} value={client._id}>{client.name} · {client.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project Manager{typeSettings.find((item) => item.category === formData.project_category)?.required_fields.includes("manager_id") && <span className="ml-1 text-red-500">*</span>}</Label>
                  <Select value={formData.manager_id || "__none__"} onValueChange={(value) => setFormData({ ...formData, manager_id: value === "__none__" ? "" : value })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Assign a manager" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">Unassigned</SelectItem>{(setupOptions?.users || []).map((user) => <SelectItem key={user._id} value={user._id}>{user.name} · {user.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sponsor</Label>
                  <Select value={formData.sponsor_id || "__none__"} onValueChange={(value) => setFormData({ ...formData, sponsor_id: value === "__none__" ? "" : value })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Assign a sponsor" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">No sponsor</SelectItem>{(setupOptions?.users || []).map((user) => <SelectItem key={user._id} value={user._id}>{user.name} · {user.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Input className="h-11" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="Why this project exists" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Project Team</Label>
                  <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2 dark:border-slate-700">
                    {(setupOptions?.users || []).map((user) => {
                      const checked = formData.team_member_ids?.includes(user._id) || false;
                      return <label key={user._id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={() => setFormData({ ...formData, team_member_ids: checked ? (formData.team_member_ids || []).filter((memberId) => memberId !== user._id) : [...(formData.team_member_ids || []), user._id] })} /><span>{user.name}</span><span className="truncate text-xs text-slate-500">{user.email}</span></label>;
                    })}
                    {setupOptions && setupOptions.users.length === 0 && <p className="text-sm text-slate-500">No active users are available.</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Info */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/15">
                  <CircleDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                </span>
                {t("projects.budgetInfo", "Commercial Controls")}
              </CardTitle>
              <CardDescription>
                Capture approved budget, contract value, and billing method for budget versus actual reporting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="budget_allocated">{t("projects.budgetAllocated", "Budget Allocated")}</Label>
                  <Input
                    className="h-11"
                    id="budget_allocated"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_allocated || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget_allocated: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="contract_value">{t("projects.contractValue", "Contract Value")}</Label>
                  <Input
                    className="h-11"
                    id="contract_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.contract_value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("projects.billingType", "Billing Type")}</Label>
                <Select
                  value={formData.billing_type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, billing_type: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_TYPES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Budget Currency</Label>
                  <Select value={formData.currency_code} onValueChange={(value) => setFormData({ ...formData, currency_code: value })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{(setupOptions?.currencies || []).map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.code} · {currency.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate</Label>
                  <Select value={formData.tax_rate_id || "__none__"} onValueChange={(value) => {
                    const tax = setupOptions?.tax_rates.find((item) => item._id === value);
                    setFormData({ ...formData, tax_rate_id: value === "__none__" ? "" : value, tax_rate_pct: tax?.rate_pct || 0 });
                  }}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="No project tax" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">No project tax</SelectItem>{(setupOptions?.tax_rates || []).map((tax) => <SelectItem key={tax._id} value={tax._id}>{tax.name} · {tax.rate_pct}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={formData.tax_inclusive} onChange={(e) => setFormData({ ...formData, tax_inclusive: e.target.checked })} />
                  Contract value includes the selected tax
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-md border p-3 text-sm dark:border-slate-700">
                <input type="checkbox" checked={formData.is_template} onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })} />
                Save as a reusable project template
              </label>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
              <CardTitle>Scope and Delivery Conditions</CardTitle>
              <CardDescription>Record what the project includes and the assumptions or constraints governing delivery.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              {([ ["scope", "Scope"], ["exclusions", "Exclusions"], ["assumptions", "Assumptions"], ["constraints", "Constraints"] ] as const).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Textarea id={key} rows={4} value={formData[key] || ""} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15">
                  <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                </span>
                {t("projects.timeline", "Delivery Timeline")}
              </CardTitle>
              <CardDescription>
                Set planned start and finish dates for scheduling and progress review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="start_date">{t("projects.startDate", "Start Date")}</Label>
                  <Input
                    className="h-11"
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="end_date">{t("projects.endDate", "End Date")}</Label>
                  <Input
                    className="h-11"
                    id="end_date"
                    type="date"
                    min={formData.start_date || undefined}
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div className="space-y-2">
                  <Label htmlFor="actual_start_date">Actual Start Date</Label>
                  <Input className="h-11" id="actual_start_date" type="date" value={formData.actual_start_date || ""} onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_end_date">Actual End Date</Label>
                  <Input className="h-11" id="actual_end_date" type="date" value={formData.actual_end_date || ""} onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  </span>
                  Control Summary
                </CardTitle>
                <CardDescription>Live review before saving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 text-sm">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-400/25 dark:bg-indigo-500/10">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">Project</div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {formData.name || "Untitled project"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {formData.project_code || (isEditing ? "—" : "Assigned automatically")}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Status</div>
                    <div className="font-medium capitalize">{formData.status?.replace("_", " ")}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Priority</div>
                    <div className="font-medium capitalize">{formData.priority}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Budget</div>
                    <div className="font-medium">{formatCurrency(formData.budget_allocated)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Contract</div>
                    <div className="font-medium">{formatCurrency(formData.contract_value)}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <FolderTree className="h-3.5 w-3.5" />
                    WBS Placement
                  </div>
                  <div className="mt-2 text-slate-900 dark:text-slate-100">
                    {selectedParent ? `${selectedParent.wbs_code} - ${selectedParent.name}` : "Top-level project"}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Projected margin</div>
                  <div className={`mt-1 text-lg font-semibold ${projectedMargin < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(projectedMargin)}
                  </div>
                </div>
                <Button className="h-11 w-full rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isEditing ? "Save project" : "Create project"}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </form>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Required Fields by Project Category</CardTitle>
            <CardDescription>Choose which setup fields users must complete for each category. Client is always required for a client job.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="max-w-sm space-y-2">
              <Label>Project Category</Label>
              <Select value={settingsCategory} onValueChange={(value: any) => setSettingsCategory(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_CATEGORIES.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REQUIRED_PROJECT_FIELDS.map(([field, label]) => {
                const selected = typeSettings.find((item) => item.category === settingsCategory)?.required_fields.includes(field) || false;
                return <label key={field} className="flex items-center gap-2 rounded-md border p-3 text-sm dark:border-slate-800"><input type="checkbox" checked={selected} onChange={() => toggleRequiredField(field)} />{label}</label>;
              })}
            </div>
            <Button type="button" variant="outline" onClick={saveRequiredFields} disabled={savingTypeSettings}>
              {savingTypeSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Category Requirements
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
