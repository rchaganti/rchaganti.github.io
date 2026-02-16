# WMI Query Language (WQL) – Event Queries: Introduction


In this post, I will write a bit about basics of WMI events and how Register-WMIEvent cmdlet can be used. To start with, here is an excerpt from [Microsoft Scripting guide](http://technet.microsoft.com/en-us/library/ee156572.aspx) that introduces WMI events:

> Just as there is a WMI class that represents each type of system resource that can be managed using WMI, there is a WMI class that represents each type of WMI event. When an event that can be monitored by WMI occurs, an instance of the corresponding WMI event class is created. A *WMI event* occurs when that instance is created.

Windows PowerShell v2 provides a cmdlet — Register-WMIEvent — to consume WMI events. There are a couple of different ways we can use this cmdlet. You can either use -Class or -Query parameters to create a [temporary ](http://msdn.microsoft.com/en-us/library/aa393013(VS.85).aspx#event_consumers)event consumer. When using -Class parameter, we need to specify a WMI [event class](http://msdn.microsoft.com/en-us/library/aa390797(v=VS.85).aspx#wmi.gloss_event_class). So, what happens if the value provided to the -Class parameter isn’t a WMI event class? Yes, PowerShell complains about it :).

{{<figure src="/images/WQL6-1.png">}}

So, PowerShell says that Win32_Process isn’t an event class. Now, how do we know what are the WMI event classes? Simple, we can use a WMI query to find out.

```
#Get all classes that are WMI event classes
#filter class names for Win32 classes
Get-WMIObject -Query "Select * from meta_class Where (__This ISA '__Event') AND (__Class like 'win32%')"
```

This will list all WMI event classes that start with Win32 prefix. You will see many more if you remove the second condition in the WHERE clause but for starters, this is good enough. If you execute the above PowerShell command, you will see a WMI class named [Win32_ProcessStartTrace](http://msdn.microsoft.com/en-us/library/aa394374(VS.85).aspx). This class indicates the new process started event. We can use this WMI class to subscribe to all process start events. For example,

```
Register-WmiEvent -Class Win32_ProcessStartTrace -SourceIdentifier "Process Started" `
                  -Action { Write-Host "$($Event.SourceEventArgs.NewEvent.ProcessName) just started" }
```

> **Note:** You have to open the PowerShell console in elevated mode. Else, you will see an access denied message everytime you try using Register-WMIEvent

This command will register an event consumer and display a message with the newly created process name. However, this will result in receiving the messages at the console everytime any process starts and not just the one you are interested in.

{{<figure src="/images/WQL6-2.png">}}

So, what if you are interested only in one specific process? We could have easily filtered out the unnecessary processes before displaying the process name at the conole. But, why even receive the event when we don’t need it? This is where -Query parameter comes handy. Look at this example

```
#Register-WMIEvent using -Query
Register-WmiEvent -Query "Select * from Win32_ProcessStartTrace WHERE ProcessName='notepad.exe'" `
                  -Action {Write-Host "New notepad process created" }
```

The WQL statement we used should be familiar to you by now. There are many other ways to monitor process creation using WMI events and WQL. What I showed above is just one way of doing it. We shall see the other methods soon.

**WMI Event Types**

There are two types of WMI events one should understand: Intrinsic Events and Extrinsic Events. It is important to understand what are the two types of events before we dig in to WQL for WMI events. There are also timer events but these type of events are rarely used in any system administration type of scripting. So, let us keep it aside for now and visit it towards the end of this series.

**Intrinsic Events**

Intrinsic events are used to monitor a resource represented by a class in the CIM repository. In other words, the intrinsic events occur in response to a change in the standard WMI data model. WMI creates intrinsic events for objects stored in the WMI repository. A provider generates intrinsic events for dynamic classes, but WMI can create an instance for a dynamic class if no provider is available. WMI uses polling to detect the changes. There are many system classes that WMI uses to report intrinsic events. However, the ones that are most interesting and useful are __InstanceCreationEvent, __InstanceModificationEvent, and __InstanceDeletionEvent. Hence, monitoring resources on a system involves monitoring of these system classes. We shall see some examples when we start discussing intrinsic events in the next post.

**Extrinsic Events**

Extrinsic events represent events that do not directly link to standard WMI model. For example, Windows registry defines extrinsic events for all registry change events. For intrinsic events, having a WMI provider isn’t mandatory. This is mostly because they are defined within the standard WMI model and WMI takes care of these if there is no WMI provider for a given resource in the standard WMI model. However, since extrinsic events are outside of the standard WMI model, having a WMI provider is mandatory. We shall see more examples of this in the later posts.

This concludes today’s post. I just introduced you to WMI events, showed some basic examples of using Register-WMIEvent cmdlet, and provided an introduction to different event types. In the next post, I shall talk about WQL syntax for writing event queries and then move on to showing some examples for intrinsic WMI events. Stay tuned.!
