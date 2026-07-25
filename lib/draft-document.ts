import type { Edge, Node } from "@xyflow/react"

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
  }
}

export function createInitialNodes(): DraftCanvasNode[] {
  return [
    {
      id: "edge-boundary",
      type: "boundary",
      position: { x: 150, y: 165 },
      data: {
        label: "EDGE NETWORK",
        detail: "REQUEST ROUTING / REGION: SIN1",
      },
      style: { width: 850, height: 430 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    },
    {
      id: "client",
      type: "draft",
      position: { x: 455, y: 24 },
      data: {
        label: "Client",
        eyebrow: "ORIGIN",
        detail: "draft.jonny.design",
        status: "HTTPS",
        tone: "neutral",
        kind: "client",
      },
      style: { width: 220 },
    },
    {
      id: "edge-proxy",
      type: "draft",
      position: { x: 465, y: 230 },
      data: {
        label: "Edge proxy",
        eyebrow: "ENTRY",
        detail: "TLS termination",
        status: "LIVE",
        tone: "green",
        kind: "gateway",
      },
      style: { width: 220 },
    },
    {
      id: "policy",
      type: "draft",
      position: { x: 220, y: 352 },
      data: {
        label: "Policy engine",
        eyebrow: "CONTROL",
        detail: "rate + access rules",
        status: "12 RULES",
        tone: "violet",
        kind: "service",
      },
      style: { width: 205 },
    },
    {
      id: "router-a",
      type: "draft",
      position: { x: 455, y: 438 },
      data: {
        label: "Function router",
        eyebrow: "COMPUTE",
        detail: "regional dispatch",
        status: "8 ms",
        tone: "blue",
        kind: "service",
      },
      style: { width: 220 },
    },
    {
      id: "router-b",
      type: "draft",
      position: { x: 735, y: 352 },
      data: {
        label: "Asset router",
        eyebrow: "STATIC",
        detail: "immutable delivery",
        status: "HIT 96%",
        tone: "neutral",
        kind: "service",
      },
      style: { width: 205 },
    },
    {
      id: "event-stream",
      type: "draft",
      position: { x: 1085, y: 244 },
      data: {
        label: "Event stream",
        eyebrow: "OBSERVE",
        detail: "request telemetry",
        status: "1.2K / S",
        tone: "red",
        kind: "queue",
      },
      style: { width: 220 },
    },
    {
      id: "warehouse",
      type: "draft",
      position: { x: 1085, y: 454 },
      data: {
        label: "Global warehouse",
        eyebrow: "PERSIST",
        detail: "analytics + traces",
        status: "ONLINE",
        tone: "green",
        kind: "database",
      },
      style: { width: 220 },
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
      type: "smoothstep",
      label: "REQUEST",
      data: { signal: "neutral" },
    },
    {
      id: "proxy-policy",
      source: "edge-proxy",
      target: "policy",
      sourceHandle: "left",
      targetHandle: "top",
      type: "smoothstep",
      label: "CHECK",
      data: { signal: "violet" },
    },
    {
      id: "proxy-router",
      source: "edge-proxy",
      target: "router-a",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "smoothstep",
      label: "DYNAMIC",
      data: { signal: "blue" },
    },
    {
      id: "proxy-assets",
      source: "edge-proxy",
      target: "router-b",
      sourceHandle: "right",
      targetHandle: "top",
      type: "smoothstep",
      label: "STATIC",
      data: { signal: "neutral" },
    },
    {
      id: "proxy-events",
      source: "edge-proxy",
      target: "event-stream",
      sourceHandle: "right",
      targetHandle: "left",
      type: "smoothstep",
      label: "METRICS",
      data: { signal: "red" },
    },
    {
      id: "events-warehouse",
      source: "event-stream",
      target: "warehouse",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "smoothstep",
      label: "FLUSH",
      data: { signal: "green" },
    },
  ]
}

export function toDraftDocument(
  nodes: DraftCanvasNode[],
  edges: DraftCanvasEdge[]
): DraftDocument {
  const cleanNodes = nodes.map(
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

  const cleanEdges = edges.map(
    ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type,
      label,
      data,
    }) => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type,
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
    },
  }
}
