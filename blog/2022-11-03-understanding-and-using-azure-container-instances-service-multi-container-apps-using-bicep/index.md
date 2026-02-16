# Understanding and using Azure Container Instances service - Multi-container Applications using Bicep


In the previous article, we looked at [getting started with Azure Container Instances service](https://ravichaganti.com/blog/2022-11-02-understanding-and-using-azure-container-instances-service-the-basics/), learned some basic concepts of ACI, and saw an example of provisioning a hello-world application. In this article, we shall extend this knowledge by provisioning a multi-container application to ACI using Bicep templates. You can also use a YAML method of provisioning multi-container applications to ACI. We shall look at this later.

As we learned earlier, a container group resembles a Kubernetes pod. The containers within the group share resources such as network and storage. The resource usage of containers can be controlled at the container group level. As a general rule of thumb, we should group containers with similar lifecycle and resource requirements into a container group. The multi-container groups are available for Linux containers only at the moment. Based on the region, there will be additional restrictions in terms of resource allocation.

Let us start with an example.

```bicep
@description('Name for the container group')
param name string = 'aciVoteApplication'

@description('Location for all resources.')
param location string = resourceGroup().location

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
        name: 'azure-vote-backend'
        properties: {
          image: 'mcr.microsoft.com/oss/bitnami/redis:6.0.8'
          ports: [
            {
              port: 6379
              protocol: 'TCP'
            }
          ]
          environmentVariables: [
            {
              name: 'ALLOW_EMPTY_PASSWORD'
              value: 'yes'
            }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
          }
        }
      }
      {
        name: 'azure-vote-frontend'
        properties: {
          image: 'mcr.microsoft.com/azuredocs/azure-vote-front:v2'
          ports: [
            {
              port: 80
              protocol: 'TCP'
            }
          ]
          environmentVariables: [
            {
              name: 'REDIS'
              value: 'localhost'
            }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
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
          port: 80
          protocol: 'TCP'
        }
      ]
    }
  }
}

output containerIPv4Address string = containerGroup.properties.ipAddress.ip

```

This example is like the earlier single-container ACI example. However, we are adding a second container in this multi-container group example. **Each container within an ACI group can reference the other using localhost only**. Therefore, in the example above, we are mapping the REDIS environment variable to `localhost` instead of the name of the Redis container. 

We can provision this ACI container group using the following Azure CLI command.

```shell
az deployment group create --template-file aci-mcg.bicep --resource-group bicep
```

Output from the Bicep template gives us the IP address of the container group, which can be used to access the voting application that we just provisioned to the ACI container group.

{{< figure src="/images/aci_2.png" width="450px">}} {{< load-photoswipe >}}

This is it. In a future article, we shall see how to provision applications across multiple multi-container groups and what role virtual networks play in such a scenario.

