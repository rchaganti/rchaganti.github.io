# PowerShell 2.0 remoting guide: Part 5 – interactive remoting sessions

 In this part of the [remoting series](http://139.59.40.198/blog/?cat=240), I will talk about using Enter-PSSession and Exit-PSSession cmdlets to perform interactive remoting.

**Why do you need interactive remoting?**

To understand the advantages of interactive remoting in PowerShell 2.0, let us first look at some gotchas with Invoke-Command. Take an example of a remote system where SharePoint 2010 is installed. SharePoint 2010 provides native PowerShell cmdlets and these cmdlets can be accesses only if you load Microsoft.SharePoint.PowerShell PS snap-in. So, to do this using Invoke-Command

```
$s = New-PSSession -ComputerName SP2010-WFE            

#load the PS Snap-in to enable SharePoint PS cmdlets
Invoke-Command -Session $s -ScriptBlock {Add-PSSnapin Microsoft.SharePoint.PowerShell}

#$s has the PowerShell cmdlets now
Invoke-Command -Session $s -ScriptBlock {Get-SPWeb http://sp2010-wfe:999}
```

If you look at the above code, we will have to use a persistent session so that we can use SharePoint cmdlets in subsequent Invoke-Command calls.

Another caveat will be the unavailability of remote computer cmdlets in the local PowerShell session — in this case, the SharePoint 2010 cmdlets. This — essentially – means that we cannot use Get-Help or Get-Command cmdlets against the SharePoint 2010 cmdlets in the local session unless we pass that as a script block to Invoke-Command.

One more disadvantage of using Invoke-Command is unavailability of command completion. Unless the cmdlet you are using inside the scriptblock is available locally, you cannot use tab completion. This can be a pain for many, including me.

This where interactive remoting comes in to play.

**How do you start interactive remoting?**

Enter-PSSession enables interactive sessions with remote computer. You can use this cmdlet the same way you’d use Invoke-Command.

```
Enter-PSSession -ComputerName SP2010-WFE
```

{{<figure src="/images/remoting5-1.png">}}

As shown in the above screenshot, PowerShell prompt changes to reflect that you are in the remote session. Now, taking the above example of SharePoint 2010 cmdlets, you can load the PS Snap-in as if you were loading it locally without using Invoke-Command

```
Add-PSSnapin Microsoft.SharePoint.PowerShell
```

Once the snap-in loaded, you will have access to all the SharePoint 2010 cmdlets as if they are available on the local computer. You can verify that by using Get-Help against one of the SharePoint 2010 cmdlets.

```
Get-Help Get-SPWeb -Full
```

Enter-PSSession when used with -ComputerName parameter, creates a PSSession in the background and uses that throughout the life of a remote session.

**How do I exit a interactive session?**

You can use Exit-PSSession to come out of an interactive PS Session. This will close any temporary session created in the background. So, it means that any variables or data you created during the interactive session won’t be available once you exit the session.

**How about using persistent sessions in interative remoting?**

Oh yes, that is a great idea. In fact, it will be advantageous to use persistent sessions. By using a persistent session, you can enter and exit the interactive session as many times as you like. All the data and variables you created in the remote session will persist until you remove the session. You can do it the same way you used persistent sessions with Invoke-Command.

```
$s = New-PSSession -ComputerName SP2010-WFE
Enter-PSSession -Session $s
```

**Can I enter an existing PSSession?**

Yes. You can use Get-PSSession cmdlet to see a list of all available/opened PS Sessions and then use Enter-PSSession as shown above to start interactive remoting. As you see here, I will pipe Get-PSSession output to Format-List cmdlet to get all session details.

{{<figure src="/images/remoting5-2.png">}}

There are four ways to enter an existing PS Session for interactive remoting. I have highlighted the available options in the above screenshot. You can use which ever way is convenient.

```
Enter-PSSession -id 1
Enter-PSSession -InstanceId 55a417ed-f903-4265-a4dc-c892c2500e0d
Enter-PSSession -Name Session1            

$s = Get-PSSession -Id 1
Enter-PSSession -Session $s
```

All of the above options start interactive session using the persistent session “session1”. It is just more than one way to do the same thing.

Alright. This brings us to the end of this part on Interactive remoting sessions. In this next part, I will talk about something called implicit remoting. Stay tuned..!
