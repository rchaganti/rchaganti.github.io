# Keyless git commit signing using Sigstore gitsign in a VS Code devcontainer


Once a Sigstore fan, always a fan!

Sigstore has become a good part of my research around SBOM and supply-chain security. I wrote about a [cosign VS Code devcontainer feature earlier](https://ravichaganti.com/blog/2022-12-12-sigstore-cosign-dev-container-feature/) and then stumbled upon [gitsign](https://docs.sigstore.dev/gitsign/overview). In the past, I tried using GPG keys to sign my git commits but could not really sustain that as I kept changing machines and using different development environments. When I first looked at cosign, my initial thought was using it also for git commit signing but as I started reading Sigstore documentation, I discovered gitsign!

Similar to my cosign VS Code devcontainer feature, I quickly [created a gitsign feature](https://github.com/rchaganti/vsc-devcontainer-features/pkgs/container/vsc-devcontainer-features%2Fgitsign). As a part of this feature install inside the devcontainer, the bootstrap script configures git global options to enable signing of all commits and using gitsign as the X509 program.

Here is how you can consume this feature in your VS code devcontainer definition.

```json
{
	"image": "mcr.microsoft.com/vscode/devcontainers/base",
	"containerEnv": {
		"TZ": "Asia/Calcutta",
		"GITSIGN_CONNECTOR_ID": "https://github.com/login/oauth",
		"GITSIGN_FULCIO_URL": "https://fulcio.sigstore.dev",
		"GITSIGN_REKOR_URL": "https://rekor.sigstore.dev"
	},
	"settings": {}
	"extensions": [
		"golang.go"
	],
	"features": {
		"ghcr.io/devcontainers/features/go:1": {
            		"version": "latest"
		},
		"ghcr.io/rchaganti/vsc-devcontainer-features/cosign:latest" : {},
		"ghcr.io/rchaganti/vsc-devcontainer-features/gitsign:latest": {
			"version": "0.4.1"
		}
	},
	"remoteUser": "vscode"
}
```

As you see in the `containerEnv` section, you can specify [gitsign specific environment variables](https://docs.sigstore.dev/gitsign/usage#environment-variables). For example, if you are using public sigstore instance (can be changed using GITSIGN_FULCIO_URL), you can use either Google or Microsoft or GitHub as auth providers. So, the auth provider of your choice can be specified using the GITSIGN_CONNECTOR_ID environment variable.

Once a devcontainer is built from this definition, every `git commit` will prompt you to retrieve and enter the verification code from the auth provider of your choice. If you have not configured the default auth provider using GITSIGN_CONNECTOR_ID variable, you will be prompted to select a auth provider (assuming you are still using Sigstore public instance.)

{{< figure src="/images/gitsign-1.png">}} {{< load-photoswipe >}}

You will notice on GitHub that these commits show up as unverified. 

{{< figure src="/images/gitsign-2.png">}} 

This is because Sigstore is not a part of GitHub's trusted root and there is no way (yet!) for GitHub to verify [using Rekor, for example] that the certificate used to sign the commit was indeed valid at the time of signing. I wish/hope that GitHub implements this support soon!

This is it for today! Be back for more Sigstore goodness!

