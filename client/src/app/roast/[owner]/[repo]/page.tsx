"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { fetchRepoSummary, streamRoast, checkRoastCache, type RoastResult } from "@/lib/github"
import { popCachedSummary } from "@/lib/repo-cache"
import { toast } from "@/components/ui/toaster"
import { RoastingLoadingState } from "@/components/roasting-loading-state"
import { ExternalLink, Share2 } from "lucide-react"
import { ArrowLeftIcon } from "@/components/lucide-animated-icons/arrow-left"
import TextType from "@/components/ui/text-type"
import Image from "next/image"

export default function RoastPage() {
  const params = useParams<{ owner: string; repo: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const owner = decodeURIComponent(params.owner)
  const repo = decodeURIComponent(params.repo)
  const profanity = searchParams.get("profanity") !== "false"

  const [result, setResult] = useState<RoastResult | null>(null)
  const [isCachedRoast, setIsCachedRoast] = useState(false)
  const [loading, setLoading] = useState(true)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function run() {
      // 1. Check server-side cache first — avoids all GitHub API calls for already-roasted repos
      const cached = await checkRoastCache(owner, repo, profanity)
      if (cached) {
        setResult({ roast: cached.roast, verdict: cached.verdict })
        setIsCachedRoast(true)
        setLoading(false)
        return
      }

      // 2. Try to use the pre-fetched summary from the in-memory cache
      let summary = popCachedSummary(owner, repo)

      // 3. If not cached (e.g. direct URL visit), fetch it now
      if (!summary) {
        const res = await fetchRepoSummary(`https://github.com/${owner}/${repo}`)
        if ("error" in res) {
          toast.error(res.message)
          setLoading(false)
          return
        }
        summary = res
      }

      // 4. Start streaming roast output
      setResult({ roast: "", verdict: "" })
      setIsCachedRoast(false)
      setLoading(false)

      const roastError = await streamRoast(summary, profanity, (chunk) => {
        if (chunk.cached) {
          setIsCachedRoast(true)
        }

        setResult((prev) => {
          const previous = prev ?? { roast: "", verdict: "" }
          return {
            roast: chunk.roast || previous.roast,
            verdict: chunk.verdict || previous.verdict,
          }
        })
      })

      if (roastError) {
        toast.error(roastError.message)
        setResult(null)
      }
    }

    run()
  }, [owner, repo, profanity])

  const handleBack = () => {
    router.push("/")
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied!")
  }

  if (loading) {
    return <RoastingLoadingState />
  }

  if (!result) {
    return (
      <section className="bg-cream min-h-[60vh] px-4 py-12 sm:px-6">
        <div className="max-w-xl mx-auto flex flex-col gap-6 items-center text-center">
          <p className="text-sm text-muted-foreground">Something went wrong. Could not roast this repo.</p>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 border-2 border-ink bg-cream text-ink px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-primary-foreground transition-colors duration-100 cursor-pointer"
          >
            <ArrowLeftIcon size={15} />
            Back
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-cream min-h-[60vh] px-4 py-12 sm:px-6">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex items-stretch justify-between gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 border-2 border-ink bg-cream text-ink px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-primary-foreground transition-colors duration-100 cursor-pointer shrink-0"
          >
            <ArrowLeftIcon size={15} />
          </button>

          <div className="flex items-stretch gap-2 shrink-0">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border-2 border-ink bg-cream text-ink px-3 py-1.5 text-xs font-mono hover:bg-ink hover:text-primary-foreground transition-colors duration-100"
            >
              <Image
                src={`https://github.com/${owner}.png?size=40`}
                alt={owner}
                width={20}
                height={20}
                className="w-5 h-5 rounded-full border border-ink/20"
              />
              {repo}
              <ExternalLink size={15} />
            </a>

            <button
              onClick={handleShare}
              className="flex items-center justify-center border-2 border-ink bg-cream text-ink px-2 py-1.5 hover:bg-ink hover:text-primary-foreground transition-colors duration-100 cursor-pointer"
              aria-label="Share"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-ink/20 w-full" />

        {/* Roast content */}
        <div className="flex flex-col gap-6">
          <div className="text-sm text-ink leading-7 whitespace-pre-wrap">
            {isCachedRoast ? (
              <TextType
                text={result.roast}
                typingSpeed={8}
                deletingSpeed={0}
                pauseDuration={0}
                initialDelay={0}
                loop={false}
                showCursor={false}
              />
            ) : (
              result.roast
            )}
          </div>
          <div className="border-t-2 border-ink/20 pt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Verdict: {result.verdict}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
