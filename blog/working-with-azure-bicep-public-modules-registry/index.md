# Working with Azure Bicep Public modules registry


Starting with Bicep version 0.5.6, Microsoft added support for consuming from a public module
repository hosted on Microsoft Container Registry (MCR). To consume a module from Microsoft’s
pubic registry, you need to use the following syntax.

```
module <module-id> 'br/public:<module-group>/<module-name>:<version>' = { ... }
```

`br/public` indicates that you want to consume the module hosted on MCR. Here is an example of
creating a Azure virtual network using the virtual-network module. The version tag is mandatory.

```bicep
module samplevNet 'br/public:network/virtual-network:1.0.1' = {
  name: '${uniqueString(deployment().name, 'EastUS')}-vnet'
  params: {
    name: 'vnet-bicep-sample'
    addressPrefixes: [
      '10.0.0.0/24'
    ]
  }
}
```

An index of modules available in this public registry can be seen at [Azure/bicep-registry-modules: Bicep registry modules (github.com)](https://github.com/Azure/bicep-registry-modules#bicep-registry-modules). There is a better way to find out the list of modules from the Microsoft's public registry.

```powershell
[CmdletBinding()]
param
(

)

$mcrUrl = 'https://mcr.microsoft.com/v2/_catalog'
$allRepos = (Invoke-RestMethod -Uri $mcrUrl -ErrorAction SilentlyContinue).repositories

$moduleList = [System.Collections.ArrayList]@()

if ($allRepos)
{  
    $bicepRepos = $allRepos.Where({$_.StartsWith('bicep')})

    foreach ($bicepRepo in $bicepRepos)
    {        
        $tagsUrl = ("https://mcr.microsoft.com/v2/{0}/tags/list" -f $bicepRepo)
        $tagsObject = Invoke-RestMethod -Uri $tagsUrl
        $null = $moduleList.Add([PSCustomObject]@{
            Name = $tagsObject.Name
            Tags = $tagsObject.tags
        })
    }
}

return $moduleList
```

You can save this script to a local folder and invoke it at the command line.

```powershell
PS C:\scratch> .\get-bicepmodule.ps1

Name                                Tags          
----                                ----          
bicep/samples/hello-world           {1.0.1, 1.0.2}
bicep/samples/array-loop            {1.0.1}       
bicep/compute/availability-set      {1.0.1}       
bicep/deployment-scripts/import-acr {1.0.1}       
bicep/network/virtual-network       {1.0.1}
```

There are not many modules in the public registry today. However, you can [contribute modules](https://github.com/Azure/bicep-registry-modules/blob/main/CONTRIBUTING.md) to registry yourself.

