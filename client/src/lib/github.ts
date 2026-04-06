/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/github.ts
// Client-side GitHub API calls (uses user's IP, no auth needed for public repos)

import { grabFileTreeAndImportantFileContents, type FileContent } from "@/lib/filetree";
import { githubFetch, type GitHubFetchError } from "@/lib/github-fetch";
import { MAX_README_CHARS, REPO_ROAST_SERVER_URL } from "@/lib/constants";

export type { GitHubFetchError };

export interface RepoSummary {
  name: string;
  owner: string;
  description: string | null;
  languages: string[];
  stars: number;
  forks: number;
  fork: boolean;
  open_issues: number;
  contributor_count: number;
  created_at: string;
  current_date: string;
  last_pushed_at: string;
  license_name: string | null;
  readme: string | null;
  recent_commit_messages: string[];
  is_archived: boolean;
  file_tree: string[];
  file_contents: FileContent[];
}

// extracts the owner and repo name from various GitHub URL formats
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\.git$/, "");
  const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}


export interface RoastResult {
  roast: string;
  verdict: string;
}

export interface CachedRoastHit extends RoastResult {
  cached: true;
}

export async function checkRoastCache(
  owner: string,
  repo: string,
  profanity: boolean
): Promise<CachedRoastHit | null> {
  try {
    const params = new URLSearchParams({ owner, repo, profanity: String(profanity) });
    const res = await fetch(`${REPO_ROAST_SERVER_URL}/roast-check?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.cached) return { roast: data.roast, verdict: data.verdict, cached: true };
    return null;
  } catch {
    return null;
  }
}

export interface RoastStreamResult extends RoastResult {
  cached?: boolean;
}

interface RoastStreamEvent {
  event: string;
  data: string;
}

function parseSseEvent(rawEvent: string): RoastStreamEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  return {
    event,
    data: dataLines.join("\n"),
  };
}

export async function fetchRoast(
  repoSummary: RepoSummary,
  profanity: boolean
): Promise<RoastResult | GitHubFetchError> {
  try {
    const res = await fetch(`${REPO_ROAST_SERVER_URL}/roast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_summary: repoSummary, profanity }),
    });
    if (!res.ok) throw new Error(`Roast server error: ${res.status}`);
    return res.json() as Promise<RoastResult>;
  } catch (err: any) {
    return { error: true, status: 500, message: err?.message ?? "Failed to fetch roast." };
  }
}

export async function streamRoast(
  repoSummary: RepoSummary,
  profanity: boolean,
  onChunk: (result: RoastStreamResult) => void
): Promise<GitHubFetchError | void> {
  try {
    const res = await fetch(`${REPO_ROAST_SERVER_URL}/roast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ repo_summary: repoSummary, profanity }),
    });

    if (!res.ok) throw new Error(`Roast server error: ${res.status}`);

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await res.json() as Partial<RoastResult> & { cached?: boolean };
      onChunk({
        roast: typeof payload.roast === "string" ? payload.roast : "",
        verdict: typeof payload.verdict === "string" ? payload.verdict : "",
        cached: payload.cached === true,
      });
      return;
    }

    if (!res.body) throw new Error("No response body from roast stream.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const event = parseSseEvent(rawEvent);
        if (!event) {
          separatorIndex = buffer.indexOf("\n\n");
          continue;
        }

        if (event.event === "error") {
          let message = "Failed to fetch roast.";
          try {
            const payload = JSON.parse(event.data) as { message?: string };
            if (payload?.message) message = payload.message;
          } catch {
            // ignore invalid payload
          }
          return { error: true, status: 500, message };
        }

        if (event.event === "chunk" || event.event === "done") {
          try {
            const payload = JSON.parse(event.data) as Partial<RoastResult>;
            onChunk({
              roast: typeof payload.roast === "string" ? payload.roast : "",
              verdict: typeof payload.verdict === "string" ? payload.verdict : "",
              cached: false,
            });
          } catch {
            // ignore malformed stream chunk
          }
        }

        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } catch (err: any) {
    return { error: true, status: 500, message: err?.message ?? "Failed to stream roast." };
  }
}

// Main function to fetch all repo data
export async function fetchRepoSummary(
  githubUrl: string
): Promise<RepoSummary | GitHubFetchError> {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) {
    return { error: true, status: 400, message: "Invalid GitHub URL." };
  }

  if (parsed.repo.toLowerCase() === "reporoast") {
    return {
      error: true,
      status: 400,
      message: "RepoRoast is too perfect to roast. Please choose another repo",
    };
  }

  if (parsed.owner.toLowerCase() === "hkhan701") {
    return {
      error: true,
      status: 400,
      message: "Did you really think I'd let you roast my personal repos? Try someone else's code, coward",
    };
  }

  const { owner, repo } = parsed;
  const base = `/repos/${owner}/${repo}`;

  try {
    const repoDataPromise = githubFetch<any>(base);
    const languagePromise = githubFetch<Record<string, number>>(`${base}/languages`);
    const contributorsPromise = githubFetch<any[]>(`${base}/contributors?per_page=10&anon=true`);
    const commitsPromise = githubFetch<any[]>(`${base}/commits?per_page=10`);
    const readmePromise = githubFetch<any>(`${base}/readme`);

    const r = await repoDataPromise;

    const filetreePromise = grabFileTreeAndImportantFileContents(owner, repo, r.default_branch);

    const [languageData, contributors, commits, readmeData, filetree] =
      await Promise.allSettled([
        languagePromise,
        contributorsPromise,
        commitsPromise,
        readmePromise,
        filetreePromise,
      ]);

    if (filetree.status === "rejected") throw filetree.reason;

    // Decode README, strip images and HTML, keep plain text
    let readme: string | null = null;
    if (readmeData.status === "fulfilled") {
      try {
        const decoded = atob(readmeData.value.content.replace(/\n/g, ""));
        readme = decoded
          .replace(/!\[.*?\]\(.*?\)/g, "")         // remove markdown images
          .replace(/<img[^>]*>/gi, "")              // remove HTML images
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // flatten links to text
          .trim();
        if (readme.length > MAX_README_CHARS) {
          readme = readme.slice(0, MAX_README_CHARS) + "\n... [truncated]";
        }
      } catch {
        readme = null;
      }
    }

    return {
      name: r.name,
      owner: r.owner?.login ?? owner,
      description: r.description ?? null,
      languages:
        languageData.status === "fulfilled"
          ? Object.keys(languageData.value)
          : [],
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      fork: r.fork ?? false,
      open_issues: r.open_issues_count ?? 0,
      contributor_count:
        contributors.status === "fulfilled" ? contributors.value.length : 0,
      created_at: r.created_at,
      current_date: new Date().toISOString(),
      last_pushed_at: r.pushed_at,
      license_name: r.license?.name ?? null,
      readme,
      recent_commit_messages:
        commits.status === "fulfilled"
          ? commits.value.map((c: any) => c.commit?.message?.split("\n")[0] ?? "").filter(Boolean)
          : [],
      is_archived: r.archived ?? false,
      file_tree: filetree.value.raw_tree,
      file_contents: filetree.value.files,
    };
  } catch (err: any) {
    if (err?.error) return err as GitHubFetchError;
    return {
      error: true,
      status: 500,
      message: err?.message ?? "Unknown error fetching repo data.",
    };
  }
}