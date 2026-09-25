import { useEffect } from 'react';
import { useLocation } from 'react-router';
import i18n from '@/i18n';

const SITE_URL = 'https://kubika.techmat.rw';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.svg`;

interface PageSeo {
  title: string;
  description: string;
  type?: 'website' | 'software';
}

const publicSeo: Record<string, PageSeo> = {
  '/': {
    title: 'KUBIKA | Stock Management System Rwanda for Growing Businesses',
    description:
      'KUBIKA is a cloud stock management and accounting ERP for Rwandan SMEs. Manage inventory, purchasing, POS, payroll, VAT and RRA reporting across every branch.',
    type: 'software',
  },
  '/pricing': {
    title: 'KUBIKA Pricing | ERP for Rwandan SMEs',
    description:
      'Explore KUBIKA plans for Rwandan SMEs that need connected inventory management, accounting, purchasing, POS and branch reporting.',
  },
  '/trust': {
    title: 'KUBIKA Trust and Security | Rwanda Business Software',
    description:
      'Learn how KUBIKA protects company records with role-based access, audit history, backups and secure cloud operations for Rwanda businesses.',
  },
  '/operations': {
    title: 'Inventory and Operations Management Rwanda | KUBIKA',
    description:
      'Control stock, warehouses, purchasing, sales and branch operations with KUBIKA, an inventory management system built for Rwandan and African businesses.',
  },
  '/platform': {
    title: 'Cloud Accounting and ERP Platform for Rwanda | KUBIKA',
    description:
      'KUBIKA connects inventory, accounting, payroll, POS and VSDC/EBM-ready workflows in one cloud ERP platform for Rwandan SMEs.',
  },
};

const setMeta = (name: string, content: string, property = false) => {
  const attribute = property ? 'property' : 'name';
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
};

const setLink = (rel: string, href: string, type?: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
  if (type) element.type = type;
};

const setJsonLd = (id: string, value: unknown) => {
  let element = document.head.querySelector<HTMLScriptElement>(`script#${id}`);
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(value);
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'BluePeak Rwanda Digital Solutions Ltd',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Kicukiro, Kigali',
    addressCountry: 'RW',
  },
  telephone: '+250780936645',
  email: 'jayfcode@gmail.com',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+250780936645',
    email: 'jayfcode@gmail.com',
    contactType: 'customer support',
    areaServed: 'RW',
  },
  // Add verified social profile URLs here when the company profiles are published.
  sameAs: [],
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: 'KUBIKA',
  url: SITE_URL,
  description:
    'Cloud stock management and accounting ERP for Rwandan SMEs and growing African businesses.',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Inventory management and accounting software',
  operatingSystem: 'Web',
  areaServed: [
    { '@type': 'Country', name: 'Rwanda' },
    { '@type': 'Continent', name: 'Africa' },
  ],
  publisher: { '@id': `${SITE_URL}/#organization` },
};

function getLocale() {
  const language = i18n.language?.split('-')[0] || 'en';
  return language === 'rw' ? 'rw' : language === 'fr' ? 'fr' : 'en';
}

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = publicSeo[pathname];
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
    const isIndexable = Boolean(seo);
    const title = seo?.title || 'KUBIKA SYSTEM | Secure Business Operations';
    const description = seo?.description || 'KUBIKA is a secure cloud workspace for business operations.';

    document.title = title;
    document.documentElement.lang = getLocale();
    setMeta('description', description);
    setMeta('robots', isIndexable ? 'index, follow' : 'noindex, nofollow');
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', seo?.type === 'software' ? 'website' : 'website', true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', DEFAULT_IMAGE, true);
    setMeta('og:image:alt', 'KUBIKA cloud stock management and accounting ERP', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', DEFAULT_IMAGE);
    setLink('canonical', canonicalUrl);
    setJsonLd('kubika-organization-schema', organizationSchema);

    if (isIndexable) {
      setJsonLd('kubika-software-schema', softwareSchema);
    } else {
      document.head.querySelector('#kubika-software-schema')?.remove();
    }
  }, [pathname]);

  return null;
}
