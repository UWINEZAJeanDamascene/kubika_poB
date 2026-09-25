import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Send, Bot, Loader2, ChevronDown,
  LogIn, RotateCcw, Maximize2, Minimize2, Sparkles,
  TrendingUp, BarChart3, PieChart, Table, Zap, FileSpreadsheet,
  GripVertical, Download, Sunrise, TrendingDown, Minus,
  AlertTriangle, AlertCircle, Info, Target, Activity,
} from 'lucide-react';
import { chatApi, type ChatMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useChatPanelStore } from '@/store/chatPanelStore';
import { chatMemory } from '@/lib/chatMemory';
import { startWorkflowRunner } from '@/lib/workflows';
import InvoicePreview from './InvoicePreview';
import { exportChartToExcel } from '@/lib/chartExport';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  evidence?: Array<{ id: string; label: string; value: unknown; unit?: string; domain?: string; sourceService?: string; sourceMethod?: string; sourceIds?: string[] }>;
}

const MAX_HISTORY_MESSAGES = 6;

function toApiHistory(messages: Message[]): ChatMessage[] {
  return messages
    .filter((m): m is Message & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY_MESSAGES)
    .map(m => ({ role: m.role, content: m.content }));
}

interface ParsedBlock {
  type: 'text' | 'chart' | 'table' | 'invoice' | 'prediction' | 'briefing' | 'benchmark' | 'tax_alert' | 'workflow' | 'industry_insight' | 'peer_comparison';
  content: string;
  data?: any;
}

// ─── Quick questions ─────────────────────────────────────────────────────────
const QUICK_QUESTIONS_DEPRECATED = [
  '🌅 Generate my morning briefing',
  '📈 Predict next month\'s revenue',
  '⚠️ What are my biggest risks?',
  '📅 What tax deadlines are coming up?',
  '🏭 How does my business compare to industry benchmarks?',
  '⚙️ Auto-send payment reminders on day 7 and 14',
  '🏗️ Which batches expire next month?',
  '📜 What is the penalty for late VAT filing in Rwanda?',
  '📈 Show me my sales trend this quarter',
  '🧾 How do I create and confirm an invoice?',
  '💰 How does VAT (Tax A & B) work?',
  '📦 How do I add a new product?',
  '🔄 How do I receive stock after a purchase?',
  '🏦 Why is my balance sheet not balanced?',
  '👥 How do I add a new user?',
];
void QUICK_QUESTIONS_DEPRECATED;

const QUICK_PROMPTS = [
  'Generate my morning briefing',
  'Predict next month revenue',
  'What are my biggest risks?',
  'Export stock analysis to Excel with charts',
  'Create a PDF report for this month sales',
  'Show my sales trend this quarter',
  'Which batches expire next month?',
  'Compare receivables and payables risk',
  'Calculate my financial ratios',
  'Why is my balance sheet not balanced?',
  'How do I create and confirm an invoice?',
  'How do I receive stock after a purchase?',
];

const CAPABILITY_TILES = [
  { label: 'Analyze', detail: 'Live module data', icon: BarChart3, tone: 'text-cyan-300 bg-cyan-400/10 border-cyan-300/20' },
  { label: 'Forecast', detail: 'Trends and risk', icon: TrendingUp, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-300/20' },
  { label: 'Calculate', detail: 'Ratios and totals', icon: Target, tone: 'text-amber-200 bg-amber-300/10 border-amber-200/20' },
  { label: 'Export', detail: 'Excel, CSV, PDF', icon: FileSpreadsheet, tone: 'text-violet-200 bg-violet-300/10 border-violet-200/20' },
];

const MODULE_GROUPS = [
  'Inventory Core',
  'Supply Chain',
  'Revenue Flow',
  'Finance Control',
  'Intelligence',
  'Control Room',
];

// ─── Chart colors ───────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// ─── Lenient JSON parser for LLM output ─────────────────────────────────────
function lenientParseJson(raw: string): any | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Try strict JSON first
  try {
    return JSON.parse(trimmed);
  } catch {
    // fallthrough
  }

  // 2. Fix common LLM JSON errors: unquoted keys, single quotes, trailing commas
  let fixed = trimmed;

  // Remove "json" prefix line if present (LLM sometimes writes "json\n{" on its own)
  fixed = fixed.replace(/^json\s*\n/i, '');

  // Quote unquoted object keys:  type: "chart"  →  "type": "chart"
  // Handles: {key:, ,key:, and keys at start of lines after newline
  fixed = fixed.replace(/([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Fix single-quoted strings to double-quoted (simple heuristic)
  fixed = fixed.replace(/'([^']*)'/g, '"$1"');

  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // Fix unquoted single-word enum values
  fixed = fixed.replace(/"chartType"\s*:\s*([a-zA-Z]+)([,}\]])/g, '"chartType":"$1"$2');
  fixed = fixed.replace(/"type"\s*:\s*([a-zA-Z]+)([,}\]])/g, '"type":"$1"$2');
  fixed = fixed.replace(/"template"\s*:\s*([a-zA-Z_-]+)([,}\]])/g, '"template":"$1"$2');
  fixed = fixed.replace(/"currency"\s*:\s*([a-zA-Z]+)([,}\]])/g, '"currency":"$1"$2');
  fixed = fixed.replace(/"unit"\s*:\s*([a-zA-Z]+)([,}\]])/g, '"unit":"$1"$2');

  // Fix unquoted multi-word string values (label, title, description, name)
  // e.g. "label": Revenue (FRW),  →  "label": "Revenue (FRW)",
  fixed = fixed.replace(
    /"(label|title|description|name)"\s*:\s*(?!true\b|false\b|null\b)([a-zA-Z][\w\s()&\-+/.]*?)([,}\]])/g,
    '"$1":"$2"$3'
  );

  // BROAD CATCH-ALL: quote any remaining bare string value after ANY key
  // Handles values WITH commas (addresses, notes) by looking for next "key": or }/]
  fixed = fixed.replace(
    /"([a-zA-Z0-9_$]+)"\s*:\s*(?!"|\{|\[|true\b|false\b|null\b|-?\d+\.?\d*\b\s*[ ,}\]])([\s\S]+?)(?=,\s*(?:"[a-zA-Z0-9_$]+"\s*:|\{|\[)|\s*[}\]])/g,
    '"$1":"$2"'
  );

  try {
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

// ─── Extract a structured block from raw text ─────────────────────────────────
function tryExtractBlock(raw: string): { type: 'chart' | 'table' | 'invoice' | 'prediction' | 'briefing' | 'benchmark' | 'tax_alert' | 'workflow' | 'industry_insight' | 'peer_comparison' | null; data: any } {
  const data = lenientParseJson(raw);
  if (!data || typeof data !== 'object') return { type: null, data: null };

  const t = String(data.type || '').toLowerCase();
  if (t === 'chart' && data.datasets && Array.isArray(data.datasets)) {
    return { type: 'chart', data };
  }
  if (t === 'table' && (data.columns || data.rows)) {
    return { type: 'table', data };
  }
  if (t === 'invoice' && data.invoiceNumber) {
    return { type: 'invoice', data };
  }
  if (t === 'prediction' && data.forecast && Array.isArray(data.forecast)) {
    return { type: 'prediction', data };
  }
  if (t === 'briefing' && data.metrics && Array.isArray(data.metrics)) {
    return { type: 'briefing', data };
  }
  if (t === 'benchmark' && data.metrics && Array.isArray(data.metrics)) {
    return { type: 'benchmark', data };
  }
  if (t === 'tax_alert' && (data.events || data.complianceScore !== undefined)) {
    return { type: 'tax_alert', data };
  }
  if (t === 'workflow' && data.name) {
    return { type: 'workflow', data };
  }
  if (t === 'industry_insight' && data.insights) {
    return { type: 'industry_insight', data };
  }
  if (t === 'peer_comparison' && data.metrics) {
    return { type: 'peer_comparison', data };
  }
  return { type: null, data: null };
}

// ─── Parse message into blocks (text, chart, table, invoice) ─────────────────
function parseMessageBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  // Pass 1: find code fences (```json ... ``` or ``` ... ```)
  const fenceRegex = /```(?:json)?\n?([\s\S]*?)\n?```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      // Also scan the "before" text for raw JSON blocks without fences
      blocks.push(...scanTextForBlocks(before));
    }

    const { type, data } = tryExtractBlock(match[1]);
    if (type && data) {
      blocks.push({ type, content: '', data });
    } else {
      blocks.push({ type: 'text', content: match[0] });
    }

    lastIndex = fenceRegex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();
  if (after) {
    blocks.push(...scanTextForBlocks(after));
  }

  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: 'text', content: text.trim() });
  }

  return blocks;
}

// Scan plain text for JSON-like blocks without code fences
function scanTextForBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  // Look for markdown tables: | col1 | col2 | ... |
  //                           |------|------| ... |
  //                           | data | data | ... |
  const tableRegex = /(\|[^\n]+\|\n\|[-\s:|]+\|\n(?:\|[^\n]+\|\n?)+)/g;

  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = tableRegex.exec(text)) !== null) {
    const before = text.slice(lastIdx, m.index).trim();
    if (before) {
      // Also scan before-text for JSON blocks
      blocks.push(...scanTextForJsonBlocks(before));
    }

    const tableData = extractMarkdownTable(m[0]);
    if (tableData) {
      blocks.push({ type: 'table', content: '', data: tableData });
    } else {
      blocks.push({ type: 'text', content: m[0] });
    }

    lastIdx = m.index + m[0].length;
    tableRegex.lastIndex = lastIdx;
  }

  const remaining = text.slice(lastIdx).trim();
  if (remaining) {
    blocks.push(...scanTextForJsonBlocks(remaining));
  }

  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: 'text', content: text.trim() });
  }

  return blocks;
}

// Extract structured data from markdown table text
function extractMarkdownTable(raw: string): { columns: string[]; rows: any[][] } | null {
  const lines = raw.trim().split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return null;

  // Parse header
  const headerCells = lines[0].split('|').map(c => c.trim()).filter(Boolean);
  if (headerCells.length === 0) return null;

  // Skip separator line
  const dataLines = lines.slice(2);
  const rows: any[][] = [];

  for (const line of dataLines) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length === 0) continue;
    // Strip markdown bold/italic before parsing
    const parsed = cells.map((c, i) => {
      const clean = c.replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '').trim();
      if (i === 0) return clean; // Keep first column as label
      const num = parseFloat(clean.replace(/,/g, ''));
      return isNaN(num) ? clean : num;
    });
    rows.push(parsed);
  }

  if (rows.length === 0) return null;

  return { columns: headerCells, rows };
}

// Scan for JSON blocks (original logic, extracted)
function scanTextForJsonBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const braceRegex = /\{[\s\S]*?"?type"?\s*[:=]\s*["']?(chart|table|invoice)["']?[\s\S]*?\}/gi;

  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = braceRegex.exec(text)) !== null) {
    const before = text.slice(lastIdx, m.index).trim();
    if (before) blocks.push({ type: 'text', content: before });

    const raw = m[0];
    const expanded = expandToBalancedBraces(text, m.index);
    const { type, data } = tryExtractBlock(expanded);
    if (type && data) {
      blocks.push({ type, content: '', data });
    } else {
      blocks.push({ type: 'text', content: raw });
    }

    lastIdx = m.index + expanded.length;
    braceRegex.lastIndex = lastIdx;
  }

  const remaining = text.slice(lastIdx).trim();
  if (remaining) blocks.push({ type: 'text', content: remaining });

  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: 'text', content: text.trim() });
  }

  return blocks;
}

// Given a starting { position, expand to the matching balanced }
function expandToBalancedBraces(text: string, startIndex: number): string {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      continue;
    }
    if (inString && (ch === '"' || ch === "'")) {
      inString = false;
      continue;
    }
    if (!inString) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return text.slice(startIndex);
}

// ─── Sanitize bot reply — strip fake URLs LLMs sometimes hallucinate ──────────
function sanitizeBotReply(text: string): string {
  // 1. Remove ALL markdown image links ![alt](url) — LLMs hallucinate these
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/gi, '');

  // 2. Convert ALL markdown links [text](url) to just "text" — strip the URL.
  //    LLMs should generate data blocks or plain text, not clickable links.
  //    Any real navigation should be done via UI buttons, not LLM-generated URLs.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/gi, '$1');

  // 3. Clean up stray "json" prefix lines that appear before actual JSON
  text = text.replace(/\njson\s*\n/gi, '\n');

  // 4. Remove multiple consecutive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// ─── Inline markdown renderer ────────────────────────────────────────────────
function InlineMarkdown({ text }: { text: string }): React.ReactNode {
  // First, handle markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      elements.push(<span key={keyCounter++}>{processInlineFormatting(text.slice(lastIndex, match.index))}</span>);
    }

    const linkText = match[1];
    let url = match[2];

    // Determine if this is an Excel download link
    const isExcelDownload = url.includes('/downloads/') || url.includes('/public-download/');

    if (isExcelDownload) {
      elements.push(
        <a
          key={keyCounter++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors border border-emerald-600/30"
          onClick={(e) => {
            e.preventDefault();
            fetch(url)
              .then((res) => {
                if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                // Extract filename from Content-Disposition header
                const disposition = res.headers.get('content-disposition');
                let filename = 'download.xlsx';
                if (disposition && disposition.includes('filename=')) {
                  const match = disposition.match(/filename="([^"]+)"/);
                  if (match) filename = match[1];
                }
                return res.blob().then(blob => ({ blob, filename }));
              })
              .then(({ blob, filename }) => {
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              })
              .catch((err) => {
                console.error('[Download] Error:', err);
                alert('Download failed: ' + err.message);
              });
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {linkText}
        </a>
      );
    } else {
      elements.push(
        <a
          key={keyCounter++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last link
  if (lastIndex < text.length) {
    elements.push(<span key={keyCounter++}>{processInlineFormatting(text.slice(lastIndex))}</span>);
  }

  return elements.length > 0 ? elements : <span>{processInlineFormatting(text)}</span>;
}

function processInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-slate-700 px-1 py-0.5 text-[11px] font-mono text-indigo-300">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ─── Render a chart block ───────────────────────────────────────────────────
function ChartBlock({ data }: { data: any }) {
  const { chartType = 'bar', labels = [], datasets = [], title = 'Chart' } = data;
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const chartData = useMemo(() => {
    return labels.map((label: string, i: number) => {
      const row: any = { name: label };
      datasets.forEach((ds: any) => {
        row[ds.label] = ds.data?.[i] ?? 0;
      });
      return row;
    });
  }, [labels, datasets]);

  const total = useMemo(() => {
    return datasets.reduce((sum: number, ds: any) => sum + (ds.data?.reduce((a: number, b: number) => a + b, 0) || 0), 0);
  }, [datasets]);

  const isPie = chartType === 'pie' || chartType === 'doughnut';

  const handleDownload = async () => {
    if (!chartRef.current || downloading) return;
    setDownloading(true);
    try {
      await exportChartToExcel({ chartType, title, labels, datasets }, chartRef.current);
    } catch (err) {
      console.error('[ChartExport]', err);
      alert('Failed to download Excel: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center gap-2">
        {(chartType === 'line' || chartType === 'area') && <TrendingUp className="h-4 w-4 text-indigo-400" />}
        {chartType === 'bar' && <BarChart3 className="h-4 w-4 text-emerald-400" />}
        {isPie && <PieChart className="h-4 w-4 text-amber-400" />}
        <span className="text-xs font-semibold text-slate-200">{title}</span>
        {total > 0 && !isPie && (
          <span className="ml-auto text-[10px] text-slate-400">
            Total: {total.toLocaleString('en-RW')}
          </span>
        )}
        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Download Excel with data & chart"
          className="ml-auto flex items-center gap-1 rounded bg-indigo-600/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50"
        >
          {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Excel
        </button>
      </div>
      <div ref={chartRef} className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              {datasets.map((ds: any, i: number) => (
                <Line key={i} type="monotone" dataKey={ds.label} stroke={ds.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              {datasets.map((ds: any, i: number) => (
                <Area key={i} type="monotone" dataKey={ds.label} stroke={ds.color || CHART_COLORS[i % CHART_COLORS.length]} fill={ds.color || CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
              ))}
            </AreaChart>
          ) : chartType === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              {datasets.map((ds: any, i: number) => (
                <Bar key={i} dataKey={ds.label} fill={ds.color || CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <RePieChart>
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Pie
                data={chartData}
                dataKey={datasets[0]?.label || 'value'}
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={70}
                innerRadius={chartType === 'doughnut' ? 40 : 0}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </RePieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Render a table block with auto-chart & Excel download ──────────────────
function TableBlock({ data }: { data: any }) {
  const { title = 'Data Table', columns = [], rows = [] } = data;
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Auto-detect numeric columns (skip first column = labels)
  const numericColIndices = useMemo(() => {
    const indices: number[] = [];
    for (let ci = 1; ci < columns.length; ci++) {
      const hasNumbers = rows.some((r: any[]) => typeof r[ci] === 'number');
      if (hasNumbers) indices.push(ci);
    }
    return indices;
  }, [columns, rows]);

  const hasChart = numericColIndices.length > 0 && rows.length >= 2;

  // Build chart data from table
  const chartData = useMemo(() => {
    if (!hasChart) return null;
    const labels = rows.map((r: any[]) => String(r[0] ?? ''));
    const datasets = numericColIndices.map((ci, i) => ({
      label: String(columns[ci] ?? `Series ${i + 1}`),
      data: rows.map((r: any[]) => (typeof r[ci] === 'number' ? r[ci] : 0)),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    // Auto-pick chart type: line for time-like labels, bar otherwise
    const timeLike = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d{2})\b/i.test(labels.join(' '));
    const chartType = timeLike ? 'line' : 'bar';
    return { chartType, labels, datasets, title };
  }, [hasChart, rows, numericColIndices, columns, title]);

  const handleDownload = async () => {
    if (!chartRef.current || !chartData || downloading) return;
    setDownloading(true);
    try {
      await exportChartToExcel(chartData, chartRef.current);
    } catch (err) {
      console.error('[TableExport]', err);
      alert('Failed to download Excel: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-3">
      {/* Auto-chart from table numeric columns */}
      {hasChart && chartData && (
        <div className="mb-2 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">{title}</span>
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download Excel with data & chart"
              className="ml-auto flex items-center gap-1 rounded bg-indigo-600/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Excel
            </button>
          </div>
          <div ref={chartRef} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.chartType === 'line' ? (
                <LineChart data={chartData.labels.map((l: string, i: number) => {
                  const row: any = { name: l };
                  chartData.datasets.forEach((ds: any) => { row[ds.label] = ds.data[i]; });
                  return row;
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                  {chartData.datasets.map((ds: any, i: number) => (
                    <Line key={i} type="monotone" dataKey={ds.label} stroke={ds.color} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData.labels.map((l: string, i: number) => {
                  const row: any = { name: l };
                  chartData.datasets.forEach((ds: any) => { row[ds.label] = ds.data[i]; });
                  return row;
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                  {chartData.datasets.map((ds: any, i: number) => (
                    <Bar key={i} dataKey={ds.label} fill={ds.color} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-700/60 bg-slate-800/50 px-3 py-2">
          <Table className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
        </div>
        <div className="max-h-[260px] overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-800/80">
              <tr>
                {columns.map((col: string, i: number) => (
                  <th key={i} className="px-3 py-2 font-semibold text-slate-300 border-b border-slate-700/50">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any[], ri: number) => (
                <tr key={ri} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                  {row.map((cell: any, ci: number) => (
                    <td key={ci} className="px-3 py-1.5 text-slate-300">
                      {typeof cell === 'number' ? cell.toLocaleString('en-RW') : String(cell ?? '-').replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '').trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Check if a table looks like an invoice line-items table
function tableLooksLikeInvoice(columns: string[]): boolean {
  const lower = columns.map(c => c.toLowerCase());
  const hasItem = lower.some(c => c.includes('item') || c.includes('description') || c.includes('product'));
  const hasQty = lower.some(c => c.includes('qty') || c.includes('quantity') || c.includes('qtd'));
  const hasPrice = lower.some(c => c.includes('price') || c.includes('unit') || c.includes('rate'));
  const hasTotal = lower.some(c => c.includes('total') || c.includes('amount'));
  return hasItem && hasQty && hasPrice && hasTotal;
}

// Convert invoice-looking table + surrounding text to InvoiceData
function convertTableToInvoice(tableData: { columns: string[]; rows: any[][] }, surroundingText: string): any | null {
  try {
    // Find invoice number
    const invMatch = surroundingText.match(/INV-\d+|Invoice\s*#?\s*[:\-]?\s*(\S+)/i);
    const invoiceNumber = invMatch ? (invMatch[1] || invMatch[0]) : 'INV-' + Date.now().toString().slice(-6);

    // Find date
    const dateMatch = surroundingText.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

    // Find due date
    const dueMatch = surroundingText.match(/Due\s*Date[:\s]*(\d{4}-\d{2}-\d{2})/i);
    const dueDate = dueMatch ? dueMatch[1] : undefined;

    // Find client name
    const clientMatch = surroundingText.match(/(?:client|bill to|to)[:\s]*([A-Z][A-Za-z0-9\s&]+)/i);
    const clientName = clientMatch ? clientMatch[1].trim() : 'Client';

    // Build items from table rows
    const lowerCols = tableData.columns.map(c => c.toLowerCase());
    const descIdx = lowerCols.findIndex(c => c.includes('item') || c.includes('description') || c.includes('product'));
    const qtyIdx = lowerCols.findIndex(c => c.includes('qty') || c.includes('quantity'));
    const unitIdx = lowerCols.findIndex(c => c.includes('unit'));
    const priceIdx = lowerCols.findIndex(c => c.includes('unit price') || c.includes('price'));
    const totalIdx = lowerCols.findIndex(c => c.includes('total') || c.includes('amount'));

    if (descIdx < 0 || qtyIdx < 0 || priceIdx < 0) return null;

    const items = tableData.rows.map(row => {
      const qty = Number(row[qtyIdx]) || 1;
      const unitPrice = Number(row[priceIdx]) || 0;
      const total = totalIdx >= 0 ? (Number(row[totalIdx]) || qty * unitPrice) : qty * unitPrice;
      return {
        description: String(row[descIdx] ?? 'Item'),
        qty,
        unit: unitIdx >= 0 ? String(row[unitIdx] ?? 'pcs') : 'pcs',
        unitPrice,
        total,
      };
    }).filter(it => it.qty > 0 || it.unitPrice > 0 || it.total > 0);

    if (items.length === 0) return null;

    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const vatRate = 18;
    const vatAmount = Math.round(subtotal * vatRate / 100);
    const total = subtotal + vatAmount;

    // Find currency
    const currMatch = surroundingText.match(/(FRW|RWF|USD|EUR)/i);
    const currency = currMatch ? currMatch[1].toUpperCase() : 'RWF';

    return {
      type: 'invoice',
      template: 'kigali-modern',
      invoiceNumber,
      date,
      dueDate,
      company: { name: 'Your Company' },
      client: { name: clientName },
      items,
      subtotal,
      vatRate,
      vatAmount,
      total,
      currency,
    };
  } catch {
    return null;
  }
}

// ─── Render a prediction block ────────────────────────────────────────────
function PredictionBlock({ data }: { data: any }) {
  const { title = 'Forecast', confidence = 'medium', trend = 'neutral', currentValue, forecast = [], recommendations = [], unit = 'RWF' } = data;
  const chartRef = useRef<HTMLDivElement>(null);

  const confidenceColor = confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    confidence === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
    'bg-red-500/20 text-red-400 border-red-500/30';

  const trendIcon = trend === 'up' ? <TrendingUp className="h-4 w-4 text-emerald-400" /> :
    trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-400" /> :
    <Minus className="h-4 w-4 text-slate-400" />;

  const chartData = useMemo(() => {
    return forecast.map((f: any) => ({
      name: f.period,
      actual: f.actual ?? null,
      predicted: f.predicted,
      lower: f.lowerBound ?? null,
      upper: f.upperBound ?? null,
    }));
  }, [forecast]);

  const hasActual = chartData.some((d: any) => d.actual !== null);

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <Activity className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-semibold text-slate-200">{title}</span>
        <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${confidenceColor}`}>
          {confidence} confidence
        </span>
      </div>

      {/* Current + Trend */}
      {currentValue !== undefined && (
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <p className="text-[10px] text-slate-400">Current</p>
            <p className="text-sm font-bold text-white">{unit === 'RWF' ? `RWF ${Number(currentValue).toLocaleString('en-RW')}` : `${Number(currentValue).toLocaleString('en-RW')} ${unit}`}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-2">
            {trendIcon}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
              {trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
            </span>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {chartData.length > 0 && (
        <div ref={chartRef} className="h-[180px] w-full mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={60} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e2e8f0' }} />
              {hasActual && <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Actual" />}
              <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">
            <Target className="h-3 w-3" /> Recommendations
          </p>
          <div className="flex flex-col gap-1">
            {recommendations.map((rec: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Render a briefing block ──────────────────────────────────────────────
function BriefingBlock({ data }: { data: any }) {
  const { greeting = 'Good morning!', summary = '', metrics = [], alerts = [], priorities = [] } = data;

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    if (s === 'warning') return <AlertCircle className="h-3.5 w-3.5 text-amber-400" />;
    return <Info className="h-3.5 w-3.5 text-blue-400" />;
  };

  const severityBg = (s: string) => {
    if (s === 'critical') return 'bg-red-500/10 border-red-500/20';
    if (s === 'warning') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-blue-500/10 border-blue-500/20';
  };

  const trendIcon = (t: string) => {
    if (t === 'up') return <TrendingUp className="h-3 w-3 text-emerald-400" />;
    if (t === 'down') return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-slate-400" />;
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sunrise className="h-5 w-5 text-amber-400" />
        <div>
          <p className="text-sm font-bold text-white">{greeting}</p>
          <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-3 rounded-lg bg-slate-800/50 p-2.5 text-[12px] leading-relaxed text-slate-200">
          {summary}
        </div>
      )}

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {metrics.slice(0, 4).map((m: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2.5">
              <p className="text-[10px] text-slate-400">{m.label}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <p className="text-sm font-bold text-white">{m.value}</p>
                {trendIcon(m.trend)}
              </div>
              <p className={`mt-0.5 text-[10px] font-medium ${m.trend === 'up' ? 'text-emerald-400' : m.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                {m.change}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {alerts.map((alert: any, idx: number) => (
            <div key={idx} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${severityBg(alert.severity)}`}>
              {severityIcon(alert.severity)}
              <div>
                <p className="text-[11px] font-medium text-slate-100">{alert.message}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{alert.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Priorities */}
      {priorities.length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">
            <Target className="h-3 w-3" /> Today's Priorities
          </p>
          <div className="flex flex-col gap-1">
            {priorities.map((p: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-200">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 text-[9px] font-bold text-indigo-300">{idx + 1}</span>
                <span>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Render a benchmark block ─────────────────────────────────────────────
function BenchmarkBlock({ data }: { data: any }) {
  const { industry = 'general', metrics = [], summary = '' } = data;

  const labelColor = (label: string) => {
    if (label === 'top') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25';
    if (label === 'above') return 'text-blue-400 bg-blue-500/15 border-blue-500/25';
    if (label === 'below') return 'text-amber-400 bg-amber-500/15 border-amber-500/25';
    return 'text-red-400 bg-red-500/15 border-red-500/25';
  };

  const labelText = (label: string) => {
    if (label === 'top') return 'Top 25%';
    if (label === 'above') return 'Above Average';
    if (label === 'below') return 'Below Average';
    return 'Bottom 25%';
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold text-slate-200">Industry Benchmark — {String(industry).charAt(0).toUpperCase() + String(industry).slice(1)}</span>
      </div>

      {summary && (
        <div className="mb-3 rounded-lg bg-slate-800/50 p-2.5 text-[12px] leading-relaxed text-slate-200">
          {summary}
        </div>
      )}

      {metrics.length > 0 && (
        <div className="flex flex-col gap-2">
          {metrics.map((m: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">{m.metricName || m.metric}</p>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${labelColor(m.label || 'below')}`}>
                  {labelText(m.label || 'below')}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div>
                  <p className="text-[9px] text-slate-500">You</p>
                  <p className="text-sm font-bold text-white">{m.userValue}{m.unit}</p>
                </div>
                <div className="h-6 w-px bg-slate-700" />
                <div>
                  <p className="text-[9px] text-slate-500">Industry Median</p>
                  <p className="text-sm font-medium text-slate-300">{m.benchmarkMedian}{m.unit}</p>
                </div>
                <div className="h-6 w-px bg-slate-700" />
                <div>
                  <p className="text-[9px] text-slate-500">Top 25%</p>
                  <p className="text-sm font-medium text-emerald-400">{m.top25}{m.unit}</p>
                </div>
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700/60">
                <div
                  className="h-1.5 rounded-full bg-cyan-500"
                  style={{ width: `${Math.min(100, Math.max(5, (m.userValue / (m.benchmarkMedian * 2)) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Render a workflow block ──────────────────────────────────────────────
function WorkflowBlock({ data }: { data: any }) {
  const { name, description, trigger, actions, enabled } = data;
  return (
    <div className="my-3 rounded-xl border border-indigo-500/30 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Zap className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-300">Workflow Created</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/30 text-slate-400'}`}>
          {enabled ? 'Active' : 'Draft'}
        </span>
      </div>
      <p className="mb-1 text-sm font-medium text-white">{name}</p>
      {description && <p className="mb-2 text-[11px] text-slate-400">{description}</p>}
      {trigger && (
        <div className="mb-2 rounded-lg bg-slate-800/50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Trigger</p>
          <p className="text-[11px] text-slate-300">{trigger.type === 'time_cron' ? `Scheduled: ${trigger.frequency || trigger.config?.frequency}` : `Event: ${trigger.type}`}</p>
        </div>
      )}
      {actions && actions.length > 0 && (
        <div className="rounded-lg bg-slate-800/50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</p>
          <div className="mt-1 flex flex-col gap-1">
            {actions.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {a.type.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Render an industry insight block ─────────────────────────────────────
function IndustryInsightBlock({ data }: { data: any }) {
  const { industry, insights = [], metrics = [], tips = [] } = data;
  return (
    <div className="my-3 rounded-xl border border-emerald-500/30 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Target className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-300">{industry || 'Industry'} Insight</span>
      </div>
      {insights.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {insights.map((ins: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              {ins}
            </div>
          ))}
        </div>
      )}
      {metrics.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          {metrics.map((m: any, i: number) => (
            <div key={i} className="rounded-lg bg-slate-800/50 p-2 text-center">
              <p className="text-[10px] text-slate-500">{m.name}</p>
              <p className="text-sm font-bold text-emerald-400">{m.value}</p>
              <p className="text-[9px] text-slate-500">{m.benchmark ? `Peer avg: ${m.benchmark}` : ''}</p>
            </div>
          ))}
        </div>
      )}
      {tips.length > 0 && (
        <div className="rounded-lg bg-emerald-900/20 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Tips</p>
          {tips.map((tip: string, i: number) => (
            <p key={i} className="text-[11px] text-slate-300">• {tip}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Render a peer comparison block ─────────────────────────────────────────
function PeerComparisonBlock({ data }: { data: any }) {
  const { summary, metrics = [], industry } = data;
  return (
    <div className="my-3 rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold text-cyan-300">Peer Comparison</span>
        <span className="ml-auto rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-400">{industry || 'General'}</span>
      </div>
      {summary && (
        <div className="mb-3 rounded-lg bg-cyan-900/20 p-2 text-[12px] text-cyan-100">
          {summary}
        </div>
      )}
      {metrics.length > 0 && (
        <div className="flex flex-col gap-2">
          {metrics.map((m: any, i: number) => (
            <div key={i} className="rounded-lg bg-slate-800/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-200">{m.metricName || m.metric}</span>
                <span className={`text-[11px] font-bold ${m.label === 'top' ? 'text-emerald-400' : m.label === 'above' ? 'text-blue-400' : m.label === 'below' ? 'text-amber-400' : 'text-red-400'}`}>
                  {m.percentile ? `Top ${100 - m.percentile}%` : m.label}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full rounded-full ${m.label === 'top' || m.label === 'above' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${m.percentile || 50}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-slate-500">
                <span>You: {m.userValue}{m.unit}</span>
                <span>Peers: {m.peerMedian || m.benchmarkMedian}{m.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Render a tax alert block ─────────────────────────────────────────────
function TaxAlertBlock({ data }: { data: any }) {
  const { complianceScore = 100, grade = 'A', events = [], summary = '' } = data;

  const gradeColor = grade === 'A' ? 'text-emerald-400' : grade === 'B' ? 'text-blue-400' : grade === 'C' ? 'text-amber-400' : grade === 'D' ? 'text-orange-400' : 'text-red-400';

  const statusBadge = (status: string) => {
    if (status === 'overdue') return 'bg-red-500/15 text-red-400 border-red-500/25';
    if (status === 'due-soon') return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold text-slate-200">Compliance Tracker</span>
        <div className={`ml-auto flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/60 px-2 py-0.5`}>
          <span className={`text-xs font-bold ${gradeColor}`}>{grade}</span>
          <span className="text-[10px] text-slate-400">{complianceScore}/100</span>
        </div>
      </div>

      {summary && (
        <div className="mb-3 rounded-lg bg-slate-800/50 p-2.5 text-[12px] leading-relaxed text-slate-200">
          {summary}
        </div>
      )}

      {events.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {events.map((evt: any, idx: number) => (
            <div key={idx} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${statusBadge(evt.status)}`}>
              <div className="mt-0.5 shrink-0">
                {evt.status === 'overdue' ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> :
                  evt.status === 'due-soon' ? <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> :
                  <Info className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-medium text-slate-100">{evt.name}</p>
                  <span className="text-[9px] font-bold text-slate-300">{evt.taxType}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-300">
                  {evt.daysUntil < 0 ? `Overdue by ${Math.abs(evt.daysUntil)} days` : `Due in ${evt.daysUntil} days`}
                  {' · '}Risk: {evt.penaltyRisk}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Render message content with charts/tables ──────────────────────────────
function MessageContent({ text }: { text: string }) {
  const blocks = useMemo(() => parseMessageBlocks(text), [text]);

  return (
    <div className="flex flex-col gap-0.5">
      {blocks.map((block, i) => {
        if (block.type === 'chart' && block.data) {
          return <ChartBlock key={i} data={block.data} />;
        }
        if (block.type === 'table' && block.data) {
          // Fallback: if table looks like invoice items, also render InvoicePreview
          if (tableLooksLikeInvoice(block.data.columns || [])) {
            // Find surrounding text (previous text block)
            const prevText = blocks
              .slice(0, i)
              .filter(b => b.type === 'text')
              .map(b => b.content)
              .join('\n');
            const invoiceData = convertTableToInvoice(block.data, prevText);
            if (invoiceData) {
              return (
                <div key={i} className="flex flex-col gap-2">
                  <InvoicePreview data={invoiceData} />
                  <TableBlock key={i} data={block.data} />
                </div>
              );
            }
          }
          return <TableBlock key={i} data={block.data} />;
        }
        if (block.type === 'invoice' && block.data) {
          return <InvoicePreview key={i} data={block.data} />;
        }
        if (block.type === 'prediction' && block.data) {
          return <PredictionBlock key={i} data={block.data} />;
        }
        if (block.type === 'briefing' && block.data) {
          return <BriefingBlock key={i} data={block.data} />;
        }
        if (block.type === 'benchmark' && block.data) {
          return <BenchmarkBlock key={i} data={block.data} />;
        }
        if (block.type === 'tax_alert' && block.data) {
          return <TaxAlertBlock key={i} data={block.data} />;
        }
        if (block.type === 'workflow' && block.data) {
          return <WorkflowBlock key={i} data={block.data} />;
        }
        if (block.type === 'industry_insight' && block.data) {
          return <IndustryInsightBlock key={i} data={block.data} />;
        }
        if (block.type === 'peer_comparison' && block.data) {
          return <PeerComparisonBlock key={i} data={block.data} />;
        }

        // Text block — split into paragraphs and lists
        const lines = block.content.split('\n');
        return (
          <div key={i} className="flex flex-col gap-0.5">
            {lines.map((line, li) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={li} className="h-1" />;

              // Heading
              if (trimmed.startsWith('### ')) {
                return <p key={li} className="mt-1 text-[11px] font-bold text-indigo-300 uppercase tracking-wide">{trimmed.slice(4)}</p>;
              }
              if (trimmed.startsWith('## ')) {
                return <p key={li} className="mt-1.5 text-[12px] font-bold text-white border-b border-slate-600 pb-0.5">{trimmed.slice(3)}</p>;
              }

              // Bullet
              if (/^[-*•]\s/.test(trimmed)) {
                return (
                  <div key={li} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <InlineMarkdown text={trimmed.replace(/^[-*•]\s/, '')} />
                  </div>
                );
              }

              // Numbered list
              if (/^\d+\.\s/.test(trimmed)) {
                const num = trimmed.match(/^\d+/)?.[0] || '';
                return (
                  <div key={li} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 text-[9px] font-bold text-indigo-300">
                      {num}
                    </span>
                    <InlineMarkdown text={trimmed.replace(/^\d+\.\s/, '')} />
                  </div>
                );
              }

              // Horizontal rule
              if (trimmed === '---' || trimmed === '───') {
                return <hr key={li} className="my-1.5 border-slate-600" />;
              }

              // Regular paragraph
              return <p key={li} className="text-[12px] leading-relaxed"><InlineMarkdown text={trimmed} /></p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function ChatEvidence({ facts }: { facts?: Message['evidence'] }) {
  if (!facts?.length) return null;
  return (
    <details className="mt-1 w-full rounded-xl border border-cyan-900/50 bg-slate-900/70 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-semibold text-cyan-300">Show evidence ({facts.length})</summary>
      <div className="mt-2 max-h-64 space-y-2 overflow-auto">
        {facts.map((fact) => (
          <div key={fact.id} className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5">
            <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-slate-100">{fact.label}</span><span className="text-[10px] text-slate-400">{fact.domain || fact.sourceMethod || 'Source fact'}{fact.unit ? ` · ${fact.unit}` : ''}</span></div>
            <pre className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300">{typeof fact.value === 'string' ? fact.value : JSON.stringify(fact.value, null, 2)}</pre>
            {(fact.sourceService || fact.sourceMethod || fact.sourceIds?.length) && <p className="mt-1 text-[9px] text-slate-500">{[fact.sourceService, fact.sourceMethod, fact.sourceIds?.length ? fact.sourceIds.join(', ') : ''].filter(Boolean).join(' · ')}</p>}
          </div>
        ))}
      </div>
    </details>
  );
}

// ─── Time formatter ──────────────────────────────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' });
}

function CapabilityPanel() {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Stacy command center</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Grounded in live modules, calculations, forecasts, and exports.</p>
        </div>
        <Activity className="h-4 w-4 shrink-0 text-emerald-300" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CAPABILITY_TILES.map(({ label, detail, icon: Icon, tone }) => (
          <div key={label} className={`rounded-lg border px-2.5 py-2 ${tone}`}>
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold text-slate-100">{label}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MODULE_GROUPS.map((module) => (
          <span key={module} className="rounded-md border border-slate-700/70 bg-slate-950/60 px-2 py-1 text-[10px] font-medium text-slate-300">
            {module}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Initial message ─────────────────────────────────────────────────────────
const makeInitialMessage = (): Message => ({
  role: 'assistant',
  content: `Hi there! 👋 I'm **Stacy**, your KUBIKA SYSTEM AI assistant.

I have full knowledge of the system and can help you with:

- 📦 Products, stock, purchases & suppliers
- 🧾 Invoices, quotations & credit notes
- 📊 Reports: P&L, Balance Sheet, VAT, Cash Flow
- 🔧 Troubleshooting any issues
- 🇷🇼 Rwanda accounting, tax rules & labor law
- 🌅 Daily morning briefings & revenue forecasts
- 🏭 Industry benchmark comparisons & peer analytics
- ⚙️ Auto-workflows: payment reminders, stock alerts, reports
- 🏥 Industry-specific advice for your sector
- 💬 Just chatting — I'm here!

I can also fetch your **live data**, generate **charts** and **reports** on demand. Try asking me:

- "Generate my morning briefing"
- "Predict next month's revenue"
- "How does my business compare to industry benchmarks?"
- "Auto-send payment reminders on day 7 and 14"
- "What tax deadlines are coming up?"
- "What's the penalty for late VAT filing in Rwanda?"
- "Show me my monthly revenue trend"
- "What are my top 5 products by revenue?"
- "Why is my balance sheet not balanced?"

What can I help you with today?`,
  timestamp: new Date(),
});

const makePolishedInitialMessage = (): Message => ({
  role: 'assistant',
  content: `Hi, I'm **Stacy**, your KUBIKA SYSTEM AI assistant.

I can work across your live modules: Inventory Core, Supply Chain, Revenue Flow, Finance Control, Intelligence, and Control Room.

I can help you:

- Analyze stock, sales, purchases, suppliers, clients, expenses, ledgers, and reports
- Interpret P&L, Balance Sheet, Cash Flow, VAT, receivables, payables, and ratios
- Forecast revenue, expenses, cash flow, inventory pressure, and collection risk
- Generate Excel, CSV, and PDF files from analyzed data
- Build chart-ready data and explain the numbers behind the chart
- Troubleshoot workflows and explain the next action clearly

I use live data when available, show assumptions for forecasts, and avoid guessing when something is not yet exposed to AI tools.

What should we analyze first?`,
  timestamp: new Date(),
});
void makeInitialMessage;

// ─── Component ────────────────────────────────────────────────────────────────
export default function AIChatBot() {
  const { isAuthenticated } = useAuth();
  const { open, width, expanded, setOpen, setWidth, setExpanded, toggle } = useChatPanelStore();
  const [messages, setMessages] = useState<Message[]>([makePolishedInitialMessage()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const sessionIdRef = useRef<string>('');

  // Initialize memory session on mount (and when auth changes)
  useEffect(() => {
    const { sessionId, messages: savedMessages } = chatMemory.getOrCreateSession();
    sessionIdRef.current = sessionId;
    if (savedMessages.length > 0) {
      setMessages(savedMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    } else {
      setMessages([makePolishedInitialMessage()]);
    }
  }, [isAuthenticated]);

  // Phase 6.3: Start auto-workflow runner on mount
  useEffect(() => {
    startWorkflowRunner();
    return () => {};
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsLg(mql.matches);
    mql.addEventListener('change', onChange);
    setIsLg(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(false);
      }, 120);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;

    const userMsg: Message = { role: 'user', content: messageText, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      // The backend builds and permission-filters the context for each question.
      const history = toApiHistory(messages);
      const data = await chatApi.send(messageText, history);
      const cleanReply = sanitizeBotReply(data.reply);
      const botMsg: Message = { role: 'assistant', content: cleanReply, timestamp: new Date(), evidence: data.ai?.context?.facts || [] };
      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);

      // Persist to memory
      chatMemory.appendMessages(
        sessionIdRef.current,
        finalMessages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() }))
      );
    } catch (err: any) {
      const backendReply = sanitizeBotReply(err?.data?.reply || err?.response?.data?.reply || '');
      const errMsg: Message = {
        role: 'assistant',
        content: backendReply || 'I\'m having trouble connecting right now. Please check your connection and try again.',
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errMsg];
      setMessages(finalMessages);

      // Persist error response too
      chatMemory.appendMessages(
        sessionIdRef.current,
        finalMessages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    // Save current session and start a fresh one
    const { sessionId, messages: savedMessages } = chatMemory.getOrCreateSession();
    sessionIdRef.current = sessionId;
    if (savedMessages.length > 0) {
      setMessages(savedMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    } else {
      setMessages([makePolishedInitialMessage()]);
    }
    setInput('');
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      setWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, setWidth]);

  // Floating window sizing (mobile / small screens)
  const windowWidth = expanded
    ? 'w-[95%] max-w-[520px] sm:w-[480px] md:w-[520px]'
    : 'w-[95%] max-w-[400px] sm:w-[360px] md:w-[400px]';
  const windowHeight = expanded
    ? 'h-[70dvh] max-h-[600px] sm:h-[560px] md:h-[600px]'
    : 'h-[55dvh] max-h-[480px] sm:h-[460px] md:h-[480px]';

  return (
    <>
      {/* Floating button (mobile / small screens only) */}
      {!isLg && (
        <button
          onClick={toggle}
          aria-label={open ? 'Close assistant' : 'Open assistant'}
          className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[9999] flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {open ? <X className="h-5 w-5" /> : <Sparkles className="h-6 w-6" />}
        </button>
      )}

      {/* Desktop docked panel (lg+ screens) */}
      {isLg && open && (
        <div
          className="fixed right-0 top-0 z-[9998] flex h-dvh flex-col overflow-hidden border-l border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/40"
          style={{ width: `${width}px` }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 z-10 h-full w-3 cursor-col-resize hover:bg-indigo-500/20 active:bg-indigo-500/30"
          >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <GripVertical className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 px-4 py-3.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-sm">
              <Bot className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-indigo-700 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                Stacy
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium text-indigo-100">AI</span>
              </p>
              <p className="text-[11px] text-indigo-200 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {isAuthenticated ? 'Online - live tools enabled' : 'Sign in to unlock full features'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                title={expanded ? 'Compact view' : 'Expand'}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleReset}
                  title="New conversation"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-500/30">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[88%]`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-[13px] shadow-md shadow-indigo-500/20'
                        : 'rounded-tl-sm bg-slate-800/90 text-slate-100 border border-slate-700/50 shadow-sm'
                    }`}
                  >
                    {msg.role === 'user'
                      ? <p className="leading-relaxed">{msg.content}</p>
                      : <><MessageContent text={msg.content} /><ChatEvidence facts={msg.evidence} /></>
                    }
                  </div>
                  <span className="px-1 text-[10px] text-slate-600">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && isAuthenticated && (
              <div className="mt-1 flex flex-col gap-3">
                <CapabilityPanel />
                <p className="px-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Quick questions:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-left text-[12px] text-indigo-300 transition-all hover:border-indigo-500/50 hover:bg-slate-700/60 hover:text-indigo-200 active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-500/30">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 border border-slate-700/50">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:160ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:320ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute right-4 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-colors"
              style={{ bottom: isAuthenticated ? '84px' : '72px' }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/95 px-3 py-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-end gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 focus-within:border-indigo-500/50 focus-within:bg-slate-800 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your business..."
                    disabled={loading}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50 leading-relaxed max-h-[120px]"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-md"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-600 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Stacy - live tools, forecasts, exports - verify critical decisions
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-[12px] text-slate-400">
                  Sign in to unlock AI-powered insights with your live data
                </p>
                <a
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 shadow-md"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in to chat with Stacy
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating chat window (small screens) */}
      {!isLg && open && (
        <div
          className={`fixed bottom-20 sm:bottom-24 right-2 sm:right-6 z-[9998] flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/40 transition-all duration-300 ${windowWidth} ${windowHeight}`}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 px-4 py-3.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-sm">
              <Bot className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-indigo-700 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                Stacy
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium text-indigo-100">AI</span>
              </p>
              <p className="text-[11px] text-indigo-200 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {isAuthenticated ? 'Online - live tools enabled' : 'Sign in to unlock full features'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                title={expanded ? 'Compact view' : 'Expand'}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleReset}
                  title="New conversation"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-500/30">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[88%]`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-[13px] shadow-md shadow-indigo-500/20'
                        : 'rounded-tl-sm bg-slate-800/90 text-slate-100 border border-slate-700/50 shadow-sm'
                    }`}
                  >
                    {msg.role === 'user'
                      ? <p className="leading-relaxed">{msg.content}</p>
                      : <><MessageContent text={msg.content} /><ChatEvidence facts={msg.evidence} /></>
                    }
                  </div>
                  <span className="px-1 text-[10px] text-slate-600">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Quick questions */}
            {messages.length === 1 && !loading && isAuthenticated && (
              <div className="mt-1 flex flex-col gap-3">
                <CapabilityPanel />
                <p className="px-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Quick questions:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-left text-[12px] text-indigo-300 transition-all hover:border-indigo-500/50 hover:bg-slate-700/60 hover:text-indigo-200 active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-500/30">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 border border-slate-700/50">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:160ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:320ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute right-4 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-colors"
              style={{ bottom: isAuthenticated ? '84px' : '72px' }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/95 px-3 py-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-end gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 focus-within:border-indigo-500/50 focus-within:bg-slate-800 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your business..."
                    disabled={loading}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50 leading-relaxed max-h-[120px]"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-md"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-600 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Stacy - live tools, forecasts, exports - verify critical decisions
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-[12px] text-slate-400">
                  Sign in to unlock AI-powered insights with your live data
                </p>
                <a
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 shadow-md"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in to chat with Stacy
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
