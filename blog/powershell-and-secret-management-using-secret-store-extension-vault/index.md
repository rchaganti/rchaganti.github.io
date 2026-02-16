# PowerShell and Secret Management - Using Secret Store Extension Vault


**Update**: This article has been updated to show the latest version of the secret store module.

In the last part, you have seen an introduction to secret management in PowerShell and towards the end you learned that they are vault extensions that provide the real functionality for storing and managing secrets. In this part of the series, you will learn more about the [SecretStore](https://www.powershellgallery.com/packages/Microsoft.PowerShell.SecretStore) vault extension for the [SecretManagement](https://www.powershellgallery.com/packages/Microsoft.PowerShell.SecretManagement) PowerShell module.

The SecretStore extension vault is a wrapper around the .NET Crypto API. This vault stores the secrets to the local machine based on the current user account context. You can install this from the PowerShell gallery.

```powershell
Install-Module -Name Microsoft.PowerShell.SecretStore
```

This extension vault comes with a few commands that are used to configure the vault behavior.

```powershell
PS C:\> Get-Command -Module Microsoft.PowerShell.SecretStore

CommandType     Name                                               Version    Source                                          
-----------     ----                                               -------    ------                                          
Cmdlet          Get-SecretStoreConfiguration                       0.9.1      Microsoft.PowerShell.SecretStore                
Cmdlet          Reset-SecretStore                                  0.9.1      Microsoft.PowerShell.SecretStore                
Cmdlet          Set-SecretStoreConfiguration                       0.9.1      Microsoft.PowerShell.SecretStore                
Cmdlet          Set-SecretStorePassword                            0.9.1      Microsoft.PowerShell.SecretStore                
Cmdlet          Unlock-SecretStore                                 0.9.1      Microsoft.PowerShell.SecretStore  
```

Before you can start using this extension vault, by default, you must first set a secret store password. 

```powershell
Set-SecretStorePassword
```

This command prompts for entering old and new passwords. Simply enter a desired password and hit enter. Once the password is set, you can run the `Get-SecretStoreConfiguration` command to see the default vault extension configuration.

```powershell
PS C:\> Get-SecretStoreConfiguration

      Scope Authentication PasswordTimeout Interaction
      ----- -------------- --------------- -----------
CurrentUser       Password             900      Prompt
```

As you can see, the default scope of the secret store is set `CurrentUser` and it can be otherwise set to `AllUsers`. The `Authentication` property by default requires to supply a password to manage the secrets. This can be disabled by setting the `Authentication` property to `None`. Within a session, the supplied password is valid for 900 seconds, by default. This can be changed by setting the `PasswordTimeout` property. The `Interaction` property, by default, is set to `Prompt` and can be set to `None` to ensure you are not prompted to enter password for any configuration retrieval or changes. When disabling password prompt, [you must ensure that you also set `Authentication` to `None`](https://github.com/PowerShell/SecretStore/issues/49) to avoid lockdown of secret store. In case you want to set the `Interaction` to `None` but still leave the `Authentication` to `Password`, you can use the `Unlock-SecretStore` command to unlock the vault.

Once this initial configuration is complete as per your needs, you can register this extension vault with the secret management module.

```powershell
Register-SecretVault -ModuleName Microsoft.PowerShell.SecretStore -Name SecretStore -DefaultVault -Verbose
```

The above command registers Microsoft.PowerShell.SecretStore module as the extension vault and sets as the default vault. The `Get-SecretVault` command retrieves all registered extension vaults. 

```powershell
PS C:\> Get-SecretVault 

Name        ModuleName                       IsDefaultVault
----        ----------                       --------------
SecretStore Microsoft.PowerShell.SecretStore True 
```

You can start storing secrets using the SecretManagement module commands now.

```powershell
Set-Secret -Name GITHUB_TOKEN -Secret 'ThIsIsANAPIKeyFoRGitHUBAuthentICation'
```

You can get a secret value by using the `Get-Secret` command. You must use `-AsPlainText` switch to return the stored secret as readable string.

```powershell
Get-Secret -Name GITHUB_TOKEN -AsPlainText
```

The `Get-SecretInfo` returns the metadata information related to the secret.

```powershell
PS C:\> Get-SecretInfo -Name GITHUB_TOKEN

Name         Type   VaultName  
----         ----   ---------  
GITHUB_TOKEN String SecretStore
```

You can remove a stored secret using the `Remove-Secret` command. 

```powershell
Remove-Secret -Name GITHUB_TOKEN
```

This is a quick overview of using the SecretStore extension vault with SecretManagement module. You will learn more about other extension vaults and secret management module itself in later parts of this series. Stay tuned.
