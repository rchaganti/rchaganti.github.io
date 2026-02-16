# Bicep Language - Beyond Basics - Output


{{<img src="/images/bicep.png">}}

You use outputs in ARM JSON templates to return value(s) from the deployment. Returning output from a template is not mandatory, but it is useful in scenarios such as deploying templates through a CI/CD pipeline or creating templates as reusable modules. To support this, Bicep language has an `outputs` element.

## Output

Syntax for adding an `output` element to Bicep is:

```
output <output-identifier> <output-type> = <literal> or <expression>
```

You can add any number of outputs in a Bicep file. The output-identifier, along with the literal value or the value from the expression, will be returned after a successful deployment. As you will learn in the next part of this series, Bicep modules make use of outputs from a template deployment. The type of data that you return from output can be an integer, a string, an array, an object, or a boolean value. 

Here is a simple example that returns the storage account Id once the template deployment is complete.

```
resource sa 'Microsoft.Storage/storageAccounts@2019-04-01' = {
  name: 'stg${uniqueString(resourceGroup().id)}'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
  	accessTier: 'Hot'
  }
}

output sid string = sa.id
```

You can use the resource accessor to assign the value of storage account resource Id to the output. In this example, `sa` is the resource instance name within the deployment. So, sa.id will retrieve the resource Id of the storage account.

You can deploy this template using `az deployment group create --template-file=C:\sandbox\bicep\main.bicep --resource-group bicep`. The output from this command will include an outputs object.

```json
"outputs": {
      "sid": {
        "type": "String",
        "value": "/subscriptions/5073fd4c-3a1b-4559-8371-21e034f70820/resourceGroups/bicep/providers/Microsoft.Storage/storageAccounts/stg6axmw2qxc2xnq"
      }
    }
```

## Output Iterations

Similar to resources and resource properties, you can use iterations with `output` as well. There are three types of iterations that you learned about in the previous part of this series. The syntax for using any of those three methods is similar for outputs as well.

```
output <output-identifier> <output-type> = [for index in range(<start>, <stop>):
	<output-properties>
]
```

 In the last part of this series, you learned how to use loop index based iteration. The same example can be extended to add output of all storage account resource Ids. Here is how you do that.

```
param saCount int = 3

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

output saId array = [for i in range(0, saCount): resourceId('Microsoft.Storage/storageAccounts', '${i}stg${uniqueString(resourceGroup().id)}')]
```

In the ARM template deployment output, you should see:

```
"outputs": {
      "saId": {
        "type": "Array",
        "value": [
          "/subscriptions/5073fd4c-8371-21e034f70820/resourceGroups/bicep/providers/Microsoft.Storage/storageAccounts/0stg6axmw2qxc2xnq",
          "/subscriptions/5073fd4c-8371-21e034f70820/resourceGroups/bicep/providers/Microsoft.Storage/storageAccounts/1stg6axmw2qxc2xnq",
          "/subscriptions/5073fd4c-8371-21e034f70820/resourceGroups/bicep/providers/Microsoft.Storage/storageAccounts/2stg6axmw2qxc2xnq"
        ]
      }
    }
```

Within the output array, if you want to return multiple properties, you can simply specify that using a property name.

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

output storageDetail array = [for (sItem, sIndex) in sAccounts: {
  id: reference('stg${sItem.name}${sIndex}', '2019-04-01', 'Full').resourceId
  accessTier: reference('stg${sItem.name}${sIndex}').accessTier
}]
```

This deployment will return the output similar to:

```json
"outputs": {
      "storageDetail": {
        "type": "Array",
        "value": [
          {
            "accessTier": "Cool",
            "id": "Microsoft.Storage/storageAccounts/stgsqllondon0"
          },
          {
            "accessTier": "Hot",
            "id": "Microsoft.Storage/storageAccounts/stgsqlchennai1"
          },
          {
            "accessTier": "Cool",
            "id": "Microsoft.Storage/storageAccounts/stgarchiveseattle2"
          }
        ]
      }
```

Alright. This is it for today. In the next part of this series, you will learn about authoring reusable modules in Bicep. Stay tuned!
