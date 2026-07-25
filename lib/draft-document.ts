import type { Edge, Node } from "@xyflow/react"

export const DRAFT_GRID_SIZE = 24
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

export type DraftNodeData = Record<string, unknown> & {
  label: string
  eyebrow: string
  detail?: string
  status?: string
  tone: DraftTone
  kind: DraftNodeKind
}

export type DraftBoundaryData = Record<string, unknown> & {
  label: string
  detail: string
}

export type DraftCanvasNode =
  | Node<DraftNodeData, "draft">
  | Node<DraftBoundaryData, "boundary">

export type DraftCanvasEdge = Edge<
  Record<string, unknown> & {
    signal?: DraftTone
  }
>

export type DraftDocument = {
  schemaVersion: 1
  meta: {
    id: string
    title: string
    updatedAt: string
  }
  graph: {
    nodes: DraftCanvasNode[]
    edges: DraftCanvasEdge[]
  }
  theme: {
    preset: "carbon"
  }
  layout: {
    direction: "TB" | "LR"
    gridSize: typeof DRAFT_GRID_SIZE
  }
}

function snapToDraftGrid(value: number) {
  return Math.round(value / DRAFT_GRID_SIZE) * DRAFT_GRID_SIZE
}

export function normalizeDraftNodes(
  nodes: DraftCanvasNode[]
): DraftCanvasNode[] {
  return nodes.map((node) => ({
    ...node,
    position: {
      x: snapToDraftGrid(node.position.x),
      y: snapToDraftGrid(node.position.y),
    },
    style:
      node.type === "draft"
        ? {
            ...node.style,
            width: DRAFT_NODE_WIDTH,
            height: DRAFT_NODE_HEIGHT,
          }
        : node.style,
  })) as DraftCanvasNode[]
}

export function normalizeDraftEdges(
  edges: DraftCanvasEdge[]
): DraftCanvasEdge[] {
  return edges.map((edge) => ({
    ...edge,
    type: "step",
    sourceHandle:
      edge.sourceHandle === "left" ? "bottom" : edge.sourceHandle,
    targetHandle:
      edge.targetHandle === "right" ? "left" : edge.targetHandle,
  }))
}

export function createInitialNodes(): DraftCanvasNode[] {
  return [
    {
      id: "edge-boundary",
      type: "boundary",
      position: { x: 144, y: 168 },
      data: {
        label: "EDGE NETWORK",
        detail: "REQUEST ROUTING / REGION: SIN1",
      },
      style: { width: 864, height: 432 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: "client",
      type: "draft",
      position: { x: 456, y: 24 },
      data: {
        label: "Client",
        eyebrow: "ORIGIN",
        detail: "draft.jonny.design",
        status: "HTTPS",
        tone: "neutral",
        kind: "client",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
    {
      id: "edge-proxy",
      type: "draft",
      position: { x: 456, y: 240 },
      data: {
        label: "Edge proxy",
        eyebrow: "ENTRY",
        detail: "TLS termination",
        status: "LIVE",
        tone: "green",
        kind: "gateway",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
    {
      id: "policy",
      type: "draft",
      position: { x: 192, y: 360 },
      data: {
        label: "Policy engine",
        eyebrow: "CONTROL",
        detail: "rate + access rules",
        status: "12 RULES",
        tone: "violet",
        kind: "service",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
    {
      id: "router-a",
      type: "draft",
      position: { x: 456, y: 456 },
      data: {
        label: "Function router",
        eyebrow: "COMPUTE",
        detail: "regional dispatch",
        status: "8 ms",
        tone: "blue",
        kind: "service",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
    {
      id: "router-b",
      type: "draft",
      position: { x: 744, y: 360 },
      data: {
        label: "Asset router",
        eyebrow: "STATIC",
        detail: "immutable delivery",
        status: "HIT 96%",
        tone: "neutral",
        kind: "service",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
    {
      id: "event-stream",
      type: "draft",
      position: { x: 1080, y: 240 },
      data: {
        label: "Event stream",
        eyebrow: "OBSERVE",
        detail: "request telemetry",
        status: "1.2K / S",
        tone: "red",
        kind: "queue",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
    {
      id: "warehouse",
      type: "draft",
      position: { x: 1080, y: 456 },
      data: {
        label: "Global warehouse",
        eyebrow: "PERSIST",
        detail: "analytics + traces",
        status: "ONLINE",
        tone: "green",
        kind: "database",
      },
      style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
    },
  ]
}

export function createInitialEdges(): DraftCanvasEdge[] {
  return [
    {
      id: "client-proxy",
      source: "client",
      target: "edge-proxy",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "step",
      label: "REQUEST",
      data: { signal: "neutral" },
    },
    {
      id: "proxy-policy",
      source: "edge-proxy",
      target: "policy",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "step",
      label: "CHECK",
      data: { signal: "violet" },
    },
    {
      id: "proxy-router",
      source: "edge-proxy",
      target: "router-a",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "step",
      label: "DYNAMIC",
      data: { signal: "blue" },
    },
    {
      id: "proxy-assets",
      source: "edge-proxy",
      target: "router-b",
      sourceHandle: "right",
      targetHandle: "top",
      type: "step",
      label: "STATIC",
      data: { signal: "neutral" },
    },
    {
      id: "proxy-events",
      source: "edge-proxy",
      target: "event-stream",
      sourceHandle: "right",
      targetHandle: "left",
      type: "step",
      label: "METRICS",
      data: { signal: "red" },
    },
    {
      id: "events-warehouse",
      source: "event-stream",
      target: "warehouse",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "step",
      label: "FLUSH",
      data: { signal: "green" },
    },
  ]
}

export function toDraftDocument(
  nodes: DraftCanvasNode[],
  edges: DraftCanvasEdge[]
): DraftDocument {
  const cleanNodes = normalizeDraftNodes(nodes).map(
    ({ id, type, position, data, style, draggable, selectable, zIndex }) => ({
      id,
      type,
      position,
      data,
      style,
      draggable,
      selectable,
      zIndex,
    })
  ) as DraftCanvasNode[]

  const cleanEdges = normalizeDraftEdges(edges).map(
    ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      label,
      data,
    }) => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: "step" as const,
      label,
      data,
    })
  )

  return {
    schemaVersion: 1,
    meta: {
      id: "edge-request-path",
      title: "Edge request path",
      updatedAt: new Date().toISOString(),
    },
    graph: {
      nodes: cleanNodes,
      edges: cleanEdges,
    },
    theme: {
      preset: "carbon",
    },
    layout: {
      direction: "TB",
      gridSize: DRAFT_GRID_SIZE,
    },
  }
}
