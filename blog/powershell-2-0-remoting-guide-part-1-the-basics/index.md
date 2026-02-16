# PowerShell 2.0 remoting guide: Part 1 – The basics


I am starting a series of articles on remoting feature of PowerShell 2.0. This is one of the best features of PowerShell 2.0 and my favorite feature for sure. The number of very cool things one can achieve using this feature is just un-imaginable. I have started digging deep in to this feature as I start writing a network file browser powerpack as a part of hands-on. I hope it is worth sharing what I learn by writing about it here. So, this is the first in that series of posts. In this post, we will look at absolute basics to start using PowerShell remoting. 

### What is PowerShell remoting?

This is a new feature in PowerShell 2.0 that enables remote management of computers from a central location. Remoting uses WS-Management to invoke scripts and cmdlets on remote machine(s). This feature also enables what is known as &#8220;<a href="http://blogs.msdn.com/powershell/archive/2008/08/19/v2-interview-universal-code-execution-model.aspx" target="_blank">Universal Code Execution Model</a>&#8221; in Windows PowerShell v2. UCEM means that whatever runs locally should run anywhere. PowerShell remoting lets you import remote commands in to a local session &#8212; a feature known as<a href="http://technet.microsoft.com/en-us/library/dd347575.aspx" target="_blank"> implicit remoting </a>and also enables you to save or <a href="http://technet.microsoft.com/en-us/library/dd347679.aspx" target="_blank">export</a> these imported commands to local disk as a module for later use. There are bunch of other features such as<a href="http://technet.microsoft.com/en-us/library/dd315384.aspx" target="_blank"> interactive </a>sessions, etc. We will look in to all these features but one thing at a time.

PowerShell remoting allows for multiple ways of connecting. These ways include interactive (1:1), fan-out (1:many), and fan-in (many:1 by using the IIS hosting model, Ex: <a href="http://powergui.org/entry.jspa?externalID=2611&categoryID=299" target="_blank">MobileShell</a> ). We will look at each of these methods in this series of articles on remoting.

#### Remoting requirements

To enable PowerShell remoting, all computers participating in remote management should have the following software.


  <ul>
    <li>
      Windows PowerShell 2.0
    </li>
    <li>
      .NET framework 2.0 SP1 or later
    </li>
    <li>
      Windows Remote Management (WinRM) 2.0
    </li>
  </ul>
All of the above are installed by default on Windows 7 and Windows Server 2008 R2. However, earlier versions of Windows will require you to download the updates from Microsoft website and install them yourself.

PowerShell 2.0 and WinRM 2.0 are included as a part of <a href="http://support.microsoft.com/kb/968929" target="_blank">Windows Management Framework </a>download and hence is available for Windows XP, Windows Server 2003, Windows Vista and Windows Server 2008. WinRM 2.0 and PowerShell 2.0 can be installed on the following supported operating systems:


  <ul>
    <li>
      Windows Server 2008 with Service Pack 1
    </li>
    <li>
      Windows Server 2008 with Service Pack 2
    </li>
    <li>
      Windows Server 2003 with Service Pack 2
    </li>
    <li>
      Windows Vista with Service Pack 2
    </li>
    <li>
      Windows Vista with Service Pack 1
    </li>
    <li>
      Windows XP with Service Pack 3
    </li>
  </ul>
Apart from the OS versions listed above, PowerShell 2.0 is supported on Windows Embedded POSReady 2009 and Windows Embedded for Point of Service 1.1 as well. Thanks to <a href="http://twitter.com/alexandair/" target="_blank">@alexaindar</a> for the pointer on this. I did not know that such OS existed apart from Windows XP Embedded which I saw a few years ago 🙂

To be able run scripts and commands on remote computers, the user performing remote script execution must be a member of the administrators group on the remote machine or should be able to provide administrator credentials at the time of remote execution. Also, on client versions of Windows such as Windows Vista and Windows 7, network location must be set either to Home or Work. WS-Management may not function properly if the network location is set to Public.

Here is the setup I have to experiment with PowerShell remoting. I will use these virtual machines and the Windows Server 2008 R2 OS to write my file browser PowerPack using PowerShell remoting. This will help me get a good coverage of all supported operating system families.

{{<figure src="/images/remoting1-1.png">}}

<a href="http://www.jonathanmedd.net/category/cmdlet-series" target="_blank">Jonathan Medd</a> is currently writing a PowerShell cmdlet series in which he is talking about remoting cmdlets also. What I am going to write here is not a repeat of that. In the <a href="http://139.59.40.198/blog/?p=1064" target="_blank">next pos</a>t, we will look <span style="text-decoration: line-through;">at how to configure the available systems to enable</span> at an overview of PowerShell remoting  cmdlets. I will also talk about various methods to enable PowerShell remoting. So, stay tuned..!
