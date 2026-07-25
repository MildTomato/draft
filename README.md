# Draft

Draft is a schema-first editor and React component kit for precise technical
diagrams.

The application at `draft.jonny.design` uses the same read-only renderer that
Draft publishes through its shadcn registry. Editor behavior stays in a
separate optional block.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npx tsc --noEmit
npm run lint
npm run registry:build
npm run build
npm test
```

## Registry

The root `registry.json` publishes two entries:

- `draft-diagram` contains `DiagramProvider`, `DiagramFrame`, `Diagram`, the
  diagram primitives, and the document schema.
- `draft-editor` adds the complete authoring interface and depends on
  `draft-diagram`.

Install the read-only renderer into a shadcn project with:

```bash
npx shadcn@latest add https://draft.jonny.design/r/draft-diagram.json
```

Install the complete editor separately:

```bash
npx shadcn@latest add https://draft.jonny.design/r/draft-editor.json
```

Run `npm run registry:build` whenever a published component changes.
