# Passing variables or arguments to an event action in PowerShell


**Update**: Based on feedback from @ShayLevy, we don’t have to send the background job object to Event action as a variable. It is already available as $event.Sender or just $sender. You can see that in the image below. I just picked up a wrong example to explain the -MessageData parameter. Although, the article originally showed a background job as an example, it was just to show how ***any*** object can be passed to event action. For example, if all you want to access is a background job object which you are monitoring using Register-ObjectEvent, you can access the job name using $event.Sender.Name or $sender.Name, job Id using $event.Sender.Id or $sender.Id, and so on.

{{<figure src="/images/sender1-1.png">}}

To avoid any confusion, I removed the initial example of background job and updated it with a more generic example.

While working with @LaerteSQLDBA on a SQL SMO related script, I was asked a question on how to pass variables or arguments and access them within an event action script block. The solution is simple. We just use the -MessageData parameter of Register-ObjectEvent. So, all event subscriptions get the object and can be accessed using $event.MessageData and this is what [Get-Help for -MessageData property of Register-ObjectEvent](http://technet.microsoft.com/en-us/library/dd347672.aspx) tells us.

Let us say, You have a an object which you need to access inside an event registration for some special purpose. And, say that the event scope is different from the object scope.

```
$foo = "Ravi"
```

Now, when you need to access this variable $foo in the event action or event script block,

```
Register-ObjectEvent -InputObject $PSISE.Options -EventName PropertyChanged -MessageData $foo -SourceIdentifier jobEvent -Action {
                    Write-Host "Job Name: $(event.MessageData)"
                } | Out-Null
```

If you observe the event registration, I supplied $foo as an argument to to -MessageData. This makes sure that we have the value of $foo is assigned to $event.MessageData in the event action script block.

So, after the event is raised, if we look a the $event automatic variable:

{{<figure src="/images/sender1-2.png">}}

So, $event.MessageData now has the value of $foo. @ShayLevy pointed me to an answer he provided on Technet Forums. Check [this ](http://social.technet.microsoft.com/Forums/en-US/ITCG/thread/07bbb0e5-0d31-451c-97e8-fad42361389f/#33e5ff21-00e5-46bc-ab5e-21975c2aadad)for an example on how to pass custom objects, etc.

This is it for today. Hope you found this useful.
