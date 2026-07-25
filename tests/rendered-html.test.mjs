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

test("keeps the app and registry on one implementation boundary", async () => {
  const [page, registry, studio, documentModel, design] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../registry.json", import.meta.url), "utf8"),
    readFile(
      new URL("../components/draft/draft-studio.tsx", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../lib/draft-document.ts", import.meta.url), "utf8"),
    readFile(new URL("../DESIGN.md", import.meta.url), "utf8"),
  ])

  const manifest = JSON.parse(registry)
  const item = manifest.items.find((entry) => entry.name === "draft-studio")

  assert.match(page, /<DraftStudio \/>/)
  assert.ok(item)
  assert.equal(item.type, "registry:block")
  assert.ok(item.dependencies.includes("@xyflow/react@^12.11.2"))
  assert.ok(item.registryDependencies.includes("button"))
  assert.ok(
    item.files.some(
      (file) => file.path === "components/draft/draft-studio.tsx"
    )
  )
  assert.match(studio, /export function DraftStudio/)
  assert.match(studio, /toDraftDocument/)
  assert.match(studio, /connectionLineType=\{ConnectionLineType\.Step\}/)
  assert.match(
    studio,
    /snapGrid=\{\[DRAFT_GRID_SIZE, DRAFT_GRID_SIZE\]\}/
  )
  assert.doesNotMatch(studio, /type:\s*"smoothstep"/)
  assert.match(studio, /sourceHandle:\s*"bottom"/)
  assert.match(studio, /targetHandle:\s*"top"/)
  assert.doesNotMatch(documentModel, /type:\s*"smoothstep"/)
  assert.match(documentModel, /DRAFT_GRID_SIZE = 24/)
  assert.match(documentModel, /DRAFT_NODE_WIDTH = 240/)
  assert.match(documentModel, /DRAFT_NODE_HEIGHT = 96/)
  assert.match(design, /Industrial schematic/)

  await access(new URL("components.json", templateRoot))
  await access(new URL("lib/draft-document.ts", templateRoot))
})
