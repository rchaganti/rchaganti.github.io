# Creating complex scheduled tasks using WMI Timer events and PowerEvents Module


A few weeks ago, I wrote about [WMI Timer events using Win32_LocalTime](http://139.59.40.198/blog/?p=1751) and then mentioned how to [work around the DayOfWeek issue](http://139.59.40.198/blog/?p=1773). In today’s post, I will show you how to use WMI timer events to create complex scheduled tasks.

As system administrators, you may have to create scheduled jobs for performing various sysadmin tasks. We generally use Task Scheduler for such jobs. However, using the regular OS task scheduler, there is no easy way to create a scheduled task that occurs — for example — **every Thursday of every fourth week of a month in the third quarter of every year.**

{{<figure src="/images/powerevents1-1.png">}}

As I mentioned in my earlier posts, this is one area where WMI timer events are quite useful.

```
$query = "Select * from __InstanceModificationEvent WHERE
          (TargetInstance ISA 'Win32_LocalTime') AND
          (TargetInstance.Quarter=3) AND
          (TargetInstance.WeekInMonth=4) AND
          (TargetInstance.DayOfWeek=4 OR TargetInstance.DayOfWeek=9) AND
          (TargetInstance.Hour=12) AND
          (TargetInstance.Minute=0) AND
          (TargetInstance.Second=0)"                        

Register-WmiEvent -Query $query -Action { Write-Host "Execute your scheduled task here" }
```
However, the major drawback of Register-WMIEvent is that the event registration is alive only until the PowerShell consle window is open. So, for this task to execute, you must have the console window open at all times. This is because Register-WMIEvent creates only a temporary event consumer. **So, how do we create a [permanent event consumer](http://msdn.microsoft.com/en-us/library/aa390825(v=vs.85).aspx#wmi.gloss_permanent_consumer)?**

We can use [Trevor](http://trevorsullivan.net/)‘s (@pcgeek86) [PowerEvents](http://powerevents.codeplex.com/) PowerShell module.

> #### What is PowerEvents?
>
> PowerEvents is a Windows PowerShell v2.0 module designed to facilitate the ease of creating, updating, and deleting WMI (*Windows Management Instrumentation*) permanent event registrations. PowerEvents makes it easy to create WMI event filters (define the events you want to capture) and event consumers (responders to events), and then bind them together to initiate the flow of events. By leveraging permanent event registrations, you can perform advanced monitoring functions on a workstation or server, that would otherwise require implementation of an enterprise monitoring product. Because WMI is incredibly vast in the information it provides, very detailed monitoring can be performed using almost any of the WMI objects that exist on a computer.

There are [five types of permanent event consumers](http://msdn.microsoft.com/en-us/library/aa393649(v=vs.85).aspx) that are possible (out-of-the-box) in WMI and the PowerEvents module provides cmdlets to create these five event consumers. In today’s post, lets look at the command-line event consumer. This is the apt choice for creating scheduled tasks in combination with WMI timer events.

To be able to receive WMI events at all time, we need to create an event filter, create an event consumer, and then bind them together. This process is explained in detail at [http://msdn.microsoft.com/en-us/library/aa393014%28v=vs.85%29.aspx](http://msdn.microsoft.com/en-us/library/aa393014(v=vs.85).aspx). We will see how PowerEvents PowerShell module makes it easy using the new cmdlets.

> **Note:** At the time of writing this post, the publicly available PowerEvents release (0.2 alpha) did not have a functional command-line consumer. To be able to use the command-line consumer as shown in this post, you need to download the [changeset ](http://powerevents.codeplex.com/SourceControl/changeset/changes/99440d1d4431)listed under source code tab.

### Creating an event filter

An event filter is an instance of the [**__EventFilter**](http://msdn.microsoft.com/en-us/library/aa394639(v=vs.85).aspx) system class that describes an event type and the conditions for delivering a notification. So, in our case it is the same WQL query we used in the example above. PowerEvents module provides a cmdlet to create an event filter — ***New-WMIEventFilter***.

```
$query = "Select * from __InstanceModificationEvent WHERE
              (TargetInstance ISA 'Win32_LocalTime') AND
              (TargetInstance.Quarter=3) AND
              (TargetInstance.WeekInMonth=4) AND
              (TargetInstance.DayOfWeek=4 OR TargetInstance.DayOfWeek=9) AND
              (TargetInstance.Hour=12) AND
              (TargetInstance.Minute=0) AND
              (TargetInstance.Second=0)"
$taskFilter = New-WmiEventFilter -Name "WQL for 3rd quarter timer event" -Query $query
```
This is it. You have the event filter created. Make a note that you need to store the event filter instance in a variable. This is required since the published version of PowerEvents has no cmdlet way to get a list of event filters. Also, see how I’d used TargetInstance.DayOfweek=9. In real world, there is no 9th DayOfWeek. This is just a [work around](http://139.59.40.198/blog/?p=1773) we need to put in place to make sure the event gets triggered on the desired day of week — in this case 4 (Thursday). We could use a WMI query to get that list but I will save it for another post.

### Creating an event consumer
An event consumer is a recipient of notifications that report an occurrence of an event. An event consumer is either [*temporary*](http://msdn.microsoft.com/en-us/library/aa390839(v=vs.85).aspx#wmi.gloss_temporary_consumer) or [*permanent*](http://msdn.microsoft.com/en-us/library/aa390825(v=vs.85).aspx#wmi.gloss_permanent_consumer). The cmdlet for creating an event consumer is ***New-WMIEventConsumer.*** In this post, I will show you how to create a command-line consumer. The idea is to invoke a backup script when the event fires. For a list of other consumer types, refer to [http://msdn.microsoft.com/en-us/library/aa393649%28v=VS.85%29.aspx](http://msdn.microsoft.com/en-us/library/aa393649(v=VS.85).aspx). Here is how we create a permanent event consumer using PowerEvents module.

```
$cmdConsumer = New-WmiEventConsumer -Verbose -Name "bkConsumer1" -ConsumerType CommandLine -CommandLineTemplate "cmd.exe /c `"C:\Scripts\backup.bat`""
```
The ***-CommandLineTemplate\*** takes the path to the backup script. Also, note that the ***ConsumerType*** is set to CommandLine in this case. Again, make sure you store the instance of consumer in a variable. We need it later.

### Binding a filter and consumer together
Now, as a final step, we need to bind the event filter and the consumer together so that the backup script gets invoked when the timer event gets triggered on the specified date & time. To do this, we will use ***New-WMIFilterConsumerBinding*** cmdlet.

```
New-WmiFilterToConsumerBinding -Filter $taskFilter -Consumer $cmdConsumer -Verbose
```
Remember why I said that we need to store the instances of filter and consumer? It makes it easy to bind them together.

This is it. The backup script gets triggered once the timer event gets fired. This is just one example of creating complex scheduling tasks using WMI timer events. And, using PowerEvents makes it easy to create permanent event consumers. Go and explore it yourself.!
