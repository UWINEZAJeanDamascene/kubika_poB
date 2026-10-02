/**
 * Stacy AI — External Knowledge Base (Phase 3: The Advisor)
 * Static knowledge chunks for Rwanda business law, tax rules, and market data.
 * In production, this feeds a backend vector search (MongoDB Atlas).
 * For now, keyword-based retrieval injects relevant chunks into LLM prompts.
 */

export interface KnowledgeChunk {
  id: string;
  category: 'tax' | 'labor' | 'rssb' | 'ebm' | 'investment' | 'trade' | 'commodity';
  title: string;
  content: string;
  keywords: string[];
}

// ─── Rwanda Business Knowledge Base ───────────────────────────────────────
const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  // ── TAX ──
  {
    id: 'tax-vat-rate',
    category: 'tax',
    title: 'Rwanda VAT Rate',
    content: 'Rwanda VAT is 18% on most goods and services (VAT Law 2012, Art. 3). Essential goods (basic foodstuffs, agricultural inputs, medicines) are zero-rated (0%). Exported goods and services are also 0% VAT. VAT-registered businesses with annual turnover above RWF 200 million must file monthly returns by the 15th of the following month. Businesses with turnover equal to or below RWF 200 million file quarterly VAT returns.',
    keywords: ['vat', 'value added tax', 'tax rate', '18%', 'vat rate', 'rwanda tax'],
  },
  {
    id: 'tax-vat-penalty',
    category: 'tax',
    title: 'RRA VAT Late Filing Penalties',
    content: 'Late filing of VAT returns: 10% of the tax due per month (or part of month) of delay (VAT Law Art. 60). Late payment: 1.5% interest per month on the outstanding amount. Criminal penalties may apply for tax evasion including imprisonment and fines up to 200% of tax evaded.',
    keywords: ['late filing', 'penalty', 'vat penalty', 'rra penalty', 'fine', 'interest', 'tax deadline'],
  },
  {
    id: 'tax-vat-registration',
    category: 'tax',
    title: 'VAT Registration Threshold',
    content: 'Businesses with annual turnover exceeding RWF 20 million (or RWF 5 million in three consecutive months in the last quarter) must register for VAT with RRA. Voluntary registration is allowed for businesses below the threshold. Registration must be done within 6 days of exceeding the threshold.',
    keywords: ['vat registration', 'register for vat', 'threshold', '20 million', 'rra registration'],
  },
  {
    id: 'tax-paye',
    category: 'tax',
    title: 'PAYE (Pay As You Earn)',
    content: 'PAYE is calculated on taxable employment income, including salary, taxable allowances, bonuses, commissions and benefits in kind. The progressive monthly bands currently are 0% on the first RWF 60,000; 10% on the next RWF 40,000; 20% on the next RWF 100,000; and 30% above RWF 200,000. Other employment income is generally withheld at 30%; qualifying casual labour engaged for fewer than 30 days in a tax year is subject to 15%. PAYE is rounded up to a whole RWF. Employers must remit PAYE to RRA by the 15th of the following month.',
    keywords: ['paye', 'withholding tax', 'employee tax', 'salary tax', 'income tax'],
  },
  {
    id: 'tax-withholding',
    category: 'tax',
    title: 'Withholding Tax Rates',
    content: 'Rwanda withholding taxes: Dividends 15%, Interest 15%, Royalties 15%, Services to non-residents 15%. Payments to resident contractors: 3% withholding. WHT deducted must be remitted to RRA within 15 days following the month of deduction. Import duties vary by product under EAC CET (0%–25%).',
    keywords: ['withholding tax', 'wht', 'dividend tax', 'interest tax', 'royalty tax'],
  },
  {
    id: 'tax-income',
    category: 'tax',
    title: 'Corporate Income Tax',
    content: 'Standard corporate income tax (CIT) rate in Rwanda is 28% from 2024 onwards (was 30% up to 2023). Newly listed companies on the capital market enjoy reduced CIT for 5 years: 20% if selling at least 40% of shares to the public, or 25% if selling at least 30% of shares to the public. SMEs with turnover below RWF 100 million and fewer than 100 employees may qualify for 0% CIT for the first 3 years if registered with RDB. Micro-finance institutions approved by competent authorities: 0% for 5 years. Special economic zone companies: 15% rate.',
    keywords: ['corporate tax', 'income tax', 'company tax', '28%', 'sme tax', 'special economic zone'],
  },
  {
    id: 'tax-ebm',
    category: 'ebm',
    title: 'EBM (Electronic Billing Machine) Requirements',
    content: 'All VAT-registered businesses must use RRA-certified EBM devices to issue invoices (Ministerial Order 001/19). EBM invoices must include: TIN, EBM serial number, item description, quantity, unit price, VAT amount, total. Penalty for non-use: RWA 200,000–2,000,000 and/or suspension of business. EBM reconciliation is required monthly.',
    keywords: ['ebm', 'electronic billing machine', 'invoice machine', 'rra ebm', 'ebm penalty'],
  },
  {
    id: 'tax-telecom',
    category: 'tax',
    title: 'Telephone Communication Tax',
    content: 'Rwanda introduced a Telephone Communication Tax applied on telephone services (voice, SMS, data). Rates: 12% from June 2025, 14% from June 2026, and 15% from June 2027. This tax is separate from VAT and applies to telecom service providers who must collect and remit it to RRA.',
    keywords: ['telephone tax', 'communication tax', 'telecom tax', 'phone tax', 'data tax'],
  },
  {
    id: 'tax-tourism',
    category: 'tax',
    title: 'Tourism Tax',
    content: 'Rwanda imposes a tourism tax of 3% on the room price exclusive of VAT. Accommodation providers (hotels, guesthouses, lodges) are responsible for declaring and remitting this tax to RRA within 15 days following the end of each month. This is in addition to the standard 18% VAT.',
    keywords: ['tourism tax', 'hotel tax', 'accommodation tax', 'room tax', 'guesthouse tax'],
  },

  // ── LABOR LAW ──
  {
    id: 'labor-minimum-wage',
    category: 'labor',
    title: 'Rwanda Minimum Wage',
    content: 'Rwanda does not have a universal statutory minimum wage. However, sector-specific minimum wages apply via Ministerial Orders. For example, tea pickers have regulated minimum daily wages. Most formal sector employers use collective bargaining agreements. General guide: unskilled workers typically earn RWF 1,500–3,000/day in informal sector.',
    keywords: ['minimum wage', 'salary', 'wage', 'pay', 'worker pay', 'labor law'],
  },
  {
    id: 'labor-leave',
    category: 'labor',
    title: 'Annual Leave & Public Holidays',
    content: 'Employees are entitled to 18 working days of paid annual leave per year (Labor Law 2018, Art. 65). After 5 years of service: 1 additional day per year up to 21 days. Public holidays (12 per year) are paid days off. Maternity leave: 12 weeks (14 weeks for multiple births). Paternity leave: 4 working days.',
    keywords: ['annual leave', 'vacation', 'maternity leave', 'paternity leave', 'public holiday', 'days off'],
  },
  {
    id: 'labor-overtime',
    category: 'labor',
    title: 'Overtime Rules',
    content: 'Normal working hours: 8 hours/day, 45 hours/week (Labor Law Art. 58). Overtime is paid at 150% of normal rate on weekdays and 200% on weekends/public holidays. Maximum overtime: 2 hours/day, 10 hours/week. Overtime requires employee consent.',
    keywords: ['overtime', 'working hours', 'extra hours', 'overtime pay', 'night shift'],
  },
  {
    id: 'labor-termination',
    category: 'labor',
    title: 'Termination & Severance',
    content: 'Indefinite contracts: employer must give notice (minimum 15 days for workers paid daily/weekly, 30 days for monthly). Severance pay: 2/3 of monthly salary per year of service (max 15 years) for unfair dismissal. Employee can terminate with 15/30 days notice.',
    keywords: ['termination', 'fire', 'dismissal', 'severance', 'notice period', 'end contract'],
  },
  {
    id: 'labor-contract',
    category: 'labor',
    title: 'Employment Contracts',
    content: 'Labor Law 2018 requires written contracts for employment exceeding 1 month. Must specify: parties, job description, remuneration, working hours, leave, notice period, place of work. Fixed-term contracts max: 2 years (renewable once). Trial period max: 6 months.',
    keywords: ['contract', 'employment contract', 'trial period', 'probation', 'fixed term'],
  },

  // ── RSSB ──
  {
    id: 'rssb-rates',
    category: 'rssb',
    title: 'RSSB Contribution Rates',
    content: 'RSSB pension contributions apply to total gross salary, including transport allowance. Employee and employer pension rates are each 6% in 2025–2026, then each rise to 7% in 2027, 8% in 2028, 9% in 2029 and 10% in 2030. Maternity leave contributions are 0.3% each for employee and employer. Occupational hazards are an employer contribution; apply the registered scheme rate. Use the rate effective for the payroll period.',
    keywords: ['rssb', 'social security', 'pension', 'mutuelle', 'cbhi', 'payroll deduction'],
  },
  {
    id: 'rssb-deadline',
    category: 'rssb',
    title: 'RSSB Filing Deadlines',
    content: 'RSSB declarations and payments are due by the 10th of each month for the previous month. Late payment attracts 10% penalty per month of delay. Employers must register all employees within 30 days of hiring.',
    keywords: ['rssb deadline', 'social security deadline', 'rssb penalty', 'rssb filing'],
  },

  // ── INVESTMENT ──
  {
    id: 'investment-incentives',
    category: 'investment',
    title: 'Rwanda Investment Incentives',
    content: 'Rwanda Investment Code 2021 offers: (1) 7-year corporate income tax holiday for strategic investments, (2) 15% CIT rate for companies in Special Economic Zones, (3) 0% CIT for micro-enterprises first 3 years, (4) VAT exemption on imported capital goods for priority sectors, (5) accelerated depreciation (50% first year for manufacturing equipment).',
    keywords: ['investment', 'tax holiday', 'incentive', 'special economic zone', 'sez', 'rdb', 'investment code'],
  },
  {
    id: 'investment-sez',
    category: 'investment',
    title: 'Special Economic Zone (SEZ) Benefits',
    content: 'SEZ registered companies enjoy: 15% corporate tax (vs standard 28%), 0% VAT on imported raw materials/machinery, 0% withholding tax on dividends for 10 years, streamlined customs procedures, 5-year loss carry-forward. Must be approved by RDB and located in designated zones (Kigali SEZ, Masaka, etc.).',
    keywords: ['sez', 'economic zone', 'export zone', 'free zone', 'manufacturing incentive'],
  },

  // ── TRADE ──
  {
    id: 'trade-eac',
    category: 'trade',
    title: 'EAC Common External Tariff (CET)',
    content: 'EAC CET import duty rates: Raw materials 0%, Capital goods 0%, Intermediate goods 10%, Finished goods 25%, Sensitive items up to 35% (sugar, rice, textiles). EAC partner states (Rwanda, Kenya, Uganda, Tanzania, Burundi, S.Sudan, DRC) enjoy 0% duty on intra-EAC trade. Rules of origin apply.',
    keywords: ['import duty', 'customs', 'tariff', 'eac', 'common external tariff', 'east african community'],
  },
  {
    id: 'trade-eac-cert',
    category: 'trade',
    title: 'EAC Certificate of Origin',
    content: 'To qualify for 0% duty within EAC, goods must have EAC Certificate of Origin. At least 35% of ex-factory cost must originate from EAC. Exporters must register with Rwanda Standards Board and RRA. Certificate issued by RRA or authorized chambers of commerce.',
    keywords: ['certificate of origin', 'eac certificate', 'export certificate', 'origin rule', 'intra-eac trade'],
  },

  // ── COMMODITIES ──
  {
    id: 'commodity-cement',
    category: 'commodity',
    title: 'Rwanda Cement Prices (2025)',
    content: 'Typical retail cement prices in Kigali (50kg bag): CIMERWA RWF 9,500–11,000; Hima Cement RWF 9,000–10,500; MUKAMIRA RWF 8,500–10,000. Wholesale (100+ bags): ~RWF 8,000–9,000/bag. Prices fluctuate with fuel costs and import duties on clinker. Construction boom has increased demand 12% YoY.',
    keywords: ['cement', 'cement price', 'cimerwa', 'hima', 'construction material', 'building material'],
  },
  {
    id: 'commodity-steel',
    category: 'commodity',
    title: 'Rwanda Steel & Iron Rod Prices (2025)',
    content: 'Steel rod prices (per kg, Kigali): Iron rods (Y8-Y32) RWF 1,200–1,800/kg depending on gauge. Steel mesh RWF 3,500–4,500/sheet. Nails RWF 3,500–5,000/kg. Prices depend on international iron ore prices and EAC 10% import duty on intermediate steel. Local production (SteelRwa, Sonaba) reduces import dependency.',
    keywords: ['steel', 'iron rod', 'rebar', 'construction steel', 'steel price', 'metal price'],
  },
  {
    id: 'commodity-fuel',
    category: 'commodity',
    title: 'Rwanda Fuel Prices (2025)',
    content: 'Government-regulated pump prices (RWF/liter): Petrol RWF 1,650–1,750; Diesel RWF 1,550–1,650; Kerosene RWF 1,300–1,400. Prices set by Ministry of Trade based on Mombasa/Dar es Salaam import parity + transport + margins. Fuel accounts for 8–12% of logistics costs for Rwandan businesses.',
    keywords: ['fuel', 'petrol', 'diesel', 'gasoline', 'pump price', 'fuel cost'],
  },
  {
    id: 'commodity-food',
    category: 'commodity',
    title: 'Rwanda Food Staple Prices (2025)',
    content: 'Retail staple prices (Kigali, per kg): Maize flour RWF 600–750; Rice (imported) RWF 1,200–1,500; Beans RWF 900–1,200; Irish potatoes RWF 400–550; Bananas (plantain) RWF 300–400. Seasonal variation: 15–25% price swings during planting/harvest seasons. Zero VAT on unprocessed food staples.',
    keywords: ['food price', 'maize', 'rice', 'beans', 'potato', 'staple', 'grain price'],
  },
];

// ─── Retrieval ────────────────────────────────────────────────────────────

function scoreChunk(chunk: KnowledgeChunk, query: string): number {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);
  let score = 0;

  // Title match
  if (chunk.title.toLowerCase().includes(q)) score += 10;

  // Keyword match
  for (const kw of chunk.keywords) {
    if (q.includes(kw.toLowerCase())) score += 5;
  }

  // Content word match
  for (const word of words) {
    if (chunk.content.toLowerCase().includes(word)) score += 1;
    if (chunk.title.toLowerCase().includes(word)) score += 2;
  }

  return score;
}

/**
 * Retrieve top-k knowledge chunks relevant to the query.
 * In production, this delegates to a backend vector search (MongoDB Atlas).
 */
export function retrieveKnowledgeChunks(query: string, topK: number = 3): KnowledgeChunk[] {
  const scored = KNOWLEDGE_CHUNKS.map(c => ({ chunk: c, score: scoreChunk(c, query) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.chunk);
}

/**
 * Format retrieved chunks into a prompt-ready context string.
 */
export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return '';
  const parts = chunks.map(c => `[${c.category.toUpperCase()}] ${c.title}: ${c.content}`);
  return `EXTERNAL KNOWLEDGE:\n${parts.join('\n')}`;
}

/**
 * Detect if a user query is asking for external knowledge/advice.
 */
export function isKnowledgeQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const knowledgeKeywords = [
    'vat', 'tax', 'rra', 'penalty', 'filing', 'deadline', 'ebm',
    'labor law', 'employee', 'worker', 'salary', 'wage', 'overtime', 'leave', 'maternity', 'contract', 'termination', 'notice',
    'rssb', 'social security', 'pension', 'mutuelle', 'cbhi',
    'import duty', 'customs', 'tariff', 'certificate of origin', 'eac',
    'investment', 'incentive', 'tax holiday', 'special economic zone', 'sez', 'rdb',
    'cement price', 'steel price', 'fuel price', 'commodity', 'market price',
    'what is the law', 'what does the law say', 'is it legal', 'regulation', 'requirement',
    'how much is', 'price of', 'cost of',
  ];
  return knowledgeKeywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Instructions for the LLM when knowledge chunks are injected.
 */
export function getKnowledgeInstructions(): string {
  return `KNOWLEDGE RULES:
You have access to Rwanda-specific business knowledge (tax, labor, trade, commodity prices) provided in the EXTERNAL KNOWLEDGE section above.
- Use this knowledge to answer the user's question accurately.
- Cite the regulation name (e.g., "VAT Law 2012, Art. 3") when stating rules.
- If the knowledge does not fully answer the question, say so clearly and suggest what to check with RRA, RSSB, or a lawyer.
- Always note that regulations may have changed and advise verifying with official sources.
- For commodity prices, mention the date/period since prices fluctuate.`;
}
