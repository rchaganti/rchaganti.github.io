# Workarounds for DayOfWeek Timer events when using Win32_LocalTime


In my [earlier post](http://139.59.40.198/blog/?p=1751), I showed how Win32_LocalTime WMI class can be used to capture timer events. As mentioned there, WMI events can be quite helpful in creating complex scheduling tasks. For example, you can specify to run a script every Thursday of every fourth week of a month in the third quarter of every year. However, there is a bug in Win32_LocalTime that currently blocks this.

I created a support incident with MS and reported this bug to them. I got a response that this indeed is a bug and they provided a workaround to solve this temporarily.

Let us see this with an example. I will use the same scenario I mentioned earlier: **every Thursday of every fourth week of a month in the third quarter of every year**

```
$query = "Select * from __InstanceModificationEvent WHERE
          (TargetInstance ISA 'Win32_LocalTime') AND
          (TargetInstance.Quarter=3) AND
          (TargetInstance.WeekInMonth=4) AND
          (TargetInstance.DayOfWeek=4 OR TargetInstance.DayOfWeek=5) AND
          (TargetInstance.Hour=12) AND
          (TargetInstance.Minute=0) AND
          (TargetInstance.Second=0)"            

Register-WmiEvent -Query $query -Action { Write-Host "Event Arrived" }
```

Observe how I used DayOfWeek property twice in the query. This is the workaround. This event fires only when DayOfWeek is used this way. However, the side effect of this is: the event fires on both Thursday (4) and Friday (5). We can workaround this in a couple of ways.

**1. You can check for DayOfWeek in the -Action script block as shown here.**

```
$query = "Select * from __InstanceModificationEvent WHERE
          (TargetInstance ISA 'Win32_LocalTime') AND
          (TargetInstance.Quarter=4) AND
          (TargetInstance.WeekInMonth=1) AND
          (TargetInstance.Hour=19) AND
          (TargetInstance.Minute=41) AND
          (TargetInstance.Second=0)"            

Register-WmiEvent -Query $query -Action { if ($MyEvent.SourceEventArgs.NewEvent.TargetInstance.DayOfWeek -eq 5) { write-Host "Event Arrived" } }
```

**2. You can provide some dummy DayOfWeek value, anything outside 0-6**. For example,

```
$query = "Select * from __InstanceModificationEvent WHERE
          (TargetInstance ISA 'Win32_LocalTime') AND
          (TargetInstance.Quarter=4) AND
          (TargetInstance.WeekInMonth=1) AND
          (TargetInstance.DayOfWeek=5 OR TargetInstance.DayOfWeek=9) AND
          (TargetInstance.Hour=19) AND
          (TargetInstance.Minute=41) AND
          (TargetInstance.Second=0)"            

Register-WmiEvent -Query $query -Action { Write-Host "Event Arrived" }
```

This way event fires on Thursday as desired and the second check for DayOfWeek=9 will never fire. This is it.
