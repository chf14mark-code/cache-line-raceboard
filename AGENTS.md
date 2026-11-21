<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Simulation lives in `src/engine/` as pure, deterministic TypeScript with no React imports — so it can be unit-tested and explained line by line.
- `src/pages/` holds page-level view components; `src/routes/` files stay thin and only render a page — routing is TanStack's file router, not `src/pages`.
- `SPEC.md` at the repo root is the source of truth for machine behavior and reference results — later work must match it.
- The app is a static front-end with no network requests or browser storage — fonts are system stacks and graphics are inline SVG.
- Reference checks live once in `src/engine/selftest.ts`; `/selftest` displays them and `src/engine/engine.test.ts` asserts them, so the page and the tests can never disagree.
