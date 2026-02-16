# Bicep v0.4 and the linter


{{<img src="/images/bicep.png">}}

Bicep v0.4.1 [was released yesterday](https://github.com/Azure/bicep/releases/tag/v0.4.1). This release includes a bunch of bug fixes, more snippets, and most importantly, a linter!

[Linters](https://en.wikipedia.org/wiki/Lint_(software)) bring in a variety of capabilities to a developer toolkit. These tools can help you perform static code analysis, check compliance against a style guide, find syntax errors, and flag potential optimizations in the code.

For a developer, linting support in an IDE is a must. With this Bicep release, Microsoft added support for linting of Bicep files in VS Code and at the command line. To realize the benefits of linting, you must upgrade Bicep CLI and the VS Code extension to v4.0.1 or later. The current set of linter rules are minimal and taken from [arm-ttk test cases](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/test-cases). Both VS Code extension and Bicep CLI check for all available rules by default and all rules are set at warning level. Based on the level of a rule, you will see errors or warnings or informational messages within the editor.

{{< figure src="/images/biceplint1.png" >}} {{< load-photoswipe >}}

When possible, you can even apply a quick fix.

 {{< figure src="/images/biceplint4.png" >}}

### Customizing linter behavior

The best part of this feature is the ability to customize the linter behavior. You can do this by placing [biceconfig.json](https://raw.githubusercontent.com/Azure/bicep/main/docs/examples/bicepconfig.json) with the right set of properties at the same level as your Bicep file or the closest or top-level of the folder tree. Here is an example. Observe where the bicepconfig.json is and where the Bicep file is.

 {{< figure src="/images/biceplint5.png" >}}

Using this configuration file, you can enable or disable linting, [supply rule-specific values](https://github.com/Azure/bicep/blob/main/docs/linter-rules/no-hardcoded-env-urls.md), and set the level of rules as well. What's more -- the Bicep VS Code extension even provides intellisense for this configuration file.

You get to see all available rules as you start customizing the Bicep linting configuration.

{{< figure src="/images/biceplint3.png" >}}

You will get help in checking if there are rule-specific values you can provide.

{{< figure src="/images/biceplint2.png" >}}

Here is my customized linter configuration.

```json
{
    "analyzers": {
      "core": {
        "verbose": false,
        "enabled": true,
        "rules": {
          "no-hardcoded-env-urls": {
            "level": "warning"
          },
          "no-unused-params" : {
              "level": "error"
          },
          "no-unused-vars" : {
              "level": "error"
          },
          "prefer-interpolation" : {
              "level": "warning"
          },
          "secure-parameter-default" : {
              "level": "error"
          },
          "simplify-interpolation" :{
              "level": "warning"
          }
        }
      }
    }
  }
```

> If you update the bicepconfig.json while a Bicep file is open in the editor, you won't see the updated linting behavior until you close and re-open the Bicep file.

If you want to disable linting, set `enabled` to `false`.

Depending on where you are using the linter, different levels of rule might mean different things. (Source: [bicep/linter.md at main · Azure/bicep (github.com)](https://github.com/Azure/bicep/blob/main/docs/linter.md))

| **level** | **Build-time behavior**                                      | **Editor behavior**                                          |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `Error`   | Violations appear as Errors in command-line build output, and cause builds to fail. | Offending code is underlined with a red squiggle and appears in Problems tab. |
| `Warning` | Violations appear as Warnings in command-line build output, but do not cause builds to fail. | Offending code is underlined with a yellow squiggle and appears in Problems tab. |
| `Info`    | Violations do not appear in command-line build output.       | Offending code is underlined with a blue squiggle and appears in Problems tab. |
| `Off`     | Suppressed completely.                                       | Suppressed completely.                                       |

```shell
C:\sandbox\bicep\modules>bicep build storageAccount.bicep
C:\sandbox\bicep\modules\storageAccount.bicep(4,9) : Error simplify-interpolation: Remove unnecessary string interpolation. [https://aka.ms/bicep/linter/simplify-interpolation]
```

With the ability to lint at command line as well, you can integrate these checks as a part of your CI/CD pipelines.

### Linting in GitHub actions

As Bicep CLI supports linting at the command-line, it is easy to reflect the state of your Bicep with regards to the linting rules in a CI / CD pipeline. You can use a [GitHub action](https://github.com/marketplace/actions/setup-bicep) to attempt a bicep build, and errors will fail the pipeline.

Here is a workflow file that I am using.

```yaml
name: ARM Template Build and Test

on: 
  push:
    branches:
      - main
  workflow_dispatch: 
  
jobs:
  build_and_test:
    name: Build ARM JSON Template
    runs-on: ubuntu-latest

    steps:
    # Check out
    - name: Checkout the repo
      uses: actions/checkout@v2

    # Set up Bicep
    - name: Setup Bicep
      uses: anthony-c-martin/setup-bicep@v0.1

    # Build ARM JSON template
    - name: Build Bicep
      run: bicep build ./main.bicep
```

{{< figure src="/images/biceplint6.png" >}}

Overall, I like this new feature. I am looking forward to writing my own rules at some point in time in the future. I do have a wish list around linting.

1. Support linting as a command-line option in Bicep CLI. For example, `bicep lint main.bicep`. Something like this will be good as part of the CI/CD process where I intend to verify if the Bicep file matches my style guide or not necessarily attempt a compile.
2. Support for structured output (JSON/XML) from the linter. For example, `bicep lint main.bicep --output file.json`. This structured output will help generate reports when a failure occurs.

