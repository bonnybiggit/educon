import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const FALLBACK_SITE_URL = 'https://universeconsults.netlify.app';

export const getSiteUrl = () => (
  (import.meta.env.VITE_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, '')
);

const setMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const setCanonical = (url) => {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
};

const setJsonLd = (jsonLd) => {
  const existing = document.head.querySelector('script[type="application/ld+json"][data-seo-jsonld="true"]');
  if (!jsonLd) {
    existing?.remove();
    return;
  }

  const script = existing || document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-seo-jsonld', 'true');
  script.textContent = JSON.stringify(jsonLd);

  if (!existing) document.head.appendChild(script);
};

const buildUrl = (siteUrl, pathname) => {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${siteUrl}${cleanPath}`;
};

const Seo = ({
  title,
  description,
  pathname,
  image = '/logo.png',
  type = 'website',
  noIndex = false,
  jsonLd,
}) => {
  const location = useLocation();

  useEffect(() => {
    const siteUrl = getSiteUrl();
    const canonicalUrl = buildUrl(siteUrl, pathname || location.pathname);
    const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;
    const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';

    document.title = title;
    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="robots"]', { name: 'robots', content: robotsContent });
    setCanonical(canonicalUrl);

    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Universe Consult' });

    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

    setJsonLd(jsonLd);
  }, [description, image, jsonLd, location.pathname, noIndex, pathname, title, type]);

  return null;
};

export default Seo;
