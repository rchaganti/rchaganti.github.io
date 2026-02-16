# Bicep Language - Beyond Basics - Expressions


{{<img src="/images/bicep.png">}}

Expressions are a critical part of any programming language. For a Domain-Specific Language (DSL) such as Bicep that transpiles to ARM template JSON, expressions add a great value in reducing the complexity in authoring templates. All built-in functions available within ARM JSON template language are available within Bicep as well. Using these functions and the supported language constructs, you can create some powerful expressions in Bicep that significantly reduces the complexity compared to JSON templates. In this article, you will learn about writing a few different ways of writing expressions.

## String Interpolation

If you are familiar with languages like PowerShell or Terraform HashiCorp Configuration Language (HCL), you will know that the string interpolation syntax is used in expanding a value (parameter or variable) and then concatenating it to another string. With the ARM JSON templates, the `concat()` or `format()` functions are used for this purpose. Bicep simplifies this by using the interpolation syntax.

Take a look at this example.

```
@maxLength(19)
param storageAccountName string = 'rchagantistg'

var resourcePrefix = 'hrdept'

resource sa 'Microsoft.Storage/storageAccounts@2019-06-01' = {
  name: '${resourcePrefix}${storageAccountName}'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}
```

The `name` property of the storage account resource is assigned a value using string interpolation. This results in the following ARM JSON template representation.

```json
"name": "[format('{0}{1}', variables('resourcePrefix'), parameters('storageAccountName'))]"
```

Similarly, you can combine built-in functions within these expressions. For example,

```
var storageAccountName = '${resourcePrefix}${uniqueString(resourceGroup().id)}
```

In the above example, `uniqueString()` and `resourceGroup()` are the built-in functions.

## Ternary Operator

Bicep language has unary and binary operators as well as a ternary operator. The unary and binary operators are something you must have already used in other languages and not difficult to understand. The ternary operator is something a bit special. Here is the general syntax of using ternary operator in Bicep language.

```
<condition-to-evaluate> ? <value-if-true> : <value-if-false>
```

The value from ternary operator evaluation can be assigned to a variable or a resource property directly. For example,

```
var resourcePrefix = resourceGroup().location == 'WestUS' ? 'wus' : 'us' 
```

This will result in the following variable assignment in the ARM JSON template.

```
"variables": {
    "resourcePrefix": "[if(equals(resourceGroup().location, 'WestUS'), 'wus', 'us')]"
}
```

## String Indexers

Bicep supports both string and array indexers. An indexer is simply a way to access an element from a collection of items. As you have learned earlier, Bicep supports variables an parameters of type of object. Object data type is similar to how you represent data in JSON format. For example, say you want to decide the access tier based on the target usage of the storage account. You may represent this as an object in Bicep.

```
var resourcePrefix = {
  performance : {
    accessTier: 'Hot' 
  }
  capacity : {
    accessTier: 'Cool'
  }
}
```

To use this, you can add a parameter that collects user input around target usage of the storage account.

```
param targetUsage string = 'capacity'
```

 Now, you can use the value from the parameter as a part of string indexer on the variable `resourcePrefix`.

```
properties: {
  accessTier: resourcePrefix[targetUsage].accessTier
}
```

Here is the complete Bicep file for this string indexer example.

```
param targetUsage string = 'capacity'
var resourcePrefix = {
  performance : {
    accessTier: 'Hot' 
  }
  capacity : {
    accessTier: 'Cool'
  }
}

resource sa 'Microsoft.Storage/storageAccounts@2019-06-01' = {
  name: '${resourcePrefix}${uniqueString(resourceGroup().id)}'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: resourcePrefix[targetUsage].accessTier
  }
}
```

The `accessTier` resource property gets compiled to the following representation in ARM JSON template. 

```json
"properties": {
	"accessTier": "[variables('resourcePrefix')[parameters('targetUsage')].accessTier]"
}
```

## Property Accessors

The property accessors are another variant of expressions and can be used to reference a specific property within an object in Bicep. For example, if you know the target storage usage without needing that as a parameter input, the above expression can be replaced with:

```
  properties: {
    accessTier: resourcePrefix.performance.accessTier
  }
```

This results in the following within ARM JSON template.

```json
"properties": {
	"accessTier": "[variables('resourcePrefix').performance.accessTier]"
}
```

Similar to property accessors, Bicep also supports resource accessors. For example, the resource instance name in the above example is `sa`. So, if you want to access the `id` property of the storage account resource, you can use `sa.id`. This type expression is useful within the `output` element of the Bicep file or within a child resource specification. You will learn more about this later.

This is it for today. In the next part of this series, you will learn about iterations in Bicep language and how you can use iterations with different elements within Bicep files. Stay tuned!
