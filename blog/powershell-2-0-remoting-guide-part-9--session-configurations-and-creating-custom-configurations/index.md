# PowerShell 2.0 remoting guide: Part 9 – Session configurations and creating custom configurations


In part2 of this series on [PowerShell remoting ](http://139.59.40.198/blog/?cat=240)we quickly looked at various cmdlets that form part of overall remoting infrastructure. The list there included cmdlets related to PS Session configuration. Now that we have gone through the basics of remoting, it is time for us to dig in to these additional cmdlets and explore what they really do.

So, in this part, we will look at all the PS session configurtion cmdlets, discuss how to create custom PS Session configurations and the need for it. Let us dive in to this now.

**What is PS session configuration?**

A session configuration can be used to define who can create a Windows PowerShell sesion on the local computer, what level of access — to cmdlets, scripts and PowerShell language — they have on the local computer, etc. When you enable PowerShell remoting using Enable-PSRemoting, you will see a final step performing Microsoft.PowerShell and Microsoft.PowerShell32 (on x64 systems) session configuration registrations. These default session configurations are used when the remote users connecting to local system do not specify a configuration name. By default, only members of administrators group have access to these two session configurations. Hence, only members of administrators group will be able to create remoting sessions by default.

Based on the above description, PowerShell session configurations can be used to

- Customize the remoting experience for users
- delegate administration by creating session configuration with varying levels of access to system

In this part, we will look at basics of session configuration and see how we can create custom session configurations. We will discuss delegated administration at depth in a later post.

**What cmdlets are available to manage session configurations?**

The following cmdlets are available to manage session configuration.

Register-PSSessionConfiguration
Unregister-PSSessionConfiguration
Enable-PSSessionConfiguration
Disable-PSSessionConfiguration
Set-PSSessionConfiguration
Get-PSSessionConfiguration

**How do I create a new session configuration?**

Register-PSSessionConfiguration cmdlet can be used to create a new session configuration. You can use a C# asembly or a PowerShell script as a startup script for this new session configuration. This startup script can be used to customize the remoting experience. For example, create a script the imports Active Directory module using import-module cmdlet as shown here.

```
Import-Module ActiveDirectory
```

Save this script as startupscript.ps1 or any name of your choice on the local computer. Now, use the Register-PSSessionConfiguration cmdlet to create a new session configuration. This can be done by running:

```
Register-PSSessionConfiguration -Name "ActiveDirectory" -StartupScript C:\scripts\StartupScript.ps1
```

You will be prompted to confirm this action and at the end to restart WinRM service on the local computer.

> Note: You must enable script execution on the local computer to be able to use the startup script as a part of session configuration

**How do I see available session configurations?**

Get-PSSessionConfiguration cmdlet lists all the available session configurations on the local computer.

{{<figure src="/images/remoting9-1.png">}}

As you see in the above output, Get-PSSessionConfiguration lists all available session configurations on the local computer and who has permission to access the configuration. No permissions have been assigned yet to the new active directory configuration.

**How do I give permissions to a session configuration?**

You can use Set-PSSessionConfiguration to allow access to invoke the new session configuration. To do this,

```
Set-PSSessionConfiguration -Name ActiveDirectory -ShowSecurityDescriptorUI
```

This opens up the dialog to add permissions to invoke this session configuration. As you see in the screenshot here, administrators group has no invoke permission on this session configuration.

{{<figure src="/images/remoting9-2.png">}}

Select Allow -> Invoke permission here and click OK. You will be prompted to restart the WinRM service. Now, an administrator or a member of administrators group will be able to use this session configuration.

**How do I invoke a session configuration?**

You can use New-PSSession, Enter-PSSession and Invoke-Command cmdlets to load a session configuration othen than the default configuration. The ConfigurationName parameter can be used to specify the session configuration.

```
$s = New-PSSession -ComputerName SP2010-WFE -ConfigurationName ActiveDirectory      
Enter-PSSession -ComputerName SP2010-WFE -ConfigurationName ActiveDirectory            
Invoke-Command -ComputerName SP2010-WFE -ConfigurationName ActiveDirectory -ScriptBlock {Get-Process}
```

> Note: To be able to use the -StartupScript, script execution policy must be set to signed or unrestricted on the local computer where the session configuration is registered.

In an earlier post — [part 6: Implict remoting sessions](http://139.59.40.198/blog/?p=1151) — we used Invoke-Command to load the active directory module within a persistent sesion and then use that persistent session to import active directory cmdlets in to local session. However, by using a session configuration that import active directory module as a startup script, we will have all the AD cmdlets available as soon as we connect to the remote session.

**How do I disable a session configuration?**

You can use Disable-PSSessionConfiguration cmdlet to disable an existing session configuration and prevents users from connecting to the local computer by using this session configuration. You can use -Name parameter to specify what session configuration you want to disable. If you do not specify a configuration name, the default Microsoft.PowerShell session configuration will be disabled.

The Disable-PSSessionConfiguration cmdlet adds a “deny all” setting to the security descriptor of one or more registered session configurations. As a result, you can unregister, view, and change the configurations, but you cannot use them in a session. Disable-PSRemoting cmdlet will disable all PS Session configurations available on the local computer.

Enable-PSSessionConfiguration cmdlet can be used to enable a disabled configuration. You can use -Name parameter to specify what session configuration you need to enable.

**How do I delete a session configuration?**

You can use Unregister-PSSessionConfiguration cmdlet to delete a previously defined session configuration. It is quite possible to delete the default session configuration — Microsoft.PowerShell — using this cmdlet. However, this default session configuration gets re-created when you run Enable-PSRemoting cmdlet.

This brings us to the end of this part on PS session configurations. In the next part, I will talk about delegated administration using session configurations.
