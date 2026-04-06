"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchRepoSummary, parseGitHubUrl, checkRoastCache, type RepoSummary, type CachedRoastHit } from "@/lib/github"
import { setCachedSummary } from "@/lib/repo-cache"
import { AvatarStrip } from "@/components/avatar-strip"
import { SampleRepos } from "@/components/sample-repos"
import { toast } from "@/components/ui/toaster"

export function HeroSection() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [profanity, setProfanity] = useState(true)

  // Background pre-fetch state
  const summaryRef = useRef<RepoSummary | null>(null)
  const summaryPromiseRef = useRef<Promise<RepoSummary | { error: true; status: number; message: string }> | null>(null)
  const cachedRoastRef = useRef<CachedRoastHit | null>(null)
  const currentUrlRef = useRef<string>("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Silently pre-fetch repo summary whenever a valid GitHub URL is entered
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const parsed = parseGitHubUrl(url)
    if (!parsed) {
      summaryRef.current = null
      summaryPromiseRef.current = null
      cachedRoastRef.current = null
      currentUrlRef.current = ""
      return
    }

    // URL changed — invalidate cached summary
    summaryRef.current = null
    summaryPromiseRef.current = null
    cachedRoastRef.current = null
    currentUrlRef.current = url

    debounceRef.current = setTimeout(async () => {
      const capturedUrl = url

      // Check server cache first — if the roast already exists, no need to fetch repo data
      const cached = await checkRoastCache(parsed.owner, parsed.repo, profanity)
      if (currentUrlRef.current !== capturedUrl) return
      if (cached) {
        cachedRoastRef.current = cached
        return
      }

      const promise = fetchRepoSummary(capturedUrl)
      summaryPromiseRef.current = promise

      promise.then((res) => {
        // Discard if the URL changed by the time this resolves
        if (currentUrlRef.current !== capturedUrl) return
        if (!("error" in res)) {
          summaryRef.current = res
        }
      })
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [url, profanity])

  const handleRoastClick = async () => {
    const parsed = parseGitHubUrl(url)
    if (!parsed) {
      toast.error("Please enter a valid GitHub repository URL.")
      return
    }

    setSubmitting(true)
    currentUrlRef.current = url

    // If the roast is already cached server-side, navigate immediately — no GitHub API calls needed
    if (cachedRoastRef.current) {
      router.push(`/roast/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}?profanity=${profanity}`)
      return
    }

    let resolvedSummary = summaryRef.current

    if (!resolvedSummary) {
      // Cancel any pending debounce and ensure we have a promise to await
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }

      const promise = summaryPromiseRef.current ?? fetchRepoSummary(url)
      summaryPromiseRef.current = promise

      const res = await promise
      if ("error" in res) {
        setSubmitting(false)
        toast.error(res.message)
        return
      }
      resolvedSummary = res
      summaryRef.current = res
    }

    // Store the pre-fetched summary so the roast page can pick it up
    setCachedSummary(parsed.owner, parsed.repo, resolvedSummary)

    // Navigate to the roast route
    router.push(`/roast/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}?profanity=${profanity}`)
  }

  // Default form view
  return (
    <section className="bg-cream pt-14 pb-6 px-4 sm:pt-20 sm:pb-8 sm:px-6 md:pt-24 md:pb-10">
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold uppercase tracking-widest text-ink text-balance">
          Roast My Repo
        </h1>
        <p className="mt-4 sm:mt-6 text-sm text-muted-foreground max-w-xl text-pretty">
          {"Drop your repo URL. We'll find every bullshit thing you put on github."}
        </p>

        <div className="mt-8 sm:mt-10 flex w-full max-w-xl flex-col gap-3">
          <div className="flex">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="paste-your-repo-url-here"
              className="flex-1 min-w-0 border-2 border-ink bg-card text-card-foreground px-3 sm:px-4 py-3 text-sm font-normal tracking-normal placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={handleRoastClick}
              disabled={submitting}
              className="border-2 border-ink bg-yellow text-ink px-4 sm:px-6 md:px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer shrink-0 disabled:opacity-50 select-none relative overflow-hidden"
              style={{
                boxShadow: 'inset 0px -4px 0px rgba(0,0,0,0.4), inset 0px 2px 0px rgba(255,255,255,0.5), inset 4px 0px 0px rgba(255,255,255,0.3), inset -4px 0px 0px rgba(0,0,0,0.2)',
                paddingBottom: '16px',
                paddingTop: '8px',
              }}
              onMouseDown={e => {
                if (!submitting) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'inset 0px 4px 0px rgba(0,0,0,0.3), inset 0px -1px 0px rgba(255,255,255,0.2), inset 4px 0px 0px rgba(0,0,0,0.15), inset -4px 0px 0px rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.paddingBottom = '12px';
                  (e.currentTarget as HTMLButtonElement).style.paddingTop = '12px';
                }
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'inset 0px -4px 0px rgba(0,0,0,0.4), inset 0px 2px 0px rgba(255,255,255,0.5), inset 4px 0px 0px rgba(255,255,255,0.3), inset -4px 0px 0px rgba(0,0,0,0.2)';
                (e.currentTarget as HTMLButtonElement).style.paddingBottom = '16px';
                (e.currentTarget as HTMLButtonElement).style.paddingTop = '8px';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'inset 0px -4px 0px rgba(0,0,0,0.4), inset 0px 2px 0px rgba(255,255,255,0.5), inset 4px 0px 0px rgba(255,255,255,0.3), inset -4px 0px 0px rgba(0,0,0,0.2)';
                (e.currentTarget as HTMLButtonElement).style.paddingBottom = '16px';
                (e.currentTarget as HTMLButtonElement).style.paddingTop = '8px';
              }}
            >
              Roast It
            </button>
          </div>

          <button
            type="button"
            onClick={() => setProfanity((p) => !p)}
            className={`self-start flex items-center gap-3 border-2 border-ink px-3 py-1.5 cursor-pointer transition-colors duration-100 ${profanity ? "bg-ink text-primary-foreground" : "bg-cream text-ink"}`}
          >
            <span className="text-xs font-bold uppercase tracking-widest">
              {profanity ? "Profanity On" : "Clean Mode"}
            </span>
            <span className={`relative w-8 h-4 border-2 border-current flex items-center transition-colors ${profanity ? "bg-yellow" : "bg-muted"}`}>
              <span className={`absolute w-2.5 h-2.5 bg-ink transition-all duration-150 ${profanity ? "left-3.5" : "left-px"}`} />
            </span>
          </button>
        </div>

        <AvatarStrip />
        <SampleRepos onSelect={setUrl} />
      </div>
    </section>
  )
}
