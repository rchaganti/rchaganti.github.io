# Azure Resource Manager - Introduction


A while ago, I had written a [series of articles](https://ravichaganti.com/series/arm-templates/) introducing and diving deep into authoring Azure Resource Manager (ARM) templates. A few things have changed in authoring ARM templates and new features got added in the recent past. I thought it is probably a better time to revisit and do it all over again. At the same time, I thought why just limit to just authoring ARM templates. Over the years, I made notes around ARM and learned quite a bit. Starting today, I will share those notes with you here.

In this new and improved series, I will start from the very basics and build upon that in each article. The goal is to ensure I create a set of articles that can be referenced in a zero to hero approach to understand ARM and authoring ARM templates. So, without further ado, let us get started and let us start with the very basics.

## What is Azure Resource Manager (ARM)?

Microsoft Azure, during the early days, had a management layer called Azure Service Manager (ASM) that was responsible for deploying and managing services. These services that you deployed using ASM were all independent entities without any grouping whatsoever. There was no way to define the dependencies either. So, if you were to implement a three-tier application as a set of cloud services, each service in the three-tier application had to be deployed individually and managed individually. When you have to delete this application, you had to do it by deleting each service individually. The same applies to updates as well. Monitoring and billing was a nightmare. This approach was not scalable. So, during [Build 2014](https://channel9.msdn.com/Events/Build/2014/2-607), Microsoft announced a new deployment and management service called Azure Resource Manager (ARM).

Here is a super simplified view of the ARM that provides an overview of the constructs. 

{{< img src="/images/armin30/d1-armarch.png" width="350">}}

With ARM, all your ***resources*** having a common life cycle (create/update/delete) can now be grouped together under a ***resource group*** and their life cycle management can be done together. A resource group becomes the unit of management. Each resource in Azure is supplied by a service known as a ***resource provider***. The resources in Azure can be deployed in many ways but the focus of this series will be around the declarative ***deployment templates*** through which you can provision the resources in a consistent and idempotent manner. 

Let us dig a bit into the terminology you read in the above paragraph.

## Azure Resources

Resources are what you provision in Azure cloud. For example, as shown in the above image, web apps, virtual machines, databases, and so on. Each resource will have certain properties that you can configure. What resources you can provision depends on what is allowed and / or enabled in your subscription. We will look at this in a later article. 

## Azure Resource Groups

Resource group is a container for all resources that share a common life cycle. A resource should always exist in a resource group and can exist only in one group. It is not necessary that resources that have inter-dependencies are provisioned in the same resource group. These resources within a resource group can exist in different regions too. Instead, the life cycle of the resources is used as a way to group the resources together.

## Azure Resource Providers

The resource providers enable the resource and implement the management of the resources. Each resource that you can provision in Azure will have an associated resource provider. ARM binds all this together to provide a single management pane irrespective of what type of resource you are provisioning. 

There are several methods to interact with ARM for all your resource creation and management needs. These methods include Azure PowerShell module, Azure CLI, Azure SDKs for Golang, Python, and other languages. You can, of course, use the REST API directly to provision and manage resources. Through all these methods, you basically use individual commands or write scripts or you own applications to provision and manage resources. This approach is more imperative in nature. You write a script to implement what you need and at the same time you define how that needs to be done. In an imperative method, you perform checks to see if the resource that you are trying to provision already exists or not and provision only if it does not exist. You perform all error handling yourself in the imperative approach. And, if you were to create a lot of resources that do not necessarily depend on each other, you can write some parallel jobs to perform simultaneous execution of resource creation. But, the onus is on you to write this code and make sure it works.

## Azure Resource Manager Templates

ARM templates help eliminate the need for the tedious and error-prone development of automation scripts using any of the methods you read about earlier. These templates are JSON files that provide a declarative syntax to provision Azure resources. Using the **declarative** syntax of ARM templates, you define what infrastructure you need to provision and not how. With the increasing focus on Agile infrastructure practices and DevOps, this declarative template becomes a part of your application code and lives in the same source control repositories as your application. Any changes to the infrastructure configuration go through the same source control and application development procedures such as automation validations, continuous integration and delivery / deployment. This is what we describe as Infrastructure as Code (IaC). 

The ARM templates also offer a way to repeatedly deploy your infrastructure in Azure cloud. This is done in an **idempotent** way. Idempotency means that the result of a provisioning task (state of the resources defined in the template) would be same irrespective of how many times you run the task.

With ARM templates, unlike imperative scripting, you don't have to worry about simultaneous resource creation or resource provisioning dependencies or error handling. ARM can infer these dependencies from what is defined in the template and also perform parallel execution when possible. This ensures **reliable** deployment of resources defined in the template.

In summary, ***ARM templates offer a declarative method to provision your infrastructure resources in a reliable and idempotent manner***. There are several other aspects of ARM templates such as validation, extensions, and modularity / composability. You will read more about these characteristics in the upcoming parts of this series with relevant examples.

> Apart from ARM templates, there are 3rd party providers such as [Terraform](https://docs.microsoft.com/en-us/azure/developer/terraform/overview#:~:text=%20Terraform%20with%20Azure%20%201%20Automate%20infrastructure,configuring%20it%20to%20use%20Azure.%20%20More%20) and [Pulumi](https://www.pulumi.com/azure/) for provisioning Azure infrastructure. These methods provide the same characteristics as ARM templates. Each of these methods have their pros and cons. This series of articles will only use ARM templates as a way to provision infrastructure.

> If you are interested in exploring what ARM templates look like or looking for a quick start for a specific resource type or scenario, you may look up [Azure Quickstart templates GitHub repository](https://github.com/Azure/azure-quickstart-templates). 

Writing and reading ARM templates can be very complex and may get boring as well! At Build 2020, Microsoft announced [language revision](https://youtu.be/UaVCNpD3pvg?t=986) that intends to provide a Domain Specific Language (DSL) abstraction that complies to a JSON template underneath and makes it easy for you to author complex ARM templates. 

{{< youtube "UaVCNpD3pvg?t=986" >}}

As this preview becomes available, I will write more about this new method here.

After you author the ARM templates, you can deploy these templates using a variety of methods. You will read more about these methods in the next part of this series.

## Azure Deployment Manager

As your organization grows and you start using Azure with multiple subscriptions and may be in multiple regions too, it becomes complex to perform an ordered and monitored rollout of Azure deployments. This is where [Azure Deployment Manager](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-manager-overview) (ADM) comes into play. ADM extends ARM by enabling new features called *Service Topologies* and *Rollouts*.  ADM makes it easy to define complex deployments that span multiple regions and subscriptions and allows repeated deployments of these topologies using [Rollouts](https://docs.microsoft.com/en-us/rest/api/deploymentmanager/rollouts). You will learn about this in-depth in later parts of this series.

## Azure Governance

While knowing how to author and deploy ARM templates is an important part of working with Azure, it is equally important to know how to govern those resources and services deployed in Azure. As cloud architect, you would want control over who can create what type resources, where can they create those resources and how many. You would also want to standardize on the deployments so that the configuration of resources is in compliance with your organization standards. Among many other aspects like this you would want the ability to track your cloud cost more granularly for every service deployed in the cloud and for every business unit or group within your organization. To address this and to implement efficient governance Azure offers features and services such as [Policies](https://docs.microsoft.com/en-us/azure/governance/policy/overview), [Management Groups](https://docs.microsoft.com/en-us/azure/governance/management-groups/), [Resource Graph](https://azure.microsoft.com/en-us/features/resource-graph/), and [Blueprints](https://docs.microsoft.com/en-us/azure/governance/blueprints/overview). Here is an excellent depiction of Azure governance architecture from the [partner blog](https://www.microsoft.com/en-us/us-partner-blog/2019/07/24/azure-governance/).

{{< img src="/images/armin30/d1-azuregovernance.png" width="800">}}

***Azure Policy*** helps enforce your organizational IT and business standards for resource consistency, compliance to regulatory requirements, management, security, and cost. Azure offers a set of built-in policy definitions that are readily available for some of the common use cases in your Azure environment. You can, of course, create your own custom policy definitions as well.

***Azure Management Groups*** allow organizing subscriptions into containers called management groups and then perform governance on these management groups. The subscriptions under the management groups inherit the governance conditions (policies) applied at the management group level.

***Azure Resource Graph*** offers an efficient and performant way to query resources across multiple environments and subscriptions. This service can be used to extend management of Azure resources by enabling the ability to query resources with complex filtering, grouping, and sorting by resource properties. To use Azure Graph, you need to understand the Kusto Query Language ([KQL](https://docs.microsoft.com/en-us/azure/governance/resource-graph/concepts/query-language)). In this series of articles, you will see a basic overview of KQL and using Azure CLI to query the Resource Graph.

***Azure Blueprints*** enable streamlining of resource deployments by packaging ARM templates, policies, and role assignments. Blueprints are a declarative way to orchestrate these templates and other related artifacts. Blueprints enable efficient tracking and auditing of deployments. The knowledge you gain around ARM templates can be directly used with Azure Blueprints.

With this quick overview of Azure governance features and service, you have an understanding of Azure Resource Manager and services that complement ARM. This brings us to the end of today's article. The next few parts of this series will focus on authoring ARM templates. As described earlier, the ARM templates are JSON files and can be authored in notepad as well. But, there are some very good authoring tools and we will take a look at that in the next part of this series. Stay tuned!


