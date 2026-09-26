import apiClient from '@/config/api';

export type AIEnvelope<T> = {
  success: boolean;
  message?: string;
  [key: string]: unknown;
} & T;

export interface AIFact {
  id: string;
  label: string;
  value: unknown;
  unit?: string;
  domain?: string;
  sourceService?: string;
  sourceMethod?: string;
  sourceIds?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

const AI = '/ai';

export const aiIntelligenceService = {
  context: (query: string, domains?: string[]) =>
    apiClient.post<AIEnvelope<{ context: { facts: AIFact[]; warnings?: string[] } }>>(`${AI}/context`, { query, domains }),
  getBriefing: () => apiClient.get<AIEnvelope<{ briefing: Record<string, unknown> | null }>>(`${AI}/monitoring/briefings/latest`),
  generateBriefing: () => apiClient.post<AIEnvelope<{ briefing: Record<string, unknown> | null; scan: { findingCount: number; warningCount: number } }>>(`${AI}/monitoring/briefings/generate`, {}),
  getPreferences: () => apiClient.get<AIEnvelope<{ preferences: AIPreferences }>>(`${AI}/monitoring/preferences`),
  updatePreferences: (preferences: Partial<AIPreferences>) =>
    apiClient.put<AIEnvelope<{ preferences: AIPreferences }>>(`${AI}/monitoring/preferences`, preferences),
  getFindings: () => apiClient.get<AIEnvelope<{ findings: AIFinding[] }>>(`${AI}/findings`),
  runFindings: () => apiClient.post<AIEnvelope<{ decision: { findings: AIFinding[] }; persistedFindings: AIFinding[] }>>(`${AI}/findings/run`, { persist: true }),
  setFindingState: (id: string, state: 'dismiss' | 'restore') =>
    apiClient.post<AIEnvelope<{ state: unknown }>>(`${AI}/findings/${encodeURIComponent(id)}/${state}`),
  snoozeFinding: (id: string, snoozedUntil: string) =>
    apiClient.post<AIEnvelope<{ state: unknown }>>(`${AI}/findings/${encodeURIComponent(id)}/snooze`, { snoozedUntil }),
  runRecommendations: () => apiClient.post<AIEnvelope<{ recommendations: AIRecommendation[] }>>(`${AI}/recommendations/run`, {
    query: 'Generate practical recommendations from the current business context.',
    domains: ['sales', 'inventory', 'finance', 'purchases', 'customers'],
  }),
  getForecastTypes: () => apiClient.get<AIEnvelope<{ types: Array<{ type: string; title: string }> }>>(`${AI}/forecasts/types`),
  getForecasts: () => apiClient.get<AIEnvelope<{ forecasts: AIForecast[] }>>(`${AI}/forecasts?limit=30`),
  createForecast: (forecastType: string, horizon: number, historyMonths: number) =>
    apiClient.post<AIEnvelope<{ forecast: AIForecast }>>(`${AI}/forecasts`, { forecastType, horizon, historyMonths }),
  getReportTypes: () => apiClient.get<AIEnvelope<{ types: Array<{ type: string; title: string }> }>>(`${AI}/reports/types`),
  getReports: () => apiClient.get<AIEnvelope<{ reports: AIReport[] }>>(`${AI}/reports?limit=30`),
  createReport: (reportType: string, dateRange: { from: string; to: string }) =>
    apiClient.post<AIEnvelope<{ report: AIReport }>>(`${AI}/reports`, { reportType, dateRange }),
  exportReport: async (id: string, format: 'json' | 'csv' | 'xlsx' | 'pdf') => {
    const response = await apiClient.instance.get(`${AI}/reports/${encodeURIComponent(id)}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data as Blob;
  },
  getProposals: () => apiClient.get<AIEnvelope<{ proposals: AIProposal[] }>>(`${AI}/proposals?limit=100`),
  approveProposal: (id: string) => apiClient.post<AIEnvelope<{ proposal: AIProposal }>>(`${AI}/proposals/${encodeURIComponent(id)}/approve`),
  rejectProposal: (id: string, reason: string) =>
    apiClient.post<AIEnvelope<{ proposal: AIProposal }>>(`${AI}/proposals/${encodeURIComponent(id)}/reject`, { reason }),
  executeProposal: (id: string) =>
    apiClient.post<AIEnvelope<{ proposal: AIProposal }>>(`${AI}/proposals/${encodeURIComponent(id)}/execute`),
  getProviderHealth: () => apiClient.get<AIEnvelope<{ providers: AIProvider[]; configured: string[]; healthy: string[]; active: string[] }>>('/chat/providers'),
};

export interface AIPreferences {
  enabled: boolean;
  maxAlertsPerDay: number;
  severities: Array<'high' | 'critical'>;
}

export interface AIFinding {
  id: string;
  findingId?: string;
  title: string;
  summary: string;
  severity: string;
  domain: string;
  evidenceFactIds?: string[];
  status?: string;
  [key: string]: unknown;
}

export interface AIRecommendation {
  id: string;
  title: string;
  rationale?: string;
  description?: string;
  priorityScore?: number;
  evidenceFactIds?: string[];
  sourceFindingIds?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AIForecast {
  forecastId: string;
  forecastType: string;
  status: string;
  confidence: string;
  method: string;
  forecast: Record<string, unknown>;
  assumptions: string[];
  sourceFacts?: AIFact[];
  createdAt?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AIReport {
  reportId: string;
  reportType: string;
  title: string;
  executiveSummary: string;
  evidence?: AIFact[];
  findings?: Array<Record<string, unknown>>;
  calculations?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  missingDataCaveats?: string[];
  dateRange?: { from: string; to: string };
  [key: string]: unknown;
}

export interface AIProposal {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  evidenceFactIds?: string[];
  riskLevel?: string;
  approvalRequiredByRole?: string[];
  executionResult?: { ok?: boolean; [key: string]: unknown } | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AIProvider {
  name: string;
  configured: boolean;
  healthy?: boolean;
  reachable?: boolean;
  status?: string;
  [key: string]: unknown;
}
