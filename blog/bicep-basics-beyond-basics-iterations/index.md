# Bicep Language - Beyond Basics - Iterations


{{<img src="/images/bicep.png">}}

When working ARM templates, you may have come across a situation where you want to provision multiple instances of a resource with similar configuration. For example, multiple storage accounts or virtual machines or multiple data disks attached to a virtual machine. In the JSON template language, the `copy` element is used for this purpose. Bicep language has a few different ways you can achieve this at different levels like resources, resource properties, and outputs. Variable iterations [are not available yet](https://github.com/Azure/bicep/issues/1814) and mostly coming as a part of [0.4 release](https://github.com/Azure/bicep/projects/7#card-56641753) which is due by [May 25th 2021](https://github.com/Azure/bicep/milestone/7).

In this part of the [series](/series/azure-bicep) of articles on Bicep language, you will learn about using iterations in your Bicep files. There are three ways to implement iterations in Bicep.

## Using a loop index

Using an iteration or loop index is the simplest way to create multiple instances of a resource or iterating resource properties. A loop index syntax in Bicep is similar to what you may have seen in other languages.

```
[for <index> in range(<start>, <stop>): {
  <resource-instance> or <resource-properties>
}]
```

As you will see next, all you need to do is just assign this either to a resource declaration or resource property.

### Resource iteration

Here is the general syntax of implementing a index based iteration in Bicep for resources.

```
resource <resource-symbolic-name> '<resource-type>@<api-version>' = [for <index> in range(<start>, <stop>): {
  <resource-instance>
}]
```

This should not be difficult to understand since you already know how to declare a resource instance. To add an iteration, all you need to do is add the iterator. In this case a loop index. The `range()` function here helps in creating a collection of integers from start integer to stop integer. Stop index is excluded. Here is a simple example around creating multiple storage accounts using loop index.

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

In the previous article on expressions in Bicep language, you learned how to use interpolation. The same technique can be used here to access the value stored in `index` -- `${index}`.

This is how the resource declaration gets tranpiled into ARM JSON.

```json
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
  ]
```

### Resource property iteration

The general syntax for using loop indexes for resource properties is similar to that of resources.

```
<property-name>: [for <index> in range(<start>, <stop>): {
  <resource-properties>
}]
```

Here is a quick example of iterating on resource properties. This example demonstrates creating multiple subnets in a Azure Virtual Network.

```
var numSubnets = 3
var subnetPrefix = [
  '10.10.12.0/24'
  '10.10.13.0/24'
]

resource vnet 'Microsoft.Network/virtualNetworks@2018-11-01' = {
  name: 'vnet'
  location: resourceGroup().location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.10.10.0/16'
      ]
    }
    subnets: [for sIndex in range(0, numSubnets): {
      name: 'subnet${sIndex}'
      properties: {
        addressPrefix: subnetPrefix[sIndex]
      }
    }]
  }
}
```

The way this example is built is very similar to how you create multiple storage account instances. For the number of subnets, the `numSubnets` variable is used and the `subnetPrefix` array has the prefixes used for each subnet. Using array indexer, you can retrieve the prefix from the `subnetPrefix` array.

Those of you with a sharp eye must have noticed that the `numSubnets` is set to 3 but there are only two elements in the `subnetPrefix` array. For Bicep, this does not matter. You must make sure that these values are consistent.

## Iterating over a collection

The second method of creating resource or resource property iterations is to iterate over a collection. Here is the general syntax for this.

```
[for <item> in <collection>: {
  <resource-instance> or <resource-properties>
}]
```

Once again, this syntax can be used with either resource declaration or resource properties.

### Resource Iteration

The general syntax for iterating over a collection to create multiple resource instances is:

```
resource <resource-symbolic-name> '<resource-type>@<api-version>' = [for <item> in <collection>: {
  <resource-instance>
}]
```

Here is a full example of creating multiple storage accounts using this method.

```
var saNames = [
  'sqllondon'
  'sqlchennai'
  'archiveseattle'
]

resource sa 'Microsoft.Storage/storageAccounts@2019-04-01' = [for sName in saNames: {
  name: concat(sName, uniqueString(resourceGroup().id))
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

In this example, the variable `saNames` contains a list of storage account names. The iteration in this example loops over the elements in `saNames` array and uses these values as a part of the storage account name. Here is how the resource declaration gets compiled into ARM JSON representation.

```json
"resources": [
	{
		"copy": {
			"name": "sa",
			"count": "[length(variables('saNames'))]"
         },
		"type": "Microsoft.Storage/storageAccounts",
		"apiVersion": "2019-04-01",
		"name": "[concat(variables('saNames')[copyIndex()], uniqueString(resourceGroup().id))]",
		"location": "[resourceGroup().location]",
		"sku": {
			"name": "Standard_LRS"
		},
		"kind": "StorageV2",
		"properties": {
			"accessTier": "Hot"
		}
	}
]
```

### Resource property iteration

Here is the general syntax for using collection iteration with resource properties.

```
<property-name>: [for <item> in <collection>: {
  <resource-properties>
}]
```

The previous example around the storage account creation can be modified to add iteration for the `accessTier` property.

```
var sAccounts = [
  {
    name: 'sqllondon'
    accessTier: 'Cool'
  }
  {
    name: 'sqlchennai'
    accessTier: 'Hot'
  }
  {
    name: 'archiveseattle'
    accessTier: 'Cool'
  }
] 

resource sa 'Microsoft.Storage/storageAccounts@2019-04-01' = [for sAcct in sAccounts: {
  name: concat(sAcct.name, uniqueString(resourceGroup().id))
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: sAcct.accessTier
  }
}]
```

In this example, the `sAccounts` variable is a collection of objects. Each object in this collection has two properties -- `name` and `accessTier`. We use the same collection for both storage account instance and the `accessTier` resource property. Within the iteration, you can access the properties using an accessor. `sAcct` represents the item from `sAccounts` collection in the current iteration and `sAcct.name` and `sAcct.accessTier` represent the `name` and `accessTier` values associated with the current item in the collection.

## Iterating over elements in an array

The final method to use loops in Bicep files is to iterate over elements in an array. In the first method, you looked using the index value from the iteration. In the second method where we used an array of storage account names, we used the element value within each iteration. In this third method, you can access both index and element value. The general syntax for this type of iteration is:

```
[for (<item>, <index>) in <collection>: {
  <resource-instance> or <resource-properties>
}]
```

### Resource Iteration

The syntax for resource iteration using this third method is:

```
resource <resource-symbolic-name> '<resource-type>@<api-version>' = [for (<item>, <index>) in <collection>: {
  <resource-instance>
}]
```

Using this method, you can simplify the above example where you created multiple storage accounts and configured a different access tier for each account.

```
var sAccounts = [
  {
    name: 'sqllondon'
    accessTier: 'Cool'
  }
  {
    name: 'sqlchennai'
    accessTier: 'Hot'
  }
  {
    name: 'archiveseattle'
    accessTier: 'Cool'
  }
] 

resource sa 'Microsoft.Storage/storageAccounts@2019-04-01' = [for (sItem, sIndex) in sAccounts: {
  name: 'stg${sItem.name}${sIndex}'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: sItem.accessTier
  }
}]
```

In this method of iteration, `sItem` represents the element at the current index and `sIndex` is the integer representing the current iteration. You can build this and see how it gets transpiled to ARM JSON representation.

### Resource property Iteration

The syntax for resource property iteration in this method is:

```
<property-name>: [for (<item>, <index>) in <collection>: {
  <resource-properties>
}]
```

Here is an example of using this method to create multiple subnets in a Azure virtual network.

```
var subnetPrefix = [
  '10.10.12.0/24'
  '10.10.13.0/24'
]

resource vnet 'Microsoft.Network/virtualNetworks@2018-11-01' = {
  name: 'vnet'
  location: resourceGroup().location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.10.10.0/16'
      ]
    }
    subnets: [for (sItem, sIndex) in subnetPrefix: {
      name: 'subnet${sIndex}'
      properties: {
        addressPrefix: sItem
      }
    }]
  }
}
```

When you choose one of these methods depends on what type of configuration you want to perform. As you start building more complex Bicep files, you will start identifying places to use one of the three methods that you just learned. 

## Serial deployment of resources

By default, creating multiple resource instances happens in parallel. However, you can configure to do this serially as well. This is where you use the the `@batchSize` decorator in a resource declaration. This decorator takes an integer as input which represent the number of parallel deployments to perform. Here is a quick example:

```
param saCount int = 20

@batchSize(3)
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

When you add a `batchSize` decorator, the resulting ARM representation sets the `mode` property of the `copy` element to serial.

```json
"resources": [
    {
      "copy": {
        "name": "sa",
        "count": "[length(range(0, parameters('saCount')))]",
        "mode": "serial",
        "batchSize": 3
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
]
```

So far you have learned about using iteration for resource creation and resource properties. This is it for today. In the next part of this series, you will learn about outputs in Bicep files and how iterations can be used with outputs. Stay tuned.
