"use client"

import { useState, useEffect } from "react"
import { Facehash } from "facehash"
import CountUp from "@/components/ui/count-up"
import { REPO_ROAST_SERVER_URL } from "@/lib/constants"

const AVATAR_NAMES = [
  "agent-47",
  "chao-monkey",
  "debug-duck",
  "error-404",
  "fix-it-felix",
  "git-blame",
  "hack-smith",
  "infinite-loop",
  "jank-master",
]

const AVATAR_BG_COLORS = [
  "bg-mint", "bg-hotpink", "bg-gold", "bg-lavender",
  "bg-rosecoral", "bg-skyblue", "bg-peachglow", "bg-mint", "bg-hotpink",
]

export function AvatarStrip() {
  const [visibleAvatars, setVisibleAvatars] = useState(0)
  const [roastCount, setRoastCount] = useState(0)

  useEffect(() => {
    fetch(`${REPO_ROAST_SERVER_URL}/roast-count`)
      .then((r) => r.json())
      .then((data) => setRoastCount(data.count ?? 31415))
      .catch(() => {/* leave null, will show fallback */ })
  }, [])

  useEffect(() => {
    if (visibleAvatars >= AVATAR_NAMES.length) return
    const timer = window.setTimeout(
      () => setVisibleAvatars((count) => Math.min(count + 1, AVATAR_NAMES.length)),
      120,
    )
    return () => window.clearTimeout(timer)
  }, [visibleAvatars])

  return (
    <>
      <style>{`
        @keyframes bounceIn {
          0% { transform: translateY(-10px); }
          50% { transform: translateY(2px); }
          75% { transform: translateY(-1px); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <div className="flex space-x-1">
          {AVATAR_NAMES.slice(0, visibleAvatars).map((name, i) => (
            <div
              key={i}
              className={`${AVATAR_BG_COLORS[i % AVATAR_BG_COLORS.length]} border-2 border-ink overflow-hidden transition-transform duration-200 ease-out hover:-translate-y-1 cursor-pointer shadow-none hover:shadow-[0_14px_16px_-10px_rgba(17,17,17,0.75)]`}
              style={{ animation: "bounceIn 0.35s ease-out" }}
            >
              <Facehash name={name} size={24} />
            </div>
          ))}
        </div>
        <span className="text-sm font-bold uppercase tracking-widest text-ink">
          +<CountUp
            from={0}
            to={roastCount}
            separator=","
            direction="up"
            duration={1}
            className="count-up-text"
          /> repos roasted
        </span>
      </div>
    </>
  )
}
