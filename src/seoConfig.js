import { FALLBACK_SITE_URL } from './components/Seo';

export const publicSeo = {
  home: {
    title: 'Universe Consult | Study Abroad Educational Consultancy',
    description: 'Universe Educational Consultancy helps students apply to partner universities across 14 countries with free guidance from consultation to arrival.',
    pathname: '/',
  },
  about: {
    title: 'About Universe Consult | Educational Consultancy',
    description: 'Learn about Universe Educational Consultancy, a registered study abroad consulting firm supporting students with global university applications.',
    pathname: '/about',
  },
  services: {
    title: 'Study Abroad Services | Universe Consult',
    description: 'Explore study abroad support from Universe Consult, including admissions guidance, visa assistance, compliance checks, accommodation, and arrival support.',
    pathname: '/services',
  },
  exploreUniversities: {
    title: 'Explore Partner Universities | Universe Consult',
    description: 'Browse universities across Universe Consult study destinations and filter by country to find options for your academic journey.',
    pathname: '/explore-universities',
  },
  faqs: {
    title: 'Study Abroad FAQs | Universe Consult',
    description: 'Find answers about Universe Consult services, study destinations, admissions, visa support, pricing, and application requirements.',
    pathname: '/faqs',
  },
  contact: {
    title: 'Contact Universe Consult | Free Study Abroad Enquiry',
    description: 'Contact Universe Educational Consultancy by phone, email, WhatsApp, or enquiry form to start your study abroad application.',
    pathname: '/contact',
  },
};

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Universe Educational Consultancy Limited',
  alternateName: 'Universe Consult',
  url: import.meta.env.VITE_SITE_URL || FALLBACK_SITE_URL,
  logo: `${(import.meta.env.VITE_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, '')}/logo.png`,
  email: 'Universeconsults@outlook.com',
  telephone: ['+447760907775', '+2347033988286'],
  address: [
    {
      '@type': 'PostalAddress',
      streetAddress: '27 Oke-Agbe Street, Garki 2',
      addressLocality: 'Abuja',
      addressCountry: 'NG',
    },
    {
      '@type': 'PostalAddress',
      addressLocality: 'Leeds',
      addressCountry: 'GB',
    },
  ],
  sameAs: ['https://www.tiktok.com/@universe.edu.consults'],
};
