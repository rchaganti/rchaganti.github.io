# Azure Policy Guest Configuration - Introduction


As your Azure adoption increases and as you on-board various departments and groups within your organization to start using Azure services, it is important that you put in place some level of governance. As cloud architect, you would want control over who can create what type resources, where can they create those resources and how many. You would also want to standardize on the deployments so that the configuration of resources is in compliance with your organization standards. Among many other aspects like this you would want the ability to track your cloud cost more granularly for every service deployed in the cloud and for every business unit or group within your organization. To address this and to implement efficient governance Azure offers features and services such as [Policies](https://docs.microsoft.com/en-us/azure/governance/policy/overview), [Management Groups](https://docs.microsoft.com/en-us/azure/governance/management-groups/), [Resource Graph](https://azure.microsoft.com/en-us/features/resource-graph/), and [Blueprints](https://docs.microsoft.com/en-us/azure/governance/blueprints/overview). Here is an excellent depiction of Azure governance architecture from the [partner blog](https://www.microsoft.com/en-us/us-partner-blog/2019/07/24/azure-governance/).

{{< figure src="/images/armin30/d1-azuregovernance.png" width="400">}} {{< load-photoswipe >}}

One of the components within Azure governance framework is [Azure Policy.](https://docs.microsoft.com/en-us/azure/governance/policy/overview) Azure Policy helps enforce your organizational IT and business standards for resource consistency, compliance to regulatory requirements, management, security, and cost. Azure offers a set of built-in policy definitions that are readily available for some of the common use cases in your Azure environment. You can, of course, create your own custom policy definitions as well. These policy definitions can be assigned to different scopes within your subscription.  

An assigned policy is evaluated: 

* When a resource goes through it's life cycle events such as creation, modification, or deletion
* When the standard compliance evaluation cycle gets triggered
* When a assigned policy gets newly assigned or gets updated

One of the, trivial but easy to understand, examples of using Azure Policy is to control the size of virtual machines that a user can create. To achieve this, you define a policy and assign it at any applicable scope from a management group to even an individual resource. When it comes to Infrastructure as a Service (IaaS) virtual machines, using Azure policy you can define constraints on what type of VMs, location of VMs, enforcing tags, and so on. You can consider this as the outside configuration of a virtual machine. If you have to audit configuration settings within the OS and / or applications running inside the VM, you can use the Azure Policy Guest Configuration.

### Azure Policy Guest Configuration

Azure Policy, through the use of [Guest Configuration](https://docs.microsoft.com/en-us/azure/governance/policy/concepts/guest-configuration), can audit settings inside a VM. This is done using the Guest Configuration Extension. The Azure Policy Guest Configuration can be used with both Azure VMs as well as Azure Arc Connected machines. For Azure VMs, you must enable the virtual machine extension and have a system managed identity assigned to the VM. The extension inside the VM uses the system managed identity to read and write to the Guest Configuration service.  

For Azure Arc connected machines, you must have the [Azure Connected Machine agent](https://docs.microsoft.com/en-us/azure/azure-arc/servers/agent-overview). 

Inside the Azure VM or Azure Arc Connected machine, guest configuration uses the tools specific to the operating system to audit configuration settings. For Windows OS, PowerShell Desired State Configuration (DSC) v2 gets used and for Linux systems, Chef Inspec is used. Guest configuration policies get evaluated every 15 minutes.

Here is a nice overview session by Michael Greene who is the Program Manager for the Azure Policy Guest Configuration feature.

{{<youtube "pySg_YuxnR0">}}

Similar to Azure Policy, Guest Configuration service also has a bunch of built-in definitions and initiatives. If you filter the category to Guest Configuration, you will see a list of policies that can be assigned to Azure VMs and/or Azure Arc Connected machines. 

{{< figure src="/images/armin30/gcpol.png" width="800">}}

Policy definitions when grouped together are called initiatives and Guest Configuration has a few initiatives as well.

{{< figure src="/images/armin30/gcpolinit.png" width="800">}}

You will see many of them marked as deprecated. You can either assign to individual policies or initiatives to your machines (Azure or Arc Connected). 

With Guest Configuration, you can author your own policy definitions and initiatives. At present, these are written as DSC resource modules. You will learn more about this in a later part of this series.

Stay tuned for the next part where you will learn how to assign policies and initiatives to Azure virtual machines.
