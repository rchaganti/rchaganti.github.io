/**
 * WebMCP (Web Model Context Protocol) Integration
 * Enables AI agents (browser-native LLMs, agentic extensions, and headless automations)
 * to discover and execute structured tools directly within the webpage.
 *
 * Spec: W3C Web Machine Learning CG (webmachinelearning/webmcp)
 * Author: Ravikanth Chaganti (https://ravichaganti.com)
 */

(function () {
  'use strict';

  // 1. Polyfill / Shim for document.modelContext if not natively present in browser
  const isNative = typeof document !== 'undefined' && 'modelContext' in document;
  const registry = new Map();

  if (!isNative) {
    document.modelContext = {
      async registerTool(toolDef, options) {
        if (!toolDef || !toolDef.name) {
          throw new Error("WebMCP: Tool definition must include a 'name'.");
        }
        registry.set(toolDef.name, toolDef);

        if (options && options.signal) {
          options.signal.addEventListener('abort', () => {
            registry.delete(toolDef.name);
          });
        }

        document.dispatchEvent(
          new CustomEvent('modelcontext:toolregistered', {
            detail: { name: toolDef.name, tool: toolDef }
          })
        );
        return true;
      },

      async unregisterTool(name) {
        return registry.delete(name);
      },

      async getTools() {
        return Array.from(registry.values()).map(t => ({
          name: t.name,
          title: t.title || t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations || { readOnlyHint: true }
        }));
      },

      async executeTool(name, params = {}) {
        const tool = registry.get(name);
        if (!tool) {
          throw new Error(`WebMCP: Tool '${name}' not found.`);
        }
        return await tool.execute(params);
      }
    };
  }

  // 2. Data Cache (Lazy loading)
  let seriesCache = null;
  let articlesCache = null;

  async function fetchSeriesData() {
    if (!seriesCache) {
      try {
        const res = await fetch('/series/index.json');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        seriesCache = await res.json();
      } catch (err) {
        console.error('[WebMCP] Failed to fetch series data:', err);
        return [];
      }
    }
    return seriesCache;
  }

  async function fetchArticlesData() {
    if (!articlesCache) {
      try {
        const res = await fetch('/index.json');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        articlesCache = await res.json();
      } catch (err) {
        console.error('[WebMCP] Failed to fetch articles index:', err);
        return [];
      }
    }
    return articlesCache;
  }

  // 3. Register Tool Helper
  async function register(toolDef) {
    try {
      await document.modelContext.registerTool(toolDef);
      // Keep track in local registry as well for quick introspection and fallback
      if (!registry.has(toolDef.name)) {
        registry.set(toolDef.name, toolDef);
      }
    } catch (e) {
      console.warn(`[WebMCP] Could not register '${toolDef.name}':`, e);
    }
  }

  // 4. Initialize Tools
  async function initTools() {
    // Tool 1: List all article series
    await register({
      name: "list_article_series",
      title: "List Article Series",
      description: "Returns all technical article series published on Ravikanth Chaganti's blog, including the series title, URL slug, number of articles, and series link.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      async execute() {
        const data = await fetchSeriesData();
        const list = data.map(s => ({
          name: s.name,
          slug: s.slug,
          articleCount: s.count,
          url: s.url
        }));
        return JSON.stringify({
          totalSeries: list.length,
          series: list
        }, null, 2);
      }
    });

    // Tool 2: Get articles in a specific series
    await register({
      name: "get_articles_in_series",
      title: "Get Articles in Series",
      description: "Returns all articles belonging to a specific series (e.g. 'Model Context Protocol', 'Microsoft Agent Framework', 'Google ADK', 'Azure Bicep') with article titles, dates, excerpts, permalinks, and markdown source URLs.",
      inputSchema: {
        type: "object",
        properties: {
          series_name: {
            type: "string",
            description: "The name or slug of the series (case-insensitive, e.g. 'Model Context Protocol' or 'model-context-protocol')"
          }
        },
        required: ["series_name"],
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      async execute({ series_name }) {
        if (!series_name) {
          return JSON.stringify({ error: "Missing parameter 'series_name'." });
        }
        const data = await fetchSeriesData();
        const query = series_name.trim().toLowerCase();
        const match = data.find(s => 
          s.name.toLowerCase() === query || 
          s.slug.toLowerCase() === query ||
          s.name.toLowerCase().includes(query)
        );

        if (!match) {
          const available = data.map(s => s.name);
          return JSON.stringify({
            error: `Series '${series_name}' not found.`,
            availableSeries: available
          }, null, 2);
        }

        return JSON.stringify({
          series: match.name,
          articleCount: match.count,
          url: match.url,
          articles: match.articles
        }, null, 2);
      }
    });

    // Tool 3: Search articles by keyword or topic
    await register({
      name: "search_articles",
      title: "Search Articles",
      description: "Search blog posts by keyword, technology, or topic across the entire blog archive. Searches titles, categories, series, tags, and excerpts.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search keyword or phrase (e.g., 'MCP', 'Agent Framework', 'Docker', 'PowerShell', 'Bicep')"
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return (default 10)",
            default: 10
          }
        },
        required: ["query"],
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      async execute({ query, limit = 10 }) {
        if (!query) {
          return JSON.stringify({ error: "Missing parameter 'query'." });
        }
        const data = await fetchArticlesData();
        const q = query.trim().toLowerCase();
        const terms = q.split(/\s+/).filter(Boolean);

        const toArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);

        // Simple relevance score matching
        const scored = [];
        for (const item of data) {
          let score = 0;
          const title = (item.title || '').toLowerCase();
          const excerpt = (item.excerpt || '').toLowerCase();
          const categories = toArray(item.categories).join(' ').toLowerCase();
          const series = toArray(item.series).join(' ').toLowerCase();
          const tags = toArray(item.tags).join(' ').toLowerCase();

          for (const term of terms) {
            if (title.includes(term)) score += 10;
            if (series.includes(term)) score += 6;
            if (categories.includes(term)) score += 4;
            if (tags.includes(term)) score += 3;
            if (excerpt.includes(term)) score += 2;
          }

          if (score > 0) {
            scored.push({ score, item });
          }
        }

        scored.sort((a, b) => b.score - a.score);
        const results = scored.slice(0, Math.min(limit, 50)).map(s => ({
          title: s.item.title,
          date: s.item.date,
          permalink: s.item.permalink,
          markdown_url: s.item.permalink ? `${s.item.permalink}index.md` : null,
          series: toArray(s.item.series),
          categories: toArray(s.item.categories),
          excerpt: s.item.excerpt
        }));

        return JSON.stringify({
          query,
          matchCount: scored.length,
          returned: results.length,
          results
        }, null, 2);
      }
    });

    // Tool 4: Get full markdown content of an article
    await register({
      name: "get_article_content",
      title: "Get Article Markdown Content",
      description: "Fetches the full markdown content of an article given its permalink URL, path, or slug.",
      inputSchema: {
        type: "object",
        properties: {
          url_or_slug: {
            type: "string",
            description: "The full permalink URL, relative path, or slug of the article (e.g. '/blog/anthropic-model-context-protocol/' or 'anthropic-model-context-protocol')"
          }
        },
        required: ["url_or_slug"],
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      async execute({ url_or_slug }) {
        if (!url_or_slug) {
          return JSON.stringify({ error: "Missing parameter 'url_or_slug'." });
        }

        let target = url_or_slug.trim();
        // If it's a bare slug (e.g. "anthropic-model-context-protocol")
        if (!target.includes('/') && !target.startsWith('http')) {
          target = `/blog/${target}/index.md`;
        } else if (!target.endsWith('.md')) {
          target = target.endsWith('/') ? `${target}index.md` : `${target}/index.md`;
        }

        try {
          const res = await fetch(target);
          if (!res.ok) {
            return JSON.stringify({
              error: `Article markdown not found at '${target}' (HTTP ${res.status}).`
            });
          }
          const markdown = await res.text();
          return JSON.stringify({
            source: target,
            content: markdown
          }, null, 2);
        } catch (err) {
          return JSON.stringify({
            error: `Failed to fetch article markdown: ${err.message}`
          });
        }
      }
    });

    // Tool 5: Get author info
    await register({
      name: "get_author_info",
      title: "Get Author Profile",
      description: "Returns biographical and background information about the blog author Ravikanth (Ravi) Chaganti, areas of expertise, and social profiles.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      async execute() {
        return JSON.stringify({
          name: "Ravikanth (Ravi) Chaganti",
          role: "Cloud, Cloud-Native, and AI Infrastructure Technologist",
          bio: "Ravikanth [Ravi] Chaganti is a cloud, cloud-native, and AI enthusiast. He is a technologist working on AI infrastructure solutions, multi-cloud infrastructure management and orchestration. He is an automation fanatic and multi-year Microsoft MVP recipient.",
          topics: [
            "Agentic AI",
            "Model Context Protocol (MCP)",
            "Microsoft Agent Framework",
            "Google ADK",
            "AI Infrastructure",
            "Azure Bicep / Cloud Automation",
            "Kubernetes & Containers"
          ],
          website: "https://ravichaganti.com",
          github: "https://github.com/rchaganti",
          twitter: "https://twitter.com/ravikanth",
          linkedin: "https://www.linkedin.com/in/rchaganti"
        }, null, 2);
      }
    });

    console.log(`[WebMCP] 5 tools registered (${isNative ? 'native browser support' : 'polyfilled'}). Ready for AI agents.`);
  }

  // Expose global helper for easy in-browser DevTools testing
  window.runWebMCPTool = async function (toolName, params = {}) {
    if (document.modelContext && typeof document.modelContext.executeTool === 'function') {
      return await document.modelContext.executeTool(toolName, params);
    }
    const tool = registry.get(toolName);
    if (!tool) throw new Error(`Tool '${toolName}' not found in registry.`);
    return await tool.execute(params);
  };

  // Run initialization
  let initPromise;
  if (document.readyState === 'loading') {
    initPromise = new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', () => resolve(initTools()));
    });
  } else {
    initPromise = initTools();
  }

  if (typeof window !== 'undefined') {
    window.__webmcpReady = initPromise;
  }
})();
