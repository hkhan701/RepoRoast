/* eslint-disable @typescript-eslint/no-explicit-any */

import { githubFetch } from "@/lib/github-fetch";
import {
  MAX_FILES_TO_RETURN,
  MAX_FILE_CONTENT_CHARS,
  NOISE_DIR_PREFIXES,
  NOISE_FILE_EXTENSIONS,
  NOISE_EXACT_FILES,
  REPO_ROAST_SERVER_URL
} from "@/lib/constants";

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //

interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

interface MistralFileSelection {
  files: string[];
}

export interface FileContent {
  path: string;
  content: string;
  truncated: boolean;
}

export interface FileTreeResult {
  files: FileContent[];
  raw_tree: string[];
}

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

function isNoisyPath(path: string): boolean {
  // Check if any segment of the path matches a noise directory
  if (NOISE_DIR_PREFIXES.some((prefix) => {
    const dir = prefix.replace(/\/$/, ""); // e.g. "node_modules"
    return path.startsWith(prefix) || path.includes(`/${dir}/`);
  })) return true;

  const filename = path.split("/").pop() ?? "";

  if (NOISE_EXACT_FILES.has(filename)) return true;

  const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : "";
  if (ext && NOISE_FILE_EXTENSIONS.has(ext)) return true;

  // Skip very deep paths (likely generated/nested dependencies)
  if (path.split("/").length > 8) return true;

  return false;
}

async function ghRawFetch(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    );
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function fetchFileTree(
  owner: string,
  repo: string,
  branch: string
): Promise<TreeEntry[]> {
  const data = await githubFetch<any>(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  // data.truncated will be true for massive repos (>100k entries) — handle gracefully
  const entries: TreeEntry[] = (data.tree ?? []).filter(
    (e: any) => e.type === "blob"
  );

  return entries;
}

async function pickImportantFiles(
  filteredPaths: string[]
): Promise<MistralFileSelection> {
  const res = await fetch(`${REPO_ROAST_SERVER_URL}/pick-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: filteredPaths }),
  });

  if (!res.ok) throw new Error(`pick-files server error: ${res.status}`);

  return res.json() as Promise<MistralFileSelection>;
}

// grabs the full file tree, filters out noise, picks important files via LLM, fetches their contents, 
// and returns everything in a compact format for the main LLM to consume.
export async function grabFileTreeAndImportantFileContents(
  owner: string,
  repo: string,
  branch: string = "main",
): Promise<FileTreeResult> {
  
  // 1. Fetch full recursive tree from GitHub
  let allEntries: TreeEntry[];
  try {
    allEntries = await fetchFileTree(owner, repo, branch);
  } catch {
    // Try 'master' as fallback if 'main' fails
    allEntries = await fetchFileTree(owner, repo, "master");
  }

  // 2. Filter out noise
  const cleanPaths = allEntries
    .map((e) => e.path)
    .filter((p) => !isNoisyPath(p));

  if (cleanPaths.length === 0) {
    throw new Error("No meaningful files found in repo.");
  }

  // 3. Ask LLM to pick the important files
  const selection = await pickImportantFiles(cleanPaths);
  const chosenPaths = selection.files.slice(0, MAX_FILES_TO_RETURN);

  // 4. Fetch actual file contents from GitHub raw in parallel
  const contentResults = await Promise.allSettled(
    chosenPaths.map((path) => ghRawFetch(owner, repo, path, branch))
  );

  const fileContents: FileContent[] = chosenPaths
    .map((path, i) => {
      const result = contentResults[i];
      const raw = result.status === "fulfilled" ? result.value : null;
      if (!raw) return null;

      const truncated = raw.length > MAX_FILE_CONTENT_CHARS;
      return {
        path,
        content: truncated ? raw.slice(0, MAX_FILE_CONTENT_CHARS) + "\n... [truncated]" : raw,
        truncated,
      };
    })
    .filter((f): f is FileContent => f !== null);

  // Build a compact representation of the raw tree for the main LLM.
  // Unfiltered so it can spot committed node_modules, .env files, secrets, etc
  // Capped at 500 to avoid blowing context.
  const rawTreeSnapshot = allEntries
    .map((e) => e.path)
    .slice(0, 500);

  return {
    files: fileContents,
    raw_tree: rawTreeSnapshot,
  };
}