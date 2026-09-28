import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const distDirectory = path.join(projectDirectory, 'dist');
const siteUrl = 'https://kubika.techmat.rw';
const baseHtml = await fs.readFile(path.join(distDirectory, 'index.html'), 'utf8');

const pages = {
  '/': {
    title: 'Inventory and Accounting Software in Rwanda | KUBIKA',
    description: 'Manage inventory, accounting, purchasing, POS and RRA workflows in one cloud system built for businesses in Rwanda.',
    heading: 'Inventory and accounting software for Rwandan businesses.',
    summary: 'KUBIKA brings stock control, purchasing, accounting, payroll and sales together so teams can manage day-to-day operations from one workspace.',
    sections: ['Track stock across products and branches', 'Connect purchasing, receiving and accounting', 'Support Rwanda-focused tax and EBM workflows'],
  },
  '/pricing': {
    title: 'KUBIKA Pricing | Inventory and Accounting Plans',
    description: 'Explore KUBIKA plans for Rwandan SMEs that need connected inventory management, accounting, purchasing, POS and branch reporting.',
    heading: 'ERP plans for Rwandan SMEs.',
    summary: 'Choose a KUBIKA operating plan for connected stock, accounting, purchasing, payroll and branch reporting.',
    sections: ['Stock and inventory control', 'Accounting and financial reporting', 'Multi-branch operations'],
  },
  '/trust': {
    title: 'KUBIKA Security and Data Controls | Rwanda',
    description: 'Learn how KUBIKA protects company records with role-based access, audit history, backups and secure cloud operations for Rwanda businesses.',
    heading: 'Secure business software for Rwanda.',
    summary: 'KUBIKA keeps company records protected with role-based access, activity history and resilient backups.',
    sections: ['Company data boundaries', 'Roles and permissions', 'Traceable activity history'],
  },
  '/operations': {
    title: 'Inventory Management Software in Rwanda | KUBIKA',
    description: 'Manage stock, warehouses, purchasing, goods received, sales and branches with KUBIKA inventory software for businesses in Rwanda and East Africa.',
    heading: 'Inventory management software for Rwanda and East Africa.',
    summary: 'Track products, warehouses, purchases, sales, transfers and reorder levels in one connected inventory system.',
    sections: ['Warehouse and stock control', 'Purchasing and goods received', 'Sales, POS and branch reporting'],
  },
  '/platform': {
    title: 'Accounting and Inventory Software in Rwanda | KUBIKA',
    description: 'Connect inventory, accounting, payroll, POS and RRA workflows in one cloud business management system for Rwandan companies.',
    heading: 'Accounting and inventory in one business system.',
    summary: 'Bring stock, accounting, payroll, POS and tax-related workflows together in a cloud system designed for Rwandan businesses.',
    sections: ['Cloud inventory and accounting', 'Payroll, PAYE and RSSB workflows', 'VAT and RRA reporting'],
  },
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

for (const [route, page] of Object.entries(pages)) {
  const canonical = `${siteUrl}${route === '/' ? '/' : route}`;
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'BluePeak Rwanda Digital Solutions Ltd',
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    telephone: '+250780936645',
    email: 'jayfcode@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kicukiro, Kigali',
      addressCountry: 'RW',
    },
    sameAs: [],
  };
  const fallback = `
    <main style="max-width:760px;margin:0 auto;padding:48px 24px;font-family:Arial,sans-serif;color:#172338">
      <p style="font-weight:700;letter-spacing:.12em;color:#c75f34">KUBIKA / RWANDA BUSINESS SOFTWARE</p>
      <h1>${escapeHtml(page.heading)}</h1>
      <p>${escapeHtml(page.summary)}</p>
      <h2>What KUBIKA connects</h2>
      <ul>${page.sections.map((section) => `<li>${escapeHtml(section)}</li>`).join('')}</ul>
      <p>Explore <a href="/operations">inventory management</a>, <a href="/platform">accounting and business tools</a>, <a href="/pricing">plans</a>, and <a href="/trust">security information</a>.</p>
      <p><a href="/register">Create a KUBIKA workspace</a> or <a href="/login">sign in</a>.</p>
      <p>KUBIKA is operated by BluePeak Rwanda Digital Solutions Ltd in Kicukiro, Kigali, Rwanda.</p>
    </main>`;

  const pageHtml = baseHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace('</head>', `<script type="application/ld+json" id="kubika-organization-schema">${JSON.stringify(organizationSchema)}</script></head>`)
    .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);

  const outputDirectory = path.join(distDirectory, route === '/' ? '' : route.slice(1));
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, 'index.html'), pageHtml);
}

console.log(`Generated static marketing HTML for ${Object.keys(pages).length} routes.`);
