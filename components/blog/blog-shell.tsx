"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Paintbrush } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import styles from "./blog-shell.module.css"
import carbon from "./themes/carbon.module.css"
import paper from "./themes/paper.module.css"
import signal from "./themes/signal.module.css"

const themes = [
  { id: "carbon", label: "Carbon", className: carbon.theme },
  { id: "paper", label: "Paper", className: paper.theme },
  { id: "signal", label: "Signal", className: signal.theme },
] as const

type ThemeId = (typeof themes)[number]["id"]

export function BlogShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("carbon")
  const activeTheme =
    themes.find((candidate) => candidate.id === theme) ?? themes[0]

  return (
    <div className={cn(styles.shell, activeTheme.className)}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            <span className={styles.brandMark}>D</span>
            <span>DRAFT / JOURNAL</span>
          </Link>

          <div className={styles.themeControl} aria-label="Article theme">
            <span className={styles.themeLabel}>
              <Paintbrush aria-hidden="true" />
              Theme
            </span>
            {themes.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={theme === option.id}
                className={styles.themeButton}
                onClick={() => setTheme(option.id)}
              >
                {theme === option.id ? <Check aria-hidden="true" /> : null}
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <article className={cn("typeset", styles.article)}>{children}</article>

      <footer className={styles.footer}>
        <span>DRAFT.JONNY.DESIGN</span>
        <span>ONE DOCUMENT / THREE THEMES</span>
      </footer>
    </div>
  )
}
