# Building Azure Resource Manager Templates – Using Domain Join Extension


The scenario that we used to understand and build ARM templates contained a domain controller VM along with one or more VMs that joined the domain service hosted by the DC VM.

{{<figure src="/images/armtemplate9-1.png">}}

To make sure the VMs join the domain, we used PowerShell DSC configuration. One of the biggest quirks, at least what I faced, with DSC extension with ARM templates is that it takes little longer to complete. For example, the complete scenario deployment took almost 48 minutes to deploy. I am not making up that number. Here is the proof.

{{<figure src="/images/armtemplate9-2.png">}}

Now, 48 minutes may not sound that worse but imagine deploying tens of VMs that need to join the domain using the DSC configuration as we saw in the earlier example in this series.

This is where the new JsonADDomainExtension helps! Instead of using DSC configuration to add VMs to a AD domain, we will now use this VM extension. Within the [earlier template that deployed this scenario][1], we will remove the domainJoin resource definition and replace that with JsonADDomainExtension.

Here is how that new resource definition looks.

```
"resources": [
    {
        "apiVersion": "2015-06-15",
        "type": "Microsoft.Compute/virtualMachines/extensions",
        "name": "[concat(concat('vm',copyIndex(1)),'/joindomain')]",
        "location": "[resourceGroup().location]",
        "dependsOn": [
                "[concat('Microsoft.Compute/virtualMachines/', concat('vm',copyIndex(1)))]"
        ],                    
        "properties": {
            "publisher": "Microsoft.Compute",
            "type": "JsonADDomainExtension",
            "typeHandlerVersion": "1.0",
            "settings": {
                "Name": "[parameters('adDomainName')]",
                "User": "[concat(parameters('adDomainName'), '\\', parameters('adminUserName'))]",
                "Restart": "true",
                "Options": "3",
                "OUPath": "[parameters('OUPath')]"
            },
            "protectedsettings": {
                "Password": "[parameters('adminPassword')]"
            }
        }
    }
]
```


In this extension settings, I am re-using a few parameters such as _adDomainName_, _adminUserName_, and _adminPassword_. I added a new parameter called _OUPath_. This specifies the organization unit for the VM computer account and it is not mandatory to specify this. Let&#8217;s take a quick look at the properties of this resource.

| **Property Name** | **Description**                                              |
| ----------------- | ------------------------------------------------------------ |
| Name              | Name of the Active Directory Domain to join                  |
| User              | Administrator account name to authenticate                   |
| Restart           | Specifies if the VM should restart after domain join. Possible values: true or false |
| Options           | Domain join options. Default option is 3.Refer to [NetJoin options on MSDN](https://msdn.microsoft.com/en-us/library/windows/desktop/aa370433(v=vs.85).aspx). |
| OUPath            | Organization Unit for the VM computer account. It is not mandatory to specify this value.Example specification: OU=testOU; DC=domain; DC=Domain; DC=com |

The [complete template that uses this new extension](https://github.com/rchaganti/armseries/blob/master/arm-series_Final-JoinDomain-Extension.json) is rather lengthy. So, click on the below Deploy to Azure button to deploy this template.

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Final-JoinDomain-Extension.json">}}

As compared to the DSC way of joining a domain, the new domain join extension method took only 31 minutes. This is it for now! Try this template and let me know what you think.
