# Usonian Guitar Company

Official website for Usonian Guitar Co., LLC, including product information and free lutherie resources.

## Deployment source of truth

Cloudflare deploys this repository (`wdklassen-collab/usonian-guitar-company`) from the `main` branch. Any new website tool must be registered here in `app/page.tsx` and must have a corresponding `app/<tool-route>/route.ts` file.

The standalone tool implementations currently live in `wdklassen-collab/usonian-web-tools`. Website routes in this repository serve those implementations at `usonianguitar.com`. The `tool-routes` test prevents a tool from being linked on the homepage without a deployable route.

## Development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
```
