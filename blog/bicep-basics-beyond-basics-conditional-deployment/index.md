# Bicep Language - Beyond Basics - Conditional Deployment


{{<img src="/images/bicep.png">}}

When you go to the Azure portal and deploy a service, you may have seen a prompt where you are asked to select an existing resource group or create a new resource group. And, a few more service deployment scenarios might ask you to select between selecting an existing or creating a new storage account. 

{{< figure src="/images/biceprg.png" >}} {{< load-photoswipe >}}

What if you want to achieve this in your own ARM templates? You can. In ARM templates, [you use the condition element](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/template-tutorial-use-conditions) within resource instance definition. Bicep supports this using the `if` keyword. Here is the general syntax for defining conditional deployment of a resource instance.

```
resource Identifier 'Microsoft.Provider/Type@Version' if (condition) = {
  name: 
  location: 
  properties: {
    
  }
}
```

Unlike iterative deployments syntax, you don't have to enclose the resource instance in square brackets. Within the `if` condition, you can use the [comparison or logical operators supported in Bicep](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/bicep-operators). Here is an example of a conditional deployment.

```
@allowed([
  'new'
  'existing'
])
param newOrExisting string = 'new'

param storageAccountName string

resource stg 'Microsoft.Storage/storageAccounts@2019-06-01' = if (newOrExisting == 'new') {
  name: storageAccountName
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Cool'
  }
}
```

In the above example, the parameter `newOrExisting` is used to collect input on whether a new storage account needs to be created or not. The value of this parameter gets checked in the `if` condition within the resource instance definition. Only if the value supplied is `new`, a new storage account resource gets provisioned. The following ARM JSON is what this example produces.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "metadata": {
    "_generator": {
      "name": "bicep",
      "version": "0.3.255.40792",
      "templateHash": "839898532623422150"
    }
  },
  "parameters": {
    "newOrExisting": {
      "type": "string",
      "defaultValue": "new",
      "allowedValues": [
        "new",
        "existing"
      ]
    },
    "storageAccountName": {
      "type": "string"
    }
  },
  "functions": [],
  "resources": [
    {
      "condition": "[equals(parameters('newOrExisting'), 'new')]",
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2019-06-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[resourceGroup().location]",
      "sku": {
        "name": "Standard_LRS",
        "tier": "Standard"
      },
      "kind": "StorageV2",
      "properties": {
        "accessTier": "Hot"
      }
    }
  ]
}
```

Conditional deployments can be used with modules as well. Here is an example of a module for creating a storage account.

```
param storageAccountName string

resource sa 'Microsoft.Storage/storageAccounts@2019-04-01' = {
  name: storageAccountName
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
  	accessTier: 'Cool'
  }
}

output saId string = resourceId('Microsoft.Storage/storageAccounts', storageAccountName)
```

This module gets used in a main Bicep file as shown below. 

```
@allowed([
  'new'
  'existing'
])
param newOrExisting string = 'new'

param storageAccountName string

module stgModule 'modules/storageAccount.bicep' = if (newOrExisting == 'new') {
  name: 'storageDeploy'
  params: {
    storageAccountName: storageAccountName
  } 
}
```

The way you perform a conditional deployment of a module is same as that of a resource instance.

Can you combine iterative and conditional deployments in Bicep? Yes, of course. Here is an example.

```
@allowed([
  'new'
  'existing'
])
param newOrExisting string = 'new'

param storageAccountName string

module stgModule 'modules/storageAccount.bicep' = [for index in range(0,3): if (newOrExisting == 'new') {
  name: 'storageDeploy'
  params: {
    storageAccountName: '${storageAccountName}${index}'
  } 
}]
```

As shown in the above example, the condition must follow the iteration syntax. This is it for today. In the next part of this series, you will learn about scoped deployments. Stay tuned.
