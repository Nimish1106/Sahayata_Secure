// filepath: src/lib/utils.ts
export function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  // already absolute
  if (/^https?:\/\//i.test(url)) return url;
  // If URL is a relative server path (e.g. '/uploads/...') and the
  // frontend environment doesn't explicitly enable local uploads,
  // return empty to indicate the file is not served by the API.
  const useLocal = (import.meta.env.VITE_USE_LOCAL_UPLOADS as string) === 'true';
  if (!useLocal && url.startsWith('/uploads')) return '';

  const base = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';
  const cleanedBase = base.replace(/\/$/, '');
  if (url.startsWith('/')) return `${cleanedBase}${url}`;
  return `${cleanedBase}/${url}`;
}

export default { resolveFileUrl };
