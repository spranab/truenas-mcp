# Installing truenas-mcp

## Requirements

Two environment variables, both required:

| Variable | Description |
|----------|-------------|
| `TRUENAS_URL` | Full URL of the TrueNAS SCALE instance, **including the scheme** (e.g. `https://truenas.local`, not just `truenas.local`) |
| `TRUENAS_API_KEY` | Generated in the TrueNAS UI: **Settings > API Keys > Add** |

Optional: `TRUENAS_VERIFY_SSL=false` to skip certificate verification for
self-signed certs (common on a local NAS).

## Install

```bash
claude mcp add truenas -- npx -y truenas-mcp \
  --env TRUENAS_URL=https://truenas.local \
  --env TRUENAS_API_KEY=1-your-api-key-here
```

## Verifying the install

Call the `truenas` tool with `{ category: "storage", action: "pool_list" }`.
A list of storage pools confirms the URL and API key are both correct. A
connection error usually means `TRUENAS_URL` is unreachable from wherever
the MCP server process runs (not necessarily from the user's own machine);
an auth error means the API key was copied incorrectly or has expired.

Destructive actions (deletes, dataset removal, etc.) require an explicit
`confirm: true` parameter and will refuse to run without it — this is
expected behavior, not a bug.
