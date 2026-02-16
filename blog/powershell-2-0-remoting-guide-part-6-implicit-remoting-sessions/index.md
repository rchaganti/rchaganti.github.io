# PowerShell 2.0 remoting guide: Part 6 – implicit remoting sessions


In an earlier post on interactive remoting sessions, we looked at how we can enter a remote session and then execute commands as if they were local. However, if you’d observed it more closely, we were actually sitting in the remote session than local console. The change in PowerShell prompt indicates this fact clearly.

In this part of the [remoting series](http://139.59.40.198/blog/?cat=240), we will look at a feature called implicit remoting which makes it possible to run the commands / scripts on the remote computer while in the local session.

We use interactive remoting to overcome a few disadvantages of using Invoke-Command. This method too has its own drawbacks. Within interactive remoting, you explicitly enter/exit a remote session. This also means that you are connected only to one remote computer and you have access only to the cmdlets or modules available on that remote computer. What if you want to access different cmdlets available on different computers?

For example, let us say you have two different computers one with Exchange 2010 and other with SharePoint 2010. Now, if you want to access cmdlets available to manage both these technologies from a “single computer” and in the “local session”. Take a note, “single computer” and “local session” is the key to understand the concept of implicit remoting. The important thing to understand is that we need to manage multiple computers / technologies without ever the need to go out of local PowerShell session.

Using Invoke-Command is certainly not the choice because it involves setting up a session to the remote computer and then sending a script block to execute in that session. This is quite tedious. Although interactive remoting can eliminate the drawbacks of Invoke-Command, it is specific one remote session. So, if you are connected to the Exchange 2010 remote session, your SharePoint 2010 session is not available. This is where implicit remoting becomes important.

Implicit remoting can be used to bring remote commands to a local session. In implicit remoting, once you import remote commands in to a local session, you don’t have to worry about the PS session details. You can import any number of remote sessions in to the local session making it possible to access cmdlets from different product technologies in the same local session. PowerShell will take care of that for you in the background.

Now, we can connect do a different remote session and import cmdlets from that session also.

```
$s = New-PSSession -ComputerName SP2010-WFE
Invoke-Command -Session $s -ScriptBlock {Add-PSSnapin Microsoft.SharePoint.PowerShell}
Import-PSSession -Session $s
```

Now, within the local session, we have access to AD cmdlets from one computer and SharePoint 2010 cmdlets from another machine. This makes it easy to manage both from the same computer and local session without worrying much about creating / destroying sessions.

**Nice. So, how do we use implicit remoting?**

Well, we have to first create a persistent PS session using New-PSSession and then use that to import remote commands in to local session. You can do it as shown here

```
$s = New-PSSession -ComputerName SP2010-WFE
Import-PSSession -Session $s
```

By default, Import-PSSession imports all commands except for commands that have the same names as commands in the current session. To import all the commands, use the AllowClobber parameter.

If you import a command with the same name as a command in the current session, the imported command hides or replaces the original commands. Essentially, imported commands take precedence over the local commands with same name. Irrespective of whether those commands were loaded after importing a session or before. However, aliases are an exception. Original aliases in the local session take precedence over imported aliases.

To know more about the command precedence, read[ about_Command_Precedence](http://technet.microsoft.com/en-us/library/dd347579.aspx).

**How do we differentiate between local & remote commands or avoid name conflicts while importing?**

Import-PSSession provide -Prefix parameter which adds the specified prefix to the nouns in the names of imported commands. For example,

```
Import-PSSession -Session $s -Prefix RS
```

will prefix RS to all the cmdlets imported from a remote computer. So, if Get-Command was imported using this method, the local session will have Get-RSCommand and when you use this cmdlet, PowerShell implicitly runs this command inside the remote session.

As we discussed earlier in this post, PowerShell manages implicit remoting in the background. So, the behavior of Invoke-Command — creates/destroys a PS session every time we execute a remote command — exists with implicit remoting too. Hence, you will see that executing remote commands over this method a bit slow. To work around this, import-PSSession adds a -asJob parameter to all the commands imported in to the local session.

For example,

```
$s = New-PSSession -ComputerName SP2010-WFE
Import-PSSession -Session $s -Prefix RS            

Get-RSProcess -asJob
```

will run Get-Process on the remote computer as a background job. The original Get-Process has no -asJob parameter.

**How do we import modules or snap-ins in to local session?**

```
$s = New-PSSession -ComputerName SP2010-WFE
Invoke-Command -Session $s -ScriptBlock {Import-Module ActiveDirectory}
Import-PSSession -Session $s -Module ActiveDirectory
```

In the above example, we first create a PS session, import active directory module using Invoke-Command and then import the session in to the local session. This makes all the active directory cmdlets available in the local session.

This is the end of part 6 of the remoting series. In the next post, I will talk about how we can save the imported session to hard disk.
