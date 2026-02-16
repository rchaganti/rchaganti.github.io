# Azure Resource Manager - Using functions in ARM templates


{{<img src="/images/armin30/templatearchitecture.png" width="760">}}

[Expressions in ARM template language](https://ravichaganti.com/blog/azure-resource-manager-in-30-days-using-expressions-and-variables-in-arm-templates/) are a way to reduce complexity in the templates. [Using parameters and variables in ARM templates](https://ravichaganti.com/blog/azure-resource-manager-adding-parameters-to-arm-templates/) always requires the use of expressions. Parameter and variable values are combined with standard (built-in) template functions (STF) to create complex expressions to implement the business requirements and implement known configurations. Updated ARM template syntax introduced the ability to implement user-defined functions for complicated expressions and use repeatedly in your templates. In this part, you will learn more about standard template functions and learn how to implement user-defined functions. 

## Standard template functions

There are different categories of [standard template functions](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions). To work with arrays, [array functions](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-array) can be used. For example, `contains()` function can be used to check whether an array / object / string contains a value / key / substring. This function returns true if the item is found an false otherwise. Here is an example.

{{< gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2 "stfArrayContains.json" >}}

In this example, the parameter `locations` has a default value so you do not have to pass any parameter values while evaluating this template [using the method you used in the last part](https://ravichaganti.com/blog/azure-resource-manager-in-30-days-using-expressions-and-variables-in-arm-templates/#evaluating-expressions). Within the `outputs` element, there are two output values defined within which the `contains()` function is used. One function checks for a value that exists on the parameter value (therefore returns true) and the second one checks for a value that does not exist in the parameter value and therefore returns false.

 {{<img src="/images/armin30/stfArrayContainsOutput.png" width="670">}}

In the last part, you tried a few examples of STF already. At a high level, you can classify the STF into two categories -- compile-time and run-time. The examples that we have seen so far are compile-time functions. The compile-time functions evaluate before the deployment begins. The run-time functions evaluate once the deployment begins. One example of a run-time function is the `listKeys()` function. Using this template function, here is how you retrieve the storage account key for a given storage account.

```json
[
    listKeys(
        resourceId(
            'Microsoft.Storage/storageAccounts', concat(
                'sacct', '-', uniqueString(
                    resourceGroup().id
                )
            )
        ), '2019-06-01'
    ).keys[0].value
]
```

In the above example, two arguments are passed to the `listKeys()` [function](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-resource#list). First one is the `resourceId()` [function](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-resource#resourceid) to retrieve the unique ID of the storage account that you provisioned. Second parameter is the API version used to deploy the resource. The final part of the expression `.keys[0].value` is the array reference to retrieve the value of primary storage key.

Here is another example of a run-time function. This is called [reference()](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-resource#reference). This function returns the runtime state of a resource.

```json
[
    reference(
        concat('Microsoft.Storage/storageAccounts/', concat(
                'sacct', '-', uniqueString(resourceGroup().id)
            ), '2019-06-01'
        )
    ).primaryEndpoints.blob
]
```

Similar to the expression that used `listKeys()` function, this one too uses a prefix string, a unique string generated using the resource group ID, and the API version string to retrieve the storage blob URI. This blob URI is retrieved using `.primaryEndpoints.blob`. 

In the above example, `concat('sacct', '-', uniqueString(resourceGroup().id))` sub-expression is used to generate a unique name for the storage account. What if you want to use a similar expression for multiple resource names in the ARM template to ensure that your ARM template uses more known configuration? One way to do that is to repeat the expression multiple times with different prefixes as needed. The second and a better way is to create and use an user-defined functions (UDF) where you get the ability to parameterize expressions and reuse the same in your ARM templates like you use built-in functions.

## User-defined functions

With user-defined functions (UDF), you can create your own functions by combining multiple standard template functions into a complicated expression. The following syntax describes how the user-defined functions can be added to ARM templates.

{{<gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2  "userDefinedFunction.json">}}

A UDF must be a part of a namespace to avoid name conflicts with STF. All your expressions get added to the members object. You need to give your custom function a unique name within the namespace and add parameters and output as needed. Here is a quick example that wraps the above expression into a custom function.

{{<gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2  "userDefinedFunctionExample.json">}}

In the above example, one parameters -- prefix -- allows you to use the expression with varying input. The output value within the UDF is set to the transformed expression that will use the parameter and return a unique resource name. How do you use this UDF in your template? Simple, like any other built-in function in an expression.

```json
"variables": {
	"virtualNetworkAddressPrefix" : "10.0.0.0/16",
	"virtualNetworkName" : "[armin30.uniqueResourceName('vnet')]",
	"virtualNetworkSubnetName" : "[armin30.uniqueResourceName('subnet')]",
	"storageAccountName" : "[armin30.uniqueResourceName('sacct')]",
	"virtualNetworkSubnetAddressPrefix" : "10.0.1.0/24"
}
```

A UDF is accessed using the *namespace.functionName* notation with a list of comma-separated parameter values. This example assign output value from `armin30.uniqueResourceName()` function to variables. You can use the UDF directly in resource properties as well.

### Limitations of UDF

There are few limitations when using user-defined functions. 

- You cannot access parameters and variables defined in the ARM template's parameters and variables elements. You can only access parameters defined within the user-defined function and these UDF parameters cannot have any default values.
- There is no nested UDF support.
- The expressions that use reference and list* methods cannot be used within UDF.

Finally, here is the updated template for the scenario you are working on. 

{{<gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2  "d6userDefinedFuncTemplate.json">}}

You can deploy this template by clicking on the deploy to Azure button.

{{<azdeploy "https://gist.githubusercontent.com/rchaganti/d7e35878c6687da07ae5fa5dfb7d54c2/raw/1b1f190cab195fb0f7562a7ecc7d3e02886953fd/d6userDefinedFuncTemplate.json">}}

Once the deployment is complete, you can see the deployed resources in the portal or in the console if you used Azure CLI. Note the random strings with the prefixes that you specified as input to the `armin30.uniqueResourceName` UDF.

{{<img src="/images/armin30/d6templateDeploy.png" width="860">}}

## Summary

With the help of parameters, variables, expressions, and user-defined functions you get the ability to simplify the ARM template authoring process and make the templates more readable. There are many standard template functions that help you simplify the ARM template resource definitions. When you have to repeat and reuse some of the complicated expressions in an ARM template, you can wrap the expression as a user-defined function and use the UDF in the resource definition. In the next part of the series, you will learn how to use secrets in an ARM template.
