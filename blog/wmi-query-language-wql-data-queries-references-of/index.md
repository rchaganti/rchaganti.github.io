# WMI Query Language (WQL) – Data Queries: References Of


Per MSDN documentation, the REFERENCES OF statement

> Retrieves all association instances that refer to a particular source instance. The REFERENCES OF statement is similar to the ASSOCIATORS OF statement in its syntax. However, rather than retrieving endpoint instances, it retrieves the intervening association instances.

That is very cryptic for beginners like you and me. So, let us look at an example to understand this.

{{<figure src="/images/WQL5-1.png">}}

If you look at the above diagram (captured from the associations tab of Win32_Process in CIM Studio) and as I showed you in my [earlier post](http://139.59.40.198/blog/?p=1580), Win32_SessionProcess, in32_NamedJobObjectProcesses, Win32_SystemProcesses are the associator or association classes. Whereas, Win32_Process, Win32_LogonSession, Win32_NamedObject, and Win32_ComputerSystem are the associated classes.

Now, let us go back to the definition. The REFERENCES OF statement retrieves all association instances that refer to a particular source instance. However, it retrieves only the intervening association instances. Again, I will show you an example to explain this.

{{<figure src="/images/WQL5-2.png">}}

In the above screen capture, you can see the syntax for using REFERENCES OF is exactly same as that of ASSOCIATORS Of. If you closely observe the output, it is more or less same as the associator classes listed in the CIM Studio output. If you look at the properties of each WMI class listed there, you will find “Antecedent”, “Dependent”, “GroupComponent”, and “PartComponent”. These are called **references**. They can be identified by type [ref](http://msdn.microsoft.com/en-us/library/aa393024(v=VS.85).aspx).

> **Note:** There is no Win32_NamedJobObjectProcesses in the output here and there is an additional CIM_ProcessExecutable. There is a missing link I am trying to find. I will update this soon.

If we had used “Associators of” instead of “References Of”, we would have seen the endpoint class definitions which are Win32_LogonSession, Win32_ComputerSystem, and Win32_NamedJobObject. You can see that in the output here.

{{<figure src="/images/WQL5-3.png">}}

Similar to Associators Of keyword, you can use the WHERE clause with “References Of” keyword also. There are predefined keywords that you can use with WHERE clause. They are:

REFERENCES OF {ObjectPath} WHERE
ClassDefsOnly
RequiredQualifier = QualifierName
ResultClass = ClassName
Role = PropertyName

We have already seen an example of using ClassDefsOnly. Also, usage of these keywords is similar to what I mentioned an [earlier post](http://139.59.40.198/blog/?p=1580). This concludes the WQL “Data or Object” queries part of this series. In the next part, we shall look at how to perform event queries and then proceed on to schema queries to end this series. I will also try to put together some “real” world examples for “Associators Of” and “References Of” keywords. Whatever we discussed around these two keywords has been really generic examples and may not have provided lot of insight in to where exactly you can use these.

I hope you find this useful and I am looking for your feedback on how to improve. Thanks again for reading.
