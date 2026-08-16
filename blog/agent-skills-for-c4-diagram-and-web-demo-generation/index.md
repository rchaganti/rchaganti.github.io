# Agent skills for C4 diagram and web demo generation


In the last article, I demonstrated an [open-source CLI](https://github.com/rchaganti/agent-plugins-validator), apv, created to validate the agent plugin schema. In my articles on [agent plugins](https://ravichaganti.com/blog/agent-plugins-package-reusable-agent-components-into-portable-and-interoperable-plugins/) and `apv`, I did not cover how I personally use them. In this article, I will describe how I structured my [skills](https://github.com/rchaganti/skills) repository and how I began releasing the agent plugins package from it. 

## Skills repository

Over the weekend, I started curating all the skills I have been using and created a collection of them in a [public repository](https://github.com/rchaganti/skills). Over time, I plan to add more skills to this collection. At the moment, there are two skills available in this repository.

| Skill                                                        | Version | Description                                                  | Target Formats / Tools                                       |
| ------------------------------------------------------------ | ------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| [**`c4-diagram`**](https://github.com/rchaganti/skills/blob/main/c4-diagram) | `1.0.1` | Comprehensive software architecture visualization based on Simon Brown's *Visualizing Software Architecture*. Generates Context, Container, Component, Deployment, Dynamic, and Landscape diagrams with Draw.io and Excalidraw MCP server integration. | Mermaid C4, PlantUML C4, Structurizr DSL, Draw.io, Excalidraw |
| [**`web-demo-generation`**](https://github.com/rchaganti/skills/blob/main/web-demo-generation) | `1.0.0` | Ingest natural language prompts for web application demos, plan markdown walkthrough scripts, and deterministically record high-definition demo videos with zero-LLM TTS voice narration, smooth cursor paths, click ripples, and spotlight highlights. | Playwright, edge-tts, pyttsx3, FFmpeg, Markdown DSL          |

Every skill in this repository follows a standardized, progressive-disclosure package layout:

```shell
skills/
└── <skill-name>/
    ├── SKILL.md                         # Main skill entrypoint (YAML frontmatter + instructions + triggers)
    ├── README.md                        # Skill-specific documentation and quickstart
    ├── LICENSE.md                       # License file
    ├── references/                      # Deep-dive documentation, vocabulary, rules, and syntax guides
    ├── examples/                        # Canonical, worked reference implementations & DSL models
    └── scripts/                         # Helper CLI scripts, linters, and verification tools
```

For the code repositories I own or I am exploring, I use the `c4-diagram` skill to generate the system diagrams. This skill can generate a markdown file containing all the architecture diagrams, or it can generate raw syntax for c4 diagrams in mermaid or plantUML format. I use the [draw.io](https://www.drawio.com/docs/manual/generate/drawio-mcp-server/) or [Excalidraw MCP servers](https://github.com/excalidraw/excalidraw-mcp) to transform the raw format into SVG.

The `web-demo-generation` skill is useful for me in generating walkthrough demos of simple web applications I vibe-code for someone else. It creates a demo script in Markdown format and uses Playwright to generate the web application demo. This skill also adds narration to the videos. Here is a quick demo script the agent generated.

```markdown
---
title: "Google Antigravity CLI in 30 Seconds"
description: "A crisp walkthrough from the Antigravity landing page to CLI installation, subagents, and MCP."
viewport:
  width: 1920
  height: 1080
fps: 30
audio:
  enabled: true
  engine: "edge-tts"
  voice: "en-US-GuyNeural"
  rate: "+30%"
  pitch: "+0Hz"
theme:
  cursor_color: "#1a73e8"
  cursor_size: 22
  click_ripple: true
  spotlight_dim: "rgba(7, 15, 35, 0.48)"
  spotlight_border: "#8ab4f8"
---

# Scene 1: Experience Liftoff
- **Navigate**: "https://antigravity.google/"
- **Spotlight**: ".welcome-wrapper"
- **Narration**: "Meet Google Antigravity, built for agent-first development."
- **ClearSpotlight**

# Scene 2: Install the CLI
- **Navigate**: "https://antigravity.google/download#antigravity-cli"
- **Spotlight**: "#antigravity-cli"
- **Narration**: "On Download, open Antigravity CLI and copy its install command."
- **ClearSpotlight**
- **Click**: "#antigravity-cli .copy-button"

# Scene 3: Terminal-First Agents
- **Navigate**: "https://antigravity.google/product/antigravity-cli"
- **Wait**: 3.5s
- **Spotlight**: ".heading-container"
- **Narration**: "A terminal-first experience keeps agents in your flow."
- **ClearSpotlight**
- **ExecuteScript**: "window.scrollTo(0, 1400);"
- **Hover**: ".feature-cards-grid .feature-card:nth-child(2)"
- **Narration**: "Subagents run work in parallel for faster delivery."

# Scene 4: MCP and Get Started
- **ExecuteScript**: "window.scrollTo(0, 2500);"
- **Hover**: ".cards-section-wrapper .text-card:nth-child(4)"
- **Narration**: "Slash commands surface plugins, MCP, skills, and hooks instantly."
- **ExecuteScript**: "window.scrollTo(0, 4640);"
- **Hover**: "#download-section a[href='/download#antigravity-cli']"
- **Narration**: "Install the CLI and start building."
- **Wait**: 0.5s
```

Here is the demo video the skill generated from this script. It is not perfect yet but a good start.

{{< youtube _gl367fiWyU >}}

## Agent Plugin packaging

I had written earlier about the agent plugin packaging for shipping agent skills and MCP server configurations. 

I have added `mcp.json` to the skills repository to add the MCP configuration for Draw.IO and Excalidraw MCP server configuration.

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "drawio": {
      "type": "streamable-http",
      "url": "https://mcp.draw.io/mcp"
    },
    "excalidraw": {
      "type": "streamable-http",
      "url": "https://mcp.excalidraw.com/mcp"
    }
  }
}
```

In addition to the MCP configuration, the `plugin.json` file describes the agent plugin itself.

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "agent-skills",
  "version": "1.0.0",
  "description": "Production-grade AI agent skills for C4 software architecture visualization and automated web demo video generation with Draw.io and Excalidraw MCP servers.",
  "author": {
    "name": "Ravikanth Chaganti",
    "url": "https://github.com/rchaganti"
  },
  "homepage": "https://github.com/rchaganti/skills",
  "repository": "https://github.com/rchaganti/skills",
  "license": "MIT",
  "keywords": [
    "architecture",
    "c4-model",
    "diagrams",
    "drawio",
    "excalidraw",
    "web-demo",
    "video-generation",
    "skills"
  ]
}
```

I found my skills repository to be an excellent playground for showcasing the generation of an agent plugin package of skills and MCP configurations as a release artifact. This is done using a simple GitHub workflow.

```yaml
name: Release Agent Plugin

on:
  push:
    branches:
      - "**"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: agent-plugin-release-${{ github.sha }}
  cancel-in-progress: false

jobs:
  build-and-release:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install Python dependencies
        run: |
          python -m pip install --upgrade pip
          pip install jsonschema pyyaml

      - name: Install Agent Plugin Validator
        env:
          APV_VERSION: "1.4.0"
        shell: bash
        run: |
          set -euo pipefail
          asset="apv_${APV_VERSION}_linux_amd64.tar.gz"
          base_url="https://github.com/rchaganti/agent-plugins-validator/releases/download/v${APV_VERSION}"
          curl --fail --silent --show-error --location --remote-name "${base_url}/${asset}"
          curl --fail --silent --show-error --location --remote-name "${base_url}/checksums.txt"
          grep "  ${asset}$" checksums.txt | sha256sum --check -
          tar -xzf "$asset"
          sudo install -m 0755 apv /usr/local/bin/apv
          apv --version

      - name: Build portable plugin package
        shell: python
        run: |
          import json
          import shutil
          from pathlib import Path

          # Load plugin manifest to determine package name
          manifest_path = Path("plugin.json")
          if not manifest_path.is_file():
              raise FileNotFoundError("Missing root plugin.json manifest")

          with open(manifest_path, "r", encoding="utf-8") as f:
              manifest = json.load(f)

          plugin_name = manifest.get("name", "agent-plugin")
          package_dir = Path("dist") / plugin_name

          if package_dir.exists():
              shutil.rmtree(package_dir)

          (package_dir / "skills").mkdir(parents=True)

          # Copy root plugin metadata
          shutil.copy2("plugin.json", package_dir / "plugin.json")
          for optional_file in ["mcp.json", "LICENSE", "LICENSE.md", "README.md", "CHANGELOG.md"]:
              if Path(optional_file).is_file():
                  shutil.copy2(optional_file, package_dir / optional_file)

          # Dynamically discover and package all skills containing a SKILL.md
          ignored_dirs = {"dist", "release", ".git", ".github", "node_modules", "skills"}
          discovered_skills = []

          for item in sorted(Path(".").iterdir()):
              if item.is_dir() and item.name not in ignored_dirs and not item.name.startswith("."):
                  skill_md = item / "SKILL.md"
                  if skill_md.is_file():
                      target_skill_dir = package_dir / "skills" / item.name
                      shutil.copytree(
                          item,
                          target_skill_dir,
                          ignore=shutil.ignore_patterns(
                              "__pycache__", "*.pyc", ".pytest_cache", "demo_output", "raw_recordings", "audio_output", ".git*"
                          ),
                      )
                      discovered_skills.append(item.name)

          if not discovered_skills:
              raise ValueError("No valid skill directories containing SKILL.md found in repository")

          print(f"Successfully packaged {len(discovered_skills)} skills into {package_dir}: {', '.join(discovered_skills)}")

      - name: Validate Agent Plugin manifests with APV
        shell: bash
        run: |
          package_dir="$(find dist -mindepth 1 -maxdepth 1 -type d | head -n 1)"
          apv validate "$package_dir"

      - name: Validate portable package layout and containment
        shell: python
        run: |
          import yaml
          from pathlib import Path

          package_dir = next(Path("dist").iterdir())
          if not package_dir.is_dir():
              raise FileNotFoundError("Package directory not found in dist/")

          # Validate root manifest exists
          manifest_file = package_dir / "plugin.json"
          if not manifest_file.is_file():
              raise FileNotFoundError("Missing plugin.json at plugin root")

          # Validate all packaged skills
          skills_dir = package_dir / "skills"
          if not skills_dir.is_dir():
              raise FileNotFoundError("Missing skills/ directory in built package")

          skills = [d for d in skills_dir.iterdir() if d.is_dir()]
          if not skills:
              raise ValueError("No skill directories found under skills/")

          for skill_dir in skills:
              skill_entry = skill_dir / "SKILL.md"
              if not skill_entry.is_file():
                  raise FileNotFoundError(f"Missing SKILL.md entrypoint in {skill_dir.name}")
              
              # Validate YAML frontmatter
              text = skill_entry.read_text(encoding="utf-8")
              if not text.startswith("---"):
                  raise ValueError(f"SKILL.md in {skill_dir.name} is missing YAML frontmatter")
              parts = text.split("---", 2)
              if len(parts) < 3:
                  raise ValueError(f"Invalid YAML frontmatter structure in {skill_entry}")
              fm = yaml.safe_load(parts[1]) or {}
              if "name" not in fm or "description" not in fm:
                  raise ValueError(f"SKILL.md in {skill_dir.name} requires 'name' and 'description' fields in frontmatter")

          # Validate containment (symlinks and paths must stay within plugin root)
          for path in package_dir.rglob("*"):
              if path.is_symlink() and package_dir not in path.resolve().parents:
                  raise ValueError(f"Package path escapes plugin root: {path}")

          print(f"Verified package layout, frontmatter, and containment for {len(skills)} skills.")

      - name: Create release archives and checksums
        id: package
        shell: bash
        run: |
          set -euo pipefail
          package_name="$(basename "$(find dist -mindepth 1 -maxdepth 1 -type d | head -n 1)")"
          short_sha="${GITHUB_SHA::12}"
          artifact_name="${package_name}-${short_sha}"
          mkdir -p release
          tar -czf "release/${artifact_name}.tar.gz" -C dist "$package_name"
          (
            cd dist
            zip -qr "../release/${artifact_name}.zip" "$package_name"
          )
          (
            cd release
            sha256sum "${artifact_name}.tar.gz" "${artifact_name}.zip" > SHA256SUMS
          )
          echo "package_name=${package_name}" >> "$GITHUB_OUTPUT"
          echo "artifact_name=${artifact_name}" >> "$GITHUB_OUTPUT"
          echo "release_tag=agent-plugin-${GITHUB_SHA}" >> "$GITHUB_OUTPUT"

      - name: Upload workflow artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ steps.package.outputs.artifact_name }}
          path: |
            release/*.tar.gz
            release/*.zip
            release/SHA256SUMS
          if-no-files-found: error

      - name: Create or update commit release
        env:
          GH_TOKEN: ${{ github.token }}
          RELEASE_TAG: ${{ steps.package.outputs.release_tag }}
        shell: python
        run: |
          import json
          import os
          import subprocess
          from pathlib import Path

          package_dir = next(Path("dist").iterdir())
          
          # Extract metadata from plugin.json
          with open(package_dir / "plugin.json", "r", encoding="utf-8") as f:
              manifest = json.load(f)

          plugin_name = manifest.get("name", "agent-plugin")
          version = manifest.get("version", "1.0.0")
          desc = manifest.get("description", "")

          # Extract MCP servers from mcp.json if present
          mcp_servers = []
          mcp_file = package_dir / "mcp.json"
          if mcp_file.is_file():
              with open(mcp_file, "r", encoding="utf-8") as f:
                  mcp_data = json.load(f)
              for s_name, s_cfg in mcp_data.get("mcpServers", {}).items():
                  s_type = s_cfg.get("type", "unknown")
                  s_target = s_cfg.get("url") or s_cfg.get("command") or ""
                  mcp_servers.append(f"- `{s_name}` ({s_type}): `{s_target}`")

          # Extract packaged skills
          skills = [d.name for d in (package_dir / "skills").iterdir() if d.is_dir()]

          commit_sha = os.environ.get("GITHUB_SHA", "unknown")
          ref_name = os.environ.get("GITHUB_REF_NAME", "main")
          release_tag = os.environ.get("RELEASE_TAG", f"agent-plugin-{commit_sha}")
          short_sha = commit_sha[:12]

          notes_lines = [
              f"Portable Agent Plugin build for commit `{commit_sha}` on `{ref_name}`.",
              "",
              f"- **Agent Plugins Spec Version**: `1.0.0`",
              f"- **Plugin Name**: `{plugin_name}` (v{version})",
              f"- **Description**: {desc}",
              "",
              f"### 📦 Bundled Skills ({len(skills)})"
          ]
          for s in sorted(skills):
              notes_lines.append(f"- `{s}`")

          if mcp_servers:
              notes_lines.extend(["", "### 🔌 Configured MCP Servers"] + mcp_servers)

          notes_lines.extend([
              "",
              "Both `.tar.gz` and `.zip` archives contain the standard portable plugin layout. Verify downloads with `SHA256SUMS`."
          ])

          notes_path = Path("release_notes.md")
          notes_path.write_text("\n".join(notes_lines), encoding="utf-8")

          # Check if release exists
          view_cmd = ["gh", "release", "view", release_tag]
          result = subprocess.run(view_cmd, capture_output=True, text=True)

          if result.returncode == 0:
              edit_cmd = [
                  "gh", "release", "edit", release_tag,
                  "--title", f"Agent Plugin {short_sha}",
                  "--notes-file", str(notes_path),
                  "--prerelease=false"
              ]
              subprocess.run(edit_cmd, check=True)
              upload_cmd = ["gh", "release", "upload", release_tag] + [str(p) for p in Path("release").iterdir()] + ["--clobber"]
              subprocess.run(upload_cmd, check=True)
          else:
              create_cmd = [
                  "gh", "release", "create", release_tag,
                  "--target", commit_sha,
                  "--title", f"Agent Plugin {short_sha}",
                  "--notes-file", str(notes_path)
              ] + [str(p) for p in Path("release").iterdir()]
              subprocess.run(create_cmd, check=True)
```

This workflow uses `apv` to validate the schema files. It also validates the skill structure and packages everything for release. You can find the existing releases of the agent plugin package on the repository's [releases page.](https://github.com/rchaganti/skills/releases)

Tell me how you generate and validate the agent plugin packages.


