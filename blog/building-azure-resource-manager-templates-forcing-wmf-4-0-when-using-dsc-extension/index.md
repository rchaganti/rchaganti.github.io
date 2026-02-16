# Building Azure Resource Manager Templates – Forcing WMF 4.0 when using DSC Extension


This subject won't really need a post of its own but I will do it anyway. In the previous part of this [ARM series][1], I showed how we can use the domain join extension instead of DSC to join a VM to an existing AD domain. This resulted is huge savings in time taken to deploy the entire scenario. When I was talking to my good friend, fellow PowerShell MVP and all-things-Azure guru, [Ben Gelens][2], he was quick to point that the delays when using DSC extension here could be due to the install of WMF 5.0. Indeed!

When you use Azure DSC extension, it by default installs latest available version of WMF 5.0 (production preview at the time of this writing) which requires a reboot! Therefore, using DSC extension in ARM templates for down-level OS such as Windows Server 2012 or 2012 R2, there will be delays. But, there is a workaround. We can force DSC extension to use WMF 4.0. Here is how we do that.

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
            "WmfVersion":  "4.0",
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

Observe line number 19. We use the WmfVersion property and set it to 4.0. This forces DSC extension to use WMF 4.0 instead of installing latest WMF 5.0 bits. Remember to use this method, for down-level OS where WMF / PS 5.0 isn&#8217;t available by default and where you don&#8217;t need any features provided by WMF / PS 5.0, to make sure deployment times are optimized.

**Note:** If you need to do this outside an ARM template, [you can do so by creating the JSON needed for this and then use the Azure PowerShell cmdlets][3].

You can click the Deploy to Azure button below to deploy the sample scenario detailed in this article series.

{{<azdeploy "https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Frchaganti%2Farmseries%2Fmaster%2Farm-series_Storage-VirtualNet-LinkedTemplate-Complete.json">}}

By forcing DSC extension to use WMF 4.0, the complete sample scenario (with one AD VM and three VMs joining the domain) was completed in 33 mins!

[1]: http://azrs.tk/armseries
[2]: https://twitter.com/bgelens
[3]: https://blogs.msdn.microsoft.com/powershell/2015/10/01/how-to-use-wmf-4-with-azure-dsc-extension-in-azure-cloud-service-manager-asm/
