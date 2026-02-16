# Implementing llms.txt and Markdown Output in Hugo


As AI agents and Large Language Models (LLMs) become a primary way for users (and other agents) to consume technical content, the way we serve our websites needs to evolve. While HTML is great for human readability in a browser, it's often cluttered with navigation, sidebars, and styling that can confuse or distract an AI agent. The emerging [llms.txt](https://llmstxt.org/) standard addresses this by providing a structured, Markdown-based map of your site's content specifically for AI consumption. I recently wrote about the [documentation stack for AI agents](https://ravichaganti.com/blog/documentation-stack-for-ai-agents/), and thought it was time to practice what I preach.

In this post, I'll show you how I extended my Hugo-based blog to generate an `llms.txt` file and, more importantly, a clean Markdown version of every article.

## The Challenge

I have been a big fan of [Hugo static site generator](https://gohugo.io/) ever since I discovered it. I have used Hugo for my own technical blog (this site you are on), the [learning platform](https://learn.ravichaganti.com/) I built recently, and a few other sites for non-profits. By default, Hugo is excellent at transforming Markdown source files into HTML. However, the source Markdown files aren't included in the final `public/` build folder. If you want an AI agent to read a clean version of your post, you have two choices:
1. Point it to your GitHub repository (if it's public).
2. Generate a Markdown version during the site build.

I chose the latter. It's more self-contained and ensures the agent gets exactly what's currently published.

To make this happen, we have to tell Hugo to generate what we need during the build process. We need to generate llms.txt at the site root and a Markdown version of each article. Both are new output formats for Hugo. So, let us start there.

## Defining Custom Output Formats

Hugo's [output formats feature](https://gohugo.io/configuration/output-formats/) is incredibly powerful but often underutilized. It allows you to render the same content into multiple formats (HTML, JSON, RSS, etc.).

To support `llms.txt` and Markdown, we first need to define them in `hugo.toml`:

```toml
[mediaTypes]
  [mediaTypes."text/markdown"]
    suffixes = ["md"]
  [mediaTypes."text/plain"]
    suffixes = ["txt"]

[outputFormats]
  [outputFormats.Markdown]
    mediaType = "text/markdown"
    baseName = "index"
    isPlainText = true
  [outputFormats.LLMS]
    mediaType = "text/plain"
    baseName = "llms"
    isPlainText = true
```

Next, we tell Hugo which pages should generate these formats:

```toml
[outputs]
  home = ["HTML", "JSON", "LLMS"] # Home page gets HTML, search JSON, and llms.txt
  page = ["HTML", "Markdown"]     # Individual posts get HTML and index.md
```

Once we have the output format defined, we need to provide Hugo with a template. These templates use Go language's [text templating feature](https://pkg.go.dev/text/template). 

## Creating the Markdown Template

When Hugo renders a page, it looks for a template named `layouts/_default/single.md` (or similar). This template defines how the Markdown output should look.

I created a simple template in `layouts/_default/single.md`:

```markdown
# {{ .Title }}

{{ .RawContent }}
```

Using `.RawContent` ensures we get the original Markdown without any HTML rendering, providing the cleanest possible input for an AI.

## Generating the llms.txt

The `llms.txt` file is essentially a site map for agents. It should live at the root of your site. I created a template in `layouts/index.llms`:

```markdown
# {{ .Site.Title }}

> {{ .Site.Params.description }}

## Blog Posts

{{- range where .Site.RegularPages "Type" "in" (slice "blog") }}
- [{{ .Title }}]({{ .RelPermalink }}index.md): {{ .Params.excerpt | default .Summary | plainify }}
{{- end }}
```

Note the link format: `{{ .RelPermalink }}index.md`. This points the agent directly to the Markdown version we generated in Step 2.

## Verification

After building the site (`hugo`), you'll find two new assets:
1. `public/llms.txt`: The site-wide index.
2. `public/blog/[slug]/index.md`: The clean Markdown version of each post.

You can verify the `llms.txt` output looks something like this:

```markdown
# Ravikanth Chaganti

> Ravikanth Chaganti on AI infrastructure, Agentic AI, Cloud Native infrastructure, and automation.

## Blog Posts
- [GitHub Agentic Workflows](/blog/github-agentic-workflows/index.md): Write automation in natural language...
- [Implementing llms.txt in Hugo](/blog/hugo-llms/index.md): Extend Hugo to support AI agents...
```

Implementing support for `llms.txt` is a small change with high impact. It signals that your site is agent-ready and AI-friendly, making it trivial for tools like LLMs, search agents, and automated workflows to consume your technical knowledge without the overhead of HTML parsing.

If you are building technical documentation or a blog in 2026, this should be part of your standard stack.

