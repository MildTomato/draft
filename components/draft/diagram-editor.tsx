"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Download,
  Frame,
  Hand,
  Maximize2,
  Minus,
  MousePointer2,
  Network,
  Plus,
  Redo2,
  RotateCcw,
  Scan,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Waypoints,
  X,
} from "lucide-react"

import {
  Diagram,
  DiagramFrame,
  DiagramProvider,
  type DiagramViewport,
} from "@/components/draft/diagram"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  createInitialDocument,
  DRAFT_CANVAS_HEIGHT,
  DRAFT_CANVAS_WIDTH,
  DRAFT_GRID_SIZE,
  DRAFT_NODE_HEIGHT,
  DRAFT_NODE_WIDTH,
  DRAFT_TONE_COLORS,
  normalizeDraftDocument,
  parseDraftDocument,
  prepareDraftDocument,
  snapToDraftGrid,
  type DraftDocument,
  type DraftNode,
  type DraftNodeData,
  type DraftNodeKind,
  type DraftPoint,
  type DraftTone,
} from "@/lib/draft-document"
import { cn } from "@/lib/utils"

import styles from "./diagram-editor.module.css"

const STORAGE_KEY = "draft:edge-request-path:v2"

const toolItems = [
  { id: "select", label: "Select", icon: MousePointer2, key: "V" },
  { id: "hand", label: "Pan canvas", icon: Hand, key: "H" },
  { id: "node", label: "Add node", icon: Square, key: "N" },
  { id: "text", label: "Add annotation", icon: Type, key: "T" },
  { id: "connect", label: "Connect", icon: Waypoints, key: "C" },
] as const

type ToolId = (typeof toolItems)[number]["id"]

type NodeDrag = {
  pointerId: number
  nodeId: string
  pointerOrigin: DraftPoint
  nodeOrigin: DraftPoint
}

type ViewportDrag = {
  pointerId: number
  clientX: number
  clientY: number
  viewport: DiagramViewport
}

function getCanvasPoint(
  event: ReactPointerEvent<SVGElement>,
  svg: SVGSVGElement
) {
  const matrix = svg.getScreenCTM()
  if (!matrix) return null

  return new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse()
  )
}

function ToolButton({
  item,
  active,
  onClick,
}: {
  item: (typeof toolItems)[number]
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          aria-label={item.label}
          aria-pressed={active}
          variant="ghost"
          size="icon"
          className={cn(styles.toolButton, active && styles.toolButtonActive)}
          onClick={onClick}
        >
          <Icon aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <span>{item.label}</span>
        <kbd>{item.key}</kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function DiagramEditorOverlay({
  document,
  activeTool,
  selectedNodeId,
  connectionSourceId,
  viewport,
  onSelectNode,
  onMoveNode,
  onConnectNode,
  onChangeViewport,
}: {
  document: DraftDocument
  activeTool: ToolId
  selectedNodeId: string | null
  connectionSourceId: string | null
  viewport: DiagramViewport
  onSelectNode: (nodeId: string | null) => void
  onMoveNode: (nodeId: string, position: DraftPoint) => void
  onConnectNode: (nodeId: string) => void
  onChangeViewport: (viewport: DiagramViewport) => void
}) {
  const nodeDrag = useRef<NodeDrag | null>(null)
  const viewportDrag = useRef<ViewportDrag | null>(null)
  const nodes = document.graph.nodes.filter(
    (node): node is DraftNode => node.type === "node"
  )
  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ?? null

  const handleNodePointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    node: DraftNode
  ) => {
    event.preventDefault()
    event.stopPropagation()
    onSelectNode(node.id)

    if (activeTool === "connect") {
      onConnectNode(node.id)
      return
    }
    if (activeTool !== "select") return

    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const point = getCanvasPoint(event, svg)
    if (!point) return

    event.currentTarget.setPointerCapture(event.pointerId)
    nodeDrag.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      pointerOrigin: { x: point.x, y: point.y },
      nodeOrigin: node.position,
    }
  }

  const handleNodePointerMove = (
    event: ReactPointerEvent<SVGRectElement>
  ) => {
    const drag = nodeDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const point = getCanvasPoint(event, svg)
    if (!point) return

    onMoveNode(drag.nodeId, {
      x: drag.nodeOrigin.x + point.x - drag.pointerOrigin.x,
      y: drag.nodeOrigin.y + point.y - drag.pointerOrigin.y,
    })
  }

  const finishNodeDrag = (event: ReactPointerEvent<SVGRectElement>) => {
    if (nodeDrag.current?.pointerId !== event.pointerId) return
    nodeDrag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handlePanePointerDown = (
    event: ReactPointerEvent<SVGRectElement>
  ) => {
    if (activeTool === "select") {
      onSelectNode(null)
      return
    }
    if (activeTool !== "hand") return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    viewportDrag.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      viewport,
    }
  }

  const handlePanePointerMove = (
    event: ReactPointerEvent<SVGRectElement>
  ) => {
    const drag = viewportDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    const scaleX = drag.viewport.width / bounds.width
    const scaleY = drag.viewport.height / bounds.height

    onChangeViewport({
      ...drag.viewport,
      x: drag.viewport.x - (event.clientX - drag.clientX) * scaleX,
      y: drag.viewport.y - (event.clientY - drag.clientY) * scaleY,
    })
  }

  const finishViewportDrag = (event: ReactPointerEvent<SVGRectElement>) => {
    if (viewportDrag.current?.pointerId !== event.pointerId) return
    viewportDrag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <g data-draft-editor-overlay="">
      <rect
        x={viewport.x}
        y={viewport.y}
        width={viewport.width}
        height={viewport.height}
        fill="transparent"
        className={activeTool === "hand" ? styles.pannablePane : undefined}
        onPointerDown={handlePanePointerDown}
        onPointerMove={handlePanePointerMove}
        onPointerUp={finishViewportDrag}
        onPointerCancel={finishViewportDrag}
      />

      {selectedNode ? (
        <g pointerEvents="none">
          <rect
            x={selectedNode.position.x - 4}
            y={selectedNode.position.y - 4}
            width={selectedNode.size.width + 8}
            height={selectedNode.size.height + 8}
            rx={6}
            className={styles.selectionBox}
          />
          {(["top", "right", "bottom", "left"] as const).map((port) => {
            const position =
              port === "top"
                ? {
                    x: selectedNode.position.x + selectedNode.size.width / 2,
                    y: selectedNode.position.y,
                  }
                : port === "right"
                  ? {
                      x: selectedNode.position.x + selectedNode.size.width,
                      y: selectedNode.position.y + selectedNode.size.height / 2,
                    }
                  : port === "bottom"
                    ? {
                        x: selectedNode.position.x + selectedNode.size.width / 2,
                        y: selectedNode.position.y + selectedNode.size.height,
                      }
                    : {
                        x: selectedNode.position.x,
                        y: selectedNode.position.y + selectedNode.size.height / 2,
                      }

            return (
              <circle
                key={port}
                cx={position.x}
                cy={position.y}
                r={4}
                className={styles.selectionPort}
              />
            )
          })}
        </g>
      ) : null}

      {nodes.map((node) => (
        <rect
          key={node.id}
          data-editor-node={node.id}
          x={node.position.x}
          y={node.position.y}
          width={node.size.width}
          height={node.size.height}
          fill="transparent"
          className={cn(
            styles.nodeHitArea,
            activeTool === "connect" && styles.nodeConnectArea,
            connectionSourceId === node.id && styles.connectionSource
          )}
          onPointerDown={(event) => handleNodePointerDown(event, node)}
          onPointerMove={handleNodePointerMove}
          onPointerUp={finishNodeDrag}
          onPointerCancel={finishNodeDrag}
        />
      ))}
    </g>
  )
}

export function DiagramEditor() {
  const [diagramDocument, setDiagramDocument] =
    useState<DraftDocument>(createInitialDocument)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    "edge-proxy"
  )
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(
    null
  )
  const [activeTool, setActiveTool] = useState<ToolId>("select")
  const [viewport, setViewport] = useState<DiagramViewport>(() => ({
    x: 0,
    y: 0,
    width: DRAFT_CANVAS_WIDTH,
    height: DRAFT_CANVAS_HEIGHT,
  }))
  const [command, setCommand] = useState("")
  const [presenting, setPresenting] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const nodes = diagramDocument.graph.nodes
  const edges = diagramDocument.graph.edges
  const selectedNode = useMemo(
    () =>
      nodes.find(
        (node): node is DraftNode =>
          node.id === selectedNodeId && node.type === "node"
      ) ?? null,
    [nodes, selectedNodeId]
  )

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = parseDraftDocument(JSON.parse(saved))
          if (parsed) setDiagramDocument(parsed)
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      } finally {
        setHydrated(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(prepareDraftDocument(diagramDocument))
      )
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [diagramDocument, hydrated])

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return

    setDiagramDocument((current) => ({
      ...current,
      graph: {
        nodes: current.graph.nodes.filter(
          (node) => node.id !== selectedNodeId
        ),
        edges: current.graph.edges.filter(
          (edge) =>
            edge.source !== selectedNodeId && edge.target !== selectedNodeId
        ),
      },
    }))
    setSelectedNodeId(null)
  }, [selectedNodeId])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const tool = toolItems.find(
        (item) => item.key.toLowerCase() === event.key.toLowerCase()
      )
      if (tool) {
        setActiveTool(tool.id)
        setConnectionSourceId(null)
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedNodeId
      ) {
        deleteSelectedNode()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [deleteSelectedNode, selectedNodeId])

  const addNode = useCallback(
    (
      label = "Untitled service",
      kind: DraftNodeKind = "service",
      tone: DraftTone = "neutral"
    ) => {
      const id = `node-${crypto.randomUUID()}`
      const selectedPosition = selectedNode?.position ?? { x: 480, y: 288 }
      const nextNode: DraftNode = {
        id,
        type: "node",
        position: {
          x: selectedPosition.x,
          y:
            selectedPosition.y +
            DRAFT_NODE_HEIGHT +
            DRAFT_GRID_SIZE * 4,
        },
        size: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
        data: {
          label,
          eyebrow: kind.toUpperCase(),
          detail: "new diagram node",
          status: "DRAFT",
          tone,
          kind,
        },
      }

      setDiagramDocument((current) =>
        normalizeDraftDocument({
          ...current,
          graph: {
            nodes: [...current.graph.nodes, nextNode],
            edges: selectedNode
              ? [
                  ...current.graph.edges,
                  {
                    id: `edge-${selectedNode.id}-${id}`,
                    source: selectedNode.id,
                    target: id,
                    sourcePort: "bottom",
                    targetPort: "top",
                    tone,
                  },
                ]
              : current.graph.edges,
          },
        })
      )
      setSelectedNodeId(id)
      setActiveTool("select")
      return id
    },
    [selectedNode]
  )

  const handleTool = (tool: ToolId) => {
    setConnectionSourceId(null)
    if (tool === "node") {
      addNode()
      return
    }
    if (tool === "text") {
      addNode("Annotation", "note", "violet")
      return
    }
    setActiveTool(tool)
  }

  const patchSelectedNode = (patch: Partial<DraftNodeData>) => {
    if (!selectedNodeId) return
    setDiagramDocument((current) => ({
      ...current,
      graph: {
        ...current.graph,
        nodes: current.graph.nodes.map((node) =>
          node.id === selectedNodeId && node.type === "node"
            ? { ...node, data: { ...node.data, ...patch } }
            : node
        ),
      },
    }))
  }

  const moveNode = (nodeId: string, position: DraftPoint) => {
    setDiagramDocument((current) => ({
      ...current,
      graph: {
        ...current.graph,
        nodes: current.graph.nodes.map((node) => {
          if (node.id !== nodeId || node.type !== "node") return node

          return {
            ...node,
            position: {
              x: snapToDraftGrid(
                Math.min(
                  Math.max(position.x, 0),
                  current.canvas.width - node.size.width
                )
              ),
              y: snapToDraftGrid(
                Math.min(
                  Math.max(position.y, 0),
                  current.canvas.height - node.size.height
                )
              ),
            },
          }
        }),
      },
    }))
  }

  const connectNode = (nodeId: string) => {
    if (!connectionSourceId) {
      setConnectionSourceId(nodeId)
      showNotice("Select a target node")
      return
    }
    if (connectionSourceId === nodeId) return

    setDiagramDocument((current) => ({
      ...current,
      graph: {
        ...current.graph,
        edges: [
          ...current.graph.edges,
          {
            id: `edge-${crypto.randomUUID()}`,
            source: connectionSourceId,
            target: nodeId,
            sourcePort: "bottom",
            targetPort: "top",
            tone: "neutral",
          },
        ],
      },
    }))
    setConnectionSourceId(null)
    setActiveTool("select")
    showNotice("Nodes connected")
  }

  const resetDiagram = () => {
    const next = createInitialDocument()
    setDiagramDocument(next)
    setViewport({
      x: 0,
      y: 0,
      width: next.canvas.width,
      height: next.canvas.height,
    })
    setSelectedNodeId("edge-proxy")
    setConnectionSourceId(null)
    showNotice("Diagram reset")
  }

  const exportDocument = () => {
    const prepared = prepareDraftDocument(diagramDocument)
    const blob = new Blob([JSON.stringify(prepared, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = `${prepared.meta.id}.draft.json`
    link.click()
    URL.revokeObjectURL(url)
    showNotice("Draft file exported")
  }

  const copyDocument = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(prepareDraftDocument(diagramDocument), null, 2)
    )
    showNotice("Diagram JSON copied")
  }

  const runCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = command.trim()
    if (!value) return

    const lower = value.toLowerCase()
    const kind: DraftNodeKind =
      lower.includes("database") || lower.includes("store")
        ? "database"
        : lower.includes("queue") || lower.includes("stream")
          ? "queue"
          : lower.includes("gateway") || lower.includes("proxy")
            ? "gateway"
            : "service"
    const tone: DraftTone =
      kind === "database"
        ? "green"
        : kind === "queue"
          ? "red"
          : kind === "gateway"
            ? "blue"
            : "neutral"
    const label =
      value
        .replace(/^add\s+(an?\s+)?/i, "")
        .replace(/\s+(after|before|to)\s+.+$/i, "")
        .trim()
        .slice(0, 36) || "New service"

    addNode(label.charAt(0).toUpperCase() + label.slice(1), kind, tone)
    setCommand("")
    showNotice("Command applied locally")
  }

  const zoom = (factor: number) => {
    setViewport((current) => {
      const width = Math.min(
        diagramDocument.canvas.width * 2,
        Math.max(diagramDocument.canvas.width / 3, current.width * factor)
      )
      const height =
        width *
        (diagramDocument.canvas.height / diagramDocument.canvas.width)

      return {
        x: current.x + (current.width - width) / 2,
        y: current.y + (current.height - height) / 2,
        width,
        height,
      }
    })
  }

  const fitViewport = () => {
    setViewport({
      x: 0,
      y: 0,
      width: diagramDocument.canvas.width,
      height: diagramDocument.canvas.height,
    })
  }

  const selectedData = selectedNode?.data

  return (
    <DiagramProvider document={diagramDocument}>
      <main
        className={cn(styles.studio, presenting && styles.studioPresenting)}
      >
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              D
            </span>
            <span className={styles.wordmark}>draft</span>
          </div>
          <Separator orientation="vertical" className={styles.headerSeparator} />
          <div className={styles.documentTitle}>
            <span>JONNY / DIAGRAMS</span>
            <strong>{diagramDocument.meta.title}</strong>
          </div>
          <div className={styles.topbarCenter}>
            <Badge variant="outline" className={styles.modeBadge}>
              <CircleDot aria-hidden="true" />
              VECTOR
            </Badge>
            <span className={styles.savedState}>
              <Check aria-hidden="true" />
              SAVED LOCALLY
            </span>
          </div>
          <div className={styles.topbarActions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.headerButton}
              onClick={() => setPresenting((current) => !current)}
            >
              {presenting ? <X /> : <Maximize2 />}
              {presenting ? "Exit" : "Present"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={styles.headerIconButton}
              aria-label="Share diagram"
              onClick={() => showNotice("Share links are next")}
            >
              <Share2 aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={styles.exportButton}
                >
                  Export
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={styles.exportMenu}>
                <DropdownMenuLabel>Draft document</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportDocument}>
                  <Download />
                  Download .draft.json
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyDocument}>
                  <Copy />
                  Copy diagram JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetDiagram}>
                  <RotateCcw />
                  Reset sample
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <aside className={styles.toolRail} aria-label="Diagram tools">
          <div className={styles.toolRailTop}>
            {toolItems.map((item, index) => (
              <div key={item.id}>
                {index === 2 ? (
                  <Separator className={styles.toolSeparator} />
                ) : null}
                <ToolButton
                  item={item}
                  active={activeTool === item.id}
                  onClick={() => handleTool(item.id)}
                />
              </div>
            ))}
          </div>
          <div className={styles.toolRailBottom}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={styles.toolButton}
                  aria-label="Add frame"
                  onClick={() => showNotice("Frames are part of the next pass")}
                >
                  <Frame aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Add frame
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        <section className={styles.canvas} aria-label="Diagram canvas">
          <div className={styles.canvasMeta}>
            <span>REQUEST PATH / V.01</span>
            <span>{nodes.filter((node) => node.type === "node").length} NODES</span>
            <span>{edges.length} EDGES</span>
          </div>

          <DiagramFrame className={styles.editorFrame}>
            <Diagram viewport={viewport}>
              {!presenting ? (
                <DiagramEditorOverlay
                  document={diagramDocument}
                  activeTool={activeTool}
                  selectedNodeId={selectedNodeId}
                  connectionSourceId={connectionSourceId}
                  viewport={viewport}
                  onSelectNode={setSelectedNodeId}
                  onMoveNode={moveNode}
                  onConnectNode={connectNode}
                  onChangeViewport={setViewport}
                />
              ) : null}
            </Diagram>
          </DiagramFrame>

          <div className={styles.canvasControls} aria-label="Canvas view">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={() => zoom(1.2)}
            >
              <Minus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fit diagram"
              onClick={fitViewport}
            >
              <Scan />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={() => zoom(0.8)}
            >
              <Plus />
            </Button>
          </div>

          <DiagramFrame className={styles.miniMap}>
            <Diagram />
          </DiagramFrame>

          <form className={styles.commandBar} onSubmit={runCommand}>
            <span className={styles.commandIcon}>
              <Sparkles aria-hidden="true" />
            </span>
            <label className="sr-only" htmlFor="draft-command">
              Describe a diagram change
            </label>
            <input
              id="draft-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Describe a change…"
              autoComplete="off"
            />
            <span className={styles.commandHint}>LOCAL COMMAND</span>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              className={styles.commandSubmit}
              aria-label="Apply command"
              disabled={!command.trim()}
            >
              <ArrowDownToLine aria-hidden="true" />
            </Button>
          </form>

          <div className={styles.canvasFooter}>
            <span>SIN1</span>
            <span className={styles.footerPulse} />
            <span>LIVE DOCUMENT</span>
            <span className={styles.footerDivider} />
            <span>GRID {DRAFT_GRID_SIZE}PX</span>
            <span>SNAP ON</span>
          </div>
        </section>

        <aside className={styles.inspector} aria-label="Inspector">
          <div className={styles.inspectorHeader}>
            <div>
              <span>INSPECTOR</span>
              <strong>{selectedData?.label ?? "No selection"}</strong>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={styles.inspectorClose}
              aria-label="Clear selection"
              onClick={() => setSelectedNodeId(null)}
              disabled={!selectedNode}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          {selectedNode && selectedData ? (
            <div className={styles.inspectorContent}>
              <section className={styles.inspectorSection}>
                <div className={styles.sectionTitle}>
                  <span>CONTENT</span>
                  <span>01</span>
                </div>
                <label className={styles.field}>
                  <span>LABEL</span>
                  <Input
                    value={selectedData.label}
                    onChange={(event) =>
                      patchSelectedNode({ label: event.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>DETAIL</span>
                  <Input
                    value={selectedData.detail ?? ""}
                    onChange={(event) =>
                      patchSelectedNode({ detail: event.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>STATUS</span>
                  <Input
                    value={selectedData.status ?? ""}
                    onChange={(event) =>
                      patchSelectedNode({ status: event.target.value })
                    }
                  />
                </label>
              </section>

              <Separator className={styles.inspectorSeparator} />

              <section className={styles.inspectorSection}>
                <div className={styles.sectionTitle}>
                  <span>SIGNAL</span>
                  <span>02</span>
                </div>
                <ToggleGroup
                  type="single"
                  value={selectedData.tone}
                  onValueChange={(value) => {
                    if (value) patchSelectedNode({ tone: value as DraftTone })
                  }}
                  className={styles.toneGroup}
                  aria-label="Node signal colour"
                >
                  {(Object.keys(DRAFT_TONE_COLORS) as DraftTone[]).map(
                    (tone) => (
                      <ToggleGroupItem
                        key={tone}
                        value={tone}
                        aria-label={tone}
                        className={styles.toneButton}
                        style={
                          {
                            "--tone-color": DRAFT_TONE_COLORS[tone],
                          } as CSSProperties
                        }
                      >
                        <span />
                      </ToggleGroupItem>
                    )
                  )}
                </ToggleGroup>
              </section>

              <Separator className={styles.inspectorSeparator} />

              <section className={styles.inspectorSection}>
                <div className={styles.sectionTitle}>
                  <span>POSITION</span>
                  <span>03</span>
                </div>
                <div className={styles.coordinates}>
                  <span>
                    X
                    <strong>{selectedNode.position.x}</strong>
                  </span>
                  <span>
                    Y
                    <strong>{selectedNode.position.y}</strong>
                  </span>
                </div>
              </section>

              <div className={styles.inspectorActions}>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedNode}
                >
                  <Trash2 aria-hidden="true" />
                  Delete node
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyInspector}>
              <Network aria-hidden="true" />
              <strong>Select a node</strong>
              <span>Inspect its content, signal, and position.</span>
            </div>
          )}

          <div className={styles.inspectorHistory}>
            <span>HISTORY</span>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                disabled
              >
                <Undo2 aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                disabled
              >
                <Redo2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        </aside>

        {notice ? (
          <div className={styles.notice} role="status">
            <Check aria-hidden="true" />
            {notice}
          </div>
        ) : null}
      </main>
    </DiagramProvider>
  )
}
