# Understanding and using Azure Container Instances service - The Basics


In an earlier article, we looked at [different containerization options](/blog/2022-11-01-containerization-in-azure) in Microsoft Azure. In today's article, we shall start with Azure Container Instances (ACI) and learn the fundamentals. In a later article, we will learn how to perform multi-container applications to ACI.

### Azure Container Instances

Azure Container Instances (ACI) service offers a quick and easy way to run containers in the Microsoft Azure cloud. It is as simple as running a container locally using the Docker engine. ACI does not provide full container orchestration. ACI is great for applications that require faster startup times and hassle-free management. ACI runs inside Azure VMs and therefore provides isolation enabled by virtualization. 

Let us start by provisioning a simple container instance using a Bicep template. This is an [example from Microsoft's documentation](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-quickstart-bicep?tabs=CLI) on ACI.

```bicep
@description('Name for the container group')
param name string = 'acibicep'

@description('Location for all resources.')
param location string = resourceGroup().location

@description('Container image to deploy. Should be of the form repoName/imagename:tag for images stored in public Docker Hub, or a fully qualified URI for other registries. Images from private registries require additional registry credentials.')
param image string = 'mcr.microsoft.com/azuredocs/aci-helloworld'

@description('Port to open on the container and the public IP address.')
param port int = 80

@description('The number of CPU cores to allocate to the container.')
param cpuCores int = 1

@description('The amount of memory to allocate to the container in gigabytes.')
param memoryInGb int = 2

@description('The behavior of Azure runtime if container has stopped.')
@allowed([
  'Always'
  'Never'
  'OnFailure'
])
param restartPolicy string = 'Always'

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2021-09-01' = {
  name: name
  location: location
  properties: {
    containers: [
      {
        name: name
        properties: {
          image: image
          ports: [
            {
              port: port
              protocol: 'TCP'
            }
          ]
          resources: {
            requests: {
              cpu: cpuCores
              memoryInGB: memoryInGb
            }
          }
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: restartPolicy
    ipAddress: {
      type: 'Public'
      ports: [
        {
          port: port
          protocol: 'TCP'
        }
      ]
    }
  }
}

output containerIPv4Address string = containerGroup.properties.ipAddress.ip
```

To provision this, we can use Azure CLI commands.

```shell
 az deployment group create --template-file aci.bicep --resource-group bicep
```

Once provisioned, the template returns the public IP address of the container instance. If we browse to this IP, we shall see the following displayed in the browser.

{{< figure src="/images/aci_1.png" width="450px">}} {{< load-photoswipe >}}

Let us now look at the Bicep template's contents to understand more about ACI.

#### Container Groups

In ACI, the containers are created within a container group. The resource type used to create a container group is `Microsoft.ContainerInstance/containerGroups`. A container group is a top-level resource in ACI. A container group is simply a group of containers scheduled on the same host. Like a Kubernetes pod, all containers within the container group share the lifecycle, network, and storage.

> At the time of writing, only Linux containers are supported in a multi-container group.

A container group resource definition contains a collection of container specifications. In the example above, we specified only one container to be created within the group. The `properties` object within the container resource contains additional properties, such as the image to be pulled for creating the containers, ports to publish, and resource requests and limits.

Each container within this collection is allocated resources specified in the container definition. For example, in the above template, we allocate one CPU core and 2GB of memory to the container. This is called a resource request. We can also set a resource limit. The resource limits of a container instance must be greater than or equal to the resource request. When the resource limit property is not set in the container instance property, the container's maximum resource usage will be the same as its resource request.

> We will learn more about resource allocation in ACI in a later post.

We can specify the restart policy at the container group level. This is done using the `restartPolicy` property within the container group properties. This property has three possible values -- `Always`, `Never`, and `OnFailure` -- with `Always` being the default. Container instances are billed by the second, so using an appropriate restart policy is important. If the restart policy is set to `Never` or `OnFailure`, the containers in the container group are stopped and set to `Terminated` state once the application exits. This configuration will be useful for running serverless workloads that just perform the function and exit. For such containerized applications, setting `restartPolicy` to `Always` can be disastrous as ACI continues to restart the container even after the application exits.

What happens when we have multiple containers in a container group? We shall explore that in the next article! 

