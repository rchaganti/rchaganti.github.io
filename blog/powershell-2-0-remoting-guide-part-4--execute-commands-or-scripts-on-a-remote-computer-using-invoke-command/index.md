# PowerShell 2.0 remoting guide: Part 4 – Execute commands or scripts on a remote computer using Invoke-Command


In this part of PowerShell <a href="http://139.59.40.198/blog/?cat=240" target="_blank">remoting series</a>, I will discuss how to run commands or scripts on remote computer(s). Within remoting, there are couple of ways to run commands or scripts on a remote machine. This includes Invoke-Command cmdlet and interactive remoting sessions. These two methods deserve a separate post for each and hence I will discuss the Invoke-Command method in today's post.

Once you have <a href="http://139.59.40.198/blog/?p=1060" target="_blank">enabled remoting</a> on all your computers, you can use<a href="http://technet.microsoft.com/en-us/library/dd347578.aspx" target="_blank"> Invoke-Command</a> cmdlet to run commands and scripts on local computer or on remote computer(s). There are many possible variations of this cmdlet. I will cover most of them here.

#### Invoke-Command to run commands on local or remote computer

You can invoke a command on local or remote computer(s) using the below method:

```
Invoke-Command -ComputerName SP2010-WFE -ScriptBlock { Get-Process }
```

The ScriptBlock parameter can be used to specify a list of commands you want to run on the remote computer.  ComputerName parameter is not required for running commands on the local machine. If you want to run the same command on multiple remote computers, you can supply the computer names as a comma separated list to ComputerName parameter or use a text file as shown in the example here

```
Invoke-Command -ComputerName SP2010-WFE,SP2010-DB -ScriptBlock{ Get-Process }
```

  <p>
    or
  </p>
```
Invoke-Command -ComputerName (get-content c:\scripts\servers.txt) -ScriptBlock {Get-Process}
```

All command names and variables in the ScriptBlock are evaluated on the remote computer. So, if you do something like -ScriptBlock {Get-Process -Name $procName}, PowerShell expects the remote computer session to have $procName defined. You can however pass variables on the local computer to a remote session when using Invoke-Command. This brings us to the next point in our discussion.

#### Passing local variables as arguments to remote computer

Taking the above example, we can pass the Name of the process you are looking for as a variable to the script block. ArgumentList parameter helps you achieve this. You can do this as shown here.

```
$procName = "powerShell"
Invoke-Command -ComputerName (get-content c:\scripts\servers.txt) -ScriptBlock {param ($Name) Get-Process -Name $Name} -ArgumentList $procName
```

The above example may be a simple one but it shows how to use -ArgumentList parameter to pass local variables to the remote session.

#### Invoke-Command to execute scripts on remote computer(s)

Using ScriptBlock parameter can be quite tedious when you have to execute a bunch of PowerShell commands. This can be confusing when you have loops and conditional statements inside the scriptblock. Invoke-Command provides FilePath parameter to address this. You can use this parameter as shown below

```
Invoke-Command -ComputerName SP2010-WFE -FilePath C:\scripts\Test.PS1
```

Make a note that the script you provide as FilePath must exist on the local machine or at a place accessible to the local machine.

#### Using -Session parameter for better performance and sharing data between commands

Whenever you run Invoke-Command with -ComputerName parameter, a temporary session gets established to execute the remote command. So, establishing a session every time you use this cmdlet can be time consuming. So, to avoid that we can use a persistent connection to the remote computer and that is what -Session uses. You can create a persistent connection to a remote computer by using New-PSSession cmdlet as shown here

```
$s = New-PSSession -ComputerName SP2010-WFE
```

Now, $s contains the session details for the persistent connection. We can use $s to invoke a command on the remote computer and the syntax for that will be

```
Invoke-Commad -Session $s -ScriptBlock {get-Process}
```

$s contains all the variables you create / modify when you execute commands on the remote computer. So, subsequent command execution with $s as the session will have access to all of the variables created / updated on the remote computer. For example,

```
$s = new-pssession -computername SP2010-WFE
Invoke-Command -Session $s -ScriptBlock {$fileCount = (Get-ChildItem C:\ -Recurse).Count}
invoke-command -session $s -scriptblock {$fileCount}
```

We could access $fileCount variable only because we used a persistent session to run the command. This would not have been possible if used -ComputerName to invoke the remote command.

#### Running remote command as a background job

The example shown above &#8212; which gets the total file count on C:\ of a remote machine &#8212; can be quite time consuming based on how big is C:\ on the remote computer. In such case, you will have to wait for the remote command to complete execution. To avoid this, you can use -AsJob parameter to run the command as a background job on the remote computer.

```
Invoke-Command -ComputerName SP2010-WFE -ScriptBlock {(Get-ChildItem C:\ -Recurse).Count} -asJob
```

Once you run this, you will see the job details listed as shown here:

{{<figure src="/images/remoting4-1.png">}}

Now, you can use Get-Job and receive job cmdlets to see the output from the background job as shown below.


```
Get-Job -id 1 | Receive-Job
```

A complete discussion on Background jobs deserves a series of posts. I will plan to do that next. If you don&#8217;t want to wait and learn about it right away, you can read about it @ <a href="http://technet.microsoft.com/en-us/library/dd315273.aspx" target="_blank">http://technet.microsoft.com/en-us/library/dd315273.aspx</a>

#### Specifying credentials required for remoting

As we have seen the <a href="http://139.59.40.198/blog/?p=1060" target="_blank">enable remoting post</a>, you can use PowerShell remoting between computers in a workgroup environment too. All of the examples I showed above assume that you have access to remote computer as an administrator. This method works quite well in a domain environment where the logged on user has administrator credentials to access any computer in the domain. However, this will not work in a workgroup setup. Within a workgroup you need to pass the credentials along with Invoke-Command. To do that,

```
$cred = Get-Credential
Invoke-Command -ComputerName SP2010-WFE -ScriptBlock { Get-Process} -Credential $cred
```

In the example above, Get-Credential prompts for the credentials to access remote computer and uses the same while calling Invoke-Command cmdlet.

This is the end of this article on Invoke-Command. Invoke-Command has many other parameters which are not discussed here. They are more advanced and used in specific scenarios. I will discuss those use cases as we proceed further in this series of posts on PowerShell 2.0 remoting.
