import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
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
