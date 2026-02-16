# WMI Query Language (WQL) – Data Queries: Associators Of


As we saw in the previous post, Select queries can be used to retrieve instances of WMI class. But select queries are not the only way to query for instances. We can also use [Associators Of](http://msdn.microsoft.com/en-us/library/aa384793(v=VS.85).aspx) keyword to the same. However, there is a difference. Select queries always return a collection of instances of a WMI class where as “Associators Of” returns a collection of WMI objects that belong to different WMI classes or associated WMI classes. Before we dig too much in to this, let us first understand what are associated WMI classes.

Take an example of a network adapter.WMI has several classes that represent network adapter information. Let us look at Win32_NetworkAdapter. This WMI class is associated with Win32_NetworkAdapterConfiguration, Win32_NetworkProtocol, and Win32_SystemDriver.

{{<figure src="/images/WQL4-1.png">}}

If you look at the above output (from CIM Studio’s association tab for a selected class), you will see that Win32_NetworkAdapterconfiguration is associated to Win32_NetworkAdapter through an association class named Win32_NetworkAdapterSetting. And, the other two classes — Win32_NetworkProtocol & Win32_SystemDriver — are associated through an association class named Win32_ProtocolBinding. Make a note of the terminology I used here: associated Class & association class. We will re-visit this later in this post.

So, the basic syntax of this “Associators Of” keyword is:

ASSOCIATORS OF {ObjectPath}

Note that the braces are part of the syntax. Any valid object path can be used for ObjectPath. Let us look at an example to understand this.

```
Get-WmiObject -Query "Associators Of {Win32_NetworkAdapter.DeviceID=12}"
```

The above snippet shows the basic usage of Associators Of. Make a note of the syntax inside curly braces. This query — when executed — gets all the instances of all associated classes (see above screenshot). So, this can take a while and the output can be overwhelming. Remember, this query without DeviceID=12 will not return anything. We have to specify a qualifier to get the associated instances. This qualifier can be any property from the source WMI class.

The output of above query can be overwhelming as the number of associated classes is very large and each associated class may have more than one instance. You can use WHERE clause to filter this out. However, the usage of WHERE clause is a bit different from how you do that with SELECT queries. There are predefined keywords that you can use with WHERE clause. They are:

ASSOCIATORS OF {ObjectPath} WHERE
AssocClass = AssocClassName
ClassDefsOnly
RequiredAssocQualifier = QualifierName
RequiredQualifier = QualifierName
ResultClass = ClassName
ResultRole = PropertyName
Role = PropertyName

> **Note**: You cannot use logical operators such as AND, OR, and NOT within the WHERE clause while using Associators Of keyword. You can use more than one subclause by just separating them by a space.

Let us see the examples for some of these now.

**ClassDefsOnly**

Let us first see a way to list only the associated class names as shown in the screenshot above. You can use the subclause ClassDefsOnly for this purpose.

```
Get-WMIObject -Query "Associators Of {Win32_NetworkAdapter.DeviceID=12} WHERE ClassDefsOnly"
```

This will list all the associated class names and methods & properties associated with each of those classes.

**AssocClass**

If you want to retrieve the instance of associated class though a single association class:

```
Get-WmiObject -Query "Associators of {Win32_NetworkAdapter.DeviceID=12} WHERE AssocClass=Win32_ProtocolBinding"
```

This will result in the driver & protocol information bound to network adapter with device ID 12.

**ResultClass**

This subclause indicates that you want to retrieve the end points associated only with the specified ResultClass. For example,

```
Get-WMIObject -Query "Associators Of {Win32_NetworkAdapter.DeviceID=12} WHERE ResultClass=Win32_NetworkAdapterConfiguration"
```

**Why the heck do you need associators of?**

Technically, you don’t need to use this keyword. You can script or parse away to glory to get the same results as what “Associators Of “keyword can do for you. Take an example of Win32_NetworkAdapter class itself. Win32_NetworkAdapter stores the physical adapter details and Win32_NetworkAdapterConfiguration stores the software (IP) configuration pertaining to each adapter instance. These two classes are associated using the Win32_NetworkAdapterSetting association class. To get the IP configuration information without using “Associators of” keyword is not a straight forward task. In layman terms, this is because there is no common key between WIn32_NetworkAdapter and Win32_NetworkAdapterConfiguration. You may think that you can use Win32_NetworkAdapterSetting class to retrieve the information. However, when you run

```
Get-WMIObject -Class Win32_NetworkAdapaterSetting
```

you will see lot of information related to all network adapters in the system but there is no easy way to filter out that for a specific device. Now, if you use “Associators Of” keyword, you can get the IP information by running

```
Get-WMIObject -Query "Associators Of {Win32_NetworkAdapter.DeviceID=12} WHERE ResultClass=Win32_NetworkAdapterConfiguration"
```

Or

```
Get-WMIObject -Query "Associators Of {Win32_NetworkAdapter.DeviceID=12} WHERE AssocClass=Win32_NetworkAdapterSetting"
```

You may now ask me why not just run “gwmi Win32_NetworkAdapaterConfiguration -Filter ‘Index=12′”. Yes, you can. This is probably the simplest way to get IP information without what is shown above. The examples above are intended only to show the usage of “Associators Of” keyword.

On the same lines, let us look at another example. For a moment think that Get-Service cmdlet never existed. Now, if you want to get the dependent services of any specific service without using “associators Of”, you would do that by parsing Win32_DependentService instances. However, using the keyword discussed today, you can the do same by

```
Get-WMIObject -Query "Associators of {Win32_Service.Name='Winmgmt'} Where ResultRole=Dependent"
```

To get a list of services that must be started before starting a specific service,

```
Get-WMIObject -Query "Associators of {Win32_Service.Name='Winmgmt'} Where ResultRole=Antecedent"
```

To get a list of both dependent and required services

```
Get-WMIObject -Query "Associators of {Win32_Service.Name='Winmgmt'} Where AssocClass=Win32_DependentService"
```

I shall conclude today’s post here and discuss “References Of” in the next post. I intentionally left a few Sub clauses for you to figure out yourself. 
