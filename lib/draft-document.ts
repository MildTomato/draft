export const DRAFT_GRID_SIZE = 24
export const DRAFT_CANVAS_WIDTH = 1440
export const DRAFT_CANVAS_HEIGHT = 720
export const DRAFT_NODE_WIDTH = 240
export const DRAFT_NODE_HEIGHT = 96

export type DraftTone = "neutral" | "red" | "green" | "blue" | "violet"
export type DraftNodeKind =
  | "client"
  | "gateway"
  | "service"
  | "database"
  | "queue"
  | "note"
export type DraftPort = "top" | "right" | "bottom" | "left"

export type DraftPoint = {
  x: number
  y: number
}

export type DraftSize = {
  width: number
  height: number
}

export type DraftNodeData = {
  label: string
  eyebrow: string
  detail?: string
  status?: string
  tone: DraftTone
  kind: DraftNodeKind
}

export type DraftBoundaryData = {
  label: string
  detail: string
}

export type DraftNode = {
  id: string
  type: "node"
  position: DraftPoint
  size: DraftSize
  data: DraftNodeData
}

export type DraftBoundary = {
  id: string
  type: "boundary"
  position: DraftPoint
  size: DraftSize
  data: DraftBoundaryData
}

export type DraftElement = DraftNode | DraftBoundary

export type DraftConnector = {
  id: string
  source: string
  target: string
  sourcePort: DraftPort
  targetPort: DraftPort
  label?: string
  tone: DraftTone
}

export type DraftDocument = {
  schemaVersion: 1
  meta: {
    id: string
    title: string
    updatedAt: string
  }
  canvas: {
    width: number
    height: number
  }
  graph: {
    nodes: DraftElement[]
    edges: DraftConnector[]
  }
}

export const DRAFT_TONE_COLORS: Record<DraftTone, string> = {
  neutral: "#747474",
  red: "#d65b5b",
  green: "#61b995",
  blue: "#6d91d8",
  violet: "#a97ad5",
}

export function snapToDraftGrid(value: number) {
  return Math.round(value / DRAFT_GRID_SIZE) * DRAFT_GRID_SIZE
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

export function normalizeDraftDocument(
  document: DraftDocument
): DraftDocument {
  const nodeIds = new Set(document.graph.nodes.map((node) => node.id))

  return {
    ...document,
    canvas: {
      width: Math.max(DRAFT_GRID_SIZE, document.canvas.width),
      height: Math.max(DRAFT_GRID_SIZE, document.canvas.height),
    },
    graph: {
      nodes: document.graph.nodes.map((node) => ({
        ...node,
        position: {
          x: snapToDraftGrid(
            clamp(node.position.x, 0, document.canvas.width - node.size.width)
          ),
          y: snapToDraftGrid(
            clamp(node.position.y, 0, document.canvas.height - node.size.height)
          ),
        },
      })),
      edges: document.graph.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      ),
    },
  }
}

export function createInitialDocument(): DraftDocument {
  return {
    schemaVersion: 1,
    meta: {
      id: "edge-request-path",
      title: "Edge request path",
      updatedAt: new Date().toISOString(),
    },
    canvas: {
      width: DRAFT_CANVAS_WIDTH,
      height: DRAFT_CANVAS_HEIGHT,
    },
    graph: {
      nodes: [
        {
          id: "edge-boundary",
          type: "boundary",
          position: { x: 144, y: 168 },
          size: { width: 864, height: 432 },
          data: {
            label: "EDGE NETWORK",
            detail: "REQUEST ROUTING / REGION: SIN1",
          },
        },
        {
          id: "client",
          type: "node",
          position: { x: 456, y: 24 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Client",
            eyebrow: "ORIGIN",
            detail: "draft.jonny.design",
            status: "HTTPS",
            tone: "neutral",
            kind: "client",
          },
        },
        {
          id: "edge-proxy",
          type: "node",
          position: { x: 456, y: 240 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Edge proxy",
            eyebrow: "ENTRY",
            detail: "TLS termination",
            status: "LIVE",
            tone: "green",
            kind: "gateway",
          },
        },
        {
          id: "policy",
          type: "node",
          position: { x: 192, y: 360 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Policy engine",
            eyebrow: "CONTROL",
            detail: "rate + access rules",
            status: "12 RULES",
            tone: "violet",
            kind: "service",
          },
        },
        {
          id: "router-a",
          type: "node",
          position: { x: 456, y: 456 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Function router",
            eyebrow: "COMPUTE",
            detail: "regional dispatch",
            status: "8 ms",
            tone: "blue",
            kind: "service",
          },
        },
        {
          id: "router-b",
          type: "node",
          position: { x: 744, y: 360 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Asset router",
            eyebrow: "STATIC",
            detail: "immutable delivery",
            status: "HIT 96%",
            tone: "neutral",
            kind: "service",
          },
        },
        {
          id: "event-stream",
          type: "node",
          position: { x: 1080, y: 240 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Event stream",
            eyebrow: "OBSERVE",
            detail: "request telemetry",
            status: "1.2K / S",
            tone: "red",
            kind: "queue",
          },
        },
        {
          id: "warehouse",
          type: "node",
          position: { x: 1080, y: 456 },
          size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
          data: {
            label: "Global warehouse",
            eyebrow: "PERSIST",
            detail: "analytics + traces",
            status: "ONLINE",
            tone: "green",
            kind: "database",
          },
        },
      ],
      edges: [
        {
          id: "client-proxy",
          source: "client",
          target: "edge-proxy",
          sourcePort: "bottom",
          targetPort: "top",
          label: "REQUEST",
          tone: "neutral",
        },
        {
          id: "proxy-policy",
          source: "edge-proxy",
          target: "policy",
          sourcePort: "bottom",
          targetPort: "top",
          label: "CHECK",
          tone: "violet",
        },
        {
          id: "proxy-router",
          source: "edge-proxy",
          target: "router-a",
          sourcePort: "bottom",
          targetPort: "top",
          label: "DYNAMIC",
          tone: "blue",
        },
        {
          id: "proxy-assets",
          source: "edge-proxy",
          target: "router-b",
          sourcePort: "right",
          targetPort: "top",
          label: "STATIC",
          tone: "neutral",
        },
        {
          id: "proxy-events",
          source: "edge-proxy",
          target: "event-stream",
          sourcePort: "right",
          targetPort: "left",
          label: "METRICS",
          tone: "red",
        },
        {
          id: "events-warehouse",
          source: "event-stream",
          target: "warehouse",
          sourcePort: "bottom",
          targetPort: "top",
          label: "FLUSH",
          tone: "green",
        },
      ],
    },
  }
}

export function prepareDraftDocument(document: DraftDocument): DraftDocument {
  return normalizeDraftDocument({
    ...document,
    meta: {
      ...document.meta,
      updatedAt: new Date().toISOString(),
    },
  })
}

export function parseDraftDocument(value: unknown): DraftDocument | null {
  if (!value || typeof value !== "object") return null

  const document = value as Partial<DraftDocument>
  if (
    document.schemaVersion !== 1 ||
    !document.meta ||
    !document.canvas ||
    !Number.isFinite(document.canvas.width) ||
    !Number.isFinite(document.canvas.height) ||
    !document.graph ||
    !Array.isArray(document.graph.nodes) ||
    !Array.isArray(document.graph.edges)
  ) {
    return null
  }

  const nodesAreValid = document.graph.nodes.every(
    (node) =>
      node &&
      typeof node.id === "string" &&
      (node.type === "node" || node.type === "boundary") &&
      Number.isFinite(node.position?.x) &&
      Number.isFinite(node.position?.y) &&
      Number.isFinite(node.size?.width) &&
      Number.isFinite(node.size?.height)
  )
  const edgesAreValid = document.graph.edges.every(
    (edge) =>
      edge &&
      typeof edge.id === "string" &&
      typeof edge.source === "string" &&
      typeof edge.target === "string"
  )

  return nodesAreValid && edgesAreValid
    ? normalizeDraftDocument(document as DraftDocument)
    : null
}
