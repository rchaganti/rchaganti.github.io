# Attaching scripts or tasks to Windows event log entries using PowerShell and WMI


During a few load test iterations on a SharePoint farm, I started seeing some SQL exceptions in the application log of SharePoint servers. If you are familiar with SharePoint platform, you may have seen these events such as event ID [3355](http://technet.microsoft.com/en-us/library/ee513066.aspx). This event complains that the SharePoint server cannot connect to SQL server. This need not really mean that the DB server is offline. So, to find out the real reason behind these event logs, I needed to start some trace activities whenever event ID 3355 gets logged.

Initially, I was looking for [eventtriggers.exe](http://technet.microsoft.com/en-us/library/bb490901.aspx) which is meant for attaching a script or task to an event log. However, I could neither find this on Windows Server 2008 R2 nor an external download. So, I wanted to look at other options I had.  I found that there are multiple ways to achieve this.

### Attach to script or task to the event in Windows Event Viewer

You can find this option in event viewer. This link is available in the actions pane of event viewer upon selecting an event.

{{<figure src="/images/log1-1.png">}}

However, this method is available only if the event log entry you are interested exists in the log. Which meant that, this wizard cannot be used to specify the event ID I wanted to monitor without actually pre-selecting the event entry. In my case, I cleared the even log after some tests and did not have the entry for ID 3355 in the application log. So, this method was not an option for me to attach a script to this specific event ID. By the way, this method create a scheduled task. This will appear under Event Viewer tasks in Task Scheduler.

**Update:** We can use Task Scheduler to create an event trigger. If you go to task scheduler and click on ‘Create Task’, you can select an event as the trigger and specify an event ID there. Take a look at the image below:

{{<figure src="/images/log1-2.png">}}

I did not use this technique. Instead, chose to use PowerShell to do this for me.

### Create a WMI event subscription using Register-WMIEvent or Management Event Watcher .NET class in PowerShell

The [System.Management.ManagementEventWatcher](http://msdn.microsoft.com/en-us/library/system.management.managementeventwatcher.aspx) .NET class can be used to create an event watcher. This takes a WMI query and starts listening for any specified events. For example,

```
$watcher = new-object system.management.ManagementEventWatcher
$watcher.query = "Select * From __InstanceCreationEvent Where
                  TargetInstance ISA 'Win32_NTLogEvent' AND
                  TargetInstance.LogFile='Application' AND
                  targetInstance.EventCode=3355"
$watcher.WaitForNextEvent()
```

Or, Register-WMIEvent — available in PowerShell v2 — can do the same job.

```
$query = "Select * From __InstanceCreationEvent Where
          TargetInstance ISA 'Win32_NTLogEvent' AND
          TargetInstance.LogFile='Application' AND
          TargetInstance.EventCode=3355"
Register-WmiEvent -Query $query -Action { Write-Host "Event Arrived or something useful here" }
```

The WMI query here simple. We just want to monitor Application log for any event with event code 3355. Both the above methods have a drawback. They are only [temporary event consumers](http://msdn.microsoft.com/en-us/library/aa392396(v=vs.85).aspx#using_temporary_event_consumers). A temporary event consumer exists only as long as the host is alive. The moment we close the PowerShell host, we lose these event subscriptions. However, I did not know when this even will happen again. So, I need the WMI event subscription to survive system reboots.

### Create a permanent WMI event consumer in PowerShell

So, the best choice for me here was to create a [permanent event consumer](http://msdn.microsoft.com/en-us/library/aa392396(v=vs.85).aspx#using_permanent_event_consumers) that can survive system reboots as well. I can create a WMI permanent consumer of command-line type in PowerShell.

> Note
> You need to have the knowledge of WMI Query language to create WMI event consumers (permanent or temporary) in PowerShell.  If you are new to WMI or WMI query language, refer to my eGuide on ‘***WMI Query Language via PowerShell***‘ available at http://139.59.40.198/blog/?page_id=2134

As I explained in the last chapter of my WQL eguide, creating a WMI event consumer in PowerShell requires lot of typing. So, I chose a shortcut and used the [PowerEvents](http://powerevents.codeplex.com/) module. This module provides an easy way to create WMI event consumers using cmdlets. So, as a solution to my event log monitoring problem, I used the following 4 lines of PowerShell code. 

```
Import-Module PowerEvents            

#Create a WMI Query for the event log entry
$query = "SELECT * FROM __InstanceCreationEvent WHERE
          TargetInstance ISA 'Win32_NTLogEvent' AND
          TargetInstance.LogFile='Application' AND
          TargetInstance.EventCode=3355"            

#Create an event filter
$filter = New-WmiEventFilter -Name "Event Filter for Event ID 3355" -Query $query            

#Create an event consumer
$consumer = New-WmiEventConsumer -Verbose -Name "Event Consumer for Event ID 3355" -ConsumerType CommandLine `
            -CommandLineTemplate "cmd.exe /c `"C:\debug\event.cmd`""            

#Bind the filter and consumer together         
New-WmiFilterToConsumerBinding -Filter $filter -Consumer $consumer -Verbose
```

The above code is really self-explanatory. Whenever there is an event ID with a code 3355, this permanent WMI event consumer will trigger C:\debug\event.cmd which in turn starts a trace or some kind of logging.

This is it for today. Hope this is helpful.
