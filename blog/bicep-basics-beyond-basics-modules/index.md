# Bicep Language - Beyond Basics - Modules


{{<img src="/images/bicep.png">}}

Reusability and repeatability are two basics requirements when you want to implement Infrastructure as Code (IaC) practices. You looked at how parameters can be added to Bicep files to make those programs reusable. This is the first step towards modularizing your programs. With the ARM JSON templates, you might have used linked templates that are meant to provide similar functionality. Bicep has support for modularity and helps simplify complex configurations into smaller reusable modules.

In this part of the [series of articles on Bicep language](/series/azure-bicep), you will learn about modularizing Bicep files. You already have the necessary knowledge, [parameterizing Bicep files](/blog/bicep-basics-beyond-basics-parameters/), to start this learning. 

Here is an example from one of the previous parts.

```
param saCount int = 2

resource sa 'Microsoft.Storage/storageAccounts@2019-04-01' = [for index in range(0, saCount): {
  name: '${index}stg${uniqueString(resourceGroup().id)}'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
  	accessTier: 'Hot'
  }
}]
```

Add some output to this using what you learned in the [previous part about using output](/blog/bicep-basics-beyond-basics-output/) in Bicep. 

```
output saId array = [for i in range(0, saCount): resourceId('Microsoft.Storage/storageAccounts', '${i}stg${uniqueString(resourceGroup().id)}')]
```

Now, save this as storageAccount.bicep. Congratulations. You just created a Bicep module! Now, to the important part. How do you consume this in another Bicep file?

## Consuming a module

The `module` keyword helps in consuming a Bicep module. The syntax for consuming a Bicep module is:

```
module <module-identifier> '<path-to-module-file>' = {
	name: <name-to-be-used-for-nested-deployment>
	params: {
		<param-name>: <param-value>
	}
}
```

module-identifier, similar to a resource identifier, will be used to reference the module object in other parts of the Bicep file as needed. The `name` property within the module will be used as a name for the nested deployment within the generated ARM template. This property is mandatory. And, then the `params` property will be used to supply a list of parameter values to the module.

Here is how you can consume the `storageAccount` module you created earlier.

```
module stgModule './storageAccount.bicep' = {
  name: 'storageDeploy'
  params: {
    saCount: 3
  }
}

output stgResourceId array = stgModule.outputs.saId
```

Save this example as main.bicep. Note that it is not necessary that you always store the module files at the same level as the main Bicep file. You can store all modules in a different folder and use that relative path. For example:

```
module stgModule './modules/storageAccount.bicep' = {
  name: 'storageDeploy'
  params: {
    saCount: 3
  }
}

output stgResourceId array = stgModule.outputs.saId
```

Also, make sure you use the Unix type path. Bicep does not support Windows backslash for cross-platform compatibility reasons. You can compile the main.bicep using `bicep build`. Here is how the generated ARM JSON will look like.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "metadata": {
    "_generator": {
      "name": "bicep",
      "version": "0.3.255.40792",
      "templateHash": "11285400335859160700"
    }
  },
  "functions": [],
  "resources": [
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2019-10-01",
      "name": "storageDeploy",
      "properties": {
        "expressionEvaluationOptions": {
          "scope": "inner"
        },
        "mode": "Incremental",
        "parameters": {
          "saCount": {
            "value": 3
          }
        },
        "template": {
          "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
          "contentVersion": "1.0.0.0",
          "metadata": {
            "_generator": {
              "name": "bicep",
              "version": "0.3.255.40792",
              "templateHash": "7655284844148565855"
            }
          },
          "parameters": {
            "saCount": {
              "type": "int",
              "defaultValue": 2
            }
          },
          "functions": [],
          "resources": [
            {
              "copy": {
                "name": "sa",
                "count": "[length(range(0, parameters('saCount')))]"
              },
              "type": "Microsoft.Storage/storageAccounts",
              "apiVersion": "2019-04-01",
              "name": "[format('{0}stg{1}', range(0, parameters('saCount'))[copyIndex()], uniqueString(resourceGroup().id))]",
              "location": "[resourceGroup().location]",
              "sku": {
                "name": "Standard_LRS"
              },
              "kind": "StorageV2",
              "properties": {
                "accessTier": "Hot"
              }
            }
          ],
          "outputs": {
            "saId": {
              "type": "array",
              "copy": {
                "count": "[length(range(0, parameters('saCount')))]",
                "input": "[resourceId('Microsoft.Storage/storageAccounts', format('{0}stg{1}', range(0, parameters('saCount'))[copyIndex()], uniqueString(resourceGroup().id)))]"
              }
            }
          }
        }
      }
    }
  ],
  "outputs": {
    "stgResourceId": {
      "type": "array",
      "value": "[reference(resourceId('Microsoft.Resources/deployments', 'storageDeploy'), '2019-10-01').outputs.saId.value]"
    }
  }
}
```

## Module iterations

You can use modules with iterations as well. It is straight forward to do this based on what you learned in [the earlier part about iterations in Bicep](/blog/bicep-basics-beyond-basics-iterations/). 

```
module <module-identifier> '<path-to-module-file>' = [for <item> in <collection>: {
  name: <name-to-be-used-for-nested-deployment>
  params: {
    <parameter-name>: <parameter-value>
  }
}]
```

You can quickly build an example that uses module iteration. Start with a module first. This module will be used to create a virtual network and a subnet within that.

```
param vNetName string
param addressPrefix string
param subnetPrefix string

resource vnet 'Microsoft.Network/virtualNetworks@2018-11-01' = {
  name: vNetName
  location: resourceGroup().location
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressPrefix
      ]
    }
    subnets: [
      {
        name: '${vNetName}-subnet'
        properties: {
          addressPrefix: subnetPrefix
        }
      }
    ]
  }
}

output vnetId string = resourceId('Microsoft.Network/virtualNetworks', vNetName)
```

Save this as vnet.bicep.

To consume this, create a main bicep file.

```
var vNet = [
  {
    vNetName: 'testNet'
    addressPrefix: '10.0.0.0/25'
    subnetPrefix: '10.0.0.0/27'
  }
  {
    vNetName: 'devNet'
    addressPrefix: '10.0.0.0/25'
    subnetPrefix: '10.0.0.32/27'
  }
  {
    vNetName: 'prodNet'
    addressPrefix: '10.0.0.0/25'
    subnetPrefix: '10.0.0.64/27'
  }
]

module net 'modules/vnet.bicep' = [for network in vNet: {
  name: '${network.vNetName}deployment'
  params: {
    vNetName: network.vNetName
    addressPrefix: network.addressPrefix
    subnetPrefix: network.subnetPrefix
  }
}]

output vNetId array = [for network in vNet: {
  id: resourceId('Microsoft.Network/virtualNetworks',network.vNetName)
}]
```

The variable `vNet` will hold a collection of virtual networks that need to be created. Using the collection iteration along with module declaration, you can supply the necessary parameter values needed for the module parameters.

As you start building complex templates, you will find modules very helpful. This is it for today. You will learn about conditional deployments in the next part of this series. 


