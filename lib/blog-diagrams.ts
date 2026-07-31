import type { DraftDocument } from "@/lib/draft-document"

export const requestPathDiagram: DraftDocument = {
  schemaVersion: 1,
  meta: {
    id: "article-request-path",
    title: "A request moving through the edge",
    updatedAt: "2026-07-25T00:00:00.000Z",
  },
  canvas: {
    width: 960,
    height: 336,
  },
  graph: {
    nodes: [
      {
        id: "request-boundary",
        type: "boundary",
        position: { x: 24, y: 48 },
        size: { width: 912, height: 240 },
        data: {
          label: "REQUEST PATH",
          detail: "SINGLE REGION / READ-ONLY VIEW",
        },
      },
      {
        id: "browser",
        type: "node",
        position: { x: 48, y: 120 },
        size: { width: 240, height: 96 },
        data: {
          label: "Browser",
          eyebrow: "ORIGIN",
          detail: "reader request",
          status: "HTTPS",
          tone: "neutral",
          kind: "client",
        },
      },
      {
        id: "edge",
        type: "node",
        position: { x: 360, y: 120 },
        size: { width: 240, height: 96 },
        data: {
          label: "Edge router",
          eyebrow: "ENTRY",
          detail: "policy + routing",
          status: "8 ms",
          tone: "blue",
          kind: "gateway",
        },
      },
      {
        id: "region",
        type: "node",
        position: { x: 672, y: 120 },
        size: { width: 240, height: 96 },
        data: {
          label: "Regional service",
          eyebrow: "COMPUTE",
          detail: "render response",
          status: "LIVE",
          tone: "green",
          kind: "service",
        },
      },
    ],
    edges: [
      {
        id: "browser-edge",
        source: "browser",
        target: "edge",
        sourcePort: "right",
        targetPort: "left",
        label: "REQUEST",
        tone: "neutral",
      },
      {
        id: "edge-region",
        source: "edge",
        target: "region",
        sourcePort: "right",
        targetPort: "left",
        label: "ROUTE",
        tone: "blue",
      },
    ],
  },
}

export const authoringLoopDiagram: DraftDocument = {
  schemaVersion: 1,
  meta: {
    id: "article-authoring-loop",
    title: "One document shared by people, agents, and renderers",
    updatedAt: "2026-07-25T00:00:00.000Z",
  },
  canvas: {
    width: 960,
    height: 456,
  },
  graph: {
    nodes: [
      {
        id: "idea",
        type: "node",
        position: { x: 48, y: 48 },
        size: { width: 240, height: 96 },
        data: {
          label: "Description",
          eyebrow: "INPUT",
          detail: "idea, sketch, or prompt",
          status: "RAW",
          tone: "violet",
          kind: "note",
        },
      },
      {
        id: "agent",
        type: "node",
        position: { x: 360, y: 48 },
        size: { width: 240, height: 96 },
        data: {
          label: "Diagram agent",
          eyebrow: "AUTHOR",
          detail: "applies layout rules",
          status: "SKILL",
          tone: "blue",
          kind: "service",
        },
      },
      {
        id: "document",
        type: "node",
        position: { x: 672, y: 48 },
        size: { width: 240, height: 96 },
        data: {
          label: "Draft document",
          eyebrow: "CONTRACT",
          detail: "portable JSON",
          status: "V1",
          tone: "green",
          kind: "database",
        },
      },
      {
        id: "editor",
        type: "node",
        position: { x: 204, y: 288 },
        size: { width: 240, height: 96 },
        data: {
          label: "Diagram editor",
          eyebrow: "CHANGE",
          detail: "drag, connect, inspect",
          status: "HUMAN",
          tone: "red",
          kind: "service",
        },
      },
      {
        id: "renderer",
        type: "node",
        position: { x: 516, y: 288 },
        size: { width: 240, height: 96 },
        data: {
          label: "Diagram renderer",
          eyebrow: "OUTPUT",
          detail: "article, docs, product",
          status: "REACT",
          tone: "neutral",
          kind: "service",
        },
      },
    ],
    edges: [
      {
        id: "idea-agent",
        source: "idea",
        target: "agent",
        sourcePort: "right",
        targetPort: "left",
        label: "INTERPRET",
        tone: "violet",
      },
      {
        id: "agent-document",
        source: "agent",
        target: "document",
        sourcePort: "right",
        targetPort: "left",
        label: "WRITE",
        tone: "blue",
      },
      {
        id: "document-renderer",
        source: "document",
        target: "renderer",
        sourcePort: "bottom",
        targetPort: "top",
        label: "READ",
        tone: "green",
      },
      {
        id: "editor-document",
        source: "editor",
        target: "document",
        sourcePort: "right",
        targetPort: "bottom",
        label: "UPDATE",
        tone: "red",
      },
    ],
  },
}

export const blogDiagrams = {
  "request-path": requestPathDiagram,
  "authoring-loop": authoringLoopDiagram,
} as const

export type BlogDiagramId = keyof typeof blogDiagrams
