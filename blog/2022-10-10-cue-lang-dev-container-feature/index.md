# CUE language VS Code development container feature


In an earlier article, I wrote a [bit about Visual Studio Code development containers](https://ravichaganti.com/blog/bicep-feature-in-vscode-devcontainer/). I have been using devcontainers for different development environments extensively. This is helping me keep the environment consistent and helps me rebuild an environment from scratch almost instantly. I use dev containers for all my Go language, Python, Rust, and now CUE language learning and development work. You can find all my dev container definition in a [sample repository I created on GitHub](https://github.com/rchaganti/devcontainersample).

Since I wrote the last article, devcontainers feature has evolved and a few things changed in how we define dev containers and dev container features. I realized that I needed to update some of my definitions and how I created dev container features.

In this article, I will walk through creating a feature for [CUE language](https://cuelang.org/) first and then show you how to consume that feature in a dev container definition.

### What is a dev container feature?

To quote a [Microsoft article](https://code.visualstudio.com/blogs/2022/09/15/dev-container-features),

> Features are self-contained units of installation code, container configuration, and/or settings and extensions designed to enable new development capabilities in your dev container.

In essence, you can use dev container features to any add missing tools or languages to your development environment. These features can be authored in any language of your choice available in the dev container.  The default choice is a shell script. To start authoring a new feature, you can clone the [feature template repository](https://github.com/devcontainers/feature-template).

{{< figure src="/images/cuelang-devcontainer-1.png" >}} {{< load-photoswipe >}} 

> I have a repository created from this template at [rchaganti/vsc-devcontainer-features: Visual Studio devcontainer features (github.com)](https://github.com/rchaganti/vsc-devcontainer-features)

As you see here, this template repository contains src, test, and GitHub workflows folders. All you feature definitions go into the src folder. The template comes with a standard GitHub workflow that builds and publishes the features as [OCI artifacts](https://opencontainers.org/) to the GitHub Container Registry (GHCR). You can place each feature in its own subfolder under the src folder. Each feature folder must contain at least two files -- devcontainer-feature.json and install.sh. The devcontainer-feature.json contains the metadata needed to describe the feature and any arguments that you need to pass to the installer script.

#### devcontainer-feature.json

For building a feature for the CUE language, here is what I have defined in the JSON.

```json
{
    "id": "cuelang",
    "version": "1.0.3",
    "name": "CUE Lang",
    "options": {
        "version": {
            "type": "string",
            "description": "Specify a version of CUE language"
        }
    },  
    "customizations": {
        "vscode": {
            "extensions": [
                "brody715.vscode-cuelang"
            ]
        }
    }
}
```

In this definition, `id`, `version`, and `name` are required fields. Any time you make a change to either the JSON definition or the install.sh script or any other artifact within the feature folder, you must bump up the version in devcontainer-feature.json. The options object can be used to define any arguments that must be passed to the install.sh script. In the above definition, there is only one property -- `version`. The customizations section is where you can add VS Code setting default for this dev container and any extensions that you need have within the development environment. For the CUE lang, there is no official extension. Therefore, I used what is available from the community in the marketplace.

#### install.sh

Once you have the devcontainer-feature.json ready, you can start implementing the necessary logic within install.sh script. For example, here is what I have in the install.sh for the CUE lang feature.

```shell
#!/bin/bash
set -e

echo "Activating feature 'CUELANG'"

# CUE lang version
VERSION=${VERSION:-"latest"}

CUEURL="https://github.com/cue-lang/cue/releases/download/v${VERSION}/cue_v${VERSION}_linux_amd64.tar.gz"

sudo curl -Lo /tmp/cue.tar.gz ${CUEURL}
sudo mkdir /tmp/cue
sudo tar xvzf /tmp/cue.tar.gz -C /tmp/cue
sudo cp /tmp/cue/cue /usr/local/bin/cue 
sudo chmod +x /usr/local/bin/cue
sudo rm -rf /tmp/cue
```

The `version` option coming from the dev container definition can be retrieved in the install.sh script. In this script, the `CUEURL` variable uses the version value passed to the install script to construct the URL needed to download the CUE lang binary. 

#### GitHub workflow

As mentioned earlier, the features can be referenced in different ways in a dev container definition but the most easiest and my favorite way is to publish to / consume from GHCR. The feature template repository comes with a built-in workflow to publish the feature tarballs as OCI artifacts.

```yaml
name: "Release dev container features"
on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  deploy:
    if: ${{ github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: "Publish"
        uses: devcontainers/action@v1
        with:
          publish-features: "true"
          base-path-to-features: "./src"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

With this in place, you should be all set. You can commit this feature into a GitHub repository and the workflow should take care of publishing the artifacts to GHCR.

### Consuming a custom feature

With the change to publish features as OCI artifacts, there is a change in consuming as well. Here is how you can consume the above CUE lang feature in a dev container definition.

```json
{
	"image": "mcr.microsoft.com/vscode/devcontainers/base",
	"settings": {},
	"features": {
		"ghcr.io/rchaganti/vsc-devcontainer-features/cuelang:latest" : {
			"version" : "0.4.3"
		}
	},
	"remoteUser": "vscode"
}
```

This is it! When you spin a dev container using this definition, you can CUE lang installed and ready to use.

 {{< figure src="/images/cuelang-devcontainer-2.png" >}}

Hope you find this useful. Leave any questions / feedback you may have in the comments.

