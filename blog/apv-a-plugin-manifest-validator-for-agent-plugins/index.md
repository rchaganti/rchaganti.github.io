# apv: A plugin manifest validator for agent plugins


In an [earlier article](https://ravichaganti.com/blog/agent-plugins-package-reusable-agent-components-into-portable-and-interoperable-plugins/), I introduced the [Agent Plugin specification](https://agent-plugins.org/) for packaging agent resources such as skills and MCP configurations. This packaging specification requires a plugin manifest (`plugin.json`) that agents and clients use to load the necessary agent resources. This manifest, as seen in the earlier article, has a strict schema. As I started exploring agent plugins for packaging skills and MCP configurations, I felt the need to quickly check whether the plugin manifest conforms to the schema. So, I built one!

## Introducing apv

`apv` ([**A**gent **P**lugin **V**alidator](https://github.com/rchaganti/agent-plugin-validator)) is a lightweight, high-performance, schema-driven Go CLI tool for validating Agent Plugin manifests (`plugin.json`) and MCP configurations (`mcp.json`) against the open [Agent Plugins v1.0.0 specification](https://agent-plugins.org/specification).

- 🎯 **100% Schema-Driven Validation**: Zero hardcoded field assumptions in validator code.
- ⚡ **Agent & CI/CD Ready**:
  - `--format json` output for programmatic consumption by AI agents and pipeline steps.
  - `--quiet` / `-q` silent mode returning deterministic exit codes (`0` = valid, `1` = invalid, `2` = usage/runtime error).
  - TTY auto-detection and standard `NO_COLOR` environment variable support.
- 📦 **Embedded & Cached Schema Lifecycle**:
  - Embedded v1.0.0 default schema fallback (`plugin.schema.json`).
  - `apv schema update [url]` to fetch and cache updated schemas locally (`~/.apv/schemas/`).
  - `--schema <path|url>` for one-off custom schema validation.
- 🚀 **Shell Autocompletion**: Built-in tab completion for Bash, Zsh, Fish, and PowerShell (`apv completion <shell>`) with `.json` file completion for `validate` and `--schema`.
- ⚠️ **Spec-Compliant Warning Handling**:
  - Unrecognized top-level fields are classified as **Warnings** (`⚠`) and ignored per Spec §5.2 without failing validation.

To install `apv`, you can run:

```shell
go install github.com/rchaganti/agent-plugin-validator@latest
```

Or you can download a release from the repository's [releases page](https://github.com/rchaganti/agent-plugin-validator/releases).

To validate a plugin manifest,

```shell
# Validate single file
c:\> apv validate plugin.json
✓ Using schema: Agent Plugins Manifest (embedded default)
✓ .\plugin.json is VALID (with 1 warning)

  ⚠ /non-schema    unknown top-level field 'non-schema' (ignored per spec §5.2)

# Validate entire plugin folder (auto-discovers plugin.json and mcp.json)
c:\> apv validate ./my-plugin-folder
✓ Using schema: Agent Plugins Manifest (embedded default)
✓ ./my-plugin-folder/plugin.json is VALID

✓ Using schema: Agent Plugins MCP Configuration (embedded default)
✓ ./my-plugin-folder/mcp.json is VALID
```

If you want to use `apv` within a CI/CD pipeline or use it in a scripted manner, you can change the output format to JSON.

```shell
PS C:\> apv validate plugin.json --format=json
{
  "valid": true,
  "schema": {
    "source": "embedded default",
    "path": "(embedded)",
    "id": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    "title": "Agent Plugins Manifest"
  },
  "errors": null,
  "warnings": [
    {
      "path": "/non-schema",
      "message": "unknown top-level field 'non-schema' (ignored per spec §5.2)"
    }
  ]
}
```

By default, `apv` carries an embedded version of the schema of both plugin and mcp JSON files.

```shell 
PS C:\temp> .\apv.exe schema show
Active Schemas:
[manifest]
  Title:  Agent Plugins Manifest
  ID:     https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
  Source: embedded default
  Path:   (embedded)

[mcp]
  Title:  Agent Plugins MCP Configuration
  ID:     https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
  Source: embedded default
  Path:   (embedded)
```

You can update the schema to an updated version available in the agent plugins spec repository.

```shell
PS C:\temp> .\apv.exe schema update
✓ Schema (manifest) successfully updated and cached.
  ID:   https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
  Path: C:\Users\ravik\.apv\schemas\plugin.schema.json
✓ Schema (mcp) successfully updated and cached.
  ID:   https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
  Path: C:\Users\ravik\.apv\schemas\mcp.schema.json
  
PS C:\temp> .\apv.exe schema show
Active Schemas:
[manifest]
  Title:  Agent Plugins Manifest
  ID:     https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
  Source: cached
  Path:   C:\Users\ravik\.apv\schemas\plugin.schema.json

[mcp]
  Title:  Agent Plugins MCP Configuration
  ID:     https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
  Source: cached
  Path:   C:\Users\ravik\.apv\schemas\mcp.schema.json
```

You can also specify the path to different plugin and MCP schema files within the `validate` command.

```shell
PS C:\temp> .\apv validate --help
Validate an Agent Plugin manifest (plugin.json) or MCP configuration (mcp.json)
against the canonical Agent Plugins v1.0.0 JSON schema.
If a directory path is passed, apv automatically discovers and validates plugin.json and mcp.json files inside it.
Pass '-' as the file argument to read from standard input.

Usage:
  apv validate <file|dir> [flags]

Flags:
  -f, --format string            Output format (text or json) (default "text")
  -h, --help                     help for validate
  -q, --quiet                    Quiet mode (suppress output, exit code only)
  -s, --schema string            Custom schema override (path, URL, or key=value, e.g. manifest=p.json,mcp=m.json)
      --schema-manifest string   Custom Manifest schema override (path or URL)
      --schema-mcp string        Custom MCP schema override (path or URL)
  -t, --type string              Schema type: auto, manifest, mcp (default "auto")

Global Flags:
      --color string   Control color output (auto, always, never) (default "auto")
```

I find this tiny utility useful as I start creating and sharing agent plugin packages. This is an open-source utility and available for you to contribute bug fixes or enhancements!

