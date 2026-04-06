// Simple in-memory cache for pre-fetched repo summaries.
// The hero page writes here before navigating; the roast page reads on mount.

import type { RepoSummary } from "@/lib/github";

const cache = new Map<string, RepoSummary>();

function key(owner: string, repo: string) {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export function setCachedSummary(owner: string, repo: string, summary: RepoSummary) {
  cache.set(key(owner, repo), summary);
}

export function popCachedSummary(owner: string, repo: string): RepoSummary | null {
  const k = key(owner, repo);
  const summary = cache.get(k) ?? null;
  if (summary) cache.delete(k);
  return summary;
}
