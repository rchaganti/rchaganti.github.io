# PowerShell and Secret Management - Updates


At the recent Ignite event, Microsoft announced the release candidate 2 update of PowerShell `SecretManagement` module and the `SecretStore` extension vault modules. Both modules have been bumped up to version 0.9.1. 

In the updated release, the secret management module has added support for secret metadata. The extension vault module must implement support for the metadata for this to work. To this extent, the SecretStore module has been updated to support metadata as well. 

This metadata can be useful in tagging additional non-sensitive details that describe the secret. For example, you can use secret metadata if you want to store the tenant or subscription associated with the secret.

```powershell
Set-Secret -Name GITHUB_TOKEN -Secret 'ThIsIsANAPIKeyFoRGitHUBAuthentICation' -Metadata @{'github_handle'='rchaganti'}
```

The additional metadata can be retrieved using the `Get-SecretInfo` command. 

```powershell
Get-SecretInfo -Name GITHUB_TOKEN | fl *
```

You can update existing metadata or add new metadata by using the `Set-SecretInfo` command.

```powershell
Set-SecretInfo -Name GITHUB_TOKEN -Metadata @{'TestKey'='TestValue';'github_handle'='rchaganti'}
```

Another good update that I have seen is about more meaningful error messages. For example, when you run `Get-Secret` command when no vaults are registered, you will see a more friendly error message.

```powershell
PS C:\> Get-Secret -Name GITHUB_TOKEN
WARNING: 
        There are currently no extension vaults registered.
        At least one vault must be registered before SecretManagement can add or retrieve secrets.
        You can download SecretManagement extension vault modules from PowerShellGallery.
        https://aka.ms/SecretManagementVaults
        
Get-Secret : The secret GITHUB_TOKEN was not found.
At line:1 char:1
+ Get-Secret -Name GITHUB_TOKEN
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (Microsoft.Power...etSecretCommand:GetSecretCommand) [Get-Secret], ItemNotFound 
   Exception
    + FullyQualifiedErrorId : GetSecretNotFound,Microsoft.PowerShell.SecretManagement.GetSecretCommand
```

Microsoft announced that the RC2 release of the SecretManagement and SecretStore modules are go live versions and will most probably be promoted to GA release if there are no high-risk bugs.
