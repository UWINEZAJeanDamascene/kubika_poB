/**
 * Generates Kinyarwanda locale file from English source.
 * Run: npx tsx scripts/generate-rw-locale.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/locales/en.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PHRASE_MAP: Record<string, string> = {
  'Are you sure you want to delete this item?': 'Uremeza ko ushaka gusiba iki kintu?',
  'Are you sure?': 'Uremeza?',
  'This action cannot be undone!': 'Iki gikorwa ntikishobora gusubizwa inyuma!',
  'No data available': 'Nta makuru aboneka',
  'Saved successfully!': 'Byabitswe neza!',
  'Deleted successfully!': 'Byasibwe neza!',
  'Updated successfully!': 'Byavuguruwe neza!',
  'Failed to fetch data': 'Kunanirwa kubona amakuru',
  'Failed to save': 'Kunanirwa kubika',
  'Failed to update': 'Kunanirwa guvugurura',
  'Failed to delete': 'Kunanirwa gusiba',
  'Loading...': 'Birimo gupakira...',
  'Sign out': 'Sohoka',
  'Are you sure you want to sign out? Any unsaved changes will be lost.':
    'Uremeza ko ushaka gusohoka? Impinduka zitarabikwa zizabura.',
  'Signing out...': 'Birimo gusohoka...',
  'Profit & Loss': 'Inyungu n\'igihombo',
  'Balance Sheet': 'Imari y\'ubucuruzi',
  'Cash Flow': 'Imiterere y\'amafaranga',
  'Goods Received Notes': 'Inyandiko z\'ibintu byakiriwe',
  // Auth
  'Welcome back': 'Murakaza neza',
  'Sign in to command center': 'Injira mu kigo cy\'ubuyobozi',
  'Enter the workspace where inventory, finance, payroll and governance move together.':
    'Injira mu mwanya w\'akazi aho ububiko, imari, umushahara n\'ubuyobozi bigenda hamwe.',
  'Live company context': 'Amakuru y\'ikigo mu gihe nyacyo',
  'Secure session handling': 'Gucunga neza session',
  'Fast access to every module': 'Kugera vuba ku moduli zose',
  'Email address': 'Aderesi ya imeli',
  'Enter password': 'Andika ijambo ry\'ibanga',
  'Forgot?': 'Wibagiwe?',
  'Sign in': 'Injira',
  'Signing in...': 'Birimo kwinjira...',
  'Create account': 'Fungura konti',
  'New company workspace?': 'Ufite ikigo gishya?',
  'Please enter email and password': 'Nyamuneka andika imeli n\'ijambo ry\'ibanga',
  'Welcome back!': 'Murakaza neza!',
  'Failed to get user details': 'Kunanirwa kubona amakuru y\'umukoresha',
  'Invalid email or password': 'Imeli cyangwa ijambo ry\'ibanga si byo',
  'This account is temporarily locked.': 'Iyi konti ifunze by\'agateganyo.',
  'Account is locked. Please try again in {{minutes}} minutes.':
    'Konti ifunze. Ongera ugerageze mu minota {{minutes}}.',
  'Login failed': 'Kwinjira byanze',
  'An error occurred during login': 'Habaye ikosa mu gihe cyo kwinjira',
  'Secure access for the operating system': 'Kwinjira neza mu sisitemu y\'ibikorwa',
  'A premium gateway for teams running inventory, purchasing, sales, finance, payroll and governance from one workspace.':
    'Urubuga rwiza rw\'amatsinda acunga ububiko, kugura, kugurisha, imari, umushahara n\'ubuyobozi mu mwanya umwe.',
  'Tenant-aware security': 'Umutekano w\'abakiriya batandukanye',
  'Role-based permissions': 'Uburenganzira bushingiye ku nshingano',
  'Audit-ready sessions': 'Session ziteguye igenzura',
  'Mission-control entry': 'Kwinjira mu buyobozi',
  'Access Console': 'Konsole yo kwinjira',
  'KUBIKA SYSTEM': 'KUBIKA SYSTEM',
  'Home': 'Ahabanza',
  'Online': 'Irakora',
  'Inventory': 'Ububiko',
  'Finance': 'Imari',
  'Payroll': 'Umushahara',
  'Accounts Receivable': 'Amafaranga y\'abakiriya batakishyuye',
  'Accounts Payable': 'Amafaranga yo kwishyura',
  'Bank Accounts': 'Konti za banki',
  'Chart of Accounts': 'Urutonde rw\'konti',
  'Journal Entries': 'Inyandiko za journal',
  'Fixed Assets': 'Umutungo utagira iherezo',
  'Accounting Periods': 'Igihe cy\'ubucuruzi',
  'Reports Hub': 'Ikigo cy\'amakuru',
  'User Management': 'Gucunga abakoresha',
  'Company Settings': 'Igenamiterere ry\'ikigo',
  'Backup & Restore': 'Gusubiza no kubika',
  'Audit Trail': 'Inzira y\'igenzura',
  'Stock Levels': 'Ingano y\'ububiko',
  'Stock Movements': 'Imihindagurikire y\'ububiko',
  'Stock Transfers': 'Kohereza ububiko',
  'Stock Audits': 'Igenzura ry\'ububiko',
  'Reorder Points': 'Ingano yo kongera gutumiza',
  'Delivery Notes': 'Inyandiko zo gutanga',
  'Credit Notes': 'Inyandiko z\'inguzanyo',
  'Recurring Invoices': 'Inyemezabuguzi zisubiramo',
  'Purchase Orders': 'Amabwiriza yo kugura',
  'Purchase Returns': 'Kugarura ibyaguzwe',
  'Freight Bills': 'Inyemezabuguzi zo kwishyura itransporo',
  'AR Receipts': 'Inyandiko zo kwakira amafaranga',
  'AP Payments': 'Kwishyura abaguzi',
  'Budget Settings': 'Igenamiterere ry\'ingengo y\'imari',
  'Notification Settings': 'Igenamiterere ry\'amenyesha',
  'Pick Packs': 'Gutora no gupakira',
  'Sales (Legacy)': 'Kugurisha (ya kera)',
};

const WORD_MAP: Record<string, string> = {
  Dashboard: 'Ikibaho',
  Dashboards: 'Amakibaho',
  Inventory: 'Ububiko',
  Purchasing: 'Kugura',
  Sales: 'Kugurisha',
  Finance: 'Imari',
  Reports: 'Raporo',
  System: 'Sisitemu',
  Products: 'Ibicuruzwa',
  Categories: 'Ibyiciro',
  Suppliers: 'Abaguzi',
  Clients: 'Abakiriya',
  Quotations: 'Amasezerano',
  Stock: 'Ububiko',
  Warehouses: 'Ububiko',
  Transfers: 'Kohereza',
  Batches: 'Ibyiciro',
  Audits: 'Igenzura',
  Invoices: 'Inyemezabuguzi',
  Subscriptions: 'Kwiyandikisha',
  Purchases: 'Kugura',
  Expenses: 'Amafaranga yakoreshejwe',
  Budgets: 'Ingengo y\'imari',
  Projects: 'Imishinga',
  Employees: 'Abakozi',
  Payroll: 'Umushahara',
  Taxes: 'Imisoro',
  Security: 'Umutekano',
  Departments: 'Amashami',
  Settings: 'Igenamiterere',
  Logout: 'Sohoka',
  Notifications: 'Amamenyesha',
  Testimonials: 'Ibyemezo',
  POS: 'POS',
  Loading: 'Birimo gupakira',
  Save: 'Bika',
  Saving: 'Birimo kubikwa',
  Cancel: 'Hagarika',
  Close: 'Funga',
  Delete: 'Siba',
  Edit: 'Hindura',
  Add: 'Ongeraho',
  Create: 'Kurema',
  Update: 'Vugurura',
  Submit: 'Ohereza',
  Confirm: 'Emeza',
  Back: 'Subira inyuma',
  Next: 'Ibikurikira',
  Previous: 'Ibyabanje',
  Reset: 'Subiza',
  Search: 'Shakisha',
  Filter: 'Shungura',
  Export: 'Kohereza hanze',
  Import: 'Kwinjiza',
  Exporting: 'Birimo kohereza hanze',
  Yes: 'Yego',
  No: 'Oya',
  Done: 'Byarangiye',
  Download: 'Kuramo',
  Actions: 'Ibikorwa',
  All: 'Byose',
  View: 'Reba',
  Name: 'Izina',
  Email: 'Imeli',
  Phone: 'Telefoni',
  Address: 'Aderesi',
  City: 'Umujyi',
  Country: 'Igihugu',
  Description: 'Ibisobanuro',
  Amount: 'Amafaranga',
  Price: 'Igiciro',
  Quantity: 'Umubare',
  Total: 'Igiteranyo',
  Notes: 'Inyandiko',
  Reference: 'Indango',
  Type: 'Ubwoko',
  Active: 'Irakora',
  Inactive: 'Ntikora',
  Activate: 'Gushyira gukora',
  Deactivate: 'Guhagarika',
  Error: 'Ikosa',
  Success: 'Intsinzi',
  Warning: 'Iburira',
  Week: 'Icyumweru',
  Month: 'Ukwezi',
  Year: 'Umwaka',
  Language: 'Ururimi',
  Status: 'Imiterere',
  Date: 'Itariki',
  Details: 'Ibisobanuro',
  Summary: 'Incamake',
  Subtotal: 'Igiteranyo cy\'ibanze',
  Tax: 'Umusoro',
  Draft: 'Icyitegererezo',
  Pending: 'Irategereje',
  Completed: 'Byarangiye',
  Cancelled: 'Byahagaritswe',
  Approved: 'Byemewe',
  Rejected: 'Byanze',
  Paid: 'Byishyuwe',
  Unpaid: 'Bitarishyurwa',
  Overdue: 'Byarenze igihe',
  Product: 'Igicuruzwa',
  Supplier: 'Umuguzi',
  Client: 'Umukiriya',
  Customer: 'Umukiriya',
  Invoice: 'Inyemezabuguzi',
  Warehouse: 'Ububiko',
  Category: 'Icyiciro',
  Unit: 'Igipimo',
  Password: 'Ijambo ry\'ibanga',
  Login: 'Injira',
  Register: 'Iyandikishe',
  Welcome: 'Murakaza neza',
  Home: 'Ahabanza',
  Features: 'Ibiranga',
  Pricing: 'Ibiciro',
  Contact: 'Twandikire',
  Help: 'Ubufasha',
  Print: 'Capa',
  Refresh: 'Vugurura',
  Copy: 'Koporora',
  Select: 'Hitamo',
  Required: 'Bikenewe',
  Optional: 'Si ngombwa',
  Title: 'Umutwe',
  Subtitle: 'Umutwe muto',
  Message: 'Ubutumwa',
  Reason: 'Impamvu',
  Comments: 'Ibitekerezo',
  Department: 'Ishami',
  Position: 'Umwanya',
  Manager: 'Umuyobozi',
  Employee: 'Umukozi',
  Salary: 'Umushahara',
  Allowance: 'Inyungu',
  Deduction: 'Igabanuka',
  Payment: 'Kwishyura',
  Receipt: 'Inyandiko yo kwakira',
  Account: 'Konti',
  Balance: 'Asigaye',
  Debit: 'Debi',
  Credit: 'Kredi',
  Deposit: 'Kubitsa',
  Withdrawal: 'Gukuramo',
  Transfer: 'Kohereza',
  Reconcile: 'Guhuza',
  Transaction: 'Igikorwa',
  Report: 'Raporo',
  Analysis: 'Isesengura',
  Summary: 'Incamake',
  Overview: 'Incamake',
  Settings: 'Igenamiterere',
  Profile: 'Umwirondoro',
  Users: 'Abakoresha',
  Roles: 'Inshingano',
  Permissions: 'Uburenganzira',
  Audit: 'Igenzura',
  Backup: 'Gusubiza',
  Restore: 'Gusubiza inyuma',
  Import: 'Kwinjiza',
  Export: 'Kohereza hanze',
  Online: 'Kuri interineti',
  Offline: 'Nta interineti',
  Strong: 'Cyiza',
  Critical: 'Bikomeye',
  Watch: 'Reba',
  Revenue: 'Amafaranga yinjiye',
  Profit: 'Inyungu',
  Loss: 'Igihombo',
  Cost: 'Igiciro',
  Budget: 'Ingengo y\'imari',
  Project: 'Umushinga',
  Task: 'Akazi',
  Timesheet: 'Urutonde rw\'igihe',
  Advance: 'Inyungu',
  Asset: 'Umutungo',
  Liability: 'Inyongera',
  Expense: 'Amafaranga yakoreshejwe',
  Income: 'Amafaranga yinjiye',
  Bank: 'Banki',
  Cash: 'Amafaranga',
  Cheque: 'Sheke',
  Card: 'Ikarita',
  Mobile: 'Telefoni',
  Money: 'Amafaranga',
  Primary: 'Ibanze',
  Default: 'Ibisanzwe',
  Custom: 'Byihariye',
  General: 'Rusange',
  Advanced: 'Byinshi',
  Basic: 'Ibanze',
  New: 'Gishya',
  Old: 'Gikera',
  Current: 'Ubu',
  Previous: 'Ibyabanje',
  Future: 'Ibizaza',
  Today: 'Uyu munsi',
  Yesterday: 'Ejo hashize',
  Tomorrow: 'Ejo',
  Annual: 'Ku mwaka',
  Monthly: 'Ku kwezi',
  Weekly: 'Ku cyumweru',
  Daily: 'Ku munsi',
  Quarterly: 'Ku gihembwe',
  Semi: 'Igice',
  Hub: 'Ikigo',
  Retry: 'Ongera ugerageze',
  Queue: 'Umurongo',
  Compliance: 'Kubahiriza amategeko',
  Control: 'Gucunga',
  Center: 'Ikigo',
  Retry: 'Ongera ugerageze',
  Unmatched: 'Bitahuye',
  Matched: 'Byahuye',
  Serial: 'Nomero',
  Numbers: 'Imibare',
  Barcode: 'Barcode',
  Scan: 'Sikana',
  Label: 'Ikarita',
  Preview: 'Reba mbere',
  Template: 'Inyandiko',
  Bulk: 'Byinshi',
  Data: 'Amakuru',
  File: 'Dosiye',
  Upload: 'Shyiraho',
  Row: 'Umurongo',
  Column: 'Inkingi',
  Field: 'Umurima',
  Mapping: 'Guhuza',
  Validation: 'Kugenzura',
  Issue: 'Ikibazo',
  Issues: 'Ibibazo',
  Passed: 'Byanyuze',
  Found: 'Byabonetse',
  Ready: 'Byiteguye',
  Skipped: 'Byasimbutse',
  Warning: 'Iburira',
  Info: 'Amakuru',
  Debug: 'Gukosora',
  Log: 'Inyandiko',
  History: 'Amateka',
  Timeline: 'Igihe',
  Activity: 'Ibikorwa',
  Recent: 'Vuba',
  Latest: 'Iheruka',
  First: 'Ubwa mbere',
  Last: 'Ubwa nyuma',
  From: 'Kuva',
  To: 'Kugeza',
  Between: 'Hagati',
  And: 'Na',
  Or: 'Cyangwa',
  With: 'Hamwe',
  Without: 'Nta',
  For: 'Kuri',
  By: 'Na',
  At: 'Kuri',
  On: 'Kuri',
  In: 'Mu',
  Of: 'Ya',
  The: '',
  A: '',
  An: '',
};

function translateWord(word: string): string {
  const cleaned = word.replace(/[^a-zA-Z&']/g, '');
  if (!cleaned) return word;
  const mapped = WORD_MAP[cleaned] ?? WORD_MAP[cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()];
  if (mapped !== undefined) return mapped;
  return word;
}

function translateString(text: string): string {
  if (typeof text !== 'string' || !text.trim()) return text;
  if (text.includes('{{')) {
    let result = text;
    for (const [enPhrase, rwPhrase] of Object.entries(PHRASE_MAP)) {
      if (enPhrase.includes('{{')) continue;
      result = result.split(enPhrase).join(rwPhrase);
    }
    for (const [en, rw] of Object.entries(WORD_MAP)) {
      const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      result = result.replace(regex, rw);
    }
    return result.replace(/\s{2,}/g, ' ').trim() || text;
  }

  if (PHRASE_MAP[text]) return PHRASE_MAP[text];

  let result = text;
  for (const [enPhrase, rwPhrase] of Object.entries(PHRASE_MAP)) {
    result = result.split(enPhrase).join(rwPhrase);
  }

  if (result === text) {
    result = text
      .split(/(\s+|\/|,|:|;|\(|\)|-|&)/)
      .map((part) => {
        if (/^\s+$/.test(part) || /^[,/():;&-]$/.test(part)) return part;
        return translateWord(part);
      })
      .join('')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return result || text;
}

function translateObject(obj: unknown): unknown {
  if (typeof obj === 'string') return translateString(obj);
  if (Array.isArray(obj)) return obj.map(translateObject);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = translateObject(value);
    }
    return result;
  }
  return obj;
}

function serialize(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';

  const lines = entries.map(([key, value]) => {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return `${padInner}${safeKey}: ${serialize(value, indent + 1)},`;
    }
    return `${padInner}${safeKey}: ${JSON.stringify(value)},`;
  });

  return `{\n${lines.join('\n')}\n${pad}}`;
}

const rw = translateObject(en);
const output = `const rw = ${serialize(rw)} as const;\n\nexport default rw;\n`;
const outPath = path.join(__dirname, '../src/i18n/locales/rw.ts');
fs.writeFileSync(outPath, output, 'utf8');
console.log(`Generated ${outPath}`);
