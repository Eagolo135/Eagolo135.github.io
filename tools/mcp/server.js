const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const {
  planChange,
  applyChange,
  addProject,
  validateSite,
  screenshotPage,
  recreateFromImage
} = require('../site-agent/core');

function toTextResult(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

async function createAndRunServer() {
  const server = new McpServer({
    name: 'eagolo135-site-agent',
    version: '1.0.0'
  });

  server.tool(
    'site_plan_change',
    {
      request: z.string().min(3),
      dryRun: z.boolean().optional()
    },
    async ({ request, dryRun }) => {
      const result = await planChange(request, { dryRun });
      return toTextResult(result);
    }
  );

  server.tool(
    'site_apply_change',
    {
      request: z.string().min(3),
      publish: z.boolean().optional()
    },
    async ({ request, publish }) => {
      const result = await applyChange(request, { publish: Boolean(publish) });
      return toTextResult(result);
    }
  );

  server.tool(
    'site_add_project',
    {
      title: z.string().min(2),
      description: z.string().min(5),
      tags: z.array(z.string()).optional(),
      link: z.string().optional(),
      image: z.string().optional(),
      publish: z.boolean().optional()
    },
    async ({ title, description, tags, link, image, publish }) => {
      const result = await addProject({ title, description, tags, link, image, publish: Boolean(publish) });
      return toTextResult(result);
    }
  );

  server.tool(
    'site_validate',
    {},
    async () => {
      const result = validateSite();
      return toTextResult(result);
    }
  );

  server.tool(
    'site_screenshot_page',
    {
      page: z.string().optional(),
      url: z.string().optional(),
      outputPath: z.string().optional(),
      fullPage: z.boolean().optional()
    },
    async ({ page, url, outputPath, fullPage }) => {
      const result = await screenshotPage({ page, url, outputPath, fullPage });
      return toTextResult(result);
    }
  );

  server.tool(
    'site_recreate_from_image',
    {
      referenceImagePath: z.string().min(1),
      targetPage: z.string().optional(),
      maxIterations: z.number().int().min(1).max(20).optional(),
      targetSimilarity: z.number().min(1).max(100).optional(),
      publish: z.boolean().optional(),
      baseInstruction: z.string().optional()
    },
    async ({ referenceImagePath, targetPage, maxIterations, targetSimilarity, publish, baseInstruction }) => {
      const result = await recreateFromImage({
        referenceImagePath,
        targetPage,
        maxIterations,
        targetSimilarity,
        publish: Boolean(publish),
        baseInstruction
      });
      return toTextResult(result);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

createAndRunServer().catch((error) => {
  console.error(`[site-agent-mcp] ERROR: ${error.message}`);
  process.exit(1);
});
