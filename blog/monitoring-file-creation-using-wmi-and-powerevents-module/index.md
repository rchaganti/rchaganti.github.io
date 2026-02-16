# Monitoring file creation using WMI and PowerEvents module


There are several ways we can create a file monitoring script using PowerShell. There is also a cmdlet in PowerShellPack called Start-FileSystemWatcher to monitor file /folder changes. However, none of these methods survive a exit at the console or wherever the script is running. This is because all these methods create a temporary event consumer. As I’d mentioned in an earlier post, [Trevor’s ](http://www.twitter.com/pcgeek86)[PowerEvents](http://powerevents.codeplex.com/) module makes it very easy to create permanent event consumers in PowerShell. In today’s post, we shall look at how we can do that.

Before we dig into that, let us first see how we can create a file monitoring script using PowerShell. Many people use CIM_DirectoryContainsFile class and create an event listener. This is how we use do that class in PowerShell.

```
$query = "Select * from __InstanceCreationEvent WITHIN 5 WHERE TargetInstance ISA 'CIM_DirectoryContainsFile' AND TargetInstance.GroupComponent='Win32_Directory.Name=""C:\\\\Scripts""'"
Register-WmiEvent -Query $query -Action {
        Write-Host "A new file $($event.SourceEventArgs.NewEvent.TargetInstance.PartComponent) got created"
    }
```

{{<figure src="/images/monitor1-1.png">}}

As you see in the above output, what we get as a part of event data is just that string contained in **$Event.SourceEventArgs.NewEvent.TargetInstance.PartComponent**. Of course, if you are RegEx lover, you’d just parse that and find the name (extension, etc) of the new file that just got created. However, there is an efficient and easy way to do that. And, that is: monitoring the CIM_DataFile class itself. This is how we do it:

```
$query = "Select * from __InstanceCreationEvent WITHIN 5 WHERE TargetInstance ISA 'CIM_DataFile' AND TargetInstance.Drive='C:' AND TargetInstance.Path='\\Scripts\\'"
Register-WmiEvent -Query $query -Action {
        $event.SourceEventArgs.NewEvent.TargetInstance | Select -Expand FileName, Extension, Name | Out-Host
    }
```

And, this is what we see in the output.

{{<figure src="/images/monitor1-2.png">}}

We selected only a few properties from the available list of properties. But, this should give you an idea why I prefer using CIM_DataFile as compared to CIM_DirectoryContainsFile when monitoring for file creation. Similarly, we can monitor file deletions and modifications by subscribing to **__InstanceDeletionEvent** and **__InstanceModificationEvent**. The usage of these two classes is more or less similar. So, I will skip those aspects in this post.

However, as I mentioned earlier, we are only creating temporary event consumers by using Register-WMIEvent cmdlet. This is not really helpful since we have to keep the console window where we registered the event always open. We can solve this problem by using a permanent WMI event consumer. This is what PowerEvents module does. It helps us create any of the five permanent WMI consumers.

So, for todays post, we shall look at creating a log file consumer using PowerEvents module.

First, we need [download ](http://powerevents.codeplex.com/)and import the module using Import-Module cmdlet. Once this is done, we need to create an event filter for the event we want to subscribe. This is done using **New-WMIEventFilter** cmdlet.

```
$query = "Select * from __InstanceCreationEvent WITHIN 5 WHERE TargetInstance ISA 'CIM_DataFile' AND TargetInstance.Drive='C:' AND TargetInstance.Path='\\Scripts\\'"
$eventFilter = New-WmiEventFilter -Name "FileMonitor" -Query $query
```

Now, we need to create a event consumer. In this case, a log file consumer.

```
$eventConsumer = New-WmiEventConsumer -ConsumerType LogFile -Name NewFileCreated -FileName C:\Logs\FileMonitor.log `
 -Text "New File has been created: %TargetInstance.Name%"
```

Once we have both filter and consumer, we can bind them together to create the permanent event consumer.

```
#This is how we create a binding
New-WmiFilterToConsumerBinding -Filter $eventFilter -Consumer $eventConsumer
```

This is it. Now, whenever a file gets created in the C:\Scripts folder, we’ll see a entry in the log file at C:\Logs\FileMonitor.log. It’d look like:

{{<figure src="/images/monitor1-3.png">}}

These log entries will appear even after a system reboot. This is the benefit of WMI permanent consumers. If you want to learn more about WMI query language syntax used in this post, refer to my [WQL series](http://139.59.40.198/blog/?p=1845).
