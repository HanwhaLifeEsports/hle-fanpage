import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ['', '/schedule', '/roster', '/predict', '/board', '/me', '/privacy', '/sources'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === '' || p === '/schedule' ? 'hourly' : 'monthly',
    priority: p === '' ? 1 : p === '/schedule' ? 0.8 : 0.5,
  }));
}
