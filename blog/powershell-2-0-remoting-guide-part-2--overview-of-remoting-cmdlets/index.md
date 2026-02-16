# PowerShell 2.0 remoting guide: Part 2 – Overview of remoting cmdlets


In part 1 of this series I gave a quick introduction to PowerShell 2.0 remoting. Before we look at how to enable or configure a computer for remoting, let us take a quick look at PowerShell 2.0 remoting cmdlets. Here is a complete list of cmdlets with a brief overview.

This list will also include cmdlets that are not directly used within remoting but help configure various aspects of remoting. The knowledge of these cmdlets such as WSMan, etc in this list is not mandatory for basic usage of PowerShell remoting. In this post, I will only discuss what each of these cmdlets are capable of and list any gotchas. A detailed usage of these cmdlets will be discussed later in the series.

**Enable-PSRemoting**

The [Enable-PSRemoting](http://technet.microsoft.com/en-us/library/dd819498.aspx) cmdlet configures the computer to receive Windows PowerShell remote commands that are sent by using the WS-Management technology. This cmdlet will be the first one to run if you want to use PowerShell 2.0 remoting features and needs to be run just once. This cmdlet internally calls [Set-WSManQuickConfig](http://technet.microsoft.com/en-us/library/dd819520.aspx) to configure WinRM service, enable firewall exceptions for WS Management and finally enables all registered PowerShell configurations.

BTW, you need to enable PowerShell remoting only if you want the computer receive commands from a remote machine. To only send commands to a remote machine, you don’t need to enable PowerShell remoting.

**Disable-PSRemoting**

The [Disable-PSRemoting ](http://technet.microsoft.com/en-us/library/dd819522.aspx)cmdlet disables all PowerShell session configurations on the local computer to prevent the computer from receiving any remote commands. You will have to manually stop the WinRM service if you don’t want the service to be running after you disable PowerShell remoting.

**Invoke-Command**
The [Invoke-Command ](http://technet.microsoft.com/en-us/library/dd347578.aspx)cmdlet runs commands on a local or remote computer and returns all output from the commands, including errors. With a single Invoke-Command command, you can run commands on multiple computers. This cmdlet — in it’s default form — opens a session for running a command against a remote computer and closes it once the execution is complete. This method — to some extent — is slow and can be worked around by specifying pre-defined session information.

**New-PSSession**
Invoke-Command cmdlet supports specifying an existing session to enhance the speed of overall command execution. By specifying an existing session, we eliminate the need for creating/destroying the sessions on the fly. [New-PSSession](http://technet.microsoft.com/en-us/library/dd347668.aspx) cmdlet can be used to create a persistent connection to a remote computer. By creating a persistent session, we will be able to share data, such as a function or the value of a variable between different commands executing within the PSSession.

**Enter-PSSession**

In part 1, I briefly touched upon interactive remote sessions feature. The [Enter-PSSession](http://technet.microsoft.com/en-us/library/dd315384.aspx) cmdlet starts an interactive session with a single remote computer. During the session, the commands that you type run on the remote computer, just as though you were typing directly on the remote computer. You can have only one interactive session at a time. You can specify the PSSession you created using New-PSSession as a parameter to this cmdlet.

**Exit-PSSesstion**

[Exit-PSSession](http://technet.microsoft.com/en-us/library/dd315322.aspx) exits an interactive PS Session created using Enter-PSSession cmdlet.

**Get-PSSession**
The [Get-PSSession](http://technet.microsoft.com/en-us/library/dd347584.aspx) cmdlet gets the Windows PowerShell sessions (PSSessions) that were created in the current session. This cmdlet gets all the PSSessions returns all the PSSessions in to a variable when no parameters are specified. You can then use the session information with other cmdlets such as Invoke-Command, Enter-PSSession, Remove-PSSession, etc

**Remove-PSSession**

The [Remove-PSSession ](http://technet.microsoft.com/en-us/library/dd315404.aspx)cmdlet closes PS session(s). It stops any commands that are running in the PSSessions, ends the PSSession, and releases the resources that the PSSession was using. If the PSSession is connected to a remote computer, Remove-PSSession also closes the connection between the local and remote computers.

**Import-PSSession**[
Import-PSSession](http://technet.microsoft.com/en-us/library/dd347575.aspx) cmdlet uses the implicit remoting feature of PowerShell 2.0. Implicit remoting enables you to import commands from a local/remote computer in to an existing PS session and run those commands as if they were local to the session.

**Export-PSSession**
The [Export-PSSession](http://technet.microsoft.com/en-us/library/dd315322.aspx) cmdlet gets cmdlets, functions, aliases, and other command types from another PSSession on a local or remote computer and saves them to local disk as a Windows PowerShell module. We can now use the [Import-Module](http://technet.microsoft.com/en-us/library/dd819454.aspx) cmdlet to add the commands from the saved module to a PS Session.

**Register-PSSessionConfiguration**
Any PS session created using Invoke-Command or New-PSSession or any other PowerShell remoting cmdlet for that matter uses the default PS Session configuration as specified in the $PSSessionConfigurationName variable. PS Session configuration determines which commands are available in the session, and it can include settings that protect the computer, such as those that limit the amount of data that the session can receive remotely in a single object or command. So, you can use the [Register-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819496.aspx) cmdlet creates and registers a new session configuration on the local computer.

**Unregister-PSSessionConfiguration**

The [Unregister-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819455.aspx) cmdlet deletes registered session configurations from the computer. It is possible to delete the default PSSession configurations (Microsoft.PowerShell or Microsoft.PowerShell32) using this cmdlet. In such a case, you can use Enable-PSRemoting cmdlet to re-create and register the default PS Session configurations.

**Disable-PSSessionConfiguration**

[Disable-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819437.aspx) disables a registered PS Session configuration. Remember, this only disables the configuration but not un-register or delete the information from local computer. These disabled session configurations cannot be used to establish a remoting session.

**Enable-PSSessionConfiguration**
The [Enable-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819495.aspx) cmdlet re-enables registered session configurations that have been disabled by using the [Disable-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819437.aspx) cmdlet.

**Get-PSSessionConfiguration**
The [Get-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819447.aspx) cmdlet gets the session configurations that have been registered on the local computer.

**Set-PSSessionConfiguration**
The [Set-PSSessionConfiguration](http://technet.microsoft.com/en-us/library/dd819440.aspx) cmdlet changes the properties of the registered session configurations on the local computer.

**Test-WSMan**

PowerShell remoting requires WinRM service to be running on the remote machines. You can use [Test-WSMan](http://technet.microsoft.com/en-us/library/dd819488.aspx) cmdlet to quickly check if you can establish a remoting session with other computers. If WinRM is not enabled on remote machine, you can safely assume that PowerShell remoting is not enabled. However, you can assume that PowerShell remoting is enabled just by verifying that WinRM service is running. Remember, this checks only for WinRM service and remoting requires many other components to function.

**Enable-WSManCredSSP**
PowerShell remoting supports CredSSP authentication and the same can be enabled by using [Enable-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819517.aspx) cmdlet. The Enable-WSManCredSPP cmdlet enables CredSSP authentication on a client or on a server computer. When CredSSP authentication is used, the user’s credentials are passed to a remote computer to be authenticated. This type of authentication is designed for commands that create a remote session from within another remote session. For example, you use this type of authentication if you want to run a background job on a remote computer.

**Disable-WSManCredSSP**
The [Disable-WSManCredSPP](http://technet.microsoft.com/en-us/library/dd819469.aspx) cmdlet disables CredSSP authentication on a client or on a server computer.

There are other WSMan cmdlets introduced in PowerShell 2.0 such as [Connect-WSMan](http://technet.microsoft.com/en-us/library/dd819453.aspx), [Disconnect-WSMan](http://technet.microsoft.com/en-us/library/dd819486.aspx), [Get-WSManInstance](http://technet.microsoft.com/en-us/library/dd819521.aspx), [New-WSManInstance](http://technet.microsoft.com/en-us/library/dd819516.aspx), [New-WSManSessionOption](http://technet.microsoft.com/en-us/library/dd819512.aspx), [Remove-WSManInstance](http://technet.microsoft.com/en-us/library/dd819463.aspx) and [Set-WSManInstance](http://technet.microsoft.com/en-us/library/dd819503.aspx). These cmdlets are not really meant for PowerShell remoting but we will discuss them as required.

This brings us to the end of part 2 and in the next set of posts we will look at how to enable/configure computer(s) for remoting and do some cool things. Do leave your feedback on this article. Let me know if I missed something or need to correct something.
