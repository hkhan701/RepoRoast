"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Facehash } from "facehash"
import { cn } from "@/lib/utils"
import { Marquee } from "@/components/ui/marquee"
import { parseGitHubUrl } from "@/lib/github"

interface RoastedRepo {
  domain: string
  verdict: string
}

const AVATAR_BG_COLORS = [
  "bg-mint",
  "bg-hotpink",
  "bg-gold",
  "bg-lavender",
  "bg-rosecoral",
  "bg-skyblue",
  "bg-peachglow",
]

const SERVER_URL = (
  process.env.NEXT_PUBLIC_REPO_ROAST_SERVER_URL ?? "http://localhost:5000"
).replace(/\/$/, "")

let lastColor: string | null = null
function getRandomColor(colors: string[]) {
  let filtered = colors
  if (lastColor && colors.length > 1) {
    filtered = colors.filter((c) => c !== lastColor)
  }
  const color = filtered[Math.floor(Math.random() * filtered.length)]
  lastColor = color
  return color
}

function RepoCard({ repo, onClick }: { repo: RoastedRepo; index: number; onClick: () => void }) {
  const [color] = useState(() => getRandomColor(AVATAR_BG_COLORS))

  return (
    <div
      onClick={onClick}
      className="bg-ink min-w-52 max-w-52 sm:min-w-75 sm:max-w-75 h-32 shrink-0 select-none cursor-pointer"
      style={{
        animation:
          "scale-up-center 1s cubic-bezier(0.4, 0, 0.2, 1) both",
      }}
    >
      <div
        className={cn(
          "h-full border-2 border-ink bg-card p-3 sm:p-5 -translate-x-1 -translate-y-1 hover:-translate-x-1.5 hover:-translate-y-1.5 active:translate-x-0 active:translate-y-0 duration-200"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-7 h-7 sm:w-9 sm:h-9 border-2 border-ink shrink-0 overflow-hidden",
              color
            )}
          >
            <span className="sm:hidden">
              <Facehash name={repo.domain} size={28} />
            </span>
            <span className="hidden sm:block">
              <Facehash name={repo.domain} size={36} />
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-card-foreground truncate">
            {repo.domain}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {repo.verdict}
        </p>
      </div>
    </div>
  )
}

function RepoCardSkeleton() {
  return (
    <div className="bg-ink min-w-52 max-w-52 sm:min-w-75 sm:max-w-75 h-32 shrink-0">
      <div className="h-full border-2 border-ink bg-card p-3 sm:p-5 -translate-x-1 -translate-y-1">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 sm:w-9 sm:h-9 border-2 border-ink bg-muted animate-pulse" />
          <div className="h-3 w-24 bg-muted animate-pulse" />
        </div>

        <div className="mt-3 space-y-2">
          <div className="h-2 bg-muted animate-pulse w-full" />
          <div className="h-2 bg-muted animate-pulse w-5/6" />
          <div className="h-2 bg-muted animate-pulse w-4/6" />
        </div>
      </div>
    </div>
  )
}

export function RecentlyRoasted() {
  const router = useRouter()
  const [rowOne, setRowOne] = useState<RoastedRepo[]>([])
  const [rowTwo, setRowTwo] = useState<RoastedRepo[]>([])
  const [loading, setLoading] = useState(true)

  const handleRepoClick = (domain: string) => {
    const normalized = domain.includes("github.com/")
      ? domain
      : `https://github.com/${domain.replace(/^\/+|\/+$/g, "")}`

    const parsed = parseGitHubUrl(normalized)
    if (!parsed) return

    router.push(`/roast/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`)
  }

  useEffect(() => {
    fetch(`${SERVER_URL}/recent-roasts`)
      .then((r) => r.json())
      .then((data: { roasts: RoastedRepo[] }) => {
        const roasts = data.roasts
        if (!roasts || roasts.length < 2) return

        const filtered = roasts.filter((r) => r.verdict && r.verdict.trim().length > 0)
        if (filtered.length < 2) return

        const mid = Math.ceil(filtered.length / 2)
        setRowOne(filtered.slice(0, mid))
        setRowTwo(filtered.slice(mid))
      })
      .catch(() => {
        // optionally handle error
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <section className="pt-6 pb-14 sm:pt-8 sm:pb-20 md:pt-10 md:pb-24 bg-cream overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10">
        <h2 className="text-sm md:text-base font-bold uppercase tracking-widest text-muted-foreground text-center">
          Recently Roasted
        </h2>
      </div>

      <div className="relative flex flex-col gap-5">
        {loading ? (
          <>
            <Marquee className="[--duration:35s] [--gap:0.75rem] sm:[--gap:1.25rem]">
              {Array.from({ length: 6 }).map((_, i) => (
                <RepoCardSkeleton key={i} />
              ))}
            </Marquee>

            <Marquee
              reverse
              className="[--duration:40s] [--gap:0.75rem] sm:[--gap:1.25rem]"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <RepoCardSkeleton key={i} />
              ))}
            </Marquee>
          </>
        ) : (
          <>
            <Marquee
              pauseOnHover
              className="[--duration:35s] [--gap:0.75rem] sm:[--gap:1.25rem]"
            >
              {rowOne.map((repo, index) => (
                <RepoCard
                  key={`${repo.domain}-${index}`}
                  repo={repo}
                  index={index}
                  onClick={() => handleRepoClick(repo.domain)}
                />
              ))}
            </Marquee>

            <Marquee
              reverse
              pauseOnHover
              className="[--duration:40s] [--gap:0.75rem] sm:[--gap:1.25rem]"
            >
              {rowTwo.map((repo, index) => (
                <RepoCard
                  key={`${repo.domain}-${index}`}
                  repo={repo}
                  index={index}
                  onClick={() => handleRepoClick(repo.domain)}
                />
              ))}
            </Marquee>
          </>
        )}

        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r from-cream to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l from-cream to-transparent" />
      </div>

      <div className="mt-10 text-center">
        <a
          href="https://github.com/hkhan701/RepoRoast"
          target="_blank"
          className="text-sm font-normal uppercase tracking-widest text-muted-foreground underline underline-offset-4 hover:text-ink transition-colors"
        >
          view source code here
        </a>
      </div>
    </section>
  )
}