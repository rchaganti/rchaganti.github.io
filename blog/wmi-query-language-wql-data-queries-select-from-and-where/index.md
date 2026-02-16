# WMI Query Language (WQL) – Data Queries: SELECT, FROM, and WHERE


In this part of the series on WQL, we will look at what are data queries and how some of the WQL keywords & operators can be used to retrieve information from WMI repository. Also, as mentioned earlier, there are many other tools that consume WQL queries to retrieve information from WMI. However, in this series, I shall use only PowerShell to demonstrate WQL.

WQL data queries are the most simplest form of querying for WMI data. Data queries are used to retrieve class instances and data associations. For example,

```
Get-WmiObject -Query "Select * FROM Win32_Process WHERE HandleCount>=5500"
```

gives us a list of all processes with a handle count above 5500.

> **Note**
> You can use -filter parameter to Get-WMIObject instead of -Query. Whatever you pass as a value to -filter will be used within the WHERE clause of a WQL statement. For example, the above PowerShell example can be re-written as
>
> ```
> Get-WmiObject -Class Win32_Process -Filter "HandleCount>=5500"
> ```
>
> So, here is the difference between using -Query or  -Filter. You can pass any valid WQL statement as a value to -Query parameter. However, whatever value you pass as a value to -filter will always be used within the WHERE clause. So, the value to -filter must be a valid WHERE clause value with proper use of WQL operators. For example, using a PowerShell comparison operator such as -eq is not valid within -Filter.

Let us use this example and discuss a few keywords.

#### SELECT

In the above WQL query,  we used [SELECT](http://msdn.microsoft.com/en-us/library/aa393276(v=VS.85).aspx) statement. This statement returns instances of the specified class and any of its subclasses. As a general practice, many people retrieve WMI data by specifying SELECT * FROM <WMI CLASS>. By using *, we retrieve all possible properties of a given WMI class. This type of query can take a while to execute and consume more bandwidth to retrieve the result set. One method to reduce the bandwidth required to retrieve the result set is to replace * with selected set of property names.

```
Get-WmiObject -Query "SELECT Name FROM Win32_Process WHERE HandleCount>=5500"
```

OR

```
Get-WmiObject -class Win32_Process -Filter "HandleCount>=5500" -Property Name
```

#### FROM

FROM statement is used to specify the class from which we need to create the instances. Remember that you can perform data queries only from one class at a time. For example, the following query will produce an invalid query error:

```
Get-WmiObject -Query "Select * from win32_Service, Win32_Process"
```

#### WHERE

As you may be familiar by now, WHERE keyword is used to narrow the scope of retrieved data based on a filter. This keyword can be used in all of the three query types. In general, WHERE clause when used with SELECT statement can take one of the following forms:

> SELECT * FROM class WHERE property operator constant
> SELECT * FROM class WHERE constant operator property

In the above two forms, property denotes a valid property of a WMI instance, operator is any valid WQL operator and constant must be of the correct type for the property. We have already seen an example of the first form of using WHERE. Here is an example for the second form. The following query retrieve all services in stopped state.

```
Get-WmiObject -Query "SELECT Name FROM Win32_Service WHERE 'Stopped'=State"
```

Multiple groups of properties, operators, and constants can be combined in a WHERE clause using logical operators such as AND, OR, and NOT. Here are a few examples to demonstrate these.

```
Get-WMIObject -Query "Select * from Win32_Service Where State='Running' AND StartMode='Manual'"
```

```
Get-WMIObject -Query "SELECT * FROM Win32_LogicalDisk WHERE Name = 'C:' OR Name = 'D:'"
```

```
Get-WMIObject -Query "SELECT * FROM win32_Service WHERE NOT (State='Stopped')"
```

The above three examples show using AND, OR, and NOT logical operators with WHERE clause to perform multiple filters. In the third example, we can replace NOT with other WQL operators. For example, the same query can be performed in the following ways:

```
Get-WMIObject -Query "SELECT * FROM win32_Service WHERE State<>'Stopped'"
Get-WMIObject -Query "SELECT * FROM win32_Service WHERE State!='Stopped'"
```

You can also use IS, IS NOT operators within WHERE clause. However, the query will be valid only if the constant is NULL. For example,

```
Get-WMIObject -query "SELECT * FROM Win32_LogicalDisk WHERE FileSystem IS NULL"
```

is valid and will return the disk drive information with no file system information. However, the following example,

```
Get-WMIObject -query "SELECT * FROM Win32_LogicalDisk WHERE DriveType IS 5"
```

will result in an invalid query error.

There are many other keywords such as REFERENCES OF, ASSOCIATORS OF within the context of data queries. To keep these posts short, I will end today’s post here and discuss a few more keywords in the next post. As usual, please leave your feedback here on what can be improved and what else you want to see.
