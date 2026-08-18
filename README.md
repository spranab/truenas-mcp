# truenas-mcp

[![npm](https://img.shields.io/npm/v/truenas-mcp)](https://www.npmjs.com/package/truenas-mcp)
[![npm downloads](https://img.shields.io/npm/dm/truenas-mcp)](https://www.npmjs.com/package/truenas-mcp)

Wiring a NAS into an AI assistant usually means registering one MCP tool per
operation. Cover TrueNAS SCALE properly and that is 50-80 tool schemas — around
28,000 tokens of your context window spent before the model has read a single
word of your question, on every request, whether or not you touch storage.

truenas-mcp covers **278 actions across 18 categories** — the whole TrueNAS
SCALE REST API — behind **one hierarchical tool** that costs about 200 tokens.
The model asks what categories exist, drills into the one it needs, then calls
the action. Destructive operations refuse to run without `confirm: true`.

## Install (60 seconds)

```bash
# No install needed
TRUENAS_URL=https://truenas.local TRUENAS_API_KEY=1-abc123 npx truenas-mcp
```

Claude Code:

```bash
claude mcp add truenas -- npx -y truenas-mcp   --env TRUENAS_URL=https://truenas.local   --env TRUENAS_API_KEY=1-your-api-key-here
```

Get the API key from the TrueNAS UI: **Settings > API Keys > Add**.

## What it looks like

**You:** "Are my pools healthy, and can you make an NFS share for the media
dataset?"

```
→ truenas({ category: "storage", action: "pool_list" })
  tank — ONLINE, 68% used, 0 errors

→ truenas({ category: "sharing", action: "nfs_share_create",
            params: { path: "/mnt/tank/media", comment: "Media share" } })
```

The model discovered `nfs_share_create` by calling `truenas({ category:
"sharing" })` first — it never had those 36 sharing actions in its prompt.

## Why one tool instead of 278

| | truenas-mcp | Typical NAS MCP server |
|---|---|---|
| **Actions** | 278 | 5-80 |
| **Token footprint** | ~200 tokens (1 tool) | 5,000-30,000 tokens (50-80 tools) |
| **Discovery** | Hierarchical — ask for what you need | Flat — everything loaded upfront |
| **MCP Resources** | 12 read-only dashboards | 0 |
| **Install** | `npx truenas-mcp` | Build from source / pip |
| **Safety** | Destructive ops require `confirm: true` | Varies |

## Full configuration

```bash
# Using npx (no install needed)
TRUENAS_URL=https://truenas.local TRUENAS_API_KEY=1-abc123 npx truenas-mcp

# Or install globally
npm install -g truenas-mcp
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRUENAS_URL` | Yes | TrueNAS instance URL (e.g. `https://truenas.local`) |
| `TRUENAS_API_KEY` | Yes | API key from TrueNAS UI: **Settings > API Keys > Add** |
| `TRUENAS_VERIFY_SSL` | No | Set to `false` to skip SSL verification (self-signed certs) |

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "truenas": {
      "command": "npx",
      "args": ["-y", "truenas-mcp"],
      "env": {
        "TRUENAS_URL": "https://truenas.local",
        "TRUENAS_API_KEY": "1-your-api-key-here",
        "TRUENAS_VERIFY_SSL": "false"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add truenas -- npx -y truenas-mcp \
  --env TRUENAS_URL=https://truenas.local \
  --env TRUENAS_API_KEY=1-your-api-key-here \
  --env TRUENAS_VERIFY_SSL=false
```

## How It Works — Hierarchical Tool Design

Instead of registering 278 individual tools (which would consume ~30k tokens in the LLM system prompt), this server exposes **one tool** called `truenas` with three usage modes:

### 1. Discover categories
```
truenas()
```
Returns all 18 categories with descriptions and action counts (~200 tokens).

### 2. Explore a category
```
truenas({ category: "storage" })
```
Returns all actions in that category with their required/optional parameters.

### 3. Execute an action
```
truenas({ category: "storage", action: "pool_list" })
truenas({ category: "storage", action: "dataset_create", params: { name: "tank/media", compression: "LZ4" } })
```

This means the LLM only pays the token cost for what it actually uses.

## Categories

| Category | Actions | Covers |
|----------|---------|--------|
| `system` | 24 | System info, config, services, mail, API keys, NTP |
| `storage` | 32 | Pools, datasets, snapshots, periodic snapshot tasks |
| `sharing` | 36 | SMB/CIFS, NFS exports, iSCSI targets/extents/portals/initiators |
| `network` | 15 | Interfaces, global config, static routes, IPMI, staged changes |
| `account` | 16 | Users, groups, privileges/roles |
| `disk` | 7 | Physical disks, SMART tests, temperatures |
| `vm` | 16 | Virtual machines, VM devices (disk, NIC, display, PCI) |
| `app` | 17 | Docker apps, container runtime config |
| `update` | 14 | System updates, boot environments, boot pool |
| `certificate` | 8 | TLS certs, ACME/Let's Encrypt, DNS authenticators |
| `alert` | 10 | Alerts, notification services (Slack, email, PagerDuty) |
| `data_protection` | 49 | Replication, cloud sync, cloud backup, cron, rsync, init scripts, SSH keys |
| `filesystem` | 7 | stat, listdir, mkdir, permissions, ACLs, chown |
| `reporting` | 3 | Metrics config, graphs, time-series data |
| `directory` | 8 | Active Directory, LDAP, Kerberos |
| `service_config` | 12 | SSH, FTP, SNMP, UPS, system tunables |
| `audit` | 3 | Audit logs, audit configuration |
| `api` | 1 | Raw API escape hatch for any endpoint |

## MCP Resources (12)

Read-only resources for dashboards — no tool call needed:

| Resource | URI | Description |
|----------|-----|-------------|
| System Info | `truenas://system/info` | Version, hostname, uptime, hardware |
| Pools | `truenas://storage/pools` | All pools with capacity and health |
| Datasets | `truenas://storage/datasets` | All datasets with properties |
| Services | `truenas://services` | Service status overview |
| Alerts | `truenas://alerts` | Current system alerts |
| Network | `truenas://network/summary` | Interfaces, IPs, DNS, gateway |
| Shares | `truenas://sharing` | All SMB, NFS, and iSCSI shares |
| VMs | `truenas://vms` | Virtual machines with status |
| Apps | `truenas://apps` | Installed applications |
| Disks | `truenas://disks` | Physical disks info |
| Boot Envs | `truenas://boot/environments` | Boot environments |
| Update | `truenas://system/update` | Update configuration |

## Example Conversations

**"What pools do I have and are they healthy?"**
```
→ truenas({ category: "storage", action: "pool_list" })
```

**"Create an NFS share for /mnt/tank/media"**
```
→ truenas({ category: "sharing", action: "nfs_share_create", params: { path: "/mnt/tank/media", comment: "Media share" } })
```

**"Check for system updates"**
```
→ truenas({ category: "update", action: "update_check" })
```

**"What SMART tests have run on sda?"**
```
→ truenas({ category: "disk", action: "disk_smart_test_list", params: { disk: "sda" } })
```

## Safety

All destructive operations require `confirm: true` in params:
- Pool create/export/disk replace
- Dataset/snapshot delete, snapshot rollback
- VM delete, app delete/rollback
- System reboot/shutdown, update apply
- Disk wipe, boot disk attach/detach
- Certificate delete, boot env delete
- Directory services leave, ACL set

Without `confirm: true`, these actions return an error message explaining what would happen.

## API Compatibility

Built for **TrueNAS SCALE** REST API v2.0. Compatible with TrueNAS SCALE 22.x through 25.x.

## Development

```bash
git clone https://github.com/spranab/truenas-mcp
cd truenas-mcp
npm install
npm run build
npm run dev  # watch mode
```

## Related projects

Other MCP servers and agent infrastructure built by the same author:

- [mcpier](https://github.com/spranab/mcpier) — self-hosted MCP control plane
  for your homelab; keeps API keys off your clients.
- [saga-mcp](https://github.com/spranab/saga-mcp) — SQLite-backed project
  tracker so the agent doesn't lose the plan between sessions.
- [yantrikdb-mcp](https://github.com/yantrikos/yantrikdb-mcp) — persistent
  cognitive memory for Claude Code, Cursor and Windsurf.
- [swarmcode](https://github.com/spranab/swarmcode) — real-time channel
  between Claude Code instances on different machines.
- [brainstorm-mcp](https://github.com/spranab/brainstorm-mcp) — multi-model
  debate as an MCP tool.

## License

MIT
