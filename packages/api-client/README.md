# @repo/api-client

Generated TypeScript types for external OpenAPI clients used by the workspace.

The package currently contains a manually maintained SEC Thailand API v2 OpenAPI document and generated `openapi-typescript` declarations.

## Layout

- [data/sec-v2.yaml](data/sec-v2.yaml) - SEC API v2 OpenAPI document.
- [src/sec-v2.d.ts](src/sec-v2.d.ts) - generated OpenAPI TypeScript declarations.
- [src/index.ts](src/index.ts) - exported `SECV2` namespace for `Paths`, `Components`, and `Operations`.
- [ts-codegen.sh](ts-codegen.sh) - code generation command.

## Scripts

```bash
pnpm --filter @repo/api-client codegen
pnpm --filter @repo/api-client lint
```

`codegen` regenerates declarations from `data/sec-v2.yaml` and then runs package formatting.
