# Bicep Language - Beyond Basics - Parameters


{{<img src="/images/bicep.png">}}

In the previous part, you learned how you can get started with Bicep language to write your first Bicep file. As you learned, `resource` keyword along with resource declaration and resource properties are the minimum required in a Bicep file. In today's article, you will see what is beyond those basics.

## Parameters

One of the goals of Infrastructure as Code (IaC) practice is to create reusable and repeatable automation for deploying your infrastructure. To make this happen, you need to parameterize your infrastructure configuration definitions. In this case, your Bicep files.

Bicep language [supports parameter declarations](https://github.com/Azure/bicep/blob/main/docs/spec/parameters.md) that get compiled into ARM template parameters.

At a minimum, this is how you specify a parameter declaration.

```
param <parameter-identifier> <parameter-type>
```

The `param` keyword is what gets used to declare parameters in Bicep. The `parameter-identifier` is what gets referenced when we need the value assigned to the parameter within any resource properties. The `parameter-type` can be any of the supported data types in Bicep. Bicep has support for several data types like every other programming language. This includes simple types such as `int`, `number`, `string`, `bool`, `null`, `error`, and `any` and complex types such as arrays and objects. You will learn about some of these types are you build more complex Bicep programs.     

So, in its simplest form, parameter specification in a Bicep file will look like the below example.

```
param myFirstParameter string
```

You can assign default values to parameters. For example,

```
param myFirstParameter string = 'Azure Bicep'
param isPrivate bool = false
```

You can also assign value from an expression as a default value as well.

```
param myFirstParameter string = resourceGroup().location
```

In Bicep, you can add parameter metadata and constraints using decorators. The general syntax for using decorated parameter declaration is as shown below.

```
@expression
param <parameter-identifier> <parameter-type>
```

### Description Decorator

The `@description` decorator is used to specify parameter description.

```
@description('This parameter is used to specify the location of the resource. Default value is WestUS')
param location string = 'WestUS'
```

### Value Decorator

The `@minValue` and `@maxValue` decorators are used to define the lower and upper bound values for an integer parameter.

```
@minValue(1)
@maxValue(10)
param numVMs int = 2
```

### Allowed Values Decorator

Similar to JSON ARM templates, Bicep language too supports constraining parameter values to a known set. This is done using `@allowed` parameter decorator.

```
@allowed([
	'WestUS'
	'WestUS2'
	'EastUS'
])
param location string = 'WestUS'
```

 `@allowed` decorator expects an array of values. This validation is case-sensitive. So, if you specify WestUs2 instead of WestUS2, `Bicep build` will fail.

```
PS C:\sandbox> bicep build .\main.bicep
C:\sandbox\main.bicep(20,25) : Error BCP027: The parameter expects a default value of type "'EastUS' | 'WestUS' | 'WestUS2'" but provided value is of type "'WestUs2'".
```

### Length Decorator

Using the `@minLength` and `@maxLength` decorator, you can constrain the length of string and array data type parameter values.

```
@minLength(3)
@maxLength(24)
param storageAccountName string

@minLength(4)
@maxLength(6)
param vmNames string[]
```

### Secure Decorator

The `@secure` decorator specifies that the parameter is a secure string or secure object. When a parameter is marked as secure, its value does not get stored in the deployment history.

```
@secure()
param administratorPasswrod string
```

### Metadata Decorator

The `@metadata` decorator can be used to specify any other custom properties that describe the parameter or its significance. 

```
@metadata({
	addedOn: '2021-04-11'
})
```

You can combine multiple decorators for any given parameter in the Bicep file. Here is an example with declaration with parameter decorators.

```
@description('Specifies the name of the storage account. Length must be between 3 and 24 characters and all characters in lower-case.')
@metadata({

})
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('Specifies the storage account tier. Default value is Hot.')
@allowed([
	'Hot'
	'Cool'
])
param accessTier string = 'Hot'

@description('Specifies the location of the new storage account. Default location is WestUS2.')
@allowed([
	'WestUS'
	'WestUS2'
	'EastUS'
])
param location string = 'WestUS2'

resource sa 'Microsoft.Storage/storageAccounts@2019-06-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: accessTier
  }
}
```

Here is how the generated template looks once you compile this using `bicep build` command.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string",
      "maxLength": 24,
      "minLength": 3,
      "metadata": {
        "addedOn": "2021-04-11",
        "description": "Specifies the name of the storage account. Length must be between 3 and 24 characters and all characters in lower-case."
      }
    },
    "accessTier": {
      "type": "string",
      "defaultValue": "Hot",
      "allowedValues": [
        "Hot",
        "Cold",
        "Archive"
      ],
      "metadata": {
        "description": "Specifies the storage account tier. Default value is Hot."
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "WestUS2",
      "allowedValues": [
        "WestUS",
        "WestUS2",
        "EastUS"
      ],
      "metadata": {
        "description": "Specifies the location of the new storage account. Default location is WestUS2."
      }
    }
  },
  "functions": [],
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2019-06-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2",
      "properties": {
        "accessTier": "Hot"
      }
    }
  ],
  "metadata": {
    "_generator": {
      "name": "bicep",
      "version": "0.3.126.58533",
      "templateHash": "10010485068534492010"
    }
  }
}
```

Notice in the `storageAccountName` parameter definition how the contents of metadata decorator get rolled into parameter's metadata attribute in the JSON template. 

Alright. This is all about using parameters in Bicep. You will gain some more knowledge beyond basics in the next post. Stay tuned. 
