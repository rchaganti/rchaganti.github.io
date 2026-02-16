# WMI Query Language (WQL) – Schema Queries


In this last and final part of this series, we will look at how to use WQL for querying the WMI schema.

Schema queries are used to retrieve class definitions (rather than class instances) and schema associations. In simple words, if you need to find out what type of information (this is what schema really means) a specific class holds, you use schema queries.Here is an example of a schema query:

```
$query = "SELECT * FROM meta_class where __this ISA 'Win32_Process'"
Get-WmiObject -Query $query | fl
```

And, this is what you would see when you execute this:

{{<figure src="/images/WQL10-1.png">}}

In one of the earlier posts, we looked at retrieving class definitions with [ASSOCIATORS OF](http://139.59.40.198/blog/?p=1580) and [REFERENCES OF](http://139.59.40.198/blog/?p=1624) keywords. So, **how are the schema queries different from the data queries using these two keywords?**

Well, the above keywords return class definitions only when there are instances of those classes present. Using a schema query, we can retrieve the class definitions even when there is no instance present.

To understand what I just said, take a look at this example that shows how a WMI query was built when using REFERENCES OF.

```
$query = "REFERENCES OF {Win32_Process=$pid} WHERE ClassDefsOnly"
Get-WmiObject -Query $query | fl
```

See the {Win32_Process=$pid} part of the query. We have to specify some identifier so that we can get an instance. In the above example, we used $pid variable. $pid is the process ID of PowerShell host. If we don’t specify a PID or some other identifier to get the instance, we end up with an error while executing the query. Now, go back and take a look at how we the schema query. We did not specify any kind of an identifier or property anywhere and we were still able to get the class definitions. That is the difference.

Let us dig a bit in to the schema query syntax.

We are familiar with *SELECT* keyword. When building schema queries, only “*” is supported. Unlike other queries, you cannot do some thing like *SELECT xyz FROM abc*. It has to be *SELECT ** always. And, the use of [***meta_class***](http://en.wikipedia.org/wiki/Metaclass) specifies that we are building a schema query. The only way to narrow down results when using schema queries is to use WHERE clause. Let us now look at a few ways to narrow the query results.

#### Using __this

__this is a special property that identifies the target class for the query and using an ISA operator is must. This requests the definitions for the subclasses of the target class. Here is how you use this method:

```
$query = "SELECT * FROM meta_class where __this ISA 'Win32_LogicalDisk'"
Get-WmiObject -Query $query | fl
```

This when executed, returns the class definitions of Win32_LogicalDisk and all its subclasses.

#### Using __Class

Using __Class, we can request for the class definitions of a single class and this is how we do it:

```
$query = "SELECT * FROM meta_class where __class='Win32_LogicalDisk'"
Get-WmiObject -Query $query | fl
```

This is a brief overview of schema queries. We seldom need to use schema queries and IT Pros will probably never have to use this type queries. You can also use ***REFERENCES OF\*** and ***ASSOCIATORS OF*** keywords to get schema associations. You can use the ***SchemaOnly*** qualifier in the WHERE clause to retrieve the schema associations of a class.

This is it. This ends the series on WMI query language.
