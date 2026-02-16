# PowerShell 2.0 remoting guide: Part 7 – saving remote session to disk


In [part 6](http://139.59.40.198/blog/?p=1151) of the [remoting series](http://139.59.40.198/blog/?cat=240) we looked at how we can use Import-PSSession cmdlet to execute remote commands as if they were local. This is nice but this will last only while the session ($s in the example) is alive. The moment we kill the session — using Rem0ve-PSSession, remoting session will also get killed. In this part of the series, we will look at how we can save a remoting session to disk so that we don’t even have to explicitly create a session.

This is achieved using [Export-PSSession](http://technet.microsoft.com/en-us/library/dd347679.aspx) cmdlet. This cmdlet lets us import commands from a remote session and save the same in a PowerShell module on the local disk. This cmdlet can get cmdlets, functions, aliases, and other command types in to a PowerShell module. The following example shows how we can achieve this.

```
$s = New-PSSession -ComputerName SP2010-WFE
Invoke-Command -Session $s -ScriptBlock {Import-Module ActiveDirectory}
Export-PSSession -Session $s -OutputModule ADRemoteCommands -AllowClobber -Module ActiveDirectory
```

In the above example, the first two lines should be quite familiar by now. The third line is where the magic happens. We tell Export-PSSession cmdlet to export all the commands, aliases, functions, etc available in PS Session $s to a module on hard disk and name it ADRemoteCommands.

If the Export-PSSession is successful, you will see output similar to what is shown here

{{<figure src="/images/remoting7-1.png">}}

In the above output, it is clear that Export-PSSession generates .psm1, .psd1 and format data file for the module automatically. Now, you can load the module at any later point in time to get access to the remote commands.

**How do we import the saved module?**

If you observe the output closely, path where the module files are stored is same as $Env:PSModulePath. So, you don’t need to specify the absolute path to the module.

```
Import-Module ADRemoteCommands
```

This imports all remote commands available in the module to local session. Whenever we execute a remote command, implicit remoting kicks in, establishes the remote session, executes the command in remote session and returns the output. All this is done without you really using any remoting related cmdlets. If establishing a remote session requires a password, you will be prompted for one.

This brings us to the end of Part 7. With this, I covered all the remoting basics and we can now move on to more advanced topics like session options and WSMan configuration required for PS Remoting. Stay tuned for that..!
