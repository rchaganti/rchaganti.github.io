# Containers – What are they? Why do you need one? – Part 1

Containers? No, not the shipping containers but the much-hyped container technology in the computer industry. I am sure even if you have not used any of the existing container technologies, you must have at least read or heard about them.

I am not the first one to write about containers and this is certainly not an in-depth overview of container technologies. I will eventually get there and show you how you can deploy different container technologies. This series of articles is about my own thoughts and a documentation for my own reference. In the process, I wish to help my readers as well.

Let us get started. In this article, I will first describe what is the need for containers and how they are different from the virtual machines that we have been using all this while.

## Infrastructure Challenges

Before we start looking at containers, let us dig into some of the challenges in the current infrastructure models. This will form the foundation for moving to containers and you will be able to appreciate the value containers bring.

### Traditional Infrastructure

Not so long ago, most of the data centers had only physical servers. When planning for application workloads, IT managers typically looked at physical servers that are configured to support the resources required for the workload. We had to plan ahead to support future growth of application usage and resource requirements. This was usually achieved by over-sizing these physical servers. And, mostly, these physical servers were used to run only a single application workload. There is technically nothing stopping us from running multiple applications on the same physical server but that was simply not a best practice as we cannot completely limit the resources a process can create and accomplish full isolation between applications. These factors led to different set of problems and challenges.

Over-sizing physical servers led to lot of unused resources. For example, a web server may not need all the processing power and memory available in a physical server. But, sizing a web server just for its average utilization will lead to performance issues during peak conditions. Another challenge was related scaling out compute power. Going back to the web server example, when you need to scale-out your web farm to support additional load, lets says during holiday season, you had to plan for it in advance and keep the servers ready. This is mainly because provisioning new physical servers takes time.

There were also other concerns over space and power utilization when using physical servers in a data center. Then came virtualization and addressed most of the challenges associated with physical server deployments.

### Virtualized Infrastructure

Virtualized infrastructures, popularized by VMware, solved most or all of the problems that IT organizations encountered with physical servers. Virtualization enables agile workload deployment, workload mobility, efficient resource utilization using resource pools, and on-demand scale out using automation.

{{< figure src="/images/virt1.png">}} {{< load-photoswipe >}}

Virtualization is great. It enables full resource utilization through consolidation and brings in all other benefits I mentioned above. I can take two or more workloads with low resource requirements and consolidate them on a big fat physical server. For the guest OS inside these virtual machines, there is usually no difference. This is because the hypervisor is emulating the hardware that is required for the guest OS to run. But, this ease of use and full functionality comes at a cost. Virtual machines are fat. They have an overhead in terms of the hypervisor itself and the emulation that is needed for the guest OS to be fully functional. So, even if all you want to run is a simple application that is isolated from all other workloads on the same machine, you still have to pay for the cost of running a full OS inside a virtual machine. The cost here is not just dollars but the overhead in running that operating system too. Remember, every OS needs to patched and maintained. All this adds to the complexity of managing the infrastructure and therefore cost too. This needs to be mitigated in a better way. We will see the answer in a while.

## DevOps Challenges

[<img class="alignleft" src="http://www.quickmeme.com/img/f8/f807fc62794fa72409995d504dc6a48f36f2bd31b56f3661cc900f3b5a25f2c8.jpg" alt="" width="322" height="242" />][2]

The overhead associated with running virtual machines alone isn&#8217;t the problem. The VMs are used for running workloads and these workloads or applications need continuous updates as developers add more features or fix existing bugs. With the Agile development and release small and release often requirements, the coordination between developers and operations becomes a bigger challenge. The solution to this challenge is what we know as [DevOps][3].

> DevOps is not a single tool or software but rather a set of practices combined with different tools.

Most of the issues reported in either QA or pre-production phases of release are due to the differences in environment. That is, the developer environment may be tweaked to make a feature work but if the same changes are not propagated down to the QA, pre-production, and production environments, there is a higher chance of failure when the software updates are deployed. So, there is a need for consistent continuous delivery and integration. This automation may not be a challenge when there are just a handful of systems in each environment. However, that is not the case. Many deployments are large (think how Facebook or Google are running their software on millions of servers) and a simple automation isn't good enough. Also, the continuous delivery and integration challenges only multiply with the need for supporting disparate platforms and system architectures. When working at a large scale, we need to ensure that the application can be scaled out with a lot less effort than creating a VM and then configuring it for the application. The time to value is super critical in this scenario. Some of these challenges can be solved by configuration management platforms such as Puppet, Chef, or even Windows PowerShell Desired State Configuration. We will talk more about this in a later post.

So, how do we overcome these challenges posed by the infrastructure, continuous delivery and integration? Containers have an answer.

In this article, we looked at the need and the primary drivers for the technology behind containerization. In the next part, I will introduce containers and history of container technologies.

[2]: http://www.quickmeme.com/img/f8/f807fc62794fa72409995d504dc6a48f36f2bd31b56f3661cc900f3b5a25f2c8.jpg
[3]: http://en.wikipedia.org/wiki/DevOps
