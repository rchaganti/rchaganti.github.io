# WMI Query Language (WQL) – An introduction

I have been using [WMI ](http://msdn.microsoft.com/en-us/library/aa394582(v=VS.85).aspx)a lot these days and got to play with [WQL ](http://msdn.microsoft.com/en-us/library/aa392902(v=VS.85).aspx)as well. In this series of posts, I want to write about how [WMI Query Language (WQL)](http://msdn.microsoft.com/en-us/library/aa394606(VS.85).aspx) can be used to retrieve management data exposed by WMI. Yes, this has nothing to do with PowerShell but as a PowerShell lover (and a [MVP ](https://mvp.support.microsoft.com/profile=0B78975F-D499-467B-A2C0-2182990E8513)now), I will use PowerShell for all my examples.

> [Windows Management Instrumentation (WMI)](http://msdn.microsoft.com/en-us/library/aa394572(v=VS.85).aspx) is the Microsoft implementation of Web-based Enterprise Management (WBEM), which is an industry initiative to develop a standard technology for accessing management information in an enterprise environment. WMI uses the Common Information Model (CIM) industry standard to represent systems, applications, networks, devices, and other managed components. CIM is developed and maintained by the Distributed Management Task Force ([DMTF](http://go.microsoft.com/fwlink/?LinkId=67786)). We can write WMI scripts to automate several tasks on local or remote computer(s).

PowerShell has a few cmdlets to retrieve the management data exposed by WMI. You can see these cmdlets by running:

```
#Use Get-Command and mention WMI* as the Noun
Get-Command -Noun WMI*
```
One of the cmdlets to retrieve WMI information is Get-WMIObject. In it’s basic usage, this cmdlet, gets the instance of a specified WMI class. So, for example, if you need to list out all drives of type 4 (network drives) in a system,

```
Get-WmiObject -Class Win32_LogicalDisk | Where-Object {
    $_.DriveType -eq 4
}
```
In the above method, we retrieve all instances of Win32_LogicalDisk and then pass it  to Where-Object to filter out what we need. Depending on how many instances are there, this can take a while. You can use an alternative approach by specifying the -Query parameter instead of -Class.

```
#This example uses -Query parameter and specifies the query using WQL
Get-WmiObject -Query "Select * from Win32_LogicalDisk WHERE DriveType=4"
```
The above example uses WMI Query Language to get the same information as the earlier example but a bit more faster. You can, of course, verify that using Measure-Command cmdlet. You can see the clear difference here.

{{<figure src="/images/WQL1-1.png">}}

The above example is very basic and may not really explain the usefulness of WQL — the speed of execution is just one benefit. When using WQL, there are quite a few advanced querying techniques that can be used to retrieve WMI information in an efficient manner. And, sometimes – such as working with WMI events, WQL becomes a necessity. So, this series of posts will explain each of those scenarios and with some appropriate examples.

With that background, let us now look at WMI Query Language.

The [WMI Query Language (WQL)](http://msdn.microsoft.com/en-us/library/aa394606(v=VS.85).aspx) is a subset of the American National Standards Institute Structured Query Language (ANSI SQL)—with minor semantic changes. Similar to SQL, WQL has a set of [keywords](http://msdn.microsoft.com/en-us/library/aa394606(v=VS.85).aspx) and [operators](http://msdn.microsoft.com/en-us/library/aa394605(v=VS.85).aspx). WQL supports three types of queries

#### Data Queries
This type is the most simplet form of querying for WMI data. The earlier example, where we queried for all instances of Win32_LogicalDisk where the driveType is 4, is a data query. Data queries are used to retrieve class instances and data associations. The WQL keywords such as SELECT, ASSOCIATORS OF, REFERENCES OF, and ISA are used in data queries.

#### Schema Queries
Schema queries are used to retrieve class definitions (rather than class instances) and schema associations. In layman’s terms, these queries are used to get information about WMI and its structure. Schema queries return a result set of class definition objects rather than actual instances of classes. The WQL keywords such as SELECT, ASSOCIATORS OF, REFERENCES OF, and ISA are used in schema queries and of course, in a slightly different way than how data queries use these keywords.

#### Event Queries
The event queries are used to create WMI event subscriptions. For example, using these queries, you can create an event subscription to notify whenever a USB drive gets attached to the system. The WQL keywords such as GROUP, HAVING, and WITHIN are used (and are specific to) when creating event queries. The event queries are critical when you want use PowerShell cmdlets such as Register-WMIEvent, etc.

And, finally, a couple of items you should know

- WQL does not support cross-namespace queries or associations. You cannot query for all instances of a specified class residing in all of the namespaces on the target computer.
- WQL queries are read-only. There are no keywords such as INSERT or UPDATE. Using WQL, we cannot modify the WMI objects.

This brings us to the end of this post on WQL introduction. In the subsequent posts, we will look at each of the WQL keywords and each WQL query type. I am also learning as I write this series. So, I welcome your feedback.
