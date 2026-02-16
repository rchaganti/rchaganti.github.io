# WMI Query Language (WQL) – Keywords and Operators


In this post, we will look at the a brief description of WQL keywords and operators and see a classification of the keywords based on where (query types) these keywords can be used.

### Keywords

Similar to SQL, WQL queries use keywords to retrieve data from the management objects. WQL has 19 keywords to perform these queries against WMI repositories. In the previous post, we discussed about three types of queries: Data, Event, and Schema. Though there are 19 WQL keywords, only a few of them can be used all 3 possible query types. The following table lists all the WQL keywords and lists the query type in which they can be used.

| **Keyword**    | **Query Type** | **Description** |       |                                                              |
| -------------- | -------------- | --------------- | ----- | ------------------------------------------------------------ |
|                | Data           | Schema          | Event |                                                              |
| AND            | X              |                 | X     | Combines two Boolean expressions, and returns TRUE when both expressions are TRUE. |
| ASSOCIATORS OF | X              | X               |       | Retrieves all instances that are associated with a source instance. Use this statement with schema queries and data queries. |
| __CLASS        | X              | X               |       | References the class of the object in a query.               |
| FROM           | X              | X               | X     | Specifies the class that contains the properties listed in a SELECT statement. Windows Management Instrumentation (WMI) supports data queries from only one class at a time. |
| GROUP          |                |                 | X     | Causes WMI to generate one notification to represent a group of events. |
| HAVING         |                |                 | X     | Filters the events that are received during the grouping interval that is specified in the WITHIN clause. |
| IS             | X              |                 | X     | Comparison operator used with NOT and NULL. The syntax for this statement is the following: IS [NOT] NULL (where NOT is optional) |
| ISA            | X              | X               | X     | Operator that applies a query to the subclasses of a specified class |
| KEYSONLY       | X              |                 |       | Used in REFERENCES OF and ASSOCIATORS OF queries to ensure that the resulting instances are only populated with the keys of the instances, which reduces the overhead of the call. |
| LIKE           | X              |                 |       | Operator that determines whether or not a given character string matches a specified pattern. |
| NOT            | X              |                 |       | Comparison operator that use in a WQL SELECT query           |
| NULL           | X              |                 |       | Indicates an object does not have an explicitly assigned value. NULL is not equivalent to zero (0) or blank. |
| OR             | X              |                 |       | Combines two conditions. When more than one logical operator is used in a statement, the OR operators are evaluated after the AND operators. |
| REFERENCES OF  | X              | X               |       | Retrieves all association instances that refer to a specific source instance. Use this statement with schema and data queries. The REFERENCES OF statement is similar to the ASSOCIATORS OF statement. However, it does not retrieve endpoint instances; it retrieves the association instances. |
| SELECT         | X              | X               | X     | Specifies the properties that are used in a query.           |
| TRUE           | X              |                 | X     | Boolean operator that evaluates to -1 (minus one).           |
| WHERE          | X              | X               | X     | Narrows the scope of a data, event, or schema query.         |
| WITHIN         |                |                 | X     | Specifies a polling or grouping interval.                    |
| FALSE          | X              | X               | X     | Boolean operator that evaluates to 0 (zero).                 |

### Operators

WMI Query Language also uses operators. The following table lists all the opeartors supported in WQL.

| **Operator** | **Description**          |
| ------------ | ------------------------ |
| =            | Equal to                 |
| <            | Less than                |
| >            | Greater than             |
| <=           | Less than or equal to    |
| >=           | Greater than or equal to |
| != or <>     | Not equal to             |

A few WQL keywords such as IS, ISA, NOT, and LIKE can also be considered as operators. In these keywords, IS and IS NOT operators are valid in the WHERE clause only if the constant is NULL. We will see a detailed discussion around these keywords & operators in the upcoming posts.
