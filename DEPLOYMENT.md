# UsonianGuitar.com Deployment

## Production source of truth

All code and content intended to appear on **UsonianGuitar.com** must be committed to this repository:

- **Repository:** `wdklassen-collab/usonian-guitar-company`
- **Production branch:** `main`
- **Hosting:** Cloudflare Workers
- **Cloudflare Worker:** `usonian-guitar-company`

Cloudflare is connected directly to this repository and builds from `main`.

## Important rule

Do **not** make production website changes in `wdklassen-collab/usonian-web-tools`.

That repository is retained only as a legacy/reference codebase. It is not the deployment source for UsonianGuitar.com.

## What belongs in this repository

This repository is the single source of truth for:

- UsonianGuitar.com homepage and company pages
- Products & Services pages
- Fretboard Generator
- Radius Dish Creator
- Neck Template Generator
- Nut spacing guides
- Future browser-based lutherie tools
- Static assets used by the site
- Cloudflare build/deployment configuration

## Deployment workflow

1. Make the website or tool change in this repository.
2. Commit the change to `main`.
3. Cloudflare automatically builds with `npm run build`.
4. Cloudflare deploys with `npx wrangler deploy`.
5. Verify the new deployment in Cloudflare and on UsonianGuitar.com.

## Before changing deployment settings

Confirm that Cloudflare still shows:

- Git repository: `wdklassen-collab/usonian-guitar-company`
- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

If a future change does not appear on the live site, first verify that the commit was made to this repository—not `usonian-web-tools`.