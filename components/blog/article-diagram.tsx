import {
  Diagram,
  DiagramFrame,
  DiagramProvider,
} from "@/components/draft/diagram"
import {
  blogDiagrams,
  type BlogDiagramId,
} from "@/lib/blog-diagrams"

import styles from "./blog-shell.module.css"

export function ArticleDiagram({
  diagram,
  caption,
}: {
  diagram: BlogDiagramId
  caption: string
}) {
  const document = blogDiagrams[diagram]
  const aspectRatio = `${document.canvas.width} / ${document.canvas.height}`

  return (
    <figure className={`${styles.figure} not-typeset`}>
      <DiagramProvider document={document}>
        <DiagramFrame
          className={styles.articleDiagram}
          style={{ aspectRatio }}
        >
          <Diagram />
        </DiagramFrame>
      </DiagramProvider>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

export function ArticleMeta({
  date,
  readingTime,
}: {
  date: string
  readingTime: string
}) {
  return (
    <div className={`${styles.articleMeta} not-typeset`}>
      <span>DRAFT JOURNAL / 001</span>
      <span>{date}</span>
      <span>{readingTime}</span>
    </div>
  )
}
