# WMI Query Language (WQL) – Event Queries: Intrinsic Events


**Intrinsic events** are used to monitor a resource represented by a class in the CIM repository. In other words, the intrinsic events occur in response to a change in the standard WMI data model. WMI creates intrinsic events for objects stored in the WMI repository. A provider generates intrinsic events for dynamic classes, but WMI can create an instance for a dynamic class if no provider is available. WMI uses polling to detect the changes.

There are many system classes that WMI uses to report intrinsic events. However, the ones that are most interesting and useful are __InstanceCreationEvent, __InstanceModificationEvent, and __InstanceDeletionEvent. Hence, monitoring resources on a system involves monitoring of these system classes. These classes are derived from the __InstanceOperationEvent class which is derived from the __Event system class under root\Default namespace. The following capture of WMI CIM Studio shows this hierarchy.

{{<figure src="/images/WQL8-1.png">}}

The WQL syntax for WMI intrinsic event queries is:

```
SELECT \* FROM __InstanceXEvent WITHIN PollingInterval WHERE TargetInstance ISA WMIClassName AND TargetInstance.WMIClassPropertyName = Value
```

This is something similar to what we saw in the earlier post about WQL syntax for event queries. The __InstanceXEvent can be any of the system classes such as __InstanceCreationEvent, __InstanceModificationEvent, __InstanceDeletionEvent, and __InstanceOperationEvent. **Now, when do we use each of these event classes?**

**__InstanceCreationEvent** is used when we want to receive a notification upon creation of an instance. For example, we can use this event class when you want to receive an event notification every time a new process gets created. This can be done by,

```
#Query for new process events
$query = "Select * from __InstanceCreationEvent WITHIN 10 WHERE TargetInstance ISA 'Win32_Process'"
#Register WMI event
Register-WmiEvent -Query $query -Action { Write-Host "New Process Created. Do something useful here" }
```

**__InstanceDeletionEvent** is used when we want to receive a notification upon deletion of an instance. For example, we can use this class when we want to receive an event notification every time a process is terminated. For example,

```
#Query for new process events
$query = "Select * from __InstanceDeletionEvent WITHIN 5 WHERE TargetInstance ISA 'Win32_Process'"
#Register WMI event
Register-WmiEvent -Query $query -Action { Write-Host "A Process terminated. Do something useful here" }
```

**__InstanceModificationEvent** is used when we want to monitor changes to an existing instance or a resource. For example, we can use this class when we want to receive an event notification when a the processor utilization on a system goes beyond a specified usage threshold. For example,

```
#Query for new process events
$query = "Select * from __InstanceModificationEvent WITHIN 5 WHERE TargetInstance ISA 'Win32_Processor' AND TargetInstance.LoadPercentage > 80"
#Register WMI event
Register-WmiEvent -Query $query -Action { Write-Host "Processor utilization is more than 80%. Do something useful here" }
```

All of the examples above just displayed a message when the event notification was received. Instead, we can do something useful within the script block. For example, in the __InstanceCreationEvent example, we are just displaying that a new process was created but not the process name that just got created. **So, how do we access that information in the script block and tell a user the name of the process that was created?**

Simple, PowerShell creates an automatic variable called $event and stores the last event received in that variable. And, this automatic variable can be accessed in the -Action scriptblock you specify during a WMI event registration. Let us see an example.

{{<figure src="/images/WQL8-2.png">}}

If you see in the above example, I made an event registration for process creation events and in the -Action script block, assigned the $event variable to a variable in the global scope ($myEvent). This is essential because we cannot access the $event variable outside the -Action script block. Once the registration was done, I opened a notepad. This will fire the __InstanceCreationEvent and $myEvent should have the details around the event. So, I tried looking at all the members of this event. After exploring that a bit, I figured out that $myEvent.SourceEventArgs.NewEvent.TargetInstance.Name has the name of the new process which is notepad.exe. This is precisely what you see in the last line there.

$Event.SourceEventArgs.NewEvent.TargetInstance will have the instance of the newly created process. I will leave it to you to explore more.
