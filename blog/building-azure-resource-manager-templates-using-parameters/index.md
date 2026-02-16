# Building Azure Resource Manager Templates – Using Parameters


In the earlier parts of this [series][1], we briefly looked at [different methods of deploying ARM templates][2] and then [basics of ARM template language][3]. Starting today&#8217;s article, we will see our leaning in action. To get going with our leaning, we will start building the ARM template for the following scenario.

{{<figure src="/images/armtemplate3-1.png">}}

We will incrementally build this scenario by learning different aspects of ARM template language. We won&#8217;t be covering all resource types in Azure but we will cover every aspect of the ARM template language and functions and expressions used in the template language. We will also review best practices in building these ARM templates as we proceed forward in this series.

So, what is there in the scenario that we are building?

  1. A resource group to host different resource types in our scenario.
  2. A storage account for hosting the VM OS and data disks.
  3. A virtual network for VM network connectivity.
  4. A public IP to connect to this deployment from external world.
  5. A load balancer that has the RDP and PowerShell remoting endpoints for the non-DC virtual machines in this scenario.
  6. Network interfaces for the AD DC and other VMs in our scenario.
  7. An Active Directory Domain Controller VM with DNS services running in it.
  8. Up to three VMs (depending on the environment type) that join the AD DS.

This scenario is not a complex deployment by any means but can be useful in building an ARM template that uses most or all of the artifacts in the template language. We will do this over a series of articles. But, at the end of each part, we will have a deploy-able template that we will test.

Let us see how we can go about this.

#### Create a Resource Group

Like I mentioned earlier, we need a resource group for deploying the components in our scenario using ARM templates. So, let us create one. You can do this using various means but I will stick to [Azure PowerShell][5] for this.

Note: I will be using Azure PowerShell 1.0 cmdlets. You can get these using either PackageManagement cmdlets or Web PI or just get the <a href="https://github.com/Azure/azure-powershell/releases">MSI package from Github</a>.

```powershell
Login-AzureRmAccount
New-AzureRmResourceGroup -Name MyARMDemo -Location 'West US'
```

Note: An Azure resource group can contain <a href="https://azure.microsoft.com/en-in/documentation/articles/resource-group-overview/#resource-groups">resources from different regions</a>.


#### Adding Parameters

Now that we have a resource group created, let us start creating our ARM template for the scenario. First thing we need is a storage account for our resources. Storage accounts in Azure have a couple of properties &#8212; _name, type,_ and _location_ &#8212; that we can configure. We should ideally collect the values for _name_ and _type_ from the user deploying this template. This is where we will use parameters in the ARM template language. Let us first start by defining that.

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "storageAccountName": {
            "type": "string",
            "defaultValue": "myARMDemo",
            "minLength": 3,
            "maxLength": 24,
            "metadata": {
                "description": "Unique name for the storage account."
            }
        },
        "storageAccountType": {
            "type": "string",
            "defaultValue": "Standard_LRS",
            "allowedValues": [
                "Standard_LRS",
                "Standard_GRS",
                "Standard_ZRS",
                "Premium_LRS",
                "Standard_RAGRS"
            ],
            "metadata": {
                "description": "Account type based on the storage redundancy requirements."
            }
        }
    }
}
```


In the above JSON template, we added parameters sub-element to the first two mandatory elements which are _$schema_ and _contentVersion._ Within the parameters element, we have two parameters needed for creating storage account. Here is the generic syntax for adding parameters.

```json
"parameters": {
   "<parameterName>" : {
     "type" : "<type-of-parameter-value>",
     "defaultValue": "<optional-default-value-of-parameter>",
     "allowedValues": [ "<optional-array-of-allowed-values>" ],
     "minValue": <optional-minimum-value-for-int-parameters>,
     "maxValue": <optional-maximum-value-for-int-parameters>,
     "minLength": <optional-minimum-length-for-string-secureString-array-parameters>,
     "maxLength": <optional-maximum-length-for-string-secureString-array-parameters>,
     "metadata": {
         "description": "<optional-description-of-the parameter>" 
     }
   }
}
```


We will be using more or less every property within the parameters element within the scenario we are developing. So, don&#8217;t worry if you don&#8217;t immediately see all of them used right away. The _storageAccountName_ parameter is of string _type_ and we set the _defaultValue_ to &#8216;myARMDemo&#8217;. So, when a user deploys this template it is not mandatory to supply the parameter value. The value of _type_ property should be a valid JSON type and one of the below mentioned types.

  * string or secureString
  * int
  * bool
  * object or secureObject
  * array

A storage account name must be at least 3 characters long and 24 characters at the most. The _minLength_ and _maxLength_ properties within the _storageAccountName_ parameter define these constraints. The _metadata_ property of the parameter is used to provide the help text to the end user deploying this template. You can put whatever string that best describes the parameter.

For the _storageAccountType_ property, we have set _allowedValues_ property to ensure we restrict what the end user can provide as a value. This is required since there only a set of valid values for the storage account type in Azure. Note that _allowedValues_ property is a JSON array and is represented using square brackets. Since we are supplying _allowedValues,_ when a user deploys this template, they get to select one of the values either using dropdown or tab-complete when using PowerShell. For eample, in Azure PowerShell, this is achieved using the _New-AzureRmResourceGroupDeployment_ cmdlet.

{{<figure src="/images/armtemplate3-2.png">}}

We would eventually add many more parameters by the time we create the final template. The basics that we discussed here should apply to all parameters that we add in future.

#### Adding Resources

To be able to deploy the template, we must have at least one resource type added to the _resources_ collection element. Let us go ahead and add the storage resource type to create a storage account.

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "storageAccountName": {
            "type": "string",
            "defaultValue": "MyARMDemo",
            "minLength": 3,
            "maxLength": 24,
            "metadata": {
                "description": "Unique name for the storage account."
            }
        },
        "storageAccountType": {
            "type": "string",
            "defaultValue": "Standard_LRS",
            "allowedValues": [
                "Standard_LRS",
                "Standard_GRS",
                "Standard_ZRS",
                "Premium_LRS",
                "Standard_RAGRS"
            ],
            "metadata": {
                "description": "Account type based on the storage redundancy requirements."
            }
        }
    },
    "resources": [
        {
            "name": "[parameters('storageAccountName')]",
            "type": "Microsoft.Storage/storageAccounts",
            "location": "[ResourceGroup().Location]",
            "apiVersion": "2015-05-01-preview",
            "properties": {
                "accountType": "[parameters('storageAccountType')]"
            }
        }        
    ]
}
```


As we learned earlier, resources element in the ARM template is a JSON array. It is a collection of comma-separated JSON objects where each JSON object represents an instance of a resource type. For a resource type, we need to configure the _name_ property to identify the resource instance within the group. Note the way we are retrieving the value of _storageAccountName_ parameter and assigning it to the _name_ property of storage account resource. We use the [_parameters()_][7] function. We supply the name of the parameter to this function to retrieve its value. Also note that the functions and expressions within the JSON syntax must be enclosed within square brackets.

```
"name": "[parameters('storageAccountName')]"
```

The _type_ property is used to define the resource provider (Microsoft.Storage) and resource type (storageAccounts) within the provider. The value of _location_ property identifies the region where we want to deploy the resource type. In the case of our ARM template, we are using the _[resourceGroup()][8]_ function to define the location for our storage account. This function returns three attributes &#8212; _id, name,_ and _location_ &#8212; for the resource group within which the resource type is getting deployed. We use dot-reference to retrieve the value of location attribute.

```
"location": "[ResourceGroup().Location]"
```

The properties element within the resource definition is a JSON object that identifies all the resource specific properties. We need to configure the storage account type setting and this is collected using the _storageAccountType_ parameter. Similar to how we assigned value to the _name_ property, we use the _parameters()_ function to get the value of _storageAccountType._

```
{
   "accountType": "[parameters('storageAccountType')]"
}
```


With this, we have a ARM template that can be used to deploy a storage account. But, how do we know whether this is valid or not. We can either use the [REST API][9] for this or PowerShell cmdlets.

<pre class="lang:ps decode:true" title="Validate ARM template">Test-AzureRmResourceGroupDeployment -ResourceGroupName myARMDemo -TemplateFile .\2-0_Template_Storage.json -storageAccountName myARMDemo -storageAccountType Standard_LRS -Verbose</pre>

Once we validate the template, we can use one of the methods we discussed in the beginning of this series to deploy this template. One of the methods we discussed is the click to deploy button. So, go ahead and click on the below button and proceed to the Azure Portal (you need a valid Azure subscription).

{{<azdeploy href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage.json">}}

You should see Azure Portal starting a new deployment and prompting you for parameter values.

{{<figure src="/images/armtemplate3-3.png">}}

if you mouse over the small &#8216;i&#8217; icon next to the parameter name, you will see the contents of the _metadata_ property for the parameter displayed in a tooltip.

{{<figure src="/images/armtemplate3-4.png">}}

Once you fill in all required values in the wizard and click Create, the storage account gets deployed within the resource group.

This is it. We have completed the first part of the ARM template development. In the next part, we will add some more resource types to the template and also learn some more artifacts in the ARM template language.

[1]: http://139.59.40.198/blog/series/arm-templates/
[2]: http://139.59.40.198/blog/building-azure-resource-manager-templates-an-introduction/
[3]: http://139.59.40.198/blog/building-azure-resource-manager-templates-the-basics/
[4]: http://139.59.40.198/blog/uploads/2015/11/demo.png
[5]: https://github.com/Azure/azure-powershell/releases
[6]: http://139.59.40.198/blog/uploads/2015/11/ARMTemplate-AutoComplete.png
[7]: https://azure.microsoft.com/en-in/documentation/articles/resource-group-template-functions/#parameters
[8]: https://azure.microsoft.com/en-in/documentation/articles/resource-group-template-functions/#resourcegroup
[9]: https://msdn.microsoft.com/en-us/library/azure/dn790547.aspx
[10]: http://139.59.40.198/blog/uploads/2015/11/customDeployment.png
[11]: http://139.59.40.198/blog/uploads/2015/11/tooltip.png
