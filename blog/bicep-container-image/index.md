# Bicep Container Image


{{<img src="/images/bicep.png">}}

While using the [Azure CLI container image](https://hub.docker.com/_/microsoft-azure-cli) for one of my side projects, I started looking for an image that contains Bicep CLI as well. I found [Mikolaj Mackowiak's](https://github.com/miqm) [Bicep-cli image](https://hub.docker.com/r/miqm/bicep-cli). This was what I really needed and it includes both Azure CLI and Bicep CLI. However, just as a fun side project, I wanted to publish my own image as well.

I started with Alpine base image and started building everything needed for Azure CLI and Bicep CLI. However, as I started building all dependencies, the size of this image grew from 5MB to ~1GB. This is when I switched the base layer to Microsoft's Azure CLI image and just added Bicep as a layer. 

Here is how my Dockerfile looks now.

```dockerfile
FROM mcr.microsoft.com/azure-cli:latest
LABEL maintainer="ravikanth@ravichaganti.com"

RUN curl -Lo bicep.bin https://github.com/Azure/bicep/releases/latest/download/bicep-linux-musl-x64 \
 && chmod +x ./bicep.bin \
 && mv ./bicep.bin /usr/local/bin/bicep
```

Update (05/21) - Optimized the Dockerfile to reduce number of image layers.

This is available in my [Bicephelpers GitHub repository](https://github.com/rchaganti/bicephelpers) and I have a [GitHub action that builds this image](https://github.com/rchaganti/bicephelpers/blob/main/.github/workflows/buildDockerImage.yml) and pushes to Docker Hub. 

You can pull this image using the following command line.

```shell
docker image pull ravikanth/bicep:latest
```

{{< figure src="/images/bicep.gif" >}} {{< load-photoswipe >}}

I will continue to update this whenever Azure CLI or Bicep CLI get updated.
