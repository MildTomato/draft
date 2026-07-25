"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type NodeProps,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  ArrowDownToLine,
  Braces,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Database,
  Download,
  Frame,
  Hand,
  Layers3,
  Maximize2,
  MousePointer2,
  Network,
  Redo2,
  RotateCcw,
  Route,
  Server,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Waypoints,
  X,
} from "lucide-react"

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
  createInitialEdges,
  createInitialNodes,
  DRAFT_GRID_SIZE,
  DRAFT_NODE_HEIGHT,
  DRAFT_NODE_WIDTH,
  normalizeDraftEdges,
  normalizeDraftNodes,
  toDraftDocument,
  type DraftBoundaryData,
  type DraftCanvasEdge,
  type DraftCanvasNode,
  type DraftNodeData,
  type DraftNodeKind,
  type DraftTone,
} from "@/lib/draft-document"
import { cn } from "@/lib/utils"

import styles from "./draft-studio.module.css"

const STORAGE_KEY = "draft:edge-request-path:v1"

const toneColors: Record<DraftTone, string> = {
  neutral: "#747474",
  red: "#d65b5b",
  green: "#61b995",
  blue: "#6d91d8",
  violet: "#a97ad5",
}

const nodeIcons: Record<DraftNodeKind, typeof Server> = {
  client: CircleDot,
  gateway: Route,
  service: Server,
  database: Database,
  queue: Layers3,
  note: Braces,
}

const toolItems = [
  { id: "select", label: "Select", icon: MousePointer2, key: "V" },
  { id: "hand", label: "Pan canvas", icon: Hand, key: "H" },
  { id: "node", label: "Add node", icon: Square, key: "N" },
  { id: "text", label: "Add annotation", icon: Type, key: "T" },
  { id: "connect", label: "Connect", icon: Waypoints, key: "C" },
] as const

type ToolId = (typeof toolItems)[number]["id"]

function DraftNodeCard({ data, selected }: NodeProps<DraftCanvasNode>) {
  const nodeData = data as DraftNodeData
  const Icon = nodeIcons[nodeData.kind] ?? Server

  return (
    <div
      className={cn(
        styles.diagramNode,
        styles[`tone${nodeData.tone}`],
        selected && styles.diagramNodeSelected
      )}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className={styles.handle}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      <div className={styles.nodeHeading}>
        <span className={styles.nodeEyebrow}>
          <Icon aria-hidden="true" />
          {nodeData.eyebrow}
        </span>
        {nodeData.status ? (
          <span className={styles.nodeStatus}>{nodeData.status}</span>
        ) : null}
      </div>
      <div className={styles.nodeLabel}>{nodeData.label}</div>
      {nodeData.detail ? (
        <div className={styles.nodeDetail}>{nodeData.detail}</div>
      ) : null}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className={styles.handle}
      />
    </div>
  )
}

function DraftBoundary({ data }: NodeProps<DraftCanvasNode>) {
  const boundaryData = data as DraftBoundaryData

  return (
    <div className={styles.boundary}>
      <div className={styles.boundaryHeader}>
        <span>{boundaryData.label}</span>
        <span>{boundaryData.detail}</span>
      </div>
      <div className={styles.boundaryIndex}>01 / SYSTEM BOUNDARY</div>
    </div>
  )
}

const nodeTypes = {
  draft: DraftNodeCard,
  boundary: DraftBoundary,
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

export function DraftStudio() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<DraftCanvasNode>(createInitialNodes())
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<DraftCanvasEdge>(createInitialEdges())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    "edge-proxy"
  )
  const [activeTool, setActiveTool] = useState<ToolId>("select")
  const [flow, setFlow] =
    useState<ReactFlowInstance<DraftCanvasNode, DraftCanvasEdge> | null>(null)
  const [command, setCommand] = useState("")
  const [presenting, setPresenting] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedNode = useMemo(
    () =>
      nodes.find(
        (node): node is Extract<DraftCanvasNode, { type?: "draft" }> =>
          node.id === selectedNodeId && node.type === "draft"
      ) ?? null,
    [nodes, selectedNodeId]
  )

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          schemaVersion?: number
          graph?: {
            nodes?: DraftCanvasNode[]
            edges?: DraftCanvasEdge[]
          }
        }
        if (
          parsed.schemaVersion === 1 &&
          parsed.graph?.nodes &&
          parsed.graph.edges
        ) {
          setNodes(normalizeDraftNodes(parsed.graph.nodes))
          setEdges(normalizeDraftEdges(parsed.graph.edges))
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [setEdges, setNodes])

  useEffect(() => {
    if (!hydrated) return
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(toDraftDocument(nodes, edges))
      )
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [edges, hydrated, nodes])

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
      if (tool) setActiveTool(tool.id)

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedNodeId
      ) {
        setNodes((current) =>
          current.filter((node) => node.id !== selectedNodeId)
        )
        setEdges((current) =>
          current.filter(
            (edge) =>
              edge.source !== selectedNodeId && edge.target !== selectedNodeId
          )
        )
        setSelectedNodeId(null)
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [selectedNodeId, setEdges, setNodes])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "step",
            data: { signal: "neutral" },
          },
          current
        )
      )
    },
    [setEdges]
  )

  const addNode = useCallback(
    (
      label = "Untitled service",
      kind: DraftNodeKind = "service",
      tone: DraftTone = "neutral"
    ) => {
      const id = `node-${crypto.randomUUID()}`
      const selectedPosition = selectedNode?.position ?? { x: 480, y: 288 }
      const nextNode: DraftCanvasNode = {
        id,
        type: "draft",
        position: {
          x: selectedPosition.x,
          y:
            selectedPosition.y +
            DRAFT_NODE_HEIGHT +
            DRAFT_GRID_SIZE * 4,
        },
        data: {
          label,
          eyebrow: kind.toUpperCase(),
          detail: "new diagram node",
          status: "DRAFT",
          tone,
          kind,
        },
        style: { width: DRAFT_NODE_WIDTH, height: DRAFT_NODE_HEIGHT },
      }

      setNodes((current) => [...current, nextNode])
      if (selectedNode) {
        setEdges((current) => [
          ...current,
          {
            id: `edge-${selectedNode.id}-${id}`,
            source: selectedNode.id,
            target: id,
            sourceHandle: "bottom",
            targetHandle: "top",
            type: "step",
            data: { signal: tone },
          },
        ])
      }
      setSelectedNodeId(id)
      setActiveTool("select")
      window.setTimeout(() => flow?.fitView({ duration: 400, padding: 0.16 }), 0)
      return id
    },
    [flow, selectedNode, setEdges, setNodes]
  )

  const handleTool = (tool: ToolId) => {
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
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId && node.type === "draft"
          ? { ...node, data: { ...node.data, ...patch } }
          : node
      )
    )
  }

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return
    setNodes((current) =>
      current.filter((node) => node.id !== selectedNodeId)
    )
    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId
      )
    )
    setSelectedNodeId(null)
  }

  const resetDiagram = () => {
    setNodes(createInitialNodes())
    setEdges(createInitialEdges())
    setSelectedNodeId("edge-proxy")
    window.setTimeout(() => flow?.fitView({ duration: 400, padding: 0.14 }), 0)
    showNotice("Diagram reset")
  }

  const exportDocument = () => {
    const document = toDraftDocument(nodes, edges)
    const blob = new Blob([JSON.stringify(document, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = "edge-request-path.draft.json"
    link.click()
    URL.revokeObjectURL(url)
    showNotice("Draft file exported")
  }

  const copyDocument = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(toDraftDocument(nodes, edges), null, 2)
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

  const selectedData = selectedNode?.data as DraftNodeData | undefined

  return (
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
          <strong>Edge request path</strong>
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
          <span>{nodes.filter((node) => node.type === "draft").length} NODES</span>
          <span>{edges.length} EDGES</span>
        </div>
        <ReactFlow<DraftCanvasNode, DraftCanvasEdge>
          nodes={nodes}
          edges={edges.map((edge) => ({
            ...edge,
            type: "step",
            style: {
              stroke:
                toneColors[
                  (edge.data?.signal as DraftTone | undefined) ?? "neutral"
                ],
              strokeWidth: 1,
            },
            labelStyle: {
              fill: toneColors[
                (edge.data?.signal as DraftTone | undefined) ?? "neutral"
              ],
              fontFamily: "var(--font-geist-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.08em",
            },
            labelBgStyle: {
              fill: "#0a0a0a",
              fillOpacity: 1,
              stroke: "#242424",
              strokeWidth: 1,
            },
            labelBgPadding: [6, 3],
            labelBgBorderRadius: 10,
          }))}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionLineType={ConnectionLineType.Step}
          onInit={setFlow}
          onNodeClick={(_, node) => {
            if (node.type === "draft") setSelectedNodeId(node.id)
          }}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.35}
          maxZoom={2}
          snapToGrid
          snapGrid={[DRAFT_GRID_SIZE, DRAFT_GRID_SIZE]}
          nodesDraggable={activeTool !== "hand"}
          nodesConnectable={activeTool !== "hand"}
          panOnDrag={activeTool === "hand" ? true : [1, 2]}
          selectionOnDrag={activeTool === "select"}
          colorMode="dark"
          defaultEdgeOptions={{
            type: "step",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: "#747474",
            },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Lines}
            gap={DRAFT_GRID_SIZE}
            size={1}
            color="#141414"
          />
          <Controls
            position="bottom-left"
            showInteractive={false}
            className={styles.flowControls}
          />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            className={styles.miniMap}
            nodeColor={(node) =>
              node.type === "boundary"
                ? "#171717"
                : toneColors[
                    ((node.data as DraftNodeData).tone as DraftTone) ?? "neutral"
                  ]
            }
            maskColor="rgba(4, 4, 4, 0.78)"
          />
        </ReactFlow>

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
                {(Object.keys(toneColors) as DraftTone[]).map((tone) => (
                  <ToggleGroupItem
                    key={tone}
                    value={tone}
                    aria-label={tone}
                    className={styles.toneButton}
                    style={
                      {
                        "--tone-color": toneColors[tone],
                      } as React.CSSProperties
                    }
                  >
                    <span />
                  </ToggleGroupItem>
                ))}
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
                  <strong>{Math.round(selectedNode.position.x)}</strong>
                </span>
                <span>
                  Y
                  <strong>{Math.round(selectedNode.position.y)}</strong>
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
  )
}
