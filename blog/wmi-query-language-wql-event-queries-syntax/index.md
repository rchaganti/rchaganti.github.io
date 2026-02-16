# WMI Query Language (WQL) – Event Queries: Syntax


The WMI query syntax for event queries is a bit different and deserves a discussion. So, before we delve in to the types of event queries, let us first look at the syntax for WQL event queries. As we discussed [earlier](http://139.59.40.198/blog/?p=1508), we use SELECT statement for event queries too. We can combine this with other keywords such as WITHIN, HAVING, and GROUP to change how we receive these WMI events.

Here is how a [MSDN article](http://msdn.microsoft.com/en-us/library/cc250721(v=PROT.10).aspx) shows the syntax for WMI event queries.

> EVENT-WQL = “SELECT” <PROPERTY-LIST> “FROM” /
> <EVENT-CLASS-NAME> <OPTIONAL-WITHIN> <EVENT-WHERE>
>
> OPTIONAL-WITHIN = [“WITHIN” <INTERVAL>]
> INTERVAL = 1*DIGIT
> EVENT-WHERE = [“WHERE” <EVENT-EXPR>]
>
> EVENT-EXPR = ( (<INSTANCE-STATE> “ISA” <CLASS-NAME> <EXPR2>) /
> <EXPR> )
> [“GROUP WITHIN” <INTERVAL>
> ( [“BY” [<INSTANCE-STATE> DOT] <PROPERTY-NAME>]
> [“HAVING” <EXPR>]] )
> INSTANCE-STATE = “TARGETINSTANCE” / “PREVIOUSINSTANCE”

In the above syntax specification, we know the SELECT, FROM, and WHERE keywords. There are also other keywords such as WITHIN, GROUP, BY, and HAVING. Let us look at each one of these keywords now.

#### WITHIN

WITHIN keyword is used to specify the polling interval or grouping interval (used with GROUP clause) for the events. A polling interval is the interval that WMI uses as the maximum amount of time that can pass before notification of an event must be delivered. The general syntax to specify the polling interval,

```
SELECT * FROM eventclass WITHIN interval WHERE property = value
```

The polling interval value is specified as number of seconds and is a floating point number. So, we can specify values smaller than one second. However, specifying a polling interval smaller than one second (for example, 0.1) may cause system slow down due to the resource intensive nature of event queries. The recommended values for the polling interval really depend on the event calss. Do not use a small value here unless you really need the event notification be delivered immediately.

#### GROUP

Using GROUP clause causes WMI to generate a single notification to represent a group of events. When used in a WMI event query, this returns an instance of [__AggregateEvent](http://msdn.microsoft.com/en-us/library/aa394623(v=VS.85).aspx) that contains an embedded object of one of the instances received during the grouping interval and number of such events received. These two are represented by **representative** & **NumberOfEvents** properties respectively. The grouping interval specifies the time period, after receiving an initial event, during which WMI should collect similar events. The GROUP clause must contain a WITHIN clause to specify the grouping interval and can contain the BY or HAVING keyword, or both. And, the GROUP clause is placed after the WHERE clause if the query contains a WHERE clause. Here is the syntax:

```
SELECT * FROM EventClass [WHERE property = value] GROUP WITHIN interval
```

The WHERE, BY, and HAVING clauses are optional.

This is especially useful when we don’t want to receive an event notification every time the event fires. For example, when monitoring a system, we may not want to receive a notification every time an specific event log gets generated. Instead, we can use GROUP clause to specify a grouping interval and receive only one notification for all the desired event logs generated within the grouping interval. Something similar to this:

```
#Build a WMI query for receiving an event
$query = "Select * from __instanceCreationEvent WHERE TargetInstance ISA 'Win32_NTLogEvent' ANDTargetInstance.EventCode=1980 GROUP WITHIN 300"
#Register the event
Register-WmiEvent -Query $query -Action {Write-Host "Eventlog Arrived" }
```

#### HAVING

In the above imaginary example, we will receive an event notification for all the events received within the grouping interval. But, what if we want to receive the event notification only when ten such event logs are generated within the grouping interval? This is where HAVING plays an important role. Let us look at how we can modify the above sample code to use HAVING keyword.

```
#Build a WMI query for receiving an event
$query = "Select * from __instanceCreationEvent WHERE TargetInstance ISA 'Win32_NTLogEvent' ANDTargetInstance.EventCode=1980 GROUP WITHIN 300 HAVING NumberOfEvents > 10"
#Register the event
Register-WmiEvent -Query $query -Action {Write-Host "Eventlog Arrived" }
```

I mentioned earlier that by using GROUP returns a property called **NumberOfEvents** that contains the number of events received during the grouping interval. Now, we use that property along with HAVING keyword to filter event notifications. Here is the syntax:

```
SELECT \* FROM EventClass [WHERE property = value]
GROUP WITHIN interval HAVING NumberOfEvents operator constant
```

So, using the HAVING query as shown above, an event notification is delivered only when WMI receives more than 10 events in the grouping interval.

#### BY

You can use BY keyword along with GROUP clause to group events by one or more properties of the event class. The general syntax for using BY is as follows:

```
SELECT \* FROM EventClass [WHERE property = value]
GROUP WITHIN interval [BY property_list]
```

For example, The following example groups all events received in 300 seconds by the TargetInstance.SourceName property.

```
#Build a WMI query for receiving an event
$query = "Select * from __instanceCreationEvent WHERE TargetInstance ISA 'Win32_NTLogEvent' `
                                                GROUP WITHIN 300 BY TargetInstance.SourceName `
                                                HAVING NumberOfEvents > 10"
#Register the event
Register-WmiEvent -Query $query -Action {Write-Host "Eventlog Arrived" }
```

In the above example, the events are grouped by the TargetInstance.SourceName property and an event notification is delivered only if the number of events received during the grouping interval exceeds 10.

So far, we looked at all the important keywords that can be used while building WMI event queries. But, if you have observed, I kept using the words ***eventclass\*** and ***TargetInstance\***. What are these?

#### Event Classes

As discussed earlier, an event class is a WMI class that [*event consumers*](http://msdn.microsoft.com/en-us/library/aa390797(v=VS.85).aspx#wmi.gloss_event_consumer) can subscribe to by an [*event query*](http://msdn.microsoft.com/en-us/library/aa390797(v=VS.85).aspx#wmi.gloss_event_query). The class reports a specific type of occurrence. For example, the [**Win32_ProcessStopTrace**](http://msdn.microsoft.com/en-us/library/aa394376(v=VS.85).aspx) class reports that a specific process has stopped. In the upcoming parts of this series, we will look at several examples of event classes when we discuss intrinsic and extrinsic events. In fact, __InstanceCreationEvent we used in all the above examples is a part of event classes that are used for intrinsic event queries. More on this later.

#### TargetInstance

TargetInstance references to the instance of the event class. This is precisely the reason why we could use TargetInstance.SourceName or TargetInstance.EventCode in the examples above. Also, take a look at the query again. To refer to an event class instance, we specified TargetInstance ISA ‘Win32_NTLogEvent’. Make a note that we did not use “=” operator or “IS” operator. The only valid comparison operator when referecing TargetInstance is “ISA”.

This concludes today’s post on WQL syntax for event queries. We shall look at intrinsic and extrinsic events in the upcoming parts. Stay tuned.!
