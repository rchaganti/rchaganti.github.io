# Building Azure Resource Manager Templates – Using Linked Templates


One of the ARM template authoring best practices is to decompose the JSON template, if applicable, into multiple target-specific templates. Think of this as creating re-usable code. You can leverage the re-usable parts of your code within multiple aspects of your application or the deployment.

For linking different external templates within the main template, we need to define the _Microsoft.Resources/deployments_ resource instance. Before we proceed let us look at the scenario for which we are building an ARM template.

{{<figure src="/images/armtemplate7-1.png">}}

So far in this series, we have looked at building an ARM template that deploys the following components of this scenario:

  * A storage account
  * A virtual network
  * A public IP address
  * A load balancer
  * Virtual network interfaces for the DC and other VMs based on the environment type.
  * Finally, a VM with DNS and Directory Services running in it.

{{<figure src="/images/armtemplate7-2">}}

By default, the Azure based IaaS deployments use the Azure DNS. If you have deployed the template that we built in the previous part of this series, you will notice that the virtual network us configured to use Azure DNS.

Since we deployed a VM that runs our own DNS and directory services, we now want to use the custom DNS in the Azure deployment so that other VMs in the deployment can join the domain that we created using the PowerShell DSC configuration.

For this, we will use an external template and call it inside our main template. What we essentially need to do here is to update the existing virtual network to use the custom DNS. Here is how it looks.

```
{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "virtualNetworkName": {
      "type": "string",
      "metadata": {
        "description": "The name of the Virtual Network to Create"
      }
    },
    "virtualNetworkAddressRange": {
      "type": "string",
      "metadata": {
        "description": "The address range of the new VNET in CIDR format"
      },
      "defaultValue": "10.0.0.0/16"
    },
    "subnetName": {
      "type": "string",
      "metadata": {
        "description": "The name of the subnet created in the new VNET"
      }
    },
    "subnetRange": {
      "type": "string",
      "metadata": {
        "description": "The address range of the subnet created in the new VNET"
      },
      "defaultValue": "10.0.0.0/24"
    },
    "DNSServerAddress": {
      "type": "array",
      "metadata": {
        "description": "The DNS address(es) of the DNS Server(s) used by the VNET"
      }
    }
  },
  "resources": [
    {
      "apiVersion": "2015-05-01-preview",
      "name": "[parameters('virtualNetworkName')]",
      "type": "Microsoft.Network/virtualNetworks",
      "location": "[resourceGroup().location]",
      "properties": {
        "addressSpace": {
          "addressPrefixes": [
            "[parameters('virtualNetworkAddressRange')]"
          ]
        },
        "dhcpOptions": {
          "dnsServers": "[parameters('DNSServerAddress')]"
        },
        "subnets": [
          {
            "name": "[parameters('subnetName')]",
            "properties": {
              "addressPrefix": "[parameters('subnetRange')]"
            }
          }
        ]
      }
    }
  ]
}
```


The above template is just another ARM JSON template. It has the same syntax. We have defined parameters that are needed for updating the virtual network to use the custom DNS that we just configured. let us save this as _vnet-with-dns-server.json_ and store it at a location that is accessible to the ARM deployment engine. I chose to store it in a [public Github repository][1].

Now, we need to link this template to the main ARM template that we have been authoring. Here is how it is done in the main template.

```
{
    "apiVersion": "2015-01-01",
    "type": "Microsoft.Resources/deployments",
    "name": "updatevnetdns",
    "dependsOn": [
        "[concat('Microsoft.Compute/virtualMachines/', parameters('dcVMName'),'/extensions/createadforest')]"
    ],
    "properties": {
        "mode": "Incremental",
        "templateLink": {
            "uri": "[concat(parameters('assetLocation'),'/vnet-with-dns-server.json')]",
            "contentVersion": "1.0.0.0"
        },
        "parameters": {
            "virtualNetworkName": {
                "value": "[parameters('vNetName')]"
            },
            "virtualNetworkAddressRange": {
                "value": "[variables('vNetPrefix')]"
            },
            "subnetName": {
                "value": "[variables('vNetSubnet1Name')]"
            },
            "subnetRange": {
                "value": "[variables('vNetSubnet1Prefix')]"
            },
            "DNSServerAddress": {
                "value": [
                    "[variables('dnsServerPrivateIp')]"
                ]
            }
        }
    }
}
```


Within this resource instance, we defined a dependency (line number 6) on the PowerShell DSC extension that creates the AD forest. We don&#8217;t want the linked template to execute until the DNS service is created in the DC VM. Line number 11 defines the link our external template that will configure the custom DNS settings. _vnet-with-dns-server.json _has a few parameters defined for collecting required custom DNS configuration.

Within the main template, we need to pass the parameter values to the external template. This is done using the parameters element within the _Microsoft.Resources/deployments_ resource instance. For the parameter values, we use either what is already gathered from the user using the main template or what is defined in the variables element of the main template. This is how state can be shared between multiple templates. If we need to return some data from the linked template to the main template, we can do so using the outputs element within the linked template. In our scenario, we don&#8217;t need any information from the linked template and therefore we will not use the outputs element.

Also, notice line number 9. The mode property within the properties element is set to incremental. This is needed because we already have some of the components within the template deployed. By setting the deployment mode to incremental, we tell the deployment engine to add the new resources or update existing resource configuration within the resource group without deleting any existing resources in the group. In our example, we are updating the configuration of an existing virtual network to use the custom DNS. so, the incremental deployment mode is necessary here.

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage-VirtualNet-LinkedTemplate-DNS_Update.json">}}

{{<figure src="/images/armtemplate7-3.png">}}

Once you deploy this updated template, you will see that the virtual network within the resource group gets set to use the custom DNS deployed using the PowerShell DSC extension.

In the next part of this series, we will look at adding more virtual machines to the deployment based on the _environmentType_ selected within the template parameters. By the end of next part, we will completely functional ARM template that deploys our scenario end to end.

[1]: https://github.com/rchaganti/azure-quickstart-templates/blob/master/201-vm-domain-join/vnet-with-dns-server.json
