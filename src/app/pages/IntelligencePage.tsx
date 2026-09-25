import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity, AlertTriangle, Bot, Check, ChevronDown, ChevronUp, CircleAlert,
  FileBarChart2, Lightbulb, Loader2, RefreshCw, ShieldCheck, Sparkles,
  TrendingUp, X,
} from 'lucide-react';
import {
  aiIntelligenceService,
  type AIFact,
  type AIFinding,
  type AIForecast,
  type AIProposal,
  type AIProvider,
  type AIRecommendation,
  type AIReport,
  type AIPreferences,
} from '@/services/aiIntelligenceService';

type TabKey = 'briefing' | 'findings' | 'recommendations' | 'forecasts' | 'reports' | 'proposals' | 'providers';
type TypeOption = { type: string; title: string };

const TABS: Array<{ id: TabKey; label: string; icon: React.ElementType }> = [
  { id: 'briefing', label: 'Briefing', icon: Activity },
  { id: 'findings', label: 'Findings', icon: CircleAlert },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
  { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'proposals', label: 'Proposals', icon: ShieldCheck },
  { id: 'providers', label: 'Provider health', icon: Bot },
];

function displayValue(value: unknown) {
  if (value === null || value === undefined) return 'Not provided';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function errorText(error: unknown) {
  const value = error as { message?: string; response?: { data?: { message?: string } } };
  return value?.response?.data?.message || value?.message || 'The request failed. Please try again.';
}

function recordId(row: Record<string, unknown>) {
  return String(row.reportId || row.forecastId || row.id || '');
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <Sparkles className="mx-auto h-7 w-7 text-cyan-600 dark:text-cyan-300" />
      <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function EvidenceList({ facts }: { facts: AIFact[] }) {
  if (!facts?.length) return <p className="text-sm text-slate-500">No source facts were attached to this item.</p>;
  return (
    <div className="space-y-2">
      {facts.map((fact) => (
        <div key={fact.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fact.label}</p>
            <span className="text-[11px] text-slate-500">{fact.domain || fact.sourceMethod || 'Source fact'}{fact.unit ? ` · ${fact.unit}` : ''}</span>
          </div>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">{displayValue(fact.value)}</pre>
          {(fact.sourceService || fact.sourceMethod || fact.sourceIds?.length) && (
            <p className="mt-2 text-[10px] text-slate-400">{[fact.sourceService, fact.sourceMethod, fact.sourceIds?.length ? `Source IDs: ${fact.sourceIds.join(', ')}` : ''].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function EvidenceDisclosure({ facts, finding }: { facts?: AIFact[]; finding?: { title: string; domain?: string } }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedFacts, setLoadedFacts] = useState<AIFact[] | null>(null);

  const reveal = async () => {
    const next = !open;
    setOpen(next);
    if (!next || facts?.length || loadedFacts) return;
    setLoading(true);
    setError('');
    try {
      const response = await aiIntelligenceService.context(finding?.title || 'Show evidence for this AI recommendation', finding?.domain ? [finding.domain] : undefined);
      setLoadedFacts(response.context?.facts || []);
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <button type="button" onClick={reveal} className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-100">
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? 'Hide evidence' : `Show evidence${facts?.length ? ` (${facts.length})` : ''}`}
      </button>
      {open && <div className="mt-3">{loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-600" /> : error ? <p className="text-sm text-rose-600">{error}</p> : <EvidenceList facts={facts?.length ? facts : loadedFacts || []} />}</div>}
    </div>
  );
}

function ItemCard({ title, summary, badge, children }: { title: string; summary?: string; badge?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-2">
        <div className="min-w-0"><CardTitle className="text-sm leading-5">{title}</CardTitle>{summary && <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{summary}</p>}</div>
        {badge}
      </CardHeader>
      {children && <CardContent className="p-4 pt-2">{children}</CardContent>}
    </Card>
  );
}

function statusTone(status: string) {
  if (['critical', 'high', 'failed', 'rejected'].includes(status.toLowerCase())) return 'destructive' as const;
  if (['approved', 'executed', 'forecasted', 'healthy'].includes(status.toLowerCase())) return 'default' as const;
  return 'secondary' as const;
}

export default function IntelligencePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  const [tab, setTab] = useState<TabKey>('briefing');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [briefing, setBriefing] = useState<Record<string, unknown> | null>(null);
  const [preferences, setPreferences] = useState<AIPreferences | null>(null);
  const [findings, setFindings] = useState<AIFinding[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [forecastTypes, setForecastTypes] = useState<TypeOption[]>([]);
  const [forecasts, setForecasts] = useState<AIForecast[]>([]);
  const [reportTypes, setReportTypes] = useState<TypeOption[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [proposals, setProposals] = useState<AIProposal[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [forecastType, setForecastType] = useState('');
  const [reportType, setReportType] = useState('');
  const [horizon, setHorizon] = useState(3);
  const [historyMonths, setHistoryMonths] = useState(24);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async (target: TabKey = tab) => {
    setLoading(true);
    setError('');
    try {
      if (target === 'briefing') {
        const [briefingResult, preferenceResult] = await Promise.all([
          aiIntelligenceService.getBriefing(), aiIntelligenceService.getPreferences(),
        ]);
        setBriefing(briefingResult.briefing || null);
        setPreferences(preferenceResult.preferences || null);
      } else if (target === 'findings') {
        const result = await aiIntelligenceService.getFindings();
        setFindings(result.findings || []);
      } else if (target === 'recommendations') {
        const result = await aiIntelligenceService.runRecommendations();
        setRecommendations(result.recommendations || []);
      } else if (target === 'forecasts') {
        const [typesResult, result] = await Promise.all([aiIntelligenceService.getForecastTypes(), aiIntelligenceService.getForecasts()]);
        setForecastTypes(typesResult.types || []);
        setForecasts(result.forecasts || []);
        setForecastType((current) => current || typesResult.types?.[0]?.type || '');
      } else if (target === 'reports') {
        const [typesResult, result] = await Promise.all([aiIntelligenceService.getReportTypes(), aiIntelligenceService.getReports()]);
        setReportTypes(typesResult.types || []);
        setReports(result.reports || []);
        setReportType((current) => current || typesResult.types?.[0]?.type || '');
      } else if (target === 'proposals') {
        const result = await aiIntelligenceService.getProposals();
        setProposals(result.proposals || []);
      } else if (target === 'providers' && isAdmin) {
        const result = await aiIntelligenceService.getProviderHealth();
        setProviders(result.providers || []);
      }
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, tab]);

  useEffect(() => { void load(tab); }, [tab, load]);

  const counts = useMemo(() => ({
    findings: findings.length,
    recommendations: recommendations.length,
    proposals: proposals.filter((proposal) => ['draft', 'pending_approval'].includes(proposal.status)).length,
  }), [findings, recommendations, proposals]);

  const runFindings = async () => {
    setActionLoading('findings'); setError('');
    try { await aiIntelligenceService.runFindings(); const result = await aiIntelligenceService.getFindings(); setFindings(result.findings || []); }
    catch (requestError) { setError(errorText(requestError)); }
    finally { setActionLoading(''); }
  };

  const updatePreference = async (patch: Partial<AIPreferences>) => {
    if (!preferences) return;
    setActionLoading('preferences'); setError('');
    try { const result = await aiIntelligenceService.updatePreferences({ ...preferences, ...patch }); setPreferences(result.preferences); }
    catch (requestError) { setError(errorText(requestError)); }
    finally { setActionLoading(''); }
  };

  const createForecast = async () => {
    if (!forecastType) return;
    setActionLoading('forecast'); setError('');
    try {
      await aiIntelligenceService.createForecast(forecastType, horizon, historyMonths);
      const result = await aiIntelligenceService.getForecasts(); setForecasts(result.forecasts || []);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setActionLoading(''); }
  };

  const createReport = async () => {
    if (!reportType) return;
    setActionLoading('report'); setError('');
    try {
      await aiIntelligenceService.createReport(reportType, { from: `${dateFrom}T00:00:00.000Z`, to: `${dateTo}T23:59:59.999Z` });
      const result = await aiIntelligenceService.getReports(); setReports(result.reports || []);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setActionLoading(''); }
  };

  const reviewProposal = async (proposal: AIProposal, action: 'approve' | 'reject' | 'execute') => {
    setActionLoading(`${action}:${proposal.id}`); setError('');
    try {
      if (action === 'approve') await aiIntelligenceService.approveProposal(proposal.id);
      else if (action === 'reject') {
        const reason = window.prompt('Reason for rejecting this proposal?') || '';
        if (!reason.trim()) { setActionLoading(''); return; }
        await aiIntelligenceService.rejectProposal(proposal.id, reason.trim());
      } else await aiIntelligenceService.executeProposal(proposal.id);
      const result = await aiIntelligenceService.getProposals(); setProposals(result.proposals || []);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setActionLoading(''); }
  };

  const downloadReport = async (report: AIReport, format: 'json' | 'csv' | 'xlsx' | 'pdf') => {
    const id = recordId(report as unknown as Record<string, unknown>);
    setActionLoading(`download:${id}`); setError('');
    try {
      const blob = await aiIntelligenceService.exportReport(id, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${report.reportType || 'ai-report'}-${id}.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setActionLoading(''); }
  };

  const availableTabs = TABS.filter((item) => item.id !== 'providers' || isAdmin);

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
            <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> KUBIKA Intelligence</div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Business signals, grounded in your data</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Review evidence-backed findings, forecasts, reports, and proposed actions. Each view follows your company and data permissions.</p>
              </div>
              <Button variant="outline" onClick={() => void load()} disabled={loading} className="shrink-0 gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh view</Button>
            </div>
          </section>

          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              {availableTabs.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="shrink-0 gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm"><Icon className="h-4 w-4" />{label}{id === 'findings' && counts.findings > 0 ? ` · ${counts.findings}` : id === 'recommendations' && counts.recommendations > 0 ? ` · ${counts.recommendations}` : id === 'proposals' && counts.proposals > 0 ? ` · ${counts.proposals}` : ''}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading intelligence data…</div>}

          {tab === 'briefing' && <section className="space-y-4">
            {briefing ? <>
              <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white dark:border-cyan-900 dark:from-cyan-950/40 dark:to-slate-900"><CardContent className="p-5"><div className="flex items-start gap-3"><Activity className="mt-1 h-5 w-5 text-cyan-700 dark:text-cyan-300"/><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-200">Latest briefing · {String(briefing.briefingDate || '')}</p><p className="mt-2 text-base leading-relaxed text-slate-800 dark:text-slate-100">{String(briefing.summary || 'No briefing summary was returned.')}</p></div></div></CardContent></Card>
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.isArray(briefing.findings) && (briefing.findings as AIFinding[]).map((finding) => <ItemCard key={finding.id} title={finding.title} summary={finding.summary} badge={<Badge variant={statusTone(finding.severity)}>{finding.severity}</Badge>}><EvidenceDisclosure facts={(briefing.facts as AIFact[] || []).filter((fact) => (finding.evidenceFactIds || []).includes(fact.id))} finding={finding}/></ItemCard>)}
                {Array.isArray(briefing.recommendations) && (briefing.recommendations as AIRecommendation[]).map((recommendation) => <ItemCard key={recommendation.id} title={recommendation.title} summary={recommendation.rationale || recommendation.description}><EvidenceDisclosure facts={(briefing.facts as AIFact[] || []).filter((fact) => (recommendation.evidenceFactIds || []).includes(fact.id))}/></ItemCard>)}
              </div>
              <ItemCard title="Briefing evidence" summary="The source facts used to prepare this briefing."><EvidenceList facts={Array.isArray(briefing.facts) ? briefing.facts as AIFact[] : []}/></ItemCard>
            </> : <EmptyState title="No briefing has been generated yet" detail="The scheduled monitoring worker creates the latest briefing. You can still run a finding scan from the Findings tab."/>}
            {preferences && <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Finding notification preferences</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center gap-4 p-4 pt-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={preferences.enabled} disabled={actionLoading === 'preferences'} onChange={(event) => void updatePreference({ enabled: event.target.checked })}/> Receive high-severity AI finding alerts</label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">Daily cap <select className="rounded-md border bg-background px-2 py-1" value={preferences.maxAlertsPerDay} onChange={(event) => void updatePreference({ maxAlertsPerDay: Number(event.target.value) })}>{[0, 1, 3, 5, 10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">Alert on {(['high', 'critical'] as const).map((severity) => <label key={severity} className="flex items-center gap-1"><input type="checkbox" checked={preferences.severities.includes(severity)} onChange={(event) => void updatePreference({ severities: event.target.checked ? [...new Set([...preferences.severities, severity])] : preferences.severities.filter((item) => item !== severity) })}/>{severity}</label>)}</div>
            </CardContent></Card>}
          </section>}

          {tab === 'findings' && <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Business findings</h2><p className="text-sm text-slate-500">Rule-based risks grounded in current company data.</p></div><Button onClick={runFindings} disabled={actionLoading === 'findings'} className="gap-2">{actionLoading === 'findings' ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>} Run scan</Button></div>
            {findings.length ? <div className="grid gap-3 lg:grid-cols-2">{findings.map((finding) => <ItemCard key={finding.id} title={finding.title} summary={finding.summary} badge={<Badge variant={statusTone(finding.severity)}>{finding.severity}</Badge>}><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{finding.domain}{finding.status ? ` · ${finding.status}` : ''}</span><span>{finding.evidenceFactIds?.length || 0} evidence references</span></div><EvidenceDisclosure finding={finding}/><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={async () => { setActionLoading(finding.id); try { await aiIntelligenceService.setFindingState(finding.id, 'dismiss'); const result = await aiIntelligenceService.getFindings(); setFindings(result.findings || []); } catch (e) { setError(errorText(e)); } finally { setActionLoading(''); } }} disabled={Boolean(actionLoading)}><X className="mr-1 h-3.5 w-3.5"/> Dismiss</Button><Button size="sm" variant="ghost" onClick={async () => { setActionLoading(finding.id); try { await aiIntelligenceService.snoozeFinding(finding.id, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); const result = await aiIntelligenceService.getFindings(); setFindings(result.findings || []); } catch (e) { setError(errorText(e)); } finally { setActionLoading(''); } }} disabled={Boolean(actionLoading)}>Snooze 24h</Button></div></ItemCard>)}</div> : !loading && <EmptyState title="No active findings" detail="Run a scan to evaluate the business rules for the domains your role can access."/>}
          </section>}

          {tab === 'recommendations' && <section className="space-y-4"><div><h2 className="text-lg font-semibold">Recommendations</h2><p className="text-sm text-slate-500">Practical next steps linked to detected risks and available facts.</p></div>{recommendations.length ? <div className="grid gap-3 lg:grid-cols-2">{recommendations.map((recommendation) => <ItemCard key={recommendation.id} title={recommendation.title} summary={recommendation.rationale || recommendation.description} badge={recommendation.priorityScore != null ? <Badge variant="secondary">Priority {recommendation.priorityScore}</Badge> : undefined}><EvidenceDisclosure finding={{ title: recommendation.title, domain: String(recommendation.metadata?.sourceDomain || '') }}/></ItemCard>)}</div> : !loading && <EmptyState title="No recommendations returned" detail="Try refreshing after new business data has been recorded, or run a scan on the Findings tab."/>}</section>}

          {tab === 'forecasts' && <section className="space-y-4">
            <div><h2 className="text-lg font-semibold">Predictive intelligence</h2><p className="text-sm text-slate-500">Estimates use statistical baselines and include assumptions and uncertainty intervals.</p></div>
            <Card><CardContent className="flex flex-wrap items-end gap-3 p-4"><label className="grid gap-1 text-xs font-medium">Forecast type<select className="h-9 min-w-56 rounded-md border bg-background px-2 text-sm" value={forecastType} onChange={(event) => setForecastType(event.target.value)}>{forecastTypes.map((type) => <option key={type.type} value={type.type}>{type.title}</option>)}</select></label><label className="grid gap-1 text-xs font-medium">Months ahead<select className="h-9 rounded-md border bg-background px-2 text-sm" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>{[1, 3, 6, 12].map((value) => <option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-xs font-medium">History months<select className="h-9 rounded-md border bg-background px-2 text-sm" value={historyMonths} onChange={(event) => setHistoryMonths(Number(event.target.value))}>{[6, 12, 24, 36, 60].map((value) => <option key={value}>{value}</option>)}</select></label><Button onClick={createForecast} disabled={!forecastType || Boolean(actionLoading)}>{actionLoading === 'forecast' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <TrendingUp className="mr-2 h-4 w-4"/>}Generate forecast</Button></CardContent></Card>
            {forecasts.length ? <div className="space-y-3">{forecasts.map((item) => <ItemCard key={item.forecastId} title={`${item.forecastType.replaceAll('_', ' ')} · ${new Date(String(item.createdAt || item.metadata?.generatedAt || Date.now())).toLocaleString()}`} badge={<Badge variant={statusTone(item.confidence)}>{item.confidence} confidence</Badge>}><div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{item.method}</span><span>·</span><span>{item.forecast.status as string}</span><span>·</span><span>{String(item.forecast.modelVersion || item.metadata?.modelVersion || '')}</span></div><pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950">{displayValue(item.forecast.predictions)}</pre><div className="mt-3"><p className="mb-1 text-xs font-semibold">Assumptions</p><ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">{(item.assumptions || []).map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></div><EvidenceDisclosure facts={item.sourceFacts || []}/></ItemCard>)}</div> : !loading && <EmptyState title="No forecasts saved" detail="Choose a forecast type to generate a tenant-scoped estimate from the available historical data."/>}
          </section>}

          {tab === 'reports' && <section className="space-y-4">
            <div><h2 className="text-lg font-semibold">AI reports</h2><p className="text-sm text-slate-500">Structured summaries with source facts, calculations, findings, and caveats.</p></div>
            <Card><CardContent className="flex flex-wrap items-end gap-3 p-4"><label className="grid gap-1 text-xs font-medium">Report type<select className="h-9 min-w-56 rounded-md border bg-background px-2 text-sm" value={reportType} onChange={(event) => setReportType(event.target.value)}>{reportTypes.map((type) => <option key={type.type} value={type.type}>{type.title}</option>)}</select></label><label className="grid gap-1 text-xs font-medium">From<input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}/></label><label className="grid gap-1 text-xs font-medium">To<input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={dateTo} onChange={(event) => setDateTo(event.target.value)}/></label><Button onClick={createReport} disabled={!reportType || Boolean(actionLoading) || dateFrom > dateTo}>{actionLoading === 'report' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileBarChart2 className="mr-2 h-4 w-4"/>}Build report</Button></CardContent></Card>
            {reports.length ? <div className="space-y-3">{reports.map((report) => <ItemCard key={recordId(report as unknown as Record<string, unknown>)} title={report.title || report.reportType} summary={report.executiveSummary} badge={<Badge variant="secondary">{report.reportType}</Badge>}><div className="flex flex-wrap gap-2">{(['json', 'csv', 'xlsx', 'pdf'] as const).map((format) => <Button key={format} size="sm" variant="outline" disabled={Boolean(actionLoading)} onClick={() => void downloadReport(report, format)}>Download {format.toUpperCase()}</Button>)}</div><EvidenceDisclosure facts={report.evidence || []}/>{report.missingDataCaveats?.length ? <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><p className="mb-1 font-semibold">Data caveats</p>{report.missingDataCaveats.map((item, index) => <p key={index}>• {item}</p>)}</div> : null}</ItemCard>)}</div> : !loading && <EmptyState title="No AI reports yet" detail="Generate a report to review an evidence-backed summary and export it for sharing."/>}
          </section>}

          {tab === 'proposals' && <section className="space-y-4"><div><h2 className="text-lg font-semibold">Action proposals</h2><p className="text-sm text-slate-500">Approvals are recorded before execution. Execution is currently supported for purchase-order drafts only.</p></div>{proposals.length ? <div className="space-y-3">{proposals.map((proposal) => <ItemCard key={proposal.id} title={proposal.type.replaceAll('_', ' ')} summary={`Risk: ${proposal.riskLevel || 'unspecified'} · Created ${proposal.createdAt ? new Date(proposal.createdAt).toLocaleString() : 'date unavailable'}`} badge={<Badge variant={statusTone(proposal.status)}>{proposal.status.replaceAll('_', ' ')}</Badge>}><details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><summary className="cursor-pointer text-xs font-semibold">Review proposal payload</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs">{displayValue(proposal.payload)}</pre><p className="mt-2 text-[10px] text-slate-500">Evidence fact IDs: {proposal.evidenceFactIds?.join(', ') || 'None attached'}</p></details>{proposal.approvalRequiredByRole?.length ? <p className="mt-2 text-xs text-slate-500">Approver roles: {proposal.approvalRequiredByRole.join(', ')}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{['draft', 'pending_approval'].includes(proposal.status) && <><Button size="sm" onClick={() => void reviewProposal(proposal, 'approve')} disabled={Boolean(actionLoading)}><Check className="mr-1 h-3.5 w-3.5"/>Approve</Button><Button size="sm" variant="outline" onClick={() => void reviewProposal(proposal, 'reject')} disabled={Boolean(actionLoading)}><X className="mr-1 h-3.5 w-3.5"/>Reject</Button></>}{proposal.status === 'approved' && proposal.type === 'purchase_order_draft' && <Button size="sm" variant="secondary" onClick={() => void reviewProposal(proposal, 'execute')} disabled={Boolean(actionLoading)}>Execute purchase order</Button>}{proposal.status === 'approved' && proposal.type !== 'purchase_order_draft' && <span className="self-center text-xs text-amber-700 dark:text-amber-300">No executor is registered for this proposal type.</span>}</div></ItemCard>)}</div> : !loading && <EmptyState title="No proposals to review" detail="Action proposals created through the AI workflow will appear here for approval or rejection."/>}</section>}

          {tab === 'providers' && isAdmin && <section className="space-y-4"><div><h2 className="text-lg font-semibold">AI provider health</h2><p className="text-sm text-slate-500">Provider status only; secret keys are never shown here.</p></div>{providers.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{providers.map((provider) => <ItemCard key={provider.name} title={provider.name} badge={<Badge variant={provider.reachable ? 'default' : provider.configured ? 'secondary' : 'outline'}>{provider.reachable ? 'reachable' : provider.configured ? 'configured' : 'not configured'}</Badge>}><div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{provider.healthy ? 'Healthy' : 'Health unknown'}</span>{provider.status && <span>· {provider.status}</span>}</div></ItemCard>)}</div> : !loading && <EmptyState title="Provider status unavailable" detail="Refresh to check which configured providers are reachable from the backend."/>}</section>}
        </div>
      </main>
    </Layout>
  );
}
