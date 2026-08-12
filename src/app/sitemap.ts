import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ['', '/schedule', '/scenarios', '/roster', '/predict', '/board', '/me', '/privacy'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === '' || p === '/schedule' || p === '/scenarios' ? 'hourly' : 'monthly',
    priority: p === '' ? 1 : p === '/schedule' || p === '/scenarios' ? 0.8 : 0.5,
  }));
}
