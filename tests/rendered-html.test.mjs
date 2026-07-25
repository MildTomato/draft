import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import test from "node:test"

const templateRoot = new URL("../", import.meta.url)

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url)
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`)
  const { default: worker } = await import(workerUrl.href)

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    }
  )
}

test("server-renders the Draft studio shell", async () => {
  const response = await render()
  assert.equal(response.status, 200)
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i)

  const html = await response.text()
  assert.match(
    html,
    /<title>Draft — Technical diagrams, still in motion<\/title>/i
  )
  assert.match(html, /draft/i)
  assert.match(html, /Edge request path/i)
  assert.match(html, /Diagram canvas/i)
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i)
})

test("keeps the app and registry on one implementation boundary", async () => {
  const [page, registry, studio, design] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../registry.json", import.meta.url), "utf8"),
    readFile(
      new URL("../components/draft/draft-studio.tsx", import.meta.url),
      "utf8"
    ),
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
  assert.match(design, /Industrial schematic/)

  await access(new URL("components.json", templateRoot))
  await access(new URL("lib/draft-document.ts", templateRoot))
})
