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
    title: 'KUBIKA | Stock Management System Rwanda for Growing Businesses',
    description: 'KUBIKA is a cloud stock management and accounting ERP for Rwandan SMEs. Manage inventory, purchasing, POS, payroll, VAT and RRA reporting across every branch.',
    heading: 'Stock management and accounting for Rwandan SMEs.',
    summary: 'KUBIKA connects inventory, purchasing, accounting, payroll, POS and RRA reporting in one cloud workspace for businesses in Rwanda and across Africa.',
    sections: ['Inventory management across branches', 'Purchasing, accounting and payroll in one system', 'VSDC/EBM-ready workflows for Rwanda'],
  },
  '/pricing': {
    title: 'KUBIKA Pricing | ERP for Rwandan SMEs',
    description: 'Explore KUBIKA plans for Rwandan SMEs that need connected inventory management, accounting, purchasing, POS and branch reporting.',
    heading: 'ERP plans for Rwandan SMEs.',
    summary: 'Choose a KUBIKA operating plan for connected stock, accounting, purchasing, payroll and branch reporting.',
    sections: ['Stock and inventory control', 'Accounting and financial reporting', 'Multi-branch operations'],
  },
  '/trust': {
    title: 'KUBIKA Trust and Security | Rwanda Business Software',
    description: 'Learn how KUBIKA protects company records with role-based access, audit history, backups and secure cloud operations for Rwanda businesses.',
    heading: 'Secure business software for Rwanda.',
    summary: 'KUBIKA keeps company records protected with role-based access, activity history and resilient backups.',
    sections: ['Company data boundaries', 'Roles and permissions', 'Traceable activity history'],
  },
  '/operations': {
    title: 'Inventory and Operations Management Rwanda | KUBIKA',
    description: 'Control stock, warehouses, purchasing, sales and branch operations with KUBIKA, an inventory management system built for Rwandan and African businesses.',
    heading: 'Inventory management for Rwanda and Africa.',
    summary: 'Track products, warehouses, purchases, sales, transfers and reorder levels without losing the company record.',
    sections: ['Warehouse and stock control', 'Purchasing and goods received', 'Sales, POS and branch reporting'],
  },
  '/platform': {
    title: 'Cloud Accounting and ERP Platform for Rwanda | KUBIKA',
    description: 'KUBIKA connects inventory, accounting, payroll, POS and VSDC/EBM-ready workflows in one cloud ERP platform for Rwandan SMEs.',
    heading: 'One cloud ERP platform for Rwandan businesses.',
    summary: 'Run stock, accounting, payroll, POS and tax-related workflows from one connected operating system.',
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
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#software`,
    name: 'KUBIKA',
    url: siteUrl,
    description: 'Cloud stock management and accounting ERP for Rwandan SMEs and growing African businesses.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    areaServed: [
      { '@type': 'Country', name: 'Rwanda' },
      { '@type': 'Continent', name: 'Africa' },
    ],
    publisher: { '@id': `${siteUrl}/#organization` },
  };
  const fallback = `
    <main style="max-width:760px;margin:0 auto;padding:48px 24px;font-family:Arial,sans-serif;color:#172338">
      <p style="font-weight:700;letter-spacing:.12em;color:#c75f34">KUBIKA / RWANDA BUSINESS SOFTWARE</p>
      <h1>${escapeHtml(page.heading)}</h1>
      <p>${escapeHtml(page.summary)}</p>
      <h2>What KUBIKA connects</h2>
      <ul>${page.sections.map((section) => `<li>${escapeHtml(section)}</li>`).join('')}</ul>
      <p><a href="/register">Create a KUBIKA workspace</a> or <a href="/login">sign in</a>.</p>
      <p>KUBIKA is operated by BluePeak Rwanda Digital Solutions Ltd in Kicukiro, Kigali, Rwanda.</p>
    </main>`;

  const pageHtml = baseHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace('</head>', `<script type="application/ld+json" id="kubika-organization-schema">${JSON.stringify(organizationSchema)}</script><script type="application/ld+json" id="kubika-software-schema">${JSON.stringify(softwareSchema)}</script></head>`)
    .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);

  const outputDirectory = path.join(distDirectory, route === '/' ? '' : route.slice(1));
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, 'index.html'), pageHtml);
}

console.log(`Generated static marketing HTML for ${Object.keys(pages).length} routes.`);
