# PowerShell 2.0 remoting guide: Part 12 – Using CredSSP for multi-hop authentication


In this part of the [remoting series](http://139.59.40.198/blog/?cat=240), we look at how [CredSSP ](http://msdn.microsoft.com/en-us/library/cc226764(PROT.10).aspx)can be used for [multi-hop authentication](http://msdn.microsoft.com/en-us/library/ee309365(VS.85).aspx) in PowerShell remoting. CredSSP and multi-hop support are not features of PowerShell 2.0 or PowerShell remoting, per se. Credential Security Service Provider (CredSSP) is a new security service provider that enables an application to delegate the user’s credentials from the client to the target server. Multi-hop support in Windows Remote Management uses CredSSP for authentication. Since PowerShell 2.0 remoting is built on top of WinRM, we can use CredSSP to perform multi-hop authentication.

**So, what is multi-hop authentication?**

Well, let us look at an example to understand what is multi-hop authentication. Imagine a group of computers as shown here and you establish a remoting session from computer A (client) to computer B (server) and then from computer B, you try to create a file in a file share on computer C.

{{<figure src="/images/remoting12-1.png">}}

Now, within the remoting session to computer B, we want to execute a command — as below — to create test.txt on computer C.

```
Invoke-Command -ComputerName Test-PC.SP2010lab.com -credential SP2010LAB\Administrator -ScriptBlock {[System.IO.File]::Create(\\FileServer\Share\Test.txt)}
```

{{<figure src="/images/remoting12-2.png">}}

This command results in an “Access Denied” error as shown above. This command fails since the remote session tries to access the file share using the machine credentilas instead of the credentials used to invoke the remote session. We could have successfully created the text file if there was a way to pass or delegate credentials from the client so that we can authenticate to the file share. This is what is called multi-hop authentication and PowerShell remoting enables this using CredSSP.

**How do we delegate credentials?**

The cmdlets to create a remoting session — Invoke-Command, Enter-PSSession and New-PSSession — have a parameter to specify the authentication method as CredSSP. However, before we use this parameter, we need to enable credSSP on the computers participating in multi-hop authentication. Also, when enabling CredSSP, we need to specify the role — client or server — of a computer. A client is the computer from which the remoting session is initiated and server is the computer from which the multi-hop authentication is triggered. So, from the above example, we need to enable CredSSP authentication on computer A and computer B.

PowerShell 2.0 has [Enable-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819469.aspx), [Disable-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819469.aspx) and [Get-WSMANCredSSP](http://technet.microsoft.com/en-us/library/dd819468.aspx) cmdlets to manage CredSSP authentication

Let us now look at how we enable WSManCredSSP and specify client / server roles. First, let us enable CredSSP on computer A.

> **Note**: You need to run these cmdlets in an elevated prompt.

```
Enable-WSManCredSSP -Role Client -DelegateComputer "*.SP2010lab.com"
```

As shown here, you can use [Enable-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819469.aspx) cmdlet to enable CredSSP authentication and specify the computer role as client. When the computer role is defined as a client, you can also specify the DelegateComputer parameter to specify the server or servers that receive the delegated credentials from the client. The delegateComputer accepts wildcards as shown above. You can also specify “*” to specify all computers in the network.

When [Enable-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819469.aspx) cmdlet is used to enable CredSSP on the client by specifying client in the role parameter. The cmdlet then performs the following:

- The WS-Management setting <localhost|computername>\Client\Auth\CredSSP is set to true.
- Sets the Windows CredSSP policy AllowFreshCredentials to WSMan/Delegate on the client.

Now, we will enable CredSSP on computer B and deginate that as server.

```
Enable-WSManCredSSP -Role Server
```

The above cmdlet enables CredSSP on computer B and sets the WS-Management setting <localhost|computername>\Service\Auth\CredSSP is to true. Now, we can use Invoke-Command to run the script block as shown at the beginning of this post. However, we will specify the authentication method as CredSSP and pass the credentials.

```
Invoke-Command -ComputerName test-pc.SP2010lab.com -Credential SP2010Lab\Administrator -Authentication CredSSP -ScriptBlock {[System.IO.File]::Create(\\FileServer\Share\Test.txt)}
```

{{<figure src="/images/remoting12-3.png">}}

As you see here,  we see the output from Create() method which shows the details of the newly created file.

> **Caution:** CredSSP authentication delegates the user’s credentials from the local computer to a remote computer. This practice increases the security risk of the remote operation. If the remote computer is compromised, when credentials are passed to it, the credentials can be used to control the network session.

You can use [Disable-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819469.aspx) to disable CredSSP authentication on a client or a server computer.

```
Disable-WSManCredSSP -Role Client            
Disable-WSManCredSSP -Role Server
```

You can use [Get-WSManCredSSP](http://technet.microsoft.com/en-us/library/dd819468.aspx) cmdlet to verify if a computer has CredSSP enabled and also the role (client/server).

This is it for now. We will look at few more aspects of PowerShell remoting in the next part of this series. Stay tuned..!
