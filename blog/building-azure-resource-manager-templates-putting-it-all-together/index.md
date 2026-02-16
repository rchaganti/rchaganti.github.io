# Building Azure Resource Manager Templates – Putting it all together


In this series so far, we looked at building ARM templates by example. The focus was not really on the resource types or how to use resource definitions. Instead, our focus was on learning the basics of template language. To that extent, we have a scenario that we want to deploy and we are incrementally building the template for it.

{{<figure src="/images/armtemplate8-1.png">}}

While building an ARM template for this, we looked at how to use parameters and variables. We looked at using copy object to create multiple instances of a resource type without really writing the resource definition multiple times. We went on to find out how we can define dependencies between different resource types so they are orchestrated in the right order. We looked at how we can decompose the template into purpose-specific external templates and how to link them together. While learning these concepts, we created a template that almost built the scenario we started with.

We will now add the remaining VMs based on the _environmentType_ selected by the user. So, based on the VM instance count we need, we have to create network interfaces and virtual machines. We have already provisioned the inbound NAT rules needed for the RDP access to these virtual machine consoles post deployment.

```
{
  "apiVersion": "2015-06-15",
  "type": "Microsoft.Network/loadBalancers/inboundNatRules",
  "copy": {
    "name": "lbRdpNatLoop",
    "count": "[variables('selectedDeployment').instancesCount]"
  },
  "name": "[concat('/loadBalancer/','VM', copyIndex(1),'-RDP')]",
  "location": "[resourceGroup().location]",
  "dependsOn": [
    "Microsoft.Network/loadBalancers/loadBalancer"
  ],
  "properties": {
    "frontendIPConfiguration": {
      "id": "[concat(resourceId('Microsoft.Network/loadBalancers','loadBalancer'),'/frontendIPConfigurations/LBFrontEnd')]"
    },
    "protocol": "tcp",
    "frontendPort": "[add(3389, copyIndex(1))]",
    "backendPort": 3389,
    "enableFloatingIP": false
  }
}
```


Look at line number 8. We are building the name of the inbound NAT rule using _copyIndex()_. This gives us the ability to differentiate between NAT rules for different VMs. We now have to create the equal number of VM network interfaces based on the instance count selected. Here is how we do it.

```
{
    "apiVersion": "2015-05-01-preview",
    "type": "Microsoft.Network/networkInterfaces",
    "name": "[concat('vm', copyIndex(1), '-nif')]",
    "location": "[resourceGroup().location]",
    "copy": {
        "name": "vmNetworkLoop",
        "count": "[variables('selectedDeployment').instancesCount]"
    },
    "dependsOn": [
        "Microsoft.Network/loadBalancers/loadBalancer",
        "[concat('Microsoft.Network/virtualNetworks/', parameters('vNetName'))]",
        "Microsoft.Resources/deployments/updatevnetdns",
        "lbRdpNatLoop"
    ],
    "properties": {
        "ipConfigurations": [
            {
                "name": "[concat('vm', copyIndex(1), '-ipconfig')]",
                "properties": {
                    "privateIPAllocationMethod": "dynamic",
                    "subnet": {
                        "id": "[variables('vNetSubnet1ID')]"
                    },
                    "loadBalancerBackendAddressPools": [
                        {
                            "id": "[concat(resourceId('Microsoft.Network/loadBalancers','loadBalancer'),'/backendAddressPools/LBBackEnd')]"
                        }
                    ],
                    "loadBalancerInboundNatRules": [
                        {
                            "id": "[concat(resourceId('Microsoft.Network/loadBalancers','loadBalancer'),concat('/inboundNatRules/VM',copyIndex(1),'-RDP'))]"
                        }
                    ]
                }
            }
        ]
    }
}
```


Let us discuss this definition a bit. We need to ensure that the network interfaces are bound to the load balancer. Without this, the RDP endpoints that we created within the NAT rules will not apply to the VMs. To achieve this, we defined dependency (line number 14) on the NAT rules resource definition identified using _lbRdpNatLoop_. So, this is how we depend on the copy loop within the ARM template language. Line number 32 attaches the right RDP NAT rule for the VM by using the _copyIndex()_ function again.

Now that we have the network interfaces required (based on the instance count), we can create the virtual machines needed based on the _envrionmentType_ (Development or Test or Production). Based on this choice, there may be more than one virtual machine that gets created. Where there is more than one VM behind a load balancer, we would need an availability set attached to those VMs. So, let us add the resource definition for the availability set.

```
{
    "type": "Microsoft.Compute/availabilitySets",
    "name": "availabilitySet",
    "apiVersion": "2015-06-15",
    "location": "[resourceGroup().location]",
    "properties": {}
}
```


We can now go ahead create the virtual machines we need.

```
{
    "apiVersion": "2015-05-01-preview",
    "type": "Microsoft.Compute/virtualMachines",
    "copy": {
        "name": "vmLoop",
        "count": "[variables('selectedDeployment').instancesCount]"
    },
    "name": "[concat('vm',copyIndex(1))]",
    "location": "[resourceGroup().location]",
    "dependsOn": [
        "[concat('Microsoft.Compute/virtualMachines/', parameters('dcVMName'))]",
        "[concat('Microsoft.Storage/storageAccounts/', parameters('storageAccountName'))]",
        "vmNetworkLoop"
    ],
    "properties": {
        "availabilitySet": {
            "id": "[resourceId('Microsoft.Compute/availabilitySets','availabilitySet')]"
        },
        "hardwareProfile": {
            "vmSize": "[parameters('vmSize')]"
        },
        "osProfile": {
            "computername": "[concat('vm',copyIndex(1))]",
            "adminUsername": "[parameters('adminUsername')]",
            "adminPassword": "[parameters('adminPassword')]"
        },
        "storageProfile": {
            "imageReference": {
                "publisher": "[variables('imagePublisher')]",
                "offer": "[variables('imageOffer')]",
                "sku": "[parameters('windowsOSVersion')]",
                "version": "latest"
            },
            "osDisk": {
                "name": "osdisk",
                "vhd": {
                    "uri": "[concat('http://',parameters('storageAccountName'),'.blob.core.windows.net/vhds/', concat('vm',copyIndex(1),'-osdisk.vhd'))]"
                },
                "caching": "ReadWrite",
                "createOption": "FromImage"
            }
        },
        "networkProfile": {
            "networkInterfaces": [
                {
                    "id": "[resourceId('Microsoft.Network/networkInterfaces',concat('vm',CopyIndex(1),'-nif'))]"
                }
            ]
        }
    }
}
```


We, once again, use a copy object in this definition to create as many virtual machines as we need based on the derived instance count. We also attach (line number 46) the network interfaces created in an earlier step. Once these VMs are created, we need to join them to the domain we created using DSC extension earlier. This is done using DSC again!

```
{
    "type": "Microsoft.Compute/virtualMachines/extensions",
    "copy": {
        "name": "vmDomainLoop",
        "count": "[variables('selectedDeployment').instancesCount]"
    },
    "name": "[concat('vm',copyIndex(1),'/domainjoin')]",
    "apiVersion": "2015-05-01-preview",
    "location": "[resourceGroup().location]",
    "dependsOn": [
        "vmLoop"
    ],
    "properties": {
        "publisher": "Microsoft.Powershell",
        "type": "DSC",
        "typeHandlerVersion": "2.8",
        "settings": {
            "ModulesUrl": "[concat(parameters('assetLocation'),'/Configuration.zip')]",
            "ConfigurationFunction": "Configuration.ps1\\DomainJoin",
            "Properties": {
                "DomainName": "[parameters('adDomainName')]",
                "AdminCreds": {
                    "UserName": "[parameters('adminUsername')]",
                    "Password": "PrivateSettingsRef:adminPassword"
                }
            }
        },
        "protectedSettings": {
            "Items": {
                "adminPassword": "[parameters('adminPassword')]"
            }
        }
    }
}
```


Line numbers 18 and 19 got the real magic that we need to join an existing domain. I packaged all DSC configurations I need for the DC creation and domain join into the configuration.zip file. We give this path to the DSC extension and tell this extension to use the _DomainJoin_ configuration from the Configuration.ps1 file from the zip package.

This completes the resource definitions needed for the scenario we have. The complete ARM template is rather lengthy. So, I will not put the entire contents here but you can find it at <https://github.com/rchaganti/armseries/blob/master/arm-series_Storage-VirtualNet-LinkedTemplate-Complete.json>.

You can optionally click on the below button to deploy the complete template right away.

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage-VirtualNet-LinkedTemplate-Complete.json">}}

Once you deploy this, you can verify that we have the configuration done in the right away by looking at the load balancer NAT rules and how they are mapped to the VMs in the backendpool.

This completes our learning of the basics of ARM template language. Hope you have learned enough to go get started with writing ARM templates. I will continue this series writing about the best practices, tips and tricks around ARM template authoring. Stay tuned for more.
