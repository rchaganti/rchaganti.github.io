# Building Azure Resource Manager Templates – Using Copy Object


If you are following this series, by now you know how to use parameters and variables in ARM template language. We used that knowledge to create a template that creates relevant things to like storage account and virtual network. Let us revisit the scenario.

{{<figure src="/images/armtemplate5-1.png">}}

In this part, we will extend the template to add publicIP, load balancer, and RDP endpoints for the virtual machines. Before we do that, let us review what we need. To achieve what we want in this, we will use copy object in the template.

#### What is Copy Object?

In our template, we already have the storage account and virtual network configuration defined. What we now need is a load balancer with a public IP so that we can access this deployment from the Internet. Also, we need the inbound NAT rules for enabling RDP access to the VMs in this deployment. But before we create the RDP rules for each VM, we need to know how many VM instances we are deploying. As shown in the scenario diagram, we need to be able to deploy this template within development, test, or production environment. Depending on the selected environment, we will have one AD DC VM along with 1 (development) or 2 (test) or 3 (production) VMs that join the AD domain. Therefore, we need a way to capture the environment type as an input parameter. Also, based on the environment type selected by the user, we need to decide on the number of VM instances required for the deployment and then create only relevant number of inbound NAT rules within the load balancer.

There are multiple ways to achieve this.

  1. Add multiple resource definitions; one for each resource instance we need. This does not give the flexibility to dynamically add or remove instances based on the VM count we need. This method is not efficient.
  2. Use some kind of iterator, like other programming languages, within a resource definition and tell ARM how many resource instances we need. This can be achieved using copy object technique in ARM templates.

Before we go to the copy object discussion, let us first add more parameters and variables that are needed for this template. These additional parameters will also help us with defining the iteration count within the copy object.

```json
"parameters": {
    "storageAccount": {
        "type": "string",
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
            "Standard_ZRS"
        ],
        "metadata": {
            "description": "Account type based on the storage redundancy requirements."
        }
    },
    "vNetName": {
        "type": "string",
        "metadata": {
            "description": "Name for the virtual network."
        }
    },
    "DnsName": {
        "type": "string",
        "metadata": {
            "description": "Unique public DNS prefix for the deployment. The fqdn will look something like '&lt;dnsname&gt;.westus.cloudapp.azure.com'."
        }
    },
    "environmentType": {
        "type": "string",
        "allowedValues": [
            "Development",
            "Test",
            "Production"
        ],
        "defaultValue": "Development",
        "metadata": {
            "description": "Type of environment where this deployment should occur. This has an impact on the number of VMs to be depoloyed."
        }
    }
}
```


Within the new parameters, we have the _dnsName_ parameter that will be for external access. The _environmentType_ parameter is used to capture whether the user is deploying this template for dev, test, or production. However, based on this selection, we need a way to find out the number of VMs we need in the domain. That is, we need know the instance count for each environment. Remember our discussion on free-form vs known configurations? We don&#8217;t want to leave such choices to the end user. So, the place where this decision can be made will be in the variables element.

```json
"variables": {
    "vNetPrefix": "10.0.0.0/16",
    "vNetSubnet1Name": "[concat(resourceGroup().Location, '-', parameters('vNetName'), '-', 'Subnet')]",
    "vNetSubnet1Prefix": "10.0.0.0/24",
    "vNetSubnet1ID": "[concat(resourceId('Microsoft.Network/virtualNetworks',parameters('vNetName')),'/subnets/',variables('vNetSubnet1Name'))]",
    "dnsServerPrivateIp": "10.0.0.8",
    "deploymentSize": {
        "Development": {
            "instancesCount": 1
        },
        "Test": {
            "instancesCount": 2
        },
        "Production": {
            "instancesCount": 3
        }
    },
    "selectedDeployment": "[variables('deploymentSize')[parameters('environmentType')]]"
}
```


Within the variables element, we defined new variables for making it easier to select the environment type. The _deploymentSize_ variable defines a JSON object. Within this, we are associating _instancesCount_ to every deployment type.

```json
"deploymentSize": {
    "Development": {
        "instancesCount": 1
    },
    "Test": {
        "instancesCount": 2
    },
    "Production": {
        "instancesCount": 3
    }
}
```


We use the _selectedDeployment_ variable to retrieve the value of _deploymentSize_ variable. This is done by associating the value of environmentType parameter and looking up for that in the _deploymentSize_ variable.

```json
"selectedDeployment": "[variables('deploymentSize')[parameters('environmentType')]]"
```

This works because _deploymentSize_ is a JSON object similar to a dictionary. We can index into it using one of the key names. So, in this case, the key names will match the value passed to the _environmentType_ parameter and indexing into that will give us the right object within _deploymentSize. _Once we have the selectedDeployment variable populated, we can access the _instancesCount_ value by dot-referencing the property name. For example,

```
[variables('selectedDeployment').instancesCount]"
```

This should not be alien to us. We use _variables()_ function and pass the _selectedDeployment_ variable name to it. The resulting object has the _instancesCount_ property which can then be retrieved using dot-referencing. Now that we figured this out, let us go back to the discussion around multiple instance creation within a template.

#### Working with Copy Object

As stated earlier, the reason we need _instancesCount_ value is because we need to tell ARM how many times it has to iterate for creating the resource for which we need multiple instances. This is done within the [copy object syntax][3].

```
"copy": { 
    "name": "copy loop name", 
    "count": "integer value" 
}
```


The _name_ property within the _copy_ element defines a name for the iterator which can later be used for defining dependencies. The _count _property defines the number of times the iterator has to run. In our case, we will set the value of count property to the _instancesCount_ value we retrieve from the _selectedDeployment._

We place this inside the resource definition. In our scenario, we will use the copy object within _Microsoft.Network/loadBalancers/inboundNatRules_ resource type. Let us first see the new resources that we need to enable public IP and load balancer configuration. We will then review the resource definition to understand how we use the copy object.

```json
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
    },
    {
        "apiVersion": "2015-05-01-preview",
        "type": "Microsoft.Network/publicIPAddresses",
        "name": "publicIp",
        "location": "[resourceGroup().location]",
        "properties": {
            "publicIPAllocationMethod": "Dynamic",
            "dnsSettings": {
                "domainNameLabel": "[parameters('DnsName')]"
            }
        }
    },
    {
        "apiVersion": "2015-05-01-preview",
        "name": "loadBalancer",
        "type": "Microsoft.Network/loadBalancers",
        "location": "[resourceGroup().location]",
        "dependsOn": [
            "Microsoft.Network/publicIPAddresses/publicIp"
        ],
        "properties": {
            "frontendIPConfigurations": [
                {
                    "name": "[variables('lbFrontend')]",
                    "properties": {
                        "publicIPAddress": {
                            "id": "[resourceId('Microsoft.Network/publicIPAddresses','publicIp')]"
                        }
                    }
                }
            ],
            "backendAddressPools": [
                {
                    "name": "[variables('lbBackendAddrPool')]"
                }
            ]
        }
    },
    {
        "apiVersion": "2015-06-15",
        "type": "Microsoft.Network/loadBalancers/inboundNatRules",
        "copy": {
            "name": "lbRdpNatLoop",
            "count": "[variables('selectedDeployment').instancesCount]"
        },
        "name": "[concat('/loadbalancer/','VM-', copyIndex(1),'-RDP')]",
        "location": "[resourceGroup().location]",
        "dependsOn": [
            "[concat('Microsoft.Network/loadBalancers/loadBalancer')]"
        ],
        "properties": {
            "frontendIPConfiguration": {
                "id": "[resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations','loadBalancer',variables('lbFrontend'))]"
            },
            "protocol": "tcp",
            "frontendPort": "[add(3389, copyIndex(1))]",
            "backendPort": 3389,
            "enableFloatingIP": false
        }
    }
]
```


In this updated resource collection, we have added three resource types. A public IP address to assign it to the load balancer, a load balancer that will act as a container for the VM endpoints, and finally, RDP endpoints based on the number of VM instances we need.

Observe the highlighted lines in the resource collection. The copy object that we used within the inboundNATRules resource type tells ARM how many instances we need to create based on the VM count we need.

```
"copy": {
    "name": "lbRdpNatLoop",
    "count": "[variables('selectedDeployment').instancesCount]"
},
```


Within an ARM template, for each resource type and its instances, the _name_ property should carry a unique value. Without this, you will see an error during deployment that multiple instances cannot use the same name. So, if you look at line number 77, we are dynamically constructing the value for _name._

```
"name": "[concat('/loadbalancer/','VM-', copyIndex(1),'-RDP')]"
```

As you see here, we are concatenating &#8216;/loadbalancer/&#8217; with &#8216;VM-&#8216; and then using the [_copyIndex()_][4] function and finally add &#8216;-RDP&#8217;. The _copyIndex()_ function gives us the iteration number. So, if we are creating three VM endpoints within this resource definition, we get iteration values 0, 1, and 2. The index always starts from 0. However, if we want to offset it to different value than zero, we can specify the value inside the _copyIndex()_ function. In my example, I am using 1 so that the values the template receives will be 1, 2, and 3. Since we are using the iteration number within the name value, we always get an unique identifier.

Another function that we are using within this template update is the _[add()][5]_ function. This function, as its name suggests, adds integers. I am using this function to dynamically derive the frontend port number for the VM RDP endpoint.

```
"frontendPort": "[add(3389, copyIndex(1))]"
```

We are doing this since all VM RDP endpoints should be accessible through the load balancer. By using add function, we are adding the iteration value to the RDP port (3389) to derive a unique value.

Now that we have completed our discussion on the copy object and its usage, let us move on to see the ARM template update that creates storage account, virtual network, public IP, load balancer, and finally the VM RDP endpoints. We are not creating an RDP endpoint for the DC VM.

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "storageAccountName": {
            "type": "string",
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
            "metadata": {
                "description": "Name for the virtual network."
            }
        },
        "DnsName": {
            "type": "string",
            "metadata": {
                "description": "Unique public DNS prefix for the deployment. The fqdn will look something like '&lt;dnsname&gt;.westus.cloudapp.azure.com'."
            }
        },
        "environmentType": {
            "type": "string",
            "allowedValues": [
                "Development",
                "Test",
                "Production"
            ],
            "defaultValue": "Development",
            "metadata": {
                "description": "Type of environment where this deployment should occur. This has an impact on the number of VMs to be depoloyed."
            }
        }
    },
    "variables": {
        "vNetPrefix": "10.0.0.0/16",
        "vNetSubnet1Name": "[concat(resourceGroup().Location, '-', parameters('vNetName'), '-', 'Subnet')]",
        "vNetSubnet1Prefix": "10.0.0.0/24",
        "vNetSubnet1ID": "[concat(resourceId('Microsoft.Network/virtualNetworks',parameters('vNetName')),'/subnets/',variables('vNetSubnet1Name'))]",
        "dnsServerPrivateIp": "10.0.0.8",
        "lbFrontend": "lbFrontEnd",
        "lbBackendAddrPool": "lbBackEndPool",
        "deploymentSize": {
            "Development": {
                "instancesCount": 1
            },
            "Test": {
                "instancesCount": 2
            },
            "Production": {
                "instancesCount": 3
            }
        },
        "selectedDeployment": "[variables('deploymentSize')[parameters('environmentType')]]"
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
        },
        {
            "apiVersion": "2015-05-01-preview",
            "type": "Microsoft.Network/publicIPAddresses",
            "name": "publicIp",
            "location": "[resourceGroup().location]",
            "properties": {
                "publicIPAllocationMethod": "Dynamic",
                "dnsSettings": {
                    "domainNameLabel": "[parameters('DnsName')]"
                }
            }
        },
        {
            "apiVersion": "2015-05-01-preview",
            "name": "loadBalancer",
            "type": "Microsoft.Network/loadBalancers",
            "location": "[resourceGroup().location]",
            "dependsOn": [
                "Microsoft.Network/publicIPAddresses/publicIp"
            ],
            "properties": {
                "frontendIPConfigurations": [
                    {
                        "name": "[variables('lbFrontend')]",
                        "properties": {
                            "publicIPAddress": {
                                "id": "[resourceId('Microsoft.Network/publicIPAddresses','publicIp')]"
                            }
                        }
                    }
                ],
                "backendAddressPools": [
                    {
                        "name": "[variables('lbBackendAddrPool')]"
                    }
                ]
            }
        },
        {
            "apiVersion": "2015-06-15",
            "type": "Microsoft.Network/loadBalancers/inboundNatRules",
            "copy": {
                "name": "lbRdpNatLoop",
                "count": "[variables('selectedDeployment').instancesCount]"
            },
            "name": "[concat('/loadbalancer/','VM-', copyIndex(1),'-RDP')]",
            "location": "[resourceGroup().location]",
            "dependsOn": [
                "[concat('Microsoft.Network/loadBalancers/loadBalancer')]"
            ],
            "properties": {
                "frontendIPConfiguration": {
                    "id": "[resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations','loadBalancer',variables('lbFrontend'))]"
                },
                "protocol": "tcp",
                "frontendPort": "[add(3389, copyIndex(1))]",
                "backendPort": 3389,
                "enableFloatingIP": false
            }
        }
    ]
}
```

You can go ahead and deploy this update by clicking on the button below. 

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage-VirtualNet-LB.json">}}

{{<figure src="/images/armtemplate5-2.png">}}

This brings up the portal and prompts for the parameter values we need for the deployment. Within the parameters, you will see the _environmentType_ dropdown with three possible values. I have selected Production as the input here and I expect to see three RDP endpoints created at the end of template deployment. Let us see if this worked.

{{<figure src="/images/armtemplate5-3.png">}}

[][7]

As you see here, the endpoints with respective frontend port numbers are created. We will have to associate these endpoints to VM network interfaces and we will take that up in a later part. Stay tuned.

[2]: http://139.59.40.198/blog/uploads/2015/11/demo.png
[3]: https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-multiple/#copy-copyindex-and-length
[4]: https://azure.microsoft.com/en-us/documentation/articles/resource-group-template-functions/#copyindex
[5]: https://azure.microsoft.com/en-us/documentation/articles/resource-group-template-functions/#add
[6]: http://139.59.40.198/blog/uploads/2015/11/arm-environmenttype1.png
[7]: http://139.59.40.198/blog/uploads/2015/11/RDPEndpoints.png
