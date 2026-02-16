# PowerShell 2.0 remoting guide: Part 10 – Restricting available commands using custom session configuration


“With great power comes great responsibility”, said uncle Ben. But some people don’t just understand that. That is when you have to rip-off their powers. Similarly, the default PS Session configuration allows full access to PowerShell language, cmdlets, scripts and everything available to PowerShell. Of course, you need to authenticate as a local administrator or should have execute permission to invoke the session. Running a few cmdlets such as Stop-Service or Restart-Computer can be quite dangerous on a production server. This is where a custom session configuration can help provide role based access to remote host using PowerShell remoting.

We touched upon creating custom session configuration in [part 9](http://139.59.40.198/blog/?p=1200) of this PowerShell [remoting series](http://139.59.40.198/blog/?cat=240). In this part, I will discuss how we can extend the concept of custom session configuration to restrict available commands and PowerShell language in a remote session. I will go striaght in to the startup script used to implement this since we already looked at how to create custom session configuration and assign permissions to a specific user.

```
$RequiredCommands = @("Get-Command",
                             "Get-FormatData",
                             "Out-Default",
                             "Select-Object",
                             "out-file",
                             "Measure-Object",
                             "Exit-PSSession"
                             )            

 $ExecutionContext.SessionState.Applications.Clear()
$ExecutionContext.SessionState.Scripts.Clear()            

Get-Command -CommandType Cmdlet, alias, function | ?{$RequiredCommands -notcontains $_.Name} | %{$_.Visibility="Private"}
$ExecutionContext.SessionState.LanguageMode="RestrictedLanguage"
```

As you see here, We have only a few required commands. We don’t want the remote user to execute commands other than this set. BTW, this set is the absolute minimum required even to start remoting session. So, consider this as a standard required commands list. Towards the end, we set the language mode to restricted to make sure the remote user cannot execute infinite loops, etc that could potentially bring the system down. This script, when used as the startup script for a session, will result in something as shown here.

{{<figure src="/images/remoting10-1.png">}}

As you see above, get-Command lists only the commands we have in the Required Commands list. However, if you have a large list of required commands, the method you have seen in the above code is not scalable. Instead, you can use a denied list of commands that is relatively small. For example, if you don’t want your users to execute Stop-Process or Restart-Computer, your code will look like

```
$DeniedCommands = @("Stop-Process",
                             "Restart-Computer"
                             )            

$ExecutionContext.SessionState.Applications.Clear()
$ExecutionContext.SessionState.Scripts.Clear()            

Get-Command -CommandType Cmdlet, alias, function | ?{$DeniedCommands -contains $_.Name} | %{$_.Visibility="Private"}
$ExecutionContext.SessionState.LanguageMode="RestrictedLanguage"
```

So, if you use this code for your startup script, you will see something like this:

{{<figure src="/images/remoting10-2.png">}}

I prefer the second method.

If you need to extend or modify the behavior of commands in a remote session, you need to create command proxies. You can read more about it @ http://blogs.msdn.com/powershell/archive/2009/01/04/extending-and-or-modifing-commands-with-proxies.aspx.

What I have shown here is just one way of achieving control in the remote sessions. However, based on your organization needs there could be a better way of doing this. These methods include user role based restrictions, etc as discussed at a [PDC’09 session](http://blogs.msdn.com/powershell/archive/2010/02/08/pdc09-svr12-and-svr13-slides.aspx). Do refer to that for more information.

This is it for now. We will look at the remote session configuration options in the next post. Stay tuned..!
