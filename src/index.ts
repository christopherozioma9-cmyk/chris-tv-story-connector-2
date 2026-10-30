
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { env } from "cloudflare:workers";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "CHRIS TV STORY CONNECTOR",
    version: "1.0.0",
  });

  // Save a story scene
  server.registerTool(
    "save_story_scene",
    {
      description: "Save a scene from a Nollywood story.",
      inputSchema: z.object({
        episode: z.string(),
        scene_number: z.number().int().positive(),
        title: z.string(),
        scene_text: z.string().min(1),
      }),
    },
    async ({ episode, scene_number, title, scene_text }) => {
      const scene_id = `scene:${episode.trim()}:${scene_number}`;

      const scene = {
        scene_id,
        episode,
        scene_number,
        title,
        scene_text,
        saved_at: new Date().toISOString(),
      };

      await env.CHRIS_STORY_STORAGE.put(
        scene_id,
        JSON.stringify(scene)
      );

      return {
        content: [
          {
            type: "text",
            text: `Scene saved successfully. Scene ID: ${scene_id}`,
          },
        ],
      };
    }
  );

  // Retrieve a saved scene
  server.registerTool(
    "get_story_scene",
    {
      description: "Retrieve a saved story scene using its scene ID.",
      inputSchema: z.object({
        scene_id: z.string(),
      }),
    },
    async ({ scene_id }) => {
      const scene = await env.CHRIS_STORY_STORAGE.get(scene_id);

      if (!scene) {
        return {
          isError: true,
          content: [{ type: "text", text: "Scene not found." }],
        };
      }

      return {
        content: [{ type: "text", text: scene }],
      };
    }
  );

  // List saved scenes
  server.registerTool(
    "list_story_scenes",
    {
      description: "List saved scenes from the story library.",
    },
    async () => {
      const result = await env.CHRIS_STORY_STORAGE.list({
        prefix: "scene:",
      });

      const scenes = result.keys.map((key) => key.name);

      return {
        content: [
          {
            type: "text",
            text: scenes.length
              ? scenes.join("\n")
              : "No story scenes have been saved yet.",
          },
        ],
      };
    }
  );

  return server;
}

const handler = createMcpHandler(createServer);

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
