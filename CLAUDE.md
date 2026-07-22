# Theme: [Poyse] — Dawn-based custom theme

## Stack
- Shopify Liquid (Online Store 2.0)
- Dawn 15.x as base, heavily customized
- Tailwind CSS v4 via PostCSS build (see `tools/build.mjs`)
- JSON templates, not legacy Liquid templates

## Conventions
- Sections: PascalCase in schema `name`, kebab-case filename
- Snippets: always pass named args, never rely on globals
- Blocks: use `block.settings` over `section.settings` for repeatable UI
- Metafields: read via `product.metafields.custom.<key>` only (never root namespace)
- Translations: every user-facing string uses `{{ 'key' | t }}` — no hardcoded English

## Commands
- `shopify theme dev` — local preview
- `shopify theme check` — lint (must pass with 0 errors)
- `shopify theme push --unpublished` — deploy to a duplicate, never live
- `pnpm css` — Tailwind build

## File Map
- Custom sections live in `sections/custom-*`
- Shared helpers in `snippets/_*.liquid` (underscore prefix = internal)
- App blocks in `blocks/`
- Customer-facing copy in `locales/en.default.json`

## Guardrails
- NEVER push directly to the live theme
- NEVER commit changes from the online code editor without pulling first
- Flag any `{% assign %}` inside a loop — potential performance issue
- Always run `shopify theme check` after multi-file changes

After editing any {% schema %} block, run shopify theme check and fix every error before stopping. Treat schema validation as a gate.

Preserve all existing schema settings unless I call one out by name. Adding new settings is fine; removing them is not.
