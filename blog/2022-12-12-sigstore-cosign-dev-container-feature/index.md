# Sigstore Cosign VS Code development container feature


For those following me here or social media will know that I am a big fan of Visual Studio development containers. I wrote a [bit about Visual Studio Code development containers](https://ravichaganti.com/blog/bicep-feature-in-vscode-devcontainer/). I have been using devcontainers for different development environments extensively. I have a [sample repo on GitHub](https://github.com/rchaganti/devcontainersample) that has all devcontainer definitions that I have been using for different projects. A latest addition to this list is the [Sigstore cosign](https://github.com/sigstore/cosign) devcontainer feature.

>  If you are new to creating VS Code devcontainer features, you can read my earlier article where I walked through [creating a devcontainer feature for Cuelang](https://ravichaganti.com/blog/2022-10-10-cue-lang-dev-container-feature/).

#### What is cosign?

The [Sigstore's cosign](https://docs.sigstore.dev/cosign/overview) aims to support artifact signing and verification. This article is not about cosign but here is a quick look at what you can achieve.

```shell
# Generate key pair (private/public)
cosign generate-key-pair

# Sign a container image
cosign sign --key cosign.key ravikanth/hello-container

# Verify signature
cosign verify --key cosign.pub ravikanth/hello-container
```

Although the above example shows signing a container image, you can sign any artifact using cosign. I have a few articles around container images and OCI artifacts in drafts where I plan to show the usage of Cosign in-depth. For now, this is just a quick overview.

Coming back to VS Code devcontainers, I use devcontainers for all my development work and as a part of that I wanted to have cosign also available in my devcontainer. So, I created a feature that I can simply include in my devcontainer definition.

#### Consuming cosign devcontainer feature

All the devcontainer features that I build are [available in the GitHub artifact registry](https://github.com/rchaganti?tab=packages&repo_name=vsc-devcontainer-features). 

For VS Code or GitHub codespaces to identify a devcontainer, you need to create a `.devcontainer` folder at the root of the repository. Once this folder is created, copy the JSON contents shown below to a file and save it as devcontainer.json under the .devcontainer folder.

```json
{
	"image": "mcr.microsoft.com/vscode/devcontainers/base",
	"containerEnv": {
		"TZ": "Asia/Calcutta"
	},
	"settings": {},
	"extensions": [
		"golang.go"
	],
	"features": {
		"ghcr.io/devcontainers/features/go:1": {
            "version": "latest"
        },
		"ghcr.io/rchaganti/vsc-devcontainer-features/cosign:latest" : {}
	},
	"remoteUser": "vscode"
}
```

This is it really. Whenever you open this repo in VS Code, it prompts you if you want to open the repository in a devcontainer. If you choose to open in a devcontainer, it will take a few minutes to build the container image and start the container for you.

If you need a specific version of the cosign binary, you can specify that using the `version` option.

```
"ghcr.io/rchaganti/vsc-devcontainer-features/cosign:latest" : {
	"version": "1.31.1"
}
```

{{< figure src="/images/cosign-devcontainer.png" width="450px">}} {{< load-photoswipe >}}

In this devcontainer, I have both Go language and cosign binary. Simple. Eh!?

Let me know how you use cosign today in the comments.

