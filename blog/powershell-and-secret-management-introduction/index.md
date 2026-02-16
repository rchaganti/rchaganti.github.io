# PowerShell and Secret Management - Introduction


**Update**: This article has been updated to show the latest version of the secret management module.

Within the infrastructure automation, you always stumble upon a need to store and retrieve credentials. For example, imagine deploying a database instance and you want the database administrator username and password to be same across based on some IT standard. For this, you either have to hardcode the values in a script or prompt the user running the automation for these values. Storing secrets such as passwords, API keys, etc is a big NO. You should never do that. And, prompting a user will hamper the automation flow and will require manual intervention. This is where secret vaults play a role. You can store all secrets in a vault (local or remote) and then on-demand you can retrieve these values from the vault and consume in your automation. This method is most preferred when delegating automation tasks, running scripts in CI / CD pipelines, and in general anything that requires unattended automation.

Within many of my PowerShell scripts, I have used Windows Credential Manager to store and retrieve secrets. PowerShell gallery has a bunch of modules that enable secret management in PowerShell. There are other 3rd party vaults such as [Hashicorp Vault](https://www.vaultproject.io/). At Ignite 2019, PowerShell team [introduced secrets management in PowerShell](https://myignite.techcommunity.microsoft.com/sessions/83981?source=sessions). This is available on [GitHub](https://github.com/powershell/secretmanagement) and [PowerShell Gallery](https://www.powershellgallery.com/packages/Microsoft.PowerShell.SecretManagement) as well.

```powershell
Install-Module -Name Microsoft.PowerShell.SecretManagement
```

This module provides the plumbing needed to register secret vaults and then store/retrieve secrets from the registered vaults.

```powershell
PS C:\> Get-Command -Module Microsoft.PowerShell.SecretManagement
CommandType     Name                                               Version    Source
-----------     ----                                               -------    ------
Cmdlet          Get-Secret                                         0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Get-SecretInfo                                     0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Get-SecretVault                                    0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Register-SecretVault                               0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Remove-Secret                                      0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Set-Secret                                         0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Set-SecretInfo                                     0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Set-SecretVaultDefault                             0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Test-SecretVault                                   0.9.1      Microsoft.PowerShell.SecretManagement           
Cmdlet          Unregister-SecretVault                             0.9.1      Microsoft.PowerShell.SecretManagement  
```

Before you can start managing secrets, you need to register a secret vault. By default, there is no registered vault. 

> Note: The earlier alpha version of this module had a built-in vault  that was a wrapper around the Windows Credential Manager. It has now been [moved out as a vault extension](https://www.powershellgallery.com/packages/Microsoft.PowerShell.SecretStore). 

You can verify that using the `Get-SecretVault` command. The secret management module vault extensions can be developed to add support for many secret vaults that already exist out there. There are bunch of them already on the [PowerShell gallery](https://devblogs.microsoft.com/powershell/secrets-management-module-vault-extensions/#:~:text=The%20purpose%20of%20the%20Secrets%20Management%20module%20is,that%20allows%20registration%20of%20other%20secrets%20storage/retrieval%20solutions.).

You can download the vault extension from PowerShell gallery the same way you download any module.

```powershell
Install-Module -Name Microsoft.PowerShell.SecretStore
```

Each secret store or the vault extension may have it's own configuration. In the next part of this series of articles on secret management in PowerShell, you will learn how to use the [SecretStore](https://www.powershellgallery.com/packages/Microsoft.PowerShell.SecretStore) vault extension. 

Stay tuned!
