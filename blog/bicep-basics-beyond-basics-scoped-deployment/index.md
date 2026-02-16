# Bicep Language - Beyond Basics - Scoped Deployment


{{<img src="/images/bicep.png">}}

When using ARM JSON templates, you can deploy to any of the four supported scopes -- [management groups](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-management-group?tabs=azure-cli), [tenants](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-tenant?tabs=azure-cli), [subscriptions](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-subscription?tabs=azure-cli), and [resource groups](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-resource-group?tabs=azure-cli). What you can deploy using ARM JSON templates differs between these different target scopes. For example, you can create resource groups at the subscription level only. You identify the target scope for an ARM JSON template using the `$schema` element in the template. Each scope has a specific schema. 

Bicep language too supports specifying scope within the bicep files using the `targetScope` keyword. This keyword takes one or more values -- resourceGroup, tenant, subscription, and managementGroup. 

{{< figure src="/images/targetscope.png" >}} {{< load-photoswipe >}}

When the `targetScope` value is set, Bicep knows what resources to expect within the file.

{{< figure src="/images/scopeerror.png" >}}

Here is an example of using the resource group resource in a subscription scoped Bicep file.

```
targetScope = 'subscription'

resource rg 'Microsoft.Resources/resourceGroups@2020-06-01' = {
  name: 'rgTest'
  location: 'WestUS'
}
```

This, when compiled, produces the following ARM JSON representation.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "metadata": {
    "_generator": {
      "name": "bicep",
      "version": "0.3.255.40792",
      "templateHash": "12733481855883894499"
    }
  },
  "functions": [],
  "resources": [
    {
      "type": "Microsoft.Resources/resourceGroups",
      "apiVersion": "2020-06-01",
      "name": "rgTest",
      "location": "WestUS"
    }
  ]
}
```

This is how you deploy a subscription level template using Azure CLI.

```shell
az deployment sub create --name rgDeployment --template-file .\main.bicep --location WestUS
```

You can mix scopes in a Bicep file by explicitly specifying scope property in a resource instance or module. Here is an example.

```
targetScope = 'subscription'
resource rgTest 'Microsoft.Resources/resourceGroups@2021-01-01' = {
  name: 'rgTest'
  location: 'West US'
}

module saDeploy 'modules/storageAccount.bicep' = {
  name: 'saDeploy'
  scope: resourceGroup('rgTest')
  params: {
    saCount: 3
  }
}
```

In the module specification, the scope property is set to the resource group being created in this template and that creates a dependency on the resource group as well.

This is a quick overview of scoped deployment template generation using Bicep. Hope you enjoyed reading this series of articles. This is the final article in this series and I will write more deep dive articles later. If you have suggestions for any specific content around Bicep, feel free to leave a comment.
