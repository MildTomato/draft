import assert from "node:assert/strict"
import { access, readFile, readdir } from "node:fs/promises"
import test from "node:test"

const templateRoot = new URL("../", import.meta.url)

test("uses the standard Next.js runtime", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
  )

  assert.equal(packageJson.scripts.dev, "next dev")
  assert.equal(packageJson.scripts.build, "next build --webpack")
  assert.equal(packageJson.scripts.start, "next start")
  assert.equal(packageJson.dependencies.next, "16.2.6")
  assert.equal(packageJson.devDependencies?.vite, undefined)
  assert.equal(packageJson.devDependencies?.vinext, undefined)
  assert.equal(packageJson.devDependencies?.wrangler, undefined)

  await access(new URL("../.next/BUILD_ID", import.meta.url))
})

test("separates the source-owned renderer from the editor", async () => {
  const [page, registry, editor, renderer, documentModel, design, packageJson] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../registry.json", import.meta.url), "utf8"),
      readFile(
        new URL("../components/draft/diagram-editor.tsx", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../components/draft/diagram.tsx", import.meta.url),
        "utf8"
      ),
      readFile(new URL("../lib/draft-document.ts", import.meta.url), "utf8"),
      readFile(new URL("../DESIGN.md", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ])

  const manifest = JSON.parse(registry)
  const diagramItem = manifest.items.find(
    (entry) => entry.name === "draft-diagram"
  )
  const editorItem = manifest.items.find(
    (entry) => entry.name === "draft-editor"
  )

  assert.match(page, /<DiagramEditor \/>/)
  assert.ok(diagramItem)
  assert.equal(diagramItem.type, "registry:component")
  assert.deepEqual(diagramItem.dependencies, ["lucide-react@^1.26.0"])
  assert.equal(diagramItem.registryDependencies, undefined)
  assert.ok(
    diagramItem.files.some(
      (file) => file.path === "components/draft/diagram.tsx"
    )
  )
  assert.ok(
    diagramItem.files.every(
      (file) => !file.path.includes("editor")
    )
  )
  assert.ok(editorItem)
  assert.equal(editorItem.type, "registry:block")
  assert.ok(
    editorItem.registryDependencies.includes(
      "https://draft.jonny.design/r/draft-diagram.json"
    )
  )
  assert.ok(editorItem.registryDependencies.includes("button"))
  assert.ok(
    editorItem.files.some(
      (file) => file.path === "components/draft/diagram-editor.tsx"
    )
  )
  assert.match(editor, /export function DiagramEditor/)
  assert.match(editor, /<DiagramProvider document=\{diagramDocument\}>/)
  assert.match(editor, /<Diagram viewport=\{viewport\}>/)
  assert.match(renderer, /export function DiagramProvider/)
  assert.match(renderer, /export function DiagramFrame/)
  assert.match(renderer, /export function Diagram\(/)
  assert.match(renderer, /export function DiagramNode/)
  assert.match(renderer, /export function DiagramConnector/)
  assert.doesNotMatch(editor, /@xyflow/)
  assert.doesNotMatch(renderer, /@xyflow/)
  assert.doesNotMatch(documentModel, /@xyflow/)
  assert.doesNotMatch(packageJson, /@xyflow/)
  assert.doesNotMatch(registry, /@xyflow/)
  assert.match(documentModel, /DRAFT_GRID_SIZE = 24/)
  assert.doesNotMatch(documentModel, /gridSize:/)
  assert.match(documentModel, /DRAFT_NODE_WIDTH = 240/)
  assert.match(documentModel, /DRAFT_NODE_HEIGHT = 96/)
  assert.match(design, /Industrial schematic/)

  await access(new URL("components.json", templateRoot))
  await access(new URL("lib/draft-document.ts", templateRoot))
  await access(new URL("components/draft/diagram.tsx", templateRoot))
})

test("themes one article and its diagrams through shared tokens", async () => {
  const themeFiles = ["carbon", "paper", "signal"]
  const [
    articleFiles,
    shell,
    diagramStyles,
    articleFigure,
    articleContent,
    ...themes
  ] = await Promise.all([
    readdir(new URL("../content/", import.meta.url)),
    readFile(
      new URL("../components/blog/blog-shell.tsx", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../components/draft/diagram.module.css", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../components/blog/article-diagram.tsx", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../content/request-path.mdx", import.meta.url), "utf8"),
    ...themeFiles.map((theme) =>
      readFile(
        new URL(
          `../components/blog/themes/${theme}.module.css`,
          import.meta.url
        ),
        "utf8"
      )
    ),
  ])

  assert.deepEqual(
    articleFiles.filter((file) => file.endsWith(".mdx")),
    ["request-path.mdx"]
  )
  assert.match(shell, /id: "carbon"/)
  assert.match(shell, /id: "paper"/)
  assert.match(shell, /id: "signal"/)
  assert.doesNotMatch(articleFigure, /figureHeader/)
  assert.doesNotMatch(articleFigure, /label: string/)
  assert.doesNotMatch(articleContent, /\slabel="Figure/)

  for (const theme of themes) {
    assert.match(theme, /--background:/)
    assert.match(theme, /--typeset-body:/)
    assert.match(theme, /--blog-shiki-token:/)
    assert.match(theme, /--draft-text-size:/)
    assert.match(theme, /--draft-frame-background:/)
    assert.match(theme, /--draft-frame-radius:/)
    assert.match(theme, /--draft-frame-shadow:/)
    assert.match(theme, /--draft-node-background:/)
    assert.match(theme, /--draft-node-radius:/)
    assert.match(theme, /--draft-boundary-radius:/)
    assert.match(theme, /--draft-status-radius:/)
    assert.match(theme, /--draft-label-radius:/)
  }

  assert.doesNotMatch(
    diagramStyles,
    /^\s*--draft-(?:frame|grid|node|text)-/m
  )
  assert.match(
    diagramStyles,
    /var\(--draft-frame-background, #070707\)/
  )
  assert.match(
    diagramStyles,
    /var\(--draft-node-background, #0c0c0c\)/
  )
  assert.match(diagramStyles, /var\(--draft-frame-radius, 0\)/)
  assert.match(
    diagramStyles,
    /var\(--draft-node-radius, var\(--draft-radius, 4px\)\)/
  )
  assert.match(diagramStyles, /var\(--draft-label-radius, 9px\)/)
})
