# WMI Query Language (WQL) – Event Queries: Extrinsic Events


In this part of the WQL series, we shall look at extrinsic events.

Extrinsic events represent events that do not directly link to standard WMI model. For example, Windows registry defines extrinsic events for all registry change events. For intrinsic events, having a WMI provider isn’t mandatory. This is mostly because they are defined within the standard WMI model and WMI takes care of these if there is no WMI provider for a given resource in the standard WMI model. However, since extrinsic events are outside of the standard WMI model, having a WMI provider is mandatory.

When creating a WMI query for extrinsic events, we need to use a class derived from __ExtrinsicEvent class. Take a look at this CIM Studio capture.

{{<figure src="/images/WQL9-1.png">}}

As you see, there is registry provider that provides extrinsic events. So, rest of this post, will use the extrinsic event classes from registry provider to show we can create event notifications for extrinsic events.

> Note: We cannot use __InstanceDeletionEvent, __InstanceCreationEvent, __InstanceModificationevent, or __InstanceOperationEvent for monitoring extrinsic events. This should be obvious from the above screen capture.

### Monitoring registry value change events

We use ***RegistryValueChangeEvent*** to monitor changes to registry values. Here is how we write a WMI query for registry value change events:

```
$query = "Select * from RegistryValueChangeEvent WHERE Hive='HKEY_LOCAL_MACHINE' AND KeyPath='Software\\Temp' AND ValueName='Name'"
Register-WmiEvent -Query $query -Action { Write-Host "Value changed" }
```

Yes, that is it. So, when the monitored value changes, you will see the message “value changed” on the screen. However, there is one drawback here. The event notification only tells you that the value has been modified but it won’t return the new value.! Also, deleting a value is also considered modification and you receive a notification. But, agian, the notification won’t tell you that the value was deleted. See the next screen capture.

{{<figure src="/images/WQL9-2.png">}}

Although I deleted the value, the resulting event notification does not tell us anything about that value deletion. So, in the -Action script block, we will have to verify the presence of registry value we are monitoring and then display the new value. For example,

```
$query = "Select * from RegistryValueChangeEvent WHERE Hive='HKEY_LOCAL_MACHINE' AND KeyPath='Software\\Temp' AND ValueName='Name'"
Register-WmiEvent -Query $query -Action {
            if ((Get-item HKLM:\SOFTWARE\Temp).GetValue("Name")) {
                write-host (Get-item HKLM:\SOFTWARE\Temp).GetValue("Name")
            } else {
                Write-host "The registry value was deleted"
            }
}
```

### Monitoring registry key change events

***RegistryKeyChangeEvent*** can be used to monitor modifications to a registry subkey. Similar to ***RegistryValueChangeEvent***, this event notification also won’t give you any information beyond subkey modification. Here is how we use it:

```
$query = "Select * from RegistryKeyChangeEvent WHERE Hive='HKEY_LOCAL_MACHINE' AND KeyPath='Software\\Temp'"
Register-WmiEvent -Query $query -Action { Write-host "Something changed" }
```

Once again, you need to use some technique similar to whats shown above to retrieve the “real” modification that happened.

### Monitoring registry tree change events

***RegistryTreeChangeEvent*** can be used to monitor subtree level modifications. Similar to other two event classes in the registry provider, this event class provides a notification that a change occurred but won’t tell you about what had changed. So, we got to use a method of our own to detect what change generated the event notification.

```
$query = "Select * from RegistryTreeChangeEvent WHERE Hive='HKEY_LOCAL_MACHINE' AND RootPath=''"
Register-WmiEvent -Query $query -Action { Write-host "Something changed" }
```

There are many vendor provided extrinsic event classes. For example, take a look at how Intel ME WMI provider uses extrinsic events for firmware state notifications: http://software.intel.com/sites/manageability/AMT_Implementation_and_Reference_Guide/default.htm?turl=WordDocuments%2Fwmievents.htm

This is it about extrinsic events and WMI event queries. Go and explore these using the examples I’d used through out. We shall look at WMI schema queries in the next part of this series. Stay tuned.!
