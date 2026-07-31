import type { Metadata } from "next"

import { BlogShell } from "@/components/blog/blog-shell"
import Article from "@/content/request-path.mdx"

export const metadata: Metadata = {
  title: "The diagram is part of the sentence — Draft",
  description:
    "A themed MDX article demonstrating Draft diagrams, shadcn Typeset, and Shiki code highlighting.",
}

export default function BlogPage() {
  return (
    <BlogShell>
      <Article />
    </BlogShell>
  )
}
