# GitHub Agentic Workflows


If you've ever written a technical book, you know the sinking feeling. Especially when the topic is an evolving technology or an area with rapid advancements. The moment the manuscript goes to print, the clock starts ticking. APIs evolve. Tools release new versions. Best practices shift. The code examples you carefully crafted six months ago? They're already gathering dust. I faced this with a few books I'd written in the past. 

This is exactly where I found myself with the companion repository for my [Azure Bicep book](https://leanpub.com/azurebicep). It has over 80 examples spread across 12 chapters and an appendix, sitting untouched while Bicep moved from one release to the next. Readers clone the repo, try the examples, and hit warnings they didn't expect. Or worse, they miss out on features that would significantly improve the code.

I needed something that could regularly audit every file in the repository, tell me what's broken, what's outdated, and what could be improved. And do so without me having to check manually. I was sitting on this problem and kept thinking about building a CI pipeline. Sure, I could write a workflow that runs `bicep build` on every file and fails if there are errors. Plenty of teams do this. But thinking about what that actually gives me:

- A red or green badge
- A wall of log output you have to scroll through
- Zero context about _why_ something matters

A traditional linter pipeline tells you _what_ is wrong. It doesn't tell you that the API version you're using is for `Microsoft.Network/virtualNetworks` is from 2021, and there have been three major revisions since. It doesn't tell you that an experimental feature you enabled in `bicepconfig.json` two years ago has since graduated to stable. It doesn't compare your code against the latest Bicep release notes and suggest which new language features could improve your examples.

That kind of analysis requires judgment, not just pattern matching. It requires an agent. Enter [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/).

## What Are GitHub Agentic Workflows?

GitHub Agentic Workflows let you write automation in natural language. Instead of stitching together YAML steps, shell scripts, and third-party Actions, you describe what you want an AI agent to accomplish and give it the tools to do it.

The workflow definition is a Markdown file with YAML frontmatter. The frontmatter handles operational concerns, when to trigger, which permissions to grant, which tools the agent can access, and which network domains it can reach. The Markdown body is where you write the actual instructions, in plain English, describing the steps the agent should follow.

When the workflow runs, GitHub compiles your Markdown into a proper Actions workflow (a `.lock.yml` file), spins up a sandboxed environment, and hands control to an AI agent (GitHub Copilot, by default) that interprets your instructions and uses the available tools to get the job done.

Here's what makes this different from just "AI in CI":

- *You define the goal, not the implementation*: You write "examine the resource declarations and check if the API versions are current" rather than crafting regex patterns to extract version strings and comparing them against a lookup table. The agent figures out how to accomplish what you described.
- *The output is structured and actionable:* Instead of dumping raw logs, the agent can create GitHub issues with tables, categorized findings, and prioritized recommendations. It can comment on pull requests with relevant context. It writes for humans.
- *It adapts to what it finds:* If the agent discovers that certain files use experimental features, it can check whether those features have been promoted to stable in the latest release. A traditional pipeline would need explicit rules for every possible scenario.

## Getting Started

Here's the minimal setup:

1. Install the `gh-aw` CLI extension:

   ```bash
   gh extension install github/gh-aw
   ```

2. Create `.github/workflows/your-workflow.md` with frontmatter and instructions

3. Compile it:

   ```bash
   gh aw compile your-workflow
   ```

4. Add the `.gitattributes` entry:

   ```
   .github/workflows/*.lock.yml linguist-generated=true merge=ours
   ```

5. Commit the `.md`, `.lock.yml`, and `.gitattributes` files

The Markdown body is where you'll spend most of your time iterating. Start simple — "read these files and summarize what you find" — and build up complexity as you learn what the agent can and can't do in the sandbox.

### Building the Bicep Lint Workflow

Let me walk through what I built and the lessons I learned along the way. Some of these lessons came the hard way, but the final result was worth it.

The source file lives at `.github/workflows/bicep-lint.md`. Here's the frontmatter:

```yaml
---
name: Bicep Schema and Feature Check
description: >
  Checks all .bicep files in the repository for schema issues, linting errors,
  and feature updates based on the latest Azure Bicep release.

on:
  schedule: "weekly"
  pull_request:
    paths:
      - "**/*.bicep"
      - "**/*.bicepparam"
      - "**/bicepconfig.json"
  push:
    branches:
      - main
    paths:
      - "**/*.bicep"
      - "**/*.bicepparam"
      - "**/bicepconfig.json"
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read

steps:
  - name: Install Bicep and run linting
    run: |
      curl -Lo ${GITHUB_WORKSPACE}/bicep-cli \
        https://github.com/Azure/bicep/releases/latest/download/bicep-linux-x64
      chmod +x ${GITHUB_WORKSPACE}/bicep-cli

      # Lint every .bicep file and save results
      for f in $(find ${GITHUB_WORKSPACE} -name "*.bicep"); do
        ${GITHUB_WORKSPACE}/bicep-cli build "$f" --stdout 2>&1 >/dev/null
      done
      # ... results saved to lint-results/

tools:
  edit:
  bash:
    - "cat *"
    - "find *"
    - "jq *"
    - "echo *"
    - "ls *"
  github:
    toolsets: [repos, issues, pull_requests]

network:
  allowed:
    - "defaults"
    - "github"

safe-outputs:
  allowed-github-references: ["repo"]
  create-issue:
    title-prefix: "[Bicep Lint] "
    labels: ["bicep", "automated"]
    max: 1
    close-older-issues: true
---
```

As defined in the front matter, the workflow runs weekly to catch new Bicep releases, on PRs to validate changes before merge, and supports manual dispatch for on-demand checks. The path filters ensure it runs only when Bicep-related files change. The agent only gets read access. Any write operations, like creating issues, go through `safe-outputs`, a mechanism that sanitizes and validates what the agent produces before it touches your repository. The agent can read files, run specific shell commands, and interact with GitHub's API. It cannot install packages, modify system files, or reach arbitrary network endpoints. This way, even if the agent is compromised or prompt-injected, it can't directly write to issues, push code, or make any other mutations. It can only request them, and the downstream jobs decide whether to honor those requests.

Below the frontmatter, the Markdown body tells the agent what to do:

```markdown
# Bicep Schema and Feature Check

You are a Bicep linting and schema validation agent. The Bicep CLI
has already been run on all .bicep files BEFORE you started. All
results are saved in the lint-results/ directory. Your job is to
analyze these results and generate a comprehensive report.

## Step 1: Read Bicep version and lint results

Read the pre-computed results:
1. Read lint-results/version.txt for the installed Bicep CLI version
2. Read lint-results/summary.txt for the total/error/warning/clean counts
3. Read lint-results/lint-output.txt for the detailed per-file lint results

## Step 2: Read latest Bicep release info

Read bicep-release.json in the workspace root. Extract the version,
release date, and key highlights from the release notes.

## Step 3: Review bicepconfig.json files

Read all bicepconfig.json files and review them for deprecated options,
experimental features promoted to stable, and missing recommended rules.

## Step 4: Check for API version currency

Examine the .bicep files and flag resources using API versions more
than 2 years old as candidates for update.

## Step 5: Generate the report

Create a summary issue with linting results, errors, warnings,
configuration review, API version updates, and feature opportunities.
```

This reads like a task description you'd give to a colleague. "Here's what we've already done. Here's what I need you to figure out. Here's how I want the output structured." The agent takes it from there.

The output is a GitHub issue. Not a log file, not a build artifact, but a properly formatted issue that shows up in your repository's Issues tab. For the book examples repository, here's what the first successful run produced:

- **Bicep Version Check**: Confirmed v0.40.2 is the latest, with a summary of new features (multi-line interpolated strings, resource existence checks, MCP server tools).
- **Linting Summary**: 81 files scanned. 47 clean, 29 with warnings, 5 with errors.
- **Error Analysis**: All 5 errors were due to external dependencies (Azure Container Registry modules and Kubernetes extensions) that aren't accessible in CI. The agent correctly identified these as external dependency issues, not code bugs.
- **Warning Breakdown**: Categorized into security warnings (secrets in outputs), best practice warnings (property naming, parent-child relationships), and compiler warnings, each with specific file references.
- **API Version Audit**: Found 20+ resource types using versions from 2016-2022, organized by priority with recommended update targets.
- **Feature Opportunities**: Identified three new Bicep v0.40.2 features that could improve the book's examples, complete with code samples showing the before/after.

The agent didn't just run a linter. It produced a technical review. You don't have to believe my words. You can read the [issue this agentic workflow created](https://github.com/rchaganti/bicepbookexamples/issues/8) yourself. I have a lot of cut out for the next few weekends.

### Challenges

The [quick start guides](https://github.github.com/gh-aw/setup/quick-start/) generally paint a nice picture. It generally works, but sometimes you run into issues that need an in-depth review. I'd be doing you a disservice if I pretended this worked on the first try. It took five iterations to get right, and each failure taught me something about how agentic workflows operate under the hood.

- My first attempt had the agent download the Bicep CLI binary and run it directly. Simple, right? The network firewall blocked the download. The sandbox restricts which domains the agent can reach, and GitHub releases weren't in the default allowlist. To fix this, I added the `"github"` network ecosystem to the allowed domains.

- With network access sorted, I had the agent download Bicep and execute it. The download succeeded. But every attempt to run the binary returned "Permission denied." Not a filesystem permission error. The Copilot CLI's shell tool has an `allowlist` of permitted commands, and even though I added `"./bicep *"` as an allowed pattern, the sandbox's deeper security layer prevents the execution of arbitrary downloaded binaries. The sandbox distinguishes between "commands the agent is allowed to request" and "binaries the system will actually execute." Downloaded ELF binaries fall into the latter category and are blocked regardless of your `allowlist`.
- I moved the installation `steps` to the front matter, thinking they would run on the host before the sandbox. The step ran, but wrote to `/usr/local/bin/bicep`, which the container user can't modify. The `steps` field runs inside the agent's container, not on the host runner. But it runs as a regular GitHub Actions step with different (broader) permissions than the agent's shell tool. 
- I changed the install path to `${GITHUB_WORKSPACE}/bicep-cli`, which is writable. The `chmod` succeeded. The version check succeeded. But the agent _still_ couldn't execute it through its shell tool. The steps can execute the binary, but the agent cannot. The shell tool restrictions apply specifically to the AI agent's tool calls, not to the pre-step scripts.
- Finally, I decided to run Bicep entirely in the pre-step, save the results to files, and let the agent just read and analyze the output. The agent never needs to execute Bicep. It just needs to understand what Bicep found. The lesson is. think of the pre-step as the "data collection" phase and the agent as the "analysis" phase. The pre-step handles anything that requires tools to execute. The agent handles anything that requires judgment.

I find that this separation is actually a better design regardless of sandbox restrictions. It's more reliable, faster (the agent doesn't waste turns on installation), and produces deterministic lint results that aren't subject to the agent's interpretation of how to run a tool.

This workflow runs every week. When the next version of Bicep ships, it will automatically:

1. Lint all example files with the new version.
2. Compare the release notes against my code.
3. Flag any deprecated patterns.
4. Suggest new features I should demonstrate.
5. Create an issue telling me exactly what to update.

For a book author maintaining example code, this turns "I should probably check if my examples are still current" into "here's a prioritized list of what needs updating, with context." The cognitive load drops from "research what changed and audit everything" to "review this issue and decide what to act on."

But this isn't just for book repositories. Any team that maintains infrastructure as code could use this pattern. Your Terraform modules. Your CloudFormation templates. Your Helm charts. Anything where the tooling evolves independently of your code, and you need to know when you're falling behind.

## Summary

GitHub Agentic Workflows are not a replacement for traditional CI/CD. If you need deterministic, reproducible build-and-test pipelines, keep using regular Actions. But if you need _analysis_, the kind of work that requires reading, reasoning, and writing, agentic workflows fill a gap that shell scripts never could. For my Bicep book repository, the difference is between 80+ files silently going stale and a weekly issue that says "here are the 3 things you should update this week, and here's why." That's the difference between a repository that decays and one that stays alive.

