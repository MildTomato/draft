"use client"

import {
  createContext,
  useContext,
  useId,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type SVGProps,
} from "react"
import {
  Braces,
  CircleDot,
  Database,
  Layers3,
  Route,
  Server,
  type LucideIcon,
} from "lucide-react"

import {
  DRAFT_GRID_SIZE,
  DRAFT_TONE_COLORS,
  type DraftBoundary,
  type DraftConnector,
  type DraftDocument,
  type DraftElement,
  type DraftNode,
  type DraftNodeKind,
  type DraftPoint,
  type DraftPort,
} from "@/lib/draft-document"
import { cn } from "@/lib/utils"

import styles from "./diagram.module.css"

function getToneColor(tone: keyof typeof DRAFT_TONE_COLORS) {
  return `var(--draft-tone-${tone}, ${DRAFT_TONE_COLORS[tone]})`
}

type DiagramContextValue = {
  document: DraftDocument
}

const DiagramContext = createContext<DiagramContextValue | null>(null)

export function DiagramProvider({
  document,
  children,
}: {
  document: DraftDocument
  children: ReactNode
}) {
  return (
    <DiagramContext.Provider value={{ document }}>
      {children}
    </DiagramContext.Provider>
  )
}

export function useDiagram() {
  const context = useContext(DiagramContext)

  if (!context) {
    throw new Error("Diagram components must be used inside DiagramProvider.")
  }

  return context
}

export function DiagramFrame({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-draft-frame=""
      className={cn(styles.frame, className)}
      {...props}
    />
  )
}

const nodeIcons: Record<DraftNodeKind, LucideIcon> = {
  client: CircleDot,
  gateway: Route,
  service: Server,
  database: Database,
  queue: Layers3,
  note: Braces,
}

function getAnchor(element: DraftElement, port: DraftPort): DraftPoint {
  const { position, size } = element

  switch (port) {
    case "top":
      return { x: position.x + size.width / 2, y: position.y }
    case "right":
      return { x: position.x + size.width, y: position.y + size.height / 2 }
    case "bottom":
      return {
        x: position.x + size.width / 2,
        y: position.y + size.height,
      }
    case "left":
      return { x: position.x, y: position.y + size.height / 2 }
  }
}

function getConnectorGeometry(
  source: DraftPoint,
  target: DraftPoint,
  sourcePort: DraftPort,
  targetPort: DraftPort
) {
  const sourceIsVertical = sourcePort === "top" || sourcePort === "bottom"
  const targetIsVertical = targetPort === "top" || targetPort === "bottom"

  if (sourceIsVertical && targetIsVertical) {
    const middleY = (source.y + target.y) / 2
    return {
      path: `M ${source.x} ${source.y} L ${source.x} ${middleY} L ${target.x} ${middleY} L ${target.x} ${target.y}`,
      label: { x: (source.x + target.x) / 2, y: middleY },
    }
  }

  if (!sourceIsVertical && !targetIsVertical) {
    const middleX = (source.x + target.x) / 2
    return {
      path: `M ${source.x} ${source.y} L ${middleX} ${source.y} L ${middleX} ${target.y} L ${target.x} ${target.y}`,
      label: { x: middleX, y: (source.y + target.y) / 2 },
    }
  }

  if (sourceIsVertical) {
    return {
      path: `M ${source.x} ${source.y} L ${source.x} ${target.y} L ${target.x} ${target.y}`,
      label: { x: source.x, y: (source.y + target.y) / 2 },
    }
  }

  return {
    path: `M ${source.x} ${source.y} L ${target.x} ${source.y} L ${target.x} ${target.y}`,
    label: { x: (source.x + target.x) / 2, y: source.y },
  }
}

export function DiagramBoundary({ boundary }: { boundary: DraftBoundary }) {
  const { position, size, data } = boundary

  return (
    <g data-draft-boundary={boundary.id} pointerEvents="none">
      <rect
        x={position.x}
        y={position.y}
        width={size.width}
        height={size.height}
        className={styles.boundaryFill}
      />
      <line
        x1={position.x}
        y1={position.y + 32}
        x2={position.x + size.width}
        y2={position.y + 32}
        className={styles.boundaryRule}
      />
      <rect
        x={position.x + 12}
        y={position.y + 44}
        width={size.width - 24}
        height={size.height - 56}
        className={styles.boundaryInner}
      />
      <text
        x={position.x + 12}
        y={position.y + 21}
        className={styles.boundaryLabel}
      >
        {data.label}
      </text>
      <text
        x={position.x + size.width - 12}
        y={position.y + 21}
        className={styles.boundaryDetail}
      >
        {data.detail}
      </text>
      <text
        x={position.x + 12}
        y={position.y + size.height - 12}
        className={styles.boundaryIndex}
      >
        01 / SYSTEM BOUNDARY
      </text>
    </g>
  )
}

export function DiagramNode({ node }: { node: DraftNode }) {
  const Icon = nodeIcons[node.data.kind]
  const tone = getToneColor(node.data.tone)

  return (
    <foreignObject
      data-draft-node={node.id}
      x={node.position.x}
      y={node.position.y}
      width={node.size.width}
      height={node.size.height}
      pointerEvents="none"
    >
      <div
        className={styles.node}
        style={{ "--node-tone": tone } as CSSProperties}
      >
        <div className={styles.nodeHeading}>
          <span className={styles.nodeEyebrow}>
            <Icon aria-hidden="true" />
            {node.data.eyebrow}
          </span>
          {node.data.status ? (
            <span className={styles.nodeStatus}>{node.data.status}</span>
          ) : null}
        </div>
        <div className={styles.nodeLabel}>{node.data.label}</div>
        {node.data.detail ? (
          <div className={styles.nodeDetail}>{node.data.detail}</div>
        ) : null}
      </div>
    </foreignObject>
  )
}

export function DiagramLabel({
  label,
  position,
  tone,
}: {
  label: string
  position: DraftPoint
  tone: string
}) {
  const width = Math.max(42, label.length * 6.2 + 16)

  return (
    <g transform={`translate(${position.x} ${position.y})`} pointerEvents="none">
      <rect
        x={-width / 2}
        y={-9}
        width={width}
        height={18}
        className={styles.connectorLabelBackground}
      />
      <text
        x={0}
        y={3.25}
        fill={tone}
        className={styles.connectorLabel}
      >
        {label}
      </text>
    </g>
  )
}

export function DiagramConnector({
  connector,
  elements,
  markerPrefix,
}: {
  connector: DraftConnector
  elements: Map<string, DraftElement>
  markerPrefix: string
}) {
  const sourceElement = elements.get(connector.source)
  const targetElement = elements.get(connector.target)
  if (!sourceElement || !targetElement) return null

  const source = getAnchor(sourceElement, connector.sourcePort)
  const target = getAnchor(targetElement, connector.targetPort)
  const geometry = getConnectorGeometry(
    source,
    target,
    connector.sourcePort,
    connector.targetPort
  )
  const tone = getToneColor(connector.tone)

  return (
    <g data-draft-connector={connector.id} pointerEvents="none">
      <path
        d={geometry.path}
        stroke={tone}
        markerEnd={`url(#${markerPrefix}-${connector.tone})`}
        className={styles.connector}
      />
      {connector.label ? (
        <DiagramLabel
          label={connector.label}
          position={geometry.label}
          tone={tone}
        />
      ) : null}
    </g>
  )
}

export type DiagramViewport = {
  x: number
  y: number
  width: number
  height: number
}

export function Diagram({
  children,
  className,
  viewport,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "viewBox"> & {
  children?: ReactNode
  viewport?: DiagramViewport
}) {
  const { document } = useDiagram()
  const markerPrefix = useId().replaceAll(":", "")
  const elements = new Map(
    document.graph.nodes.map((node) => [node.id, node] as const)
  )
  const view = viewport ?? {
    x: 0,
    y: 0,
    width: document.canvas.width,
    height: document.canvas.height,
  }

  return (
    <svg
      data-draft-diagram=""
      role="img"
      aria-label={document.meta.title}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      className={cn(styles.diagram, className)}
      {...props}
    >
      <defs>
        <pattern
          id={`${markerPrefix}-grid`}
          width={DRAFT_GRID_SIZE}
          height={DRAFT_GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${DRAFT_GRID_SIZE} 0 L 0 0 0 ${DRAFT_GRID_SIZE}`}
            className={styles.gridLine}
          />
        </pattern>
        {(Object.keys(DRAFT_TONE_COLORS) as Array<
          keyof typeof DRAFT_TONE_COLORS
        >).map((tone) => (
          <marker
            key={tone}
            id={`${markerPrefix}-${tone}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={getToneColor(tone)} />
          </marker>
        ))}
      </defs>

      <rect
        x={0}
        y={0}
        width={document.canvas.width}
        height={document.canvas.height}
        fill={`url(#${markerPrefix}-grid)`}
        pointerEvents="none"
      />

      {document.graph.nodes
        .filter((node): node is DraftBoundary => node.type === "boundary")
        .map((boundary) => (
          <DiagramBoundary key={boundary.id} boundary={boundary} />
        ))}

      {document.graph.edges.map((connector) => (
        <DiagramConnector
          key={connector.id}
          connector={connector}
          elements={elements}
          markerPrefix={markerPrefix}
        />
      ))}

      {document.graph.nodes
        .filter((node): node is DraftNode => node.type === "node")
        .map((node) => (
          <DiagramNode key={node.id} node={node} />
        ))}

      {children}
    </svg>
  )
}
