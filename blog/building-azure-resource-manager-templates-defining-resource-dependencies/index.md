# Building Azure Resource Manager Templates – Defining Resource Dependencies


We will continue learning about building ARM templates by looking at how we can define dependencies between resources. To recap, here is the scenario we are working on.

{{<figure src="/images/armtemplate6-1.png">}}

In the earlier parts of this series, we created the storage account, virtual network, a public IP, a load balancer, and added all inbound NAT rules required for the virtual machine RDP access. If you notice, we have components that depend on others. For example, the inbound NAT rules depend on the load balancer. Similarly, VMs depend on network interfaces which in turn depend on the virtual network. In the absence of dependencies, ARM will attempt to deploy these resources in parallel which may result in errors. So, within the resource template, we need to define these dependencies so that ARM can make decisions about the deployment sequence. There are multiple ways of doing this.

#### Using DependsOn

If you have noticed in the earlier parts of this series, we have used _DependsOn_ property within the resource element.

```
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
        "Microsoft.Network/loadBalancers/loadBalancer"
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
```


If you look at line number 11, we added _DependsOn_ property to define that the _inboundNatRules_ depend on the load balancer configuration. This is straightforward and very easy to define. You can use template language functions such as _ResourceId()_ or _concat()_ as well within the value of _DependsOn_ and dynamically build these dependencies. You can provide more than one value here as a comma-separated list.

```
"dependsOn": [
    "Microsoft.Network/loadBalancers/loadBalancer",
    "Microsoft.Network/virtualNetworks/vNet1"
]
```




#### Using References

The second method is to define reference to the dependent resource. Let us create a virtual network interface the AD VM in our scenario. This depends on the virtual network resource that we already created.

```
{
    "apiVersion": "2015-05-01-preview",
    "type": "Microsoft.Network/networkInterfaces",
    "name": "dcvmnif",
    "location": "[resourceGroup().location]",
    "properties": {
        "ipConfigurations": [
            {
                "name": "[concat(reference(parameters('vNetName')).subnets[0].name,parameters('dcVmName'),'-nifconfig')]",
                "properties": {
                    "privateIPAllocationMethod": "Static",
                    "privateIPAddress": "[variables('dnsServerPrivateIp')]",
                    "subnet": {
                        "id": "[variables('vNetSubnet1ID')]"
                    }
                }
            }
        ]
    }
}
```


Observe line number 9. We used the reference() function to get a reference to the virtual network object we created and get the subnet name from there and use it to construct the _IPConfiguration_ name. When ARM engine finds this reference, it creates an implicit dependency on the virtual network that we referenced. There is no need here to specify _DependsOn_ property.

Note that we cannot use the reference() function as a part of the resource instance name. This is because the ARM engine must know the names of the resource instances before the deployment can start.

#### Child or Nested Resources

The 3rd way to define dependencies is to use child resources. Let us see an example before we discuss this further.

```
{
    "apiVersion": "2015-06-15",
    "type": "Microsoft.Compute/virtualMachines",
    "name": "[Parameters('dcVMName')]",
    "location": "[resourceGroup().location]",
    "dependsOn": [
        "[resourceId('Microsoft.Storage/storageAccounts',parameters('storageAccount'))]",
        "[resourceId('Microsoft.Network/networkInterfaces',concat(parameters('dcVMName'),'-nif'))]"
    ],
    "properties": {
        "hardwareProfile": {
            "vmSize": "[parameters('vmSize')]"
        },
        "osProfile": {
            "computerName": "[parameters('dcVMName')]",
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
                "name": "[concat(parameters('dcVMName'), '-osdisk.vhd')]",
                "vhd": {
                    "uri": "[concat('http://',parameters('storageAccount'),'.blob.core.windows.net/vhds/', parameters('dcVMName'), '-osdisk.vhd')]"
                },
                "caching": "ReadWrite",
                "createOption": "FromImage"
            },
            "dataDisks": [
                {
                    "name": "[concat(parameters('dcVMName'), '-data-disk1.vhd')]",
                    "vhd": {
                        "uri": "[concat('http://',parameters('storageAccount'),'.blob.core.windows.net/vhds/', parameters('dcVMName'), '-data-disk1.vhd')]"
                    },
                    "caching": "None",
                    "createOption": "Empty",
                    "diskSizeGB": "1000",
                    "lun": 0
                }
            ]
        },
        "networkProfile": {
            "networkInterfaces": [
                {
                    "id": "[resourceId('Microsoft.Network/networkInterfaces',concat(parameters('dcVMName'),'-nif'))]"
                }
            ]
        },
        "diagnosticsProfile": {
            "bootDiagnostics": {
                "enabled": "true",
                "storageUri": "[concat('http://',parameters('storageAccount'),'.blob.core.windows.net')]"
            }
        }
    },
    "resources": [
        {
            "type": "extensions",
            "name": "createadforest",
            "apiVersion": "2015-05-01-preview",
            "location": "[resourceGroup().location]",
            "dependsOn": [
                "[concat('Microsoft.Compute/virtualMachines/',parameters('dcVMName'))]"
            ],
            "properties": {
                "publisher": "Microsoft.Powershell",
                "type": "DSC",
                "typeHandlerVersion": "2.8",
                "settings": {
                    "ModulesUrl": "[concat(parameters('assetLocation'),'/Configuration.zip')]",
                    "ConfigurationFunction": "CreateADPDC.ps1\\CreateADPDC",
                    "Properties": {
                        "DomainName": "[parameters('adDomainName')]",
                        "AdminCreds": {
                            "UserName": "[parameters('adminUsername')]",
                            "Password": "PrivateSettingsRef:AdminPassword"
                        }
                    }
                },
                "protectedSettings": {
                    "Items": {
                        "AdminPassword": "[parameters('adminPassword')]"
                    }
                }
            }
        }
    ]
}
```


This example is quite long. It is the virtual machine resource instance that we need for the domain controller. Apart from all the virtual machine properties such as storage profile and OS profile, we have something interesting at line number 61. We have another resources element within the VM resource definition. As with the top-level resources element, this is also a JSON array and contains the resource definition for the [VM DSC extension][2]. It is obvious that VM DSC extension without a VM is meaningless. By defining this as a child or nested resource inside the VM resource definition, we are creating an implicit dependency between the VM and the VM DSC extension. When ARM engine looks at this in the template, it schedules VM creation before the DSC extension. BTW, this VM DSC extension has the DSC configuration required to build the domain controller in this deployment.

Always make sure you that you create enough flexibility within the template for someone else to take this and deploy the template in their own environment.To this extent, I have used a parameter called _assetLocation_ (line 75) in the DSC extension properties. You can call this whatever you want. This parameter specifies where all the template assets such as DSC configuration scripts and any additional template files are stored.

So far in this part, we have seen three different ways of defining dependencies between resources. If you check the template that we [built so far for this scenario][3], you will observe that I have added a few more variables and parameters needed for the DC VM and its configuration.

Go ahead and deploy this.

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage-VirtualNet-LB_vNIC-VM.json">}}

In the next part, we will look at the nested template deployments.

[1]: http://139.59.40.198/blog/uploads/2015/11/demo1.png
[2]: http://www.powershellmagazine.com/2014/08/05/understanding-azure-vm-dsc-extension/
[3]: https://github.com/rchaganti/armseries/blob/master/arm-series_Storage-VirtualNet-LB_vNIC-VM.json
