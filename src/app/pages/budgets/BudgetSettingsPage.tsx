import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../../layout/Layout';
import {
  Settings,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  GitBranch,
  CheckCircle,
  Star,
  Play,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  X,
  Info,
  Lightbulb,
  Users,
  BarChart3,
  Zap,
  Layers,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { accessApi, budgetsApi } from '@/lib/api';
import { useFormatCurrency } from '@/lib/currencyUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';

interface WorkflowStep {
  step_number: number;
  step_name: string;
  description?: string;
  approver_type: 'user' | 'role' | 'department_head' | 'any_manager' | 'specific_user';
  approver_id?: string | null;
  approver_role?: string | null;
  required_approvals: number;
  min_amount?: number;
  max_amount?: number | null;
  can_reject: boolean;
  can_request_changes: boolean;
  can_delegate: boolean;
  auto_approve_hours?: number | null;
}

interface WorkflowSettings {
  allow_parallel_approvals: boolean;
  require_all_steps: boolean;
  notify_requester_on_approval: boolean;
  notify_requester_on_rejection: boolean;
  escalation_hours: number;
  escalation_user_id?: string | null;
}

interface WorkflowConfig {
  _id: string;
  name: string;
  description: string;
  workflow_type: 'budget_creation' | 'budget_transfer' | 'budget_adjustment' | 'encumbrance' | 'expense' | 'all';
  min_amount: number;
  max_amount: number | null;
  department_scope: 'all' | 'specific';
  department_ids: string[];
  steps: WorkflowStep[];
  is_active: boolean;
  is_default: boolean;
  priority: number;
  settings: WorkflowSettings;
  usage_count: number;
  createdAt: string;
  updatedAt: string;
}

const WORKFLOW_TYPES = [
  { value: 'budget_creation', label: 'Budget Creation' },
  { value: 'budget_transfer', label: 'Budget Transfer' },
  { value: 'budget_adjustment', label: 'Budget Adjustment' },
  { value: 'encumbrance', label: 'Encumbrance' },
  { value: 'expense', label: 'Expense' },
  { value: 'all', label: 'All Types' },
];

const APPROVER_TYPES = [
  { value: 'user', label: 'Specific User' },
  { value: 'role', label: 'Role-based' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'any_manager', label: 'Any Manager' },
  { value: 'specific_user', label: 'Named User' },
];

const defaultStep = (): WorkflowStep => ({
  step_number: 1,
  step_name: '',
  description: '',
  approver_type: 'role',
  approver_id: null,
  approver_role: 'accountant',
  required_approvals: 1,
  min_amount: 0,
  max_amount: null,
  can_reject: true,
  can_request_changes: true,
  can_delegate: false,
  auto_approve_hours: null,
});

const defaultSettings = (): WorkflowSettings => ({
  allow_parallel_approvals: false,
  require_all_steps: true,
  notify_requester_on_approval: true,
  notify_requester_on_rejection: true,
  escalation_hours: 48,
  escalation_user_id: null,
});

export default function BudgetSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [availableApproverRoles, setAvailableApproverRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'test' | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<WorkflowConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<WorkflowConfig | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWorkflowType, setFormWorkflowType] = useState<'budget_creation' | 'budget_transfer' | 'budget_adjustment' | 'encumbrance' | 'expense' | 'all'>('budget_creation');
  const [formMinAmount, setFormMinAmount] = useState('0');
  const [formMaxAmount, setFormMaxAmount] = useState('');
  const [formDepartmentScope, setFormDepartmentScope] = useState<'all' | 'specific'>('all');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formPriority, setFormPriority] = useState('0');
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([defaultStep()]);
  const [formSettings, setFormSettings] = useState<WorkflowSettings>(defaultSettings());

  // Test form state
  const [testWorkflowType, setTestWorkflowType] = useState('budget_creation');
  const [testAmount, setTestAmount] = useState('');
  const [testDepartmentId, setTestDepartmentId] = useState('');
  const [testResult, setTestResult] = useState<WorkflowConfig | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testHasRun, setTestHasRun] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await budgetsApi.getWorkflowConfigs() as any;
      setConfigs(response.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load workflow configurations');
    } finally {
      setLoading(false);
    }
  };

  const fetchApproverRoles = async () => {
    try {
      const response = await accessApi.getRoles() as { success: boolean; data?: Array<{ name: string }> };
      setAvailableApproverRoles((response.data || []).map(role => role.name).filter(Boolean));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roles for budget approvers');
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchApproverRoles();
  }, []);

  const filteredConfigs = configs.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.workflow_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedConfig(null);
    setFormName('');
    setFormDescription('');
    setFormWorkflowType('budget_creation');
    setFormMinAmount('0');
    setFormMaxAmount('');
    setFormDepartmentScope('all');
    setFormIsDefault(false);
    setFormPriority('0');
    setFormSteps([defaultStep()]);
    setFormSettings(defaultSettings());
    setExpandedSteps([0]);
    setTestResult(null);
    setTestHasRun(false);
    setTestAmount('');
    setTestDepartmentId('');
  };

  const openCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormWorkflowType('budget_creation');
    setFormMinAmount('0');
    setFormMaxAmount('');
    setFormDepartmentScope('all');
    setFormIsDefault(false);
    setFormPriority('0');
    setFormSteps([defaultStep()]);
    setFormSettings(defaultSettings());
    setExpandedSteps([0]);
    setDrawerMode('create');
  };

  const openEdit = (config: WorkflowConfig) => {
    setSelectedConfig(config);
    setFormName(config.name);
    setFormDescription(config.description);
    setFormWorkflowType(config.workflow_type);
    setFormMinAmount(String(config.min_amount || 0));
    setFormMaxAmount(config.max_amount ? String(config.max_amount) : '');
    setFormDepartmentScope(config.department_scope);
    setFormIsDefault(config.is_default);
    setFormPriority(String(config.priority));
    setFormSteps(config.steps.length > 0 ? config.steps : [defaultStep()]);
    setFormSettings({ ...defaultSettings(), ...config.settings });
    setExpandedSteps([0]);
    setDrawerMode('edit');
  };

  const openTest = () => {
    setTestWorkflowType('budget_creation');
    setTestAmount('');
    setTestDepartmentId('');
    setTestResult(null);
    setTestHasRun(false);
    setDrawerMode('test');
  };

  const handleAddStep = () => {
    const newStep = defaultStep();
    newStep.step_number = formSteps.length + 1;
    setFormSteps([...formSteps, newStep]);
    setExpandedSteps([...expandedSteps, formSteps.length]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = formSteps.filter((_, i) => i !== index);
    // Re-number steps
    newSteps.forEach((step, i) => { step.step_number = i + 1; });
    setFormSteps(newSteps);
    setExpandedSteps(expandedSteps.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const handleStepChange = (index: number, field: keyof WorkflowStep, value: any) => {
    const newSteps = [...formSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormSteps(newSteps);
  };

  const toggleStepExpanded = (index: number) => {
    if (expandedSteps.includes(index)) {
      setExpandedSteps(expandedSteps.filter(i => i !== index));
    } else {
      setExpandedSteps([...expandedSteps, index]);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error('Workflow name is required'); return; }
    if (formSteps.length === 0) { toast.error('At least one approval step is required'); return; }
    if (formSteps.some(s => !s.step_name.trim())) { toast.error('All steps must have a name'); return; }

    setActionLoading('create');
    try {
      await budgetsApi.createWorkflowConfig({
        name: formName,
        description: formDescription,
        workflow_type: formWorkflowType,
        min_amount: parseFloat(formMinAmount) || 0,
        max_amount: formMaxAmount ? parseFloat(formMaxAmount) : null,
        department_scope: formDepartmentScope,
        department_ids: [],
        steps: formSteps,
        is_default: formIsDefault,
        priority: parseInt(formPriority) || 0,
        settings: formSettings,
      });
      toast.success('Workflow configuration created');
      closeDrawer();
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workflow configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedConfig) return;
    if (!formName.trim()) { toast.error('Workflow name is required'); return; }
    if (formSteps.length === 0) { toast.error('At least one approval step is required'); return; }
    if (formSteps.some(s => !s.step_name.trim())) { toast.error('All steps must have a name'); return; }

    setActionLoading('update');
    try {
      await budgetsApi.updateWorkflowConfig(selectedConfig._id, {
        name: formName,
        description: formDescription,
        workflow_type: formWorkflowType,
        min_amount: parseFloat(formMinAmount) || 0,
        max_amount: formMaxAmount ? parseFloat(formMaxAmount) : null,
        department_scope: formDepartmentScope,
        department_ids: [],
        steps: formSteps,
        is_default: formIsDefault,
        priority: parseInt(formPriority) || 0,
        settings: formSettings,
      });
      toast.success('Workflow configuration updated');
      closeDrawer();
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update workflow configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteDialog = (config: WorkflowConfig) => {
    setConfigToDelete(config);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    setActionLoading(configToDelete._id);
    try {
      await budgetsApi.deleteWorkflowConfig(configToDelete._id);
      toast.success('Workflow configuration deleted');
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workflow configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (config: WorkflowConfig) => {
    setActionLoading(`default-${config._id}`);
    try {
      await budgetsApi.setDefaultWorkflowConfig(config._id);
      toast.success('Workflow set as default');
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default workflow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestWorkflow = async () => {
    setTestLoading(true);
    setTestHasRun(true);
    try {
      const response = await budgetsApi.testWorkflowMatch({
        workflow_type: testWorkflowType,
        amount: testAmount ? parseFloat(testAmount) : 0,
        department_id: testDepartmentId || null,
      }) as any;
      setTestResult(response.data?.workflow || null);
      if (!response.data?.workflow) {
        toast.info('No matching workflow found for the given criteria');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to test workflow match');
    } finally {
      setTestLoading(false);
    }
  };

  const formatCurrency = useFormatCurrency();

  const getWorkflowTypeLabel = (type: string) => {
    return WORKFLOW_TYPES.find(t => t.value === type)?.label || type;
  };

  const getApproverTypeLabel = (type: string) => {
    return APPROVER_TYPES.find(t => t.value === type)?.label || type;
  };

  // Metrics
  const totalConfigs = configs.length;
  const activeConfigs = configs.filter(c => c.is_active).length;
  const defaultConfigs = configs.filter(c => c.is_default).length;
  const totalSteps = configs.reduce((sum, c) => sum + c.steps.length, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* ── Hero Header ── */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <Settings className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Budget Workflow Settings
                  </h1>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Configure multi-level approval workflows for budgets, transfers, and expenses.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <BarChart3 className="mr-1 h-3 w-3" />
                    {totalConfigs} workflows
                  </Badge>
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <Zap className="mr-1 h-3 w-3" />
                    {activeConfigs} active
                  </Badge>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={openCreate}
                    className="h-10 gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                  >
                    <Plus className="h-4 w-4" />
                    Create Workflow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openTest}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Play className="h-4 w-4" />
                    Test Match
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/budgets')}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Workflows</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{totalConfigs}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeConfigs}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Default Set</p>
                  <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{defaultConfigs}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Steps</p>
                  <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">{totalSteps}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Metric Tiles ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-lg" />
                      </div>
                      <Skeleton className="mt-3 h-3 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Workflows</p>
                        <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{totalConfigs}</p>
                      </div>
                      <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                        <Layers className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Configured approval flows</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</p>
                        <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeConfigs}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                        <Zap className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Currently in use</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Default</p>
                        <p className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">{defaultConfigs}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                        <Star className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Auto-assigned workflows</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Steps</p>
                        <p className="mt-3 text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSteps}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Approval steps across all flows</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ── Search ── */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-10 pl-10 bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Configs Grid ── */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/50">
              <GitBranch className="h-12 w-12 text-slate-300 mx-auto mb-4 dark:text-slate-600" />
              <h3 className="text-lg font-medium mb-2 text-slate-900 dark:text-white">No workflow configurations</h3>
              <p className="text-slate-500 mb-4 dark:text-slate-400">Create your first approval workflow to get started</p>
              <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredConfigs.map(config => (
                <Card
                  key={config._id}
                  className={`overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950 ${
                    config.is_default ? 'ring-1 ring-violet-500/30 dark:ring-violet-500/20' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          config.is_default
                            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60'
                            : 'bg-slate-50 text-slate-700 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
                        }`}>
                          <GitBranch className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{config.name}</CardTitle>
                        </div>
                        {config.is_default && (
                          <Badge className="text-xs bg-violet-600 text-white shrink-0">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        {!config.is_active && (
                          <Badge variant="destructive" className="text-xs shrink-0">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!config.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleSetDefault(config)}
                            disabled={actionLoading === `default-${config._id}`}
                            title="Set as default"
                          >
                            {actionLoading === `default-${config._id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4 text-amber-500" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(config)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => openDeleteDialog(config)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-xs mt-1 line-clamp-1">{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {/* Workflow Info */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs dark:bg-slate-800 dark:text-slate-300">
                        {getWorkflowTypeLabel(config.workflow_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {formatCurrency(config.min_amount)} - {formatCurrency(config.max_amount)}
                      </Badge>
                      <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">
                        <Building2 className="h-3 w-3 mr-1" />
                        {config.department_scope === 'all' ? 'All Departments' : 'Specific'}
                      </Badge>
                    </div>

                    {/* Steps Preview */}
                    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {config.steps.length} approval step{config.steps.length !== 1 ? 's' : ''}
                      </div>
                      <div className="space-y-2">
                        {config.steps.slice(0, 3).map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <div className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 text-[10px] flex items-center justify-center font-bold dark:bg-violet-950/40 dark:text-violet-300">
                              {step.step_number}
                            </div>
                            <span className="truncate text-slate-700 dark:text-slate-300">{step.step_name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">({getApproverTypeLabel(step.approver_type)})</span>
                          </div>
                        ))}
                        {config.steps.length > 3 && (
                          <div className="text-[10px] text-slate-400 pl-7 dark:text-slate-500">
                            +{config.steps.length - 3} more steps
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 dark:text-slate-500">
                      <span>Used {config.usage_count} times</span>
                      <span className="text-slate-300 dark:text-slate-600">{new Date(config.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Bottom Explanatory Cards ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">How It Works</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Budget workflows define multi-step approval chains for budget creation, transfers, adjustments, and expenses.
                      When a user submits a budget request, the system automatically routes it through the configured approvers.
                      Each step can require a specific role (e.g., Finance Manager, CFO) or department head.
                      Set amount ranges and department scope so the right workflow matches each request.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Configuration Tips</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      1. Create one workflow per budget type (creation, transfer, expense). 2. Use priority to control which
                      workflow is picked when multiple match. 3. Set a default workflow so requests always have a fallback.
                      4. Use amount ranges to escalate large budgets to higher approvers. 5. Enable notifications so requesters
                      get updates at each step. Use Test Match to verify your setup before going live.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Drawer ── */}
          {drawerMode && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
              <div className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-white border-l border-slate-200 z-50 shadow-xl flex flex-col dark:bg-slate-950 dark:border-slate-800">

                {/* Create / Edit */}
                {(drawerMode === 'create' || drawerMode === 'edit') && (
                  <>
                    <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-950 dark:text-white">
                          {drawerMode === 'create' ? <Plus className="h-5 w-5 text-violet-600" /> : <Edit2 className="h-5 w-5 text-violet-600" />}
                          {drawerMode === 'create' ? 'Create Workflow' : 'Edit Workflow'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {drawerMode === 'create'
                            ? 'Define a new multi-level approval workflow'
                            : `Editing: ${selectedConfig?.name}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={closeDrawer} className="dark:text-slate-300"><X className="h-4 w-4" /></Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Basic Info</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-slate-700 dark:text-slate-300">Workflow Name *</Label>
                            <Input
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              placeholder="e.g., Standard Budget Approval"
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                            <Textarea
                              value={formDescription}
                              onChange={e => setFormDescription(e.target.value)}
                              placeholder="What this workflow is used for..."
                              rows={2}
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">Workflow Type</Label>
                            <Select value={formWorkflowType} onValueChange={v => setFormWorkflowType(v as any)}>
                              <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                {WORKFLOW_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value} className="dark:text-slate-300 dark:focus:bg-slate-800">{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">Priority</Label>
                            <Input
                              type="number"
                              value={formPriority}
                              onChange={e => setFormPriority(e.target.value)}
                              placeholder="Higher = preferred"
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Amount Range */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount Range</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">Minimum Amount</Label>
                            <Input
                              type="number"
                              value={formMinAmount}
                              onChange={e => setFormMinAmount(e.target.value)}
                              placeholder="0"
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">Maximum Amount (empty = no limit)</Label>
                            <Input
                              type="number"
                              value={formMaxAmount}
                              onChange={e => setFormMaxAmount(e.target.value)}
                              placeholder="No limit"
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Department Scope & Default */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scope & Defaults</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">Department Scope</Label>
                            <Select value={formDepartmentScope} onValueChange={v => setFormDepartmentScope(v as any)}>
                              <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                <SelectItem value="all" className="dark:text-slate-300 dark:focus:bg-slate-800">All Departments</SelectItem>
                                <SelectItem value="specific" className="dark:text-slate-300 dark:focus:bg-slate-800">Specific Departments</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Switch
                              id="is-default"
                              checked={formIsDefault}
                              onCheckedChange={setFormIsDefault}
                            />
                            <Label htmlFor="is-default" className="cursor-pointer text-slate-700 dark:text-slate-300">
                              Set as default workflow for this type
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Approval Steps</h3>
                          <Button variant="outline" size="sm" onClick={handleAddStep} className="gap-2 dark:border-slate-700 dark:text-slate-200">
                            <Plus className="h-4 w-4" />
                            Add Step
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {formSteps.map((step, index) => (
                            <Collapsible
                              key={index}
                              open={expandedSteps.includes(index)}
                              onOpenChange={() => toggleStepExpanded(index)}
                            >
                              <div className="border border-slate-200 rounded-lg overflow-hidden dark:border-slate-700">
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-3 bg-slate-50/70 cursor-pointer dark:bg-slate-900/50">
                                    <div className="flex items-center gap-3">
                                      <div className="h-6 w-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">
                                        {step.step_number}
                                      </div>
                                      <span className="font-medium text-slate-900 dark:text-white">
                                        {step.step_name || `Step ${step.step_number}`}
                                      </span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500">
                                        ({getApproverTypeLabel(step.approver_type)})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {formSteps.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400"
                                          onClick={(e) => { e.stopPropagation(); handleRemoveStep(index); }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {expandedSteps.includes(index) ? (
                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="p-4 space-y-4 bg-white dark:bg-slate-950">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Step Name *</Label>
                                        <Input
                                          value={step.step_name}
                                          onChange={e => handleStepChange(index, 'step_name', e.target.value)}
                                          placeholder="e.g., Department Manager Approval"
                                          className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Approver Type</Label>
                                        <Select
                                          value={step.approver_type}
                                          onValueChange={v => handleStepChange(index, 'approver_type', v)}
                                        >
                                          <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                            {APPROVER_TYPES.map(t => (
                                              <SelectItem key={t.value} value={t.value} className="dark:text-slate-300 dark:focus:bg-slate-800">{t.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {step.approver_type === 'role' && (
                                      <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Approver Role</Label>
                                        <Select
                                          value={step.approver_role || ''}
                                          onValueChange={v => handleStepChange(index, 'approver_role', v)}
                                        >
                                          <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                            {[...new Set([...availableApproverRoles, ...formSteps.map(formStep => formStep.approver_role).filter((role): role is string => Boolean(role))])].sort().map(r => (
                                              <SelectItem key={r} value={r} className="dark:text-slate-300 dark:focus:bg-slate-800">{r.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          Only users assigned this exact role can approve this step. Assign this role to at least one user in User Management.
                                        </p>
                                        {step.approver_role && !availableApproverRoles.some(role => role.toLowerCase() === step.approver_role?.toLowerCase()) && (
                                          <p className="text-xs text-amber-700 dark:text-amber-300">
                                            This role is not currently available in your company. Choose an existing role or create and assign it in Role Settings.
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Required Approvals</Label>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={step.required_approvals}
                                          onChange={e => handleStepChange(index, 'required_approvals', parseInt(e.target.value) || 1)}
                                          className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Auto-approve (hours)</Label>
                                        <Input
                                          type="number"
                                          placeholder="No auto-approve"
                                          value={step.auto_approve_hours || ''}
                                          onChange={e => handleStepChange(index, 'auto_approve_hours', e.target.value ? parseInt(e.target.value) : null)}
                                          className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-2">
                                      <div className="flex items-center space-x-2">
                                        <Switch
                                          id={`can-reject-${index}`}
                                          checked={step.can_reject}
                                          onCheckedChange={v => handleStepChange(index, 'can_reject', v)}
                                        />
                                        <Label htmlFor={`can-reject-${index}`} className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">Can Reject</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Switch
                                          id={`can-request-${index}`}
                                          checked={step.can_request_changes}
                                          onCheckedChange={v => handleStepChange(index, 'can_request_changes', v)}
                                        />
                                        <Label htmlFor={`can-request-${index}`} className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">Can Request Changes</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Switch
                                          id={`can-delegate-${index}`}
                                          checked={step.can_delegate}
                                          onCheckedChange={v => handleStepChange(index, 'can_delegate', v)}
                                        />
                                        <Label htmlFor={`can-delegate-${index}`} className="cursor-pointer text-sm text-slate-700 dark:text-slate-300">Can Delegate</Label>
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))}
                        </div>
                      </div>

                      {/* Settings */}
                      <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workflow Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="allow-parallel"
                              checked={formSettings.allow_parallel_approvals}
                              onCheckedChange={v => setFormSettings({ ...formSettings, allow_parallel_approvals: v })}
                            />
                            <Label htmlFor="allow-parallel" className="cursor-pointer text-slate-700 dark:text-slate-300">Allow Parallel Approvals</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="require-all-steps"
                              checked={formSettings.require_all_steps}
                              onCheckedChange={v => setFormSettings({ ...formSettings, require_all_steps: v })}
                            />
                            <Label htmlFor="require-all-steps" className="cursor-pointer text-slate-700 dark:text-slate-300">Require All Steps</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="notify-approval"
                              checked={formSettings.notify_requester_on_approval}
                              onCheckedChange={v => setFormSettings({ ...formSettings, notify_requester_on_approval: v })}
                            />
                            <Label htmlFor="notify-approval" className="cursor-pointer text-slate-700 dark:text-slate-300">Notify requester on approval</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="notify-rejection"
                              checked={formSettings.notify_requester_on_rejection}
                              onCheckedChange={v => setFormSettings({ ...formSettings, notify_requester_on_rejection: v })}
                            />
                            <Label htmlFor="notify-rejection" className="cursor-pointer text-slate-700 dark:text-slate-300">Notify requester on rejection</Label>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">Escalation Hours</Label>
                            <Input
                              type="number"
                              value={formSettings.escalation_hours}
                              onChange={e => setFormSettings({ ...formSettings, escalation_hours: parseInt(e.target.value) || 48 })}
                              className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                      <Button
                        onClick={drawerMode === 'create' ? handleCreate : handleUpdate}
                        className="w-full gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                        disabled={actionLoading === 'create' || actionLoading === 'update'}
                      >
                        {(actionLoading === 'create' || actionLoading === 'update') ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {drawerMode === 'create' ? 'Create Workflow' : 'Save Changes'}
                      </Button>
                    </div>
                  </>
                )}

                {/* Test Workflow */}
                {drawerMode === 'test' && (
                  <>
                    <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-950 dark:text-white">
                          <Play className="h-5 w-5 text-violet-600" />
                          Test Workflow Match
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Find which workflow would match given criteria
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={closeDrawer} className="dark:text-slate-300"><X className="h-4 w-4" /></Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">Workflow Type</Label>
                          <Select value={testWorkflowType} onValueChange={setTestWorkflowType}>
                            <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                              {WORKFLOW_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value} className="dark:text-slate-300 dark:focus:bg-slate-800">{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">Amount</Label>
                          <Input
                            type="number"
                            value={testAmount}
                            onChange={e => setTestAmount(e.target.value)}
                            placeholder="Enter amount..."
                            className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">Department ID (optional)</Label>
                          <Input
                            value={testDepartmentId}
                            onChange={e => setTestDepartmentId(e.target.value)}
                            placeholder="Enter department ID..."
                            className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleTestWorkflow}
                        className="w-full gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                        disabled={testLoading}
                      >
                        {testLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Test Match
                      </Button>

                      {testResult && (
                        <Card className="border-violet-200 dark:border-violet-900/40">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                              <span className="text-slate-950 dark:text-white">Matching Workflow Found</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{testResult.name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">{testResult.description}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">{getWorkflowTypeLabel(testResult.workflow_type)}</Badge>
                              <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">
                                {formatCurrency(testResult.min_amount)} - {formatCurrency(testResult.max_amount)}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">{testResult.steps.length} steps:</span>
                              <ul className="mt-1 space-y-1">
                                {testResult.steps.map((step, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <span className="h-4 w-4 rounded-full bg-violet-100 text-violet-700 text-[10px] flex items-center justify-center font-bold dark:bg-violet-950/40 dark:text-violet-300">
                                      {step.step_number}
                                    </span>
                                    {step.step_name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {testHasRun && testResult === null && !testLoading && (
                        <div className="text-center py-8 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">No Matching Workflow</h3>
                          <p className="text-slate-500 dark:text-slate-400">No workflow configuration matches the given criteria</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Delete Confirmation Dialog ── */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950">
              <div className="bg-slate-950 px-6 pb-6 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 ring-1 ring-red-500/30">
                    <AlertTriangle className="h-5 w-5 text-red-300" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Action</p>
                    <h3 className="text-lg font-bold text-white">Delete Workflow</h3>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to delete "{configToDelete?.name}"? This action cannot be undone.
                </p>
              </div>
              <DialogFooter className="px-6 pb-6">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!!actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
