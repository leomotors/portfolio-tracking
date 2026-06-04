# Changelog

## [minor] - 2026-06-04

- feat: add all-time chart timeframes, investment chart timeframe controls, chart axes, and start-of-timeframe comparison tooltips
- feat: color overview and investment chart lines relative to the selected timeframe start value
- feat: refine allocation donut charts with tighter legends, accessible chart labels, and value-aware legend rows
- chore: add product design context for future dashboard UI work

## [0.3.0] - 2026-06-03

- chore: replace Claude Opus 4.7 with Opus 4.8 for new chats; retire 4.7 so existing threads keep the same model
- feat: add selectable overview and investment account chart metrics with positive/negative PnL coloring
- chore: update Lucide React and Vitest browser React dependencies
- fix: use the direct Next ESLint plugin configuration for ESLint 10 compatibility

## [0.2.0] - 2026-05-21

- feat: add multi-provider AI agent with streaming chat, tool progress, Markdown rendering, history, and usage cost tracking
- feat: support OpenAI, Anthropic, and xAI model selection with provider availability and per-million token pricing in the chat UI
- feat: add server-side chat persistence, read-only portfolio tools, web/X search tooling, and AI database tables
- chore: add dashboard environment template for AI provider keys and defaults

## [0.1.1] - 2026-05-11

- fix: derive OAuth redirect origin from request headers so Next.js 16's default `0.0.0.0` bind hostname doesn't leak into post-login redirects

## [0.1.0] - 2026-05-11

- feat: initial vibed dashboard by claude design & claude code
