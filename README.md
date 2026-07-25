# Draft

Draft is a schema-first studio and React component for precise, editable technical diagrams.

The application at `draft.jonny.design` consumes the same component exposed through the shadcn registry.

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

The root `registry.json` publishes the same `draft-studio` block used by the
application. The built registry item is served from:

```text
https://draft.jonny.design/r/draft-studio.json
```

Install it into a shadcn project with:

```bash
npx shadcn@latest add https://draft.jonny.design/r/draft-studio.json
```

Run `npm run registry:build` whenever a published component changes.
