# Introduction to Azure Bicep


{{<img src="/images/bicep.png">}}

As I started preparing slides and demos for [my session on Azure Bicep at the Global Azure Bootcamp 2021](/speaking-at-global-azure-bootcamp-india-2021), I made a bunch of notes. As a part of this [new series of articles on Azure Bicep](/series/azure-bicep), I will start sharing those notes here.

[Azure Bicep](https://github.com/azure/bicep) is a new Domain-Specific Language (DSL) for declaratively deploying Azure resources. Bicep is not a general purpose programming language but a transparent abstraction for Azure Resource Manager (ARM) Templates. This ensures that the properties that are valid in ARM templates are valid in Bicep as well. Azure Bicep acts as a transpiler for generating ARM templates from Bicep files. But, what is wrong with ARM templates?

### Why Bicep?

ARM templates are JSON documents that offer a declarative way of defining your Azure infrastructure and configuration. These templates specify your intent to provision a service without the need to express how that can be done. [ARM template language](https://docs.microsoft.com/en-us/azure/templates/) offers built-in functions and other language constructs such as loops and that help you create more dynamic infrastructure definitions. However, the JSON syntax for ARM templates makes these documents quite verbose and restricts the extensibility since you have to play within what is supported within JSON data representation. As the complexity of the infrastructure grows, your ARM template becomes almost unreadable and maintain. You can, of course, decompose the template into multiple linked templates and but linked templates too have their own limitations. You can use linked templates only from a HTTP location or a Azure blob store. There are alternatives to ARM template deployment. Especially, [HashiCorp Terraform](https://www.terraform.io/) or [Pulumi SDK](https://www.pulumi.com/product/#sdk). These tools do not use ARM templates but provide alternate ways to define your infrastructure as code. 

Terraform provides a declarative way to define Azure infrastructure using the HashiCorp Configuration Language (HCL). Being a [language on its own](https://www.terraform.io/docs/language/index.html), HCL supports variables, data types, arithmetic and logical operations, functions, and expressions. With the help of HCL, terraform delivers syntax that is concise and simple to write. The only downside of Terraform is the day zero support for new resources and resource providers.

Pulumi, on the other hand, provides an SDK that you can use in your favorite language and define your infrastructure as imperative scripts or programs. I have not spent much time on Pulumi because of my non-developer background but Pulumi claims that they can provide day zero support for any new resource or resource provider. 

Both Terraform and Pulumi support multiple cloud deployments. These are not tools that are specifically written for Microsoft Azure. Microsoft could have chosen to adapt one of these but they instead chose to write their own language that makes authoring ARM templates easier. This is an important step since there are many customers who have heavily invested in ARM templates. If Microsoft moves away from ARM templates, this section of customers won't be happy. Creating a transpiler that provides simple and concise declarative way of generating ARM templates will help maintain the backward compatibility while ensuring that those who are just starting with Microsoft Azure do not get freaked out looking at ARM templates. 

With Bicep, you don't have to worry about learning ARM template language and author thousands of lines of JSON documents. You simply write a Bicep file that declaratively defines the Azure infrastructure, transpile it into an ARM template, and finally use the methods that are already known to you to provision the generated ARM template. Simple. But, how simple is Bicep language? Let us look at an example.

```
param storageAccountName string
param accessTier string = 'Hot'
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

The 26 lines in the above example is what you need to create a reusable Bicep file that can generate ARM template to provision an Azure storage account. This, when compiled, produces the following ARM template. 

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string"
    },
    "accessTier": {
      "type": "string",
      "defaultValue": "Hot"
    },
    "location": {
      "type": "string",
      "defaultValue": "WestUS2"
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
      "templateHash": "6796585337478950038"
    }
  }
}
```

The generated template is almost twice the size of the Bicep file. This ARM template can be deployed by supplying the necessary parameter values as another JSON or at the command line when using Azure CLI or Azure PowerShell. 

This is a trivial example but consider the flexibility you will have with a language of its own to generate the ARM templates. You don't have to worry about the JSON syntax gotchas or worry about how you can effectively decompose larger ARM templates into smaller linked templates. Bicep provides not just the constructs of a typical programming language but also a way to compose your Azure infrastructure definitions as smaller reusable modules.

With Bicep being a transpiler for ARM templates, your existing CI and CD pipelines don't have to change. All you may have to do is add an additional `bicep build` step that brings the ARM template into the pipeline.

Alright. This is a quick overview of what Bicep is and why you may want to look at it. In the next part of this series, you will see how you can get started with Bicep. Stay tuned.
