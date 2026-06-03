<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## AI chat models

See the architecture comment at the top of `src/lib/ai/models.ts`. Selectable models live in `AI_MODELS`; retired ids stay in `RETIRED_AI_MODELS` so existing conversations keep the same API model. New chats and model changes must not accept retired ids (`allowRetired: false` on `normalizeModelSelection`).
