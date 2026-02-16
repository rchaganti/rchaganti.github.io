# Building Azure Resource Manager Templates – Using Variables

If you have been following this series on [ARM templates][1], in the last part, we started with a sample scenario that we are using to build an ARM template. Here it is again.

{{<figure src="/images/armtemplate4-1.png">}}

In the [last part][3], we completed creation of storage account required for backing the OS and data disks for virtual machines in the deployment. The next step in our scenario is to create the virtual network for the VM connectivity. A virtual network and any subnets required must exist before the creation of virtual machines. So, in today&#8217;s article, we will see how we can use variables in the ARM template language while incrementally building an ARM template for our scenario and add virtual network. Towards the end, we will review some best practices guidance with regards to using parameters and variables in developing ARM templates.

#### Working with Variables

Variables in ARM template language can be used to simplify the template. For example, in our template, we will be using the subnet name at multiple places. There is no point repeating the same string everywhere for this. This may also lead to human errors such as unintentional misspelling of the subnet name. This type of errors will result in failure during the deployment. Instead, we can assign subnet name as a value to a variable and refer that variable within the template as needed. Also, variables in ARM template language will let us expand or construct other variable values. We will see examples of this in the template.

Here is the generic syntax for variables in ARM template language.

```json
"variables": {
   "<variable-name>": "<variable-value>",
   "<variable-name>": { 
       <variable-complex-type-value> 
   }
}
```


In general, variables is a JSON object which contains pairs of variable names and values. The variable value can be a complex type such as another JSON object. We will see these as examples as we add the variables needed to complete virtual network configuration.

```json
"variables": {
    "vNetPrefix": "10.0.0.0/16",
    "vNetSubnet1Name": "[concat(resourceGroup().Location, '-', parameters('vNetName'), '-', 'Subnet')]",
    "vNetSubnet1Prefix": "10.0.0.0/24",
    "vNetSubnet1ID": "[concat(resourceId('Microsoft.Network/virtualNetworks',parameters('vNetName')),'/subnets/',variables('vNetSubnet1Name'))]",
    "dnsServerPrivateIp": "10.0.0.8"
}
```


For the virtual network required for our scenario, we defined a variable called _vNetPrefix_ and set a value &#8220;10.0.0.0/16&#8221;. This is the overall virtual network address scope. Within this vNet, we intend to create one subnet with address prefix &#8220;10.0.0.0/24&#8221; and this is represented using the variable _vNetSubnet1Prefix. _I have added another variable named _dnsServerPrivateIp_ to reserve an IP address for the AD domain controller VM. This is because we don&#8217;t want a DHCP assigned IP for the AD DC.

You will also see that we are using another function within this variables element called _[concat()][4]._

```json
"vNetSubnet1Name": "[concat(resourceGroup().Location, '-', parameters('vNetName'), '-', 'Subnet')]"
```

This function can take &#8216;n&#8217; strings and concatenate them together. In the example above, we are retrieving the resource group location and then concatenate that with &#8216;-&#8216; and the value of the _vNetName_ parameter. This variable value is then used to derive the value of the variable _vNetSubnet1ID._

```json
"vNetSubnet1ID": "[concat(resourceId('Microsoft.Network/virtualNetworks',parameters('vNetName')),'/subnets/',variables('vNetSubnet1Name'))]"
```

As I&#8217;d mentioned earlier, variables values can be generated dynamically based on other values. If you observe the above code snippet, we are constructing the _vNetSubnet1ID_ by retrieving the resource ID for the virtual network that we are creating. The _resourceId()_ function returns the unique identifier of a resource and it won&#8217;t be available until the vNet is created. This shows us that the values of variables can be derived from other related configuration settings. We have used the _concat()_ function again here to concatenate the resource Id value of the vNet with &#8216;/subnets/&#8217; and the value of the _vNetSubnet1Name_ variable that we derived in last step. Similar to _parameters()_ function, the _[variables()][5]_ function gives us the value of the variable name specified.

```
"[variables('vNetSubnet1Name')]"
```

The _variables()_ function can be used with the variables element as well as the resource definitions and outputs element. Like any other expression in template language, anytime you want to use this function, it must be enclosed in square brackets ([]).

We will see more about creating variables with complex value types in a later part but fundamentals that you learned here are applicable even to complex types. Now that we have the variables needed for the vNet creation, let us go ahead and add the virtual network resource definition to our template.

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
        },
        "vNetName": {
            "type": "string",
            "defaultValue": "myARMDemo",
            "metadata": {
                "description": "Unique name of the virtual network for this deployment"
            }
        }
    },
    "variables": {
        "vNetPrefix": "10.0.0.0/16",
        "vNetSubnet1Name": "[concat(resourceGroup().Location, '-', parameters('vNetName'), '-', 'Subnet')]",
        "vNetSubnet1Prefix": "10.0.0.0/24",
        "vNetSubnet1ID": "[concat(resourceId('Microsoft.Network/virtualNetworks',parameters('vNetName')),'/subnets/',variables('vNetSubnet1Name'))]",
        "dnsServerPrivateIp": "10.0.0.8"
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
        },
        {
            "name": "[parameters('vNetName')]",
            "type": "Microsoft.Network/virtualNetworks",
            "location": "[ResourceGroup().Location]",
            "apiVersion": "2015-05-01-preview",
            "properties": {
                "addressSpace": {
                    "addressPrefixes": [
                        "[variables('vNetPrefix')]"
                    ]
                },
                "subnets": [
                    {
                        "name": "[variables('vNetSubnet1Name')]",
                        "properties": {
                            "addressPrefix": "[variables('vNetSubnet1Prefix')]"
                        }
                    }
                ]
            }
        }        
    ]
}
```


I added a _vNetName_ parameter to the parameters element so that user deploying this template can provide that as input. We can go ahead and test if this is template is valid or not.

```powershell
Test-AzureRmResourceGroupDeployment -ResourceGroupName myARMDemo -TemplateFile .\arm-series_Storage-VirtualNet.json -storageAccountName myARMDemo -storageAccountType Standard_LRS -vNetName myARMDemo -Verbose
```

Once the validation is complete, we can go ahead and deploy the same to ensure it is deploy-able. To test this immediately, click on the deploy to Azure button below.

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage-VirtualNet.json">}}

#### Free-form vs Known Configuration

We have so far looked at parameters, variables, and used them in the template that we are building. Parameters give us the flexibility to gather input from user deploying the template. We can completely parameterize the template and let the user provide every value needed for the deployment as an input parameter. This is called free-form configuration. However, using free-form configuration is not always scalable. The number of parameters that a user need to input might be overwhelming. Also, you don&#8217;t want your end user deploying this template to mess-up with the vNet and subnet address prefixes. This can have negative effects on the overall IaaS deployment. You might always want to prefix the subnet name with the resource group name to ensure there is uniformity across the resource names that you use. Some of this cannot be controlled unless you use known configurations. Known configurations help standardize resource configurations. Use variables in the template for resource settings that require no user input or you need control over. By using variables, you can simply change the value of the variable if at all you need to modify the template instead of trying to find where all the value is used.

We will review more such best practices guidance and see using known configurations throughout this series. This is it for today. Stay tuned for more!

[1]: http://139.59.40.198/blog/series/arm-templates/
[2]: http://139.59.40.198/blog/uploads/2015/11/demo.png
[3]: http://139.59.40.198/blog/building-azure-resource-manager-templates-using-parameters/
[4]: https://azure.microsoft.com/en-in/documentation/articles/resource-group-template-functions/#concat
[5]: https://azure.microsoft.com/en-in/documentation/articles/resource-group-authoring-templates/#variables
