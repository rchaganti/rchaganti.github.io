# Publish container images to Azure Container Registry


In the [previous articles in this series](https://ravichaganti.com/series/container-images/), we looked at how to build container images and understand the OCI image specification that governs how the images are built and dealt with. Once the images are built, we may want to push them to a central repository for sharing with a larger community or a private container registry such as the Azure Container Registry (ACR).

In today's article, we shall learn how to create an Azure Container Registry, push an image, and consume it back in the local environment. Let's start!

### Azure Container Registry

ACR is a managed registry service based on open-source Docker Registry 2.0. Within our Azure subscription, we can create an instance of the ACR resource and use it for publishing the container images. The following Bicep template can be used to provision ACR.

```bicep
@minLength(5)
@maxLength(50)
@description('Specify a globally unique name')
param acrName string

@description('Specify a location where the ACR must be created')
param location string = resourceGroup().location

@description('Specify the pricing tier of for ACR')
param acrSku string = 'Basic'

resource acrResource 'Microsoft.ContainerRegistry/registries@2021-06-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: false
  }
}

@description('Login server information')
output loginServer string = acrResource.properties.loginServer
```

We can provision this template using Azure PowerShell or Azure CLI.

```shell
az deployment group create --resource-group bicep --template-file acr.bicep --parameters acrName='acrbicepex'
```

This Bicep template returns the login server FQDN as the output.

```json
"outputs": {
  "loginServer": {
    "type": "String",
    "value": "acrbicepex.azurecr.io"
  }
}
```

Once an instance of ACR is available within the subscription, we can start pushing images to this registry and eventually pull images from this private registry. Optionally, we can import Docker Hub images to ACR.

#### Pushing images to ACR

To try pushing images to ACR, let us first pull an image using docker CLI. 

```shell
docker pull ravikanth/bicep
```

We must re-tag (alias) the pulled image to indicate the remote Azure Container Registry we provisioned.

```shell
docker tag ravikanth/bicep acrbicepex.azurecr.io/bicep:latest
```

Before we can push to the ACR, we need to authenticate. For this, we need the Azure CLI.

```shell
az login
az acr login --name acrbicepex.azurecr.io
```

We are now ready to push the image. This can be done using the `docker push` command.

```shell
 docker push acrbicepex.azurecr.io/bicep:latest
```

#### Pulling an image from ACR

Pulling an image from ACR is the same as pulling one from the Docker Hub. We must refer to the right image location. And, since the ACR instance we created is a private registry, we must ensure that we authenticate to it before trying to pull an image.

```shell
docker pull acrbicepex.azurecr.io/bicep:latest
```

#### Importing Docker Hub images to ACR

```
az acr import \
  --name acrbicepex \
  --source docker.io/library/ravikanth/hello-cloud:latest \
  --image hello-cloud:latest
```

In a later post, we shall see how ACR can be used with other container services in Azure.

