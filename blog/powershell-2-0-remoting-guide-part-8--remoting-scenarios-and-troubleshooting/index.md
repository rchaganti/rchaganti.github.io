# PowerShell 2.0 remoting guide: Part 8 – remoting scenarios and troubleshooting


If you have been following this remoting series and using PS remoting on a test setup or even production, you must have gone through a few initial hiccups. In fact, there could be many such issues if you are working in a mixed environment where you have a few computers in a domain and a few in workgroup. So, in this part of the remoting series I will discuss some of these issues and workarounds to resolve the same. I discussed enabling remoting on workgroup computers in [part3](http://139.59.40.198/blog/?p=1060) – “Enable remoting” of this series. This post is kind of an extension to that.

A more detailed guide is available at [about_remote_troubleshooting](http://technet.microsoft.com/en-us/library/dd347642.aspx) page on TechNet. I will list only the scenarios I have tested.

**Remoting to a computer in workgroup from a computer in domain**

Take an example of two computers, Win7-VM in a domain environment and WinXP-VM in a workgroup. Now, if you want to start a remoting session from Win7-VM using Enter-PSSession using:

```
Enter-PSSession -ComputerName WinXP-VM -Credential WinXP-VM\Administrator
```

you will see an error message similar to the one here

{{<figure src="/images/remoting8-1.png">}}

We can workaround this by adding the remote computer to local computer’s trusted hosts list — in this case, on Win7-VM. You can use one of the following methods.

```
Set-Item WSMan:\localhost\Client\TrustedHosts -Value *
```

```
set-item wsman:\localhost\Client\TrustedHosts -value WinXP-VM
```

> **Note**: WSMan:\LocalHost\Client will be available only if WinRM service is enabled and running.

The first command uses a wildcard to add all computers in the network to the list of trusted hosts and the second command adds only WinXP-VM to that list. You can also supply a comma seperated list.

**Remoting to a computer in domain from a computer in workgroup**

Using the same example as above — if you want to establish a remoting session from WinXP-VM to Win7-VM, you can change the trusted hosts list on WinXP-VM to add the computers in the domain. Again, it can be done in multiple ways.

```
Set-Item WSMan:\localhost\Client\TrustedHosts -Value *            
set-item wsman:\localhost\Client\TrustedHosts -value Win7-VM            
set-item wsman:\localhost\Client\TrustedHosts -value *.remotinglab.com
```

The first two commands variations must be familiar by now. The 3rd variation adds all computers in [remotinglab.com](http://remotinglab.com/) domain to the trusted hosts on WinXP-VM computer.

**Remoting to a domain computer as a non-administrator from another domain computer**

To start a remoting a session with a remote computer, the user initiating the remoting session must

1. Be a member of the administrators group on the remote computer **or**
2. Be able to authenticate to the remote computer as an administrator using the Credential parameter

Alternatively — on the remote computer, you can give non-administrator users execute permission to default session configuration. This can be done by running the following command at a elevated PowerShell prompt:

```
Set-PSSessionConfiguration Microsoft.Powershell -ShowSecurityDescriptorUI            

#In addition to the above, on a x64 computer
Set-PSSessionConfiguration Microsoft.Powershell32 -ShowSecurityDescriptorUI
```

When you use the above cmdlet, you will see a dialog box as shown here.

{{<figure src="/images/remoting8-2.png">}}

Here, you need to click add and then select the non-administrator user account. Once added, give the user Execute permission. After you click OK on the main dialog and return to PowerShell, you will be prompted to restart WinRM service. That is it. I recommend this method than the first two. This way a non-administrator user should be able to remote in to a domain computer without providing administrator credentials or adding the user to local administrators group.

A few things I discussed here today are really meant for an advanced remoting post. However, for the sake of getting started in a mixed environment, I thought this post is must. Feel free to write any questions you may have in an email or tweet to me.
