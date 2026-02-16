# PowerShell 2.0 remoting guide: Part 11 – Interpreting, formatting and displaying remote output


In this part of the [remoting series](http://139.59.40.198/blog/?cat=240), we look at remoting output. This includes how the output is transferred from remote computer to local, how it is displayed and how we can format this output based on a need. We already discussed various methods to execute commands ([part4](http://139.59.40.198/blog/?p=1108), [part 5](http://139.59.40.198/blog/?p=1140) and [part 6](http://139.59.40.198/blog/?p=1151)) on a remote computer. In this post, for the sake of our discussion of remoting output, I will use only Invoke-Command method to execute remote commands. However, I will point out the differences as required.

> Note: Most of this does not apply within an interactive remoting session

The concepts of remoting output are explained in a TechNet article at http://technet.microsoft.com/en-us/library/dd347582.aspx. I am going to put some story around this to help you understand the concepts well.

First, let us start with an obvious difference in the output received from a remote session. If you use Invoke-Command to run Get-PSDrive, you see something like this.

{{<figure src="/images/remoting11-1.png">}}

You can see an additional column in the output that shows the remote computer name with PSComputerName as the column name. This won’t be displayed if you run the same cmdlet on local computer. So, if you don’t want to display this information in the remote output you can use the -HideComputerName parameter.

It is also possible that some cmdlets may not display PSComputerName property. For example, Get-Date. In such a scenario you can add PSComputerName to the output of Get-Date as shown here

```
Invoke-Command -ComputerName SP2010-WFE,SP2010-APP -ScriptBlock {Get-Date} | ft DateTime, PSComputerName -Auto
```

{{<figure src="/images/remoting11-2.png">}}

**How remote command output is sent over to local computer?**

The objects that Windows PowerShell cmdlets return cannot be transmitted over the network. So, the live objects are “serialized”. In other words, the live objects are converted into XML representations of the object and its properties. Then, the XML-based serialized object is transmitted across the network to the local session where it gets deserialized in to .NET object. This is how an [MSDN ](http://msdn.microsoft.com/en-us/library/ms973893.aspx)article defines serialization in .NET framework.

> Why would you want to use serialization? The two most important reasons are to persist the state of an object to a storage medium so an exact copy can be recreated at a later stage, and to send the object by value from one application domain to another. For example, serialization is used to save session state in ASP.NET and to copy objects to the clipboard in Windows Forms. It is **also used by remoting** to pass objects by value from one application domain to another.

**So, what does this mean to us in PowerShell remoting?**

As it is defined above, the live objects are converted in to XML based representation. So, once deserialized in the local session, they don’t expose any methods that actually belong to the object. Let us see an example to understand this. First, let us look at Get-Process output in a local session and see what all methods we see.

{{<figure src="/images/remoting11-3.png">}}

Here, you can see a list of methods you can use against a process object. Now, let us take a look at how this looks when we execute the same command in a remote session.

{{<figure src="/images/remoting11-4.png">}}

If you observe in the above screenshot, TypeName represents a deserialized object and there are no methods that you can use against a process object. A deserialized object represents a snapshot of get-process at the time of command execution in the remote session. This also means that you can’t execute methods such as Kill() against a deserialized process object. Also, no methods to modify the property set will work in the local session.

Windows PowerShell blog has a nice post on [how objects are to and from a remote session](http://blogs.msdn.com/powershell/archive/2010/01/07/how-objects-are-sent-to-and-from-remote-sessions.aspx). I recommend that you read this post for more information.

**What about output formatting?**

Most deserialized objects are automatically formatted for display by entries in the Types.ps1xml or Format.ps1xml files. However, the local computer might not have formatting files for all of the deserialized objects that were generated on a remote computer. When objects are not formatted, all of the properties of each object appear in the console in a streaming list. To get formatting data from another computer, use the Get-FormatData and Export-FormatData cmdlets. Again, let us take an example to understand this.

Take an example of a SharePoint 2010 farm and you want to access /run SharePoint 2010 cmdlets from a Windows 7 machine using Invoke-Command. First, if we run Get-SPSite on SharePoint 2010 web frontend, you will see

{{<figure src="/images/remoting11-5.png">}}

Now, if we try to run the same in a remote session using Invoke-Command, you will see

{{<figure src="/images/remoting11-6.png">}}

As you see in the above screenshot, the output from a remote session is quite different from the one you saw in a local session. This is because we don’t have the formatting data available on the Windows 7 computer.

**So, how do we get the formatting data to local computer?**

We can use Get-FormatData, Export-FormatData and Update-FormatData cmdlets to get the formatting data from a remote computer to local session. To do this:

```
$s = New-PSSession -ComputerName SP2010-WFE
Invoke-Command -session $s -ScriptBlock {Add-PSSnapin Microsoft.SharePoint.PowerShell}
Invoke-Command -Session $s -ScriptBlock {Get-FormatData -TypeName *SharePoint*} | Export-FormatData -Path C:\scripts\SharePoint.Format.ps1xml
Update-FormatData -PrependPath C:\scripts\SharePoint.Format.ps1xml
```

The above code snippet will let you import the formatting data for all SharePoint cmdlets in to the local session. Now, if we run Get-SPSite in the remote session using Invoke-Command, you will see

{{<figure src="/images/remoting11-7.png">}}

Now, with the formatting information in the local session, you can see that Get-SPSite output is formatted similar to the one we saw when we ran the cmdlet in a local session. However, make a note that this applies only to the current session. If you close and re-open the PowerShell console, the formatting data will be lost. You can add the Update-FormatData cmdlet to your PowerShell profile to make the format data across all PowerShell sessions.

This is it. We are just a few more posts away from completing this PowerShell remoting series. Do let me know your feedback and let me know if you want to see something more around remoting.
