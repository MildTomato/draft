# Design System — Draft

## Product Context

- **What this is:** A schema-first studio and component kit for precise, editable technical diagrams.
- **Who it is for:** Engineers, technical writers, and product teams explaining systems and flows.
- **Project type:** Interactive web application and installable React component.

## Aesthetic Direction

- **Direction:** Industrial schematic.
- **Decoration level:** Minimal and intentional.
- **Mood:** Dense, exact, and quietly technical. The canvas should feel like the finished product rather than content inside generic application chrome.

## Typography

- **UI and diagram labels:** Geist Sans.
- **Metadata, ports, and system labels:** Geist Mono with tabular figures.
- **Scale:** 8px micro labels, 9–10px metadata, 11–13px controls and nodes, 14–16px document headings.

## Color

- **Canvas:** `#070707`
- **Chrome:** `#0A0A0A`
- **Raised surface:** `#0F0F0F`
- **Primary text:** `#DEDEDE`
- **Muted text:** `#747474`
- **Borders:** `#242424`
- **Signals:** green `#61B995`, blue `#6D91D8`, violet `#A97AD5`, red `#D65B5B`
- Colour is reserved for system meaning, focus, and state.

## Spacing and Shape

- **Base unit:** 4px.
- **Density:** Compact.
- **Radius:** 2–4px for structural surfaces; pills are reserved for small state labels.
- **Borders:** Fine one-pixel rules carry most of the hierarchy.

## Layout

- **Approach:** Grid-disciplined.
- The editor uses a fixed top bar, narrow tool rail, infinite canvas, and compact inspector.
- Diagram boundaries and nested systems are shown with frames rather than card collections.

## Motion

- **Approach:** Minimal-functional.
- 100–160ms transitions for hover and selection.
- 300–450ms for canvas fitting and viewport movement.
- Respect reduced-motion preferences.

## Distribution

- The application consumes the same `DraftStudio` component published by the shadcn registry.
- Registry components may depend on npm packages for the rendering engine, but their interface and theme remain editable in the consuming project.

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-07-25 | Dark industrial schematic as the first style | It gives Draft a specific visual voice and keeps dense technical diagrams legible. |
| 2026-07-25 | shadcn for application chrome | Consumers can install and adapt the interface using familiar project-owned components. |
| 2026-07-25 | React Flow behind Draft’s component boundary | It provides proven canvas interaction while leaving Draft’s schema and visual system under our control. |
