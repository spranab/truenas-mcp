import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TrueNASClient } from "./client.js";
import { buildRegistry } from "./tools/index.js";
import { registerResources } from "./resources.js";

export interface ServerConfig {
  baseUrl: string;
  apiKey: string;
  verifySsl?: boolean;
}

export function createServer(config: ServerConfig): McpServer {
  const client = new TrueNASClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    verifySsl: config.verifySsl,
  });

  const server = new McpServer({
    name: "truenas-mcp",
    version: "1.0.0",
    description:
      "Comprehensive MCP server for TrueNAS SCALE — 278 tools behind a single hierarchical interface",
  });

  // Build the tool registry from all modules
  const registry = buildRegistry(client);

  // Register ONE tool with hierarchical discovery
  server.tool(
    "truenas",
    `Manage your TrueNAS SCALE system. 278 actions organized in categories.

Usage:
  - No args or category="help" → list all categories
  - category only → list available actions in that category with parameters
  - category + action → execute (pass action-specific params in 'params')

Categories: system, storage, sharing, network, account, disk, vm, app, update, certificate, alert, data_protection, filesystem, reporting, directory, service_config, audit, api`,
    {
      category: z
        .string()
        .optional()
        .describe(
          'Category name: system, storage, sharing, network, account, disk, vm, app, update, certificate, alert, data_protection, filesystem, reporting, directory, service_config, audit, api'
        ),
      action: z
        .string()
        .optional()
        .describe(
          "Action name within the category (e.g. 'pool_list', 'dataset_create'). Omit to discover available actions."
        ),
      params: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Action-specific parameters as key-value pairs. Discover required params by calling with just category."
        ),
    },
    async ({ category, action, params }) => {
      // Mode 1: List categories
      if (!category || category === "help") {
        return {
          content: [{ type: "text" as const, text: registry.listCategories() }],
        };
      }

      // Mode 2: List actions in category
      if (!action) {
        return {
          content: [{ type: "text" as const, text: registry.listActions(category) }],
        };
      }

      // Mode 3: Execute action
      try {
        const result = await registry.execute(category, action, params || {});

        // If the handler returned an MCP-shaped response, pass it through
        if (
          result &&
          typeof result === "object" &&
          "content" in (result as Record<string, unknown>)
        ) {
          return result as { content: Array<{ type: "text"; text: string }> };
        }

        // Otherwise wrap the result
        return {
          content: [
            {
              type: "text" as const,
              text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  registerResources(server, client);

  return server;
}

export async function startStdio(config: ServerConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
