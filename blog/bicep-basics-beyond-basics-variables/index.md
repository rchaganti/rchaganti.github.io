# Bicep Language - Beyond Basics - Variables


{{<img src="/images/bicep.png">}}

This part of the series will take you beyond Bicep language basics by showing you how to add variables to your Bicep files. If you have worked on ARM JSON templates, you know that variables exist there as well. The primary intention of using variables in either ARM JSON templates or Bicep language is to bring in a balance between [free-form vs fixed configurations](/blog/azure-resource-manager-in-30-days-using-expressions-and-variables-in-arm-templates/#free-form-vs-known-configuration). 

For example, as you learned in [last part of this series](/blog/bicep-basics-beyond-basics-parameters/), if you parameterize all resource properties, you will end up with a huge list of input parameters that need to be provided while compiling the Bicep file to ARM JSON template. While this provides flexibility, it may not always have desired outcome. If you want to enforce some standard resource property values across deployments, you must either hard-code those values or constrain what values can be specified if you are collecting the value from a parameter. 

> Azure Policy can help with some of what I just described and is a different discussion altogether. 

Having too many parameters is not desired and hard-coding values in a template makes it difficult to maintain especially when the same value is used for multiple resource instances in a template.

This is where variables are used. The basic syntax for declaring variables in Bicep is:

```
var <variable-name> = <variable-value>
```

The `var` keyword is used to declare a variable. *Variables in Bicep should be assigned at the time of declaration and cannot be reassigned.* The name of the variable cannot be same as that of a `param`, `resource`, or `output` identifiers. Variable declaration in Bicep does not need type specification like parameters. The data type of a variable gets inferred from the value that you assign. 

Here is an example that uses a variable in Bicep.

```
@description('Specifies the name of the storage account. Length must be between 3 and 24 characters and all characters in lower-case.')
@metadata({
  addedOn: '2021-04-11'
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

var location = resourceGroup().location

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

In this example, you will see that the location is now a variable and not collected as input from parameters. The value of the location variable is assigned by evaluating the expression `resourceGroup().location`. Now, imagine if you have multiple resources that you want to deploy as a part of the template. Instead of specifying the hard-coded location resource property value multiple times, you can simply refer to the variable that you defined.

This is a quick one today but as you learn more beyond the basics in a later part of this [series](/series/azure-bicep), you will see how  variables can be assigned values from expressions in Bicep language and how that is a powerful way to reduce the complexity of template authoring in Bicep language. Stay tuned!
