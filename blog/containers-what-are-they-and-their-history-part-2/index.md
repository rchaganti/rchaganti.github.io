# Containers – What are they? And, their history! – Part 2

In the earlier article, I explained the [hurdles in the traditional and virtualized ways of implementing workloads][1]. Also, we looked how the DevOps challenges are demanding changes the continuous delivery and integration processes. Towards the end, I&#8217;d mentioned that Containers are an answer.

In today&#8217;s article, we will see what are containers and some history behind containerization. Let us get started. In the subsequent parts, we will dig into each building block used within container technologies and understand how to use them.

> **Note**: If you are not a Linux user or never even installed Linux, lot of content that follows will sound alien. If you need to get a quick training on Linux, go ahead to [edX][2] and take the [Linux Foundation course][3].

Containers are light weight isolated operating system environments running on a host. Unlike virtual machines, containers

  * don&#8217;t need additional hardware capabilities such as Intel-VT and so on.
  * don&#8217;t need emulated BIOS or completely virtualized hardware

Instead, containers are processes running on a host operating system that provide allocation and assignment of resources such as CPU, memory, block IO, and network bandwidth and do not (or cannot) interfere with rest of the system&#8217;s resources or process.

Take a look at the following figure.

{{< figure src="/images/container11.png" >}} {{< load-photoswipe >}}

The figure above contrasts the way containers implemented with how VMs are built. Remember that containers are complementary to virtual machines. They are not a complete replacement for virtual machines. You may end up creating virtual machines for complete isolation and then run containers inside those VMs.

[pullquote]The above representation is an over-simplified architecture of containers. In fact, there are no technologies shown in the picture that really are the building blocks for creating containers. We will dig into that in a bit.[/pullquote]

Each container is a process within the host operating system. The applications running inside the container assume exclusive access to the operating system. In reality, those applications run inside an isolated process environment. This is similar to how [chroot][5] works. Historically speaking, the concept of containerization itself is not new. [Solaris Zones and Containers][6] did something similar for a long time. Windows OS had something called [Dynamic Hardware Partitioning][7] (not on x86 systems and something that never got popular for the same reason) in Windows Server 2008. The container technology that we are going to discuss is based on Linux OS and has some history associated with it. Let us review the history a bit and then dive into the technology that is used to implement these containers.

## History

Google [has been using the container technology][8] to run their own services for a long time. In fact, they create [more than 2 billion containers][9]  a week. While Google started using containerization in the year 2004, they formally donated the [cgroups project][10] to Linux kernel in the year 2007.

<p style="text-align: left;">
  [pullquote]<b>cgroups</b> (abbreviated from <b>control groups</b>) is a <a title="Linux kernel" href="http://en.wikipedia.org/wiki/Linux_kernel">Linux kernel</a> feature that limits, accounts for and isolates the <a class="mw-redirect" title="Resource (computer science)" href="http://en.wikipedia.org/wiki/Resource_(computer_science)">resource usage</a> (CPU, memory, disk I/O, network, etc.) of a collection of processes.[/pullquote]
</p>

The release of cgroups lead to creation of **[Linux Containers (LXC)][11]**. Apart from cgroups, LXC uses kernel namespaces, apparmor and SE Linux profiles, Chroots, CGroups, and other kernel capabilities such as Seccomp policies. LXC falls somewhere in between the VMs and a chroot.

### LMCTFY

Let-me-contain-that-for-you ([LMCTFY][12]) is an open source version of Google&#8217;s container stack. LMCTFY works at the same level as LXC and therefore it is not recommended to use it along side other container technologies such as LXC. Most or all of Google&#8217;s online services run inside the containers deployed using their own container stack and they have been doing this since 2004! So, it goes without saying that they have mastered this art containerization and certainly have a solid technology in LMCTFY.

Creating resource isolation is only one part of the story. We still need a better way to orchestrate the whole container creation and then manage the container life cycle.

### Docker

Orchestration of the container and managing life cycle is important and this is where tools such as [Docker][13] come into picture.

{{< youtube ZzQfxoMFH0U >}}

Docker, [until release 0.9][14], used LXC as the default execution environment. Starting with Docker 0.9, LXC was replaced with [libcontainer][15] &#8211; a library developed to access Linux kernel&#8217;s container APIs directly. With libcontainer, Docker can now perform container management without relying on other execution environments such as LXC. Although libcontainer is the new default execution environment, Docker still supports LXC. In fact, the execution driver API was added to ensure that other execution environments can be used when necessary provided they have a execution driver.

Docker revolutionized and brought the concepts of Linux containers to masses. In the subsequent parts of this series, we will dive into LXC, Docker, and the kernel components that help the overall containerization.

### Kubernetes

While tools such as Docker provide the container life cycle management, the orchestration of multi-tier containers and container clusters is still not easy. This is where Google once again took the lead and developed [Kubernetes][16].

Kubernetes is an open source system for managing containerized applications across multiple hosts, providing basic mechanisms for deployment, maintenance, and scaling of applications.

There are many other tools in the Docker eco-system. We will look at them when we start discussing Docker in-depth.

### Rocket

Docker has a rival in [Rocket][17]. Rocket is a new container runtime, designed for composability, security, and speed.

From their FAQ, [Rocket][18] is an alternative to the Docker runtime, designed for server environments with the most rigorous security and production requirements. Rocket is oriented around the App Container specification, a new set of simple and open specifications for a portable container format.

This is an interesting development and at the moment with Linux-only focus unlike Docker.

### Others

There are other container solutions such as OpenVZ and Warden. I will not go into the details as I have not worked on any of these. I will try and pull some information on these if I get to experiment with them a bit.

## Future

We looked at the history of container technology itself and the container solutions such as Docker. Docker has certainly brought Linux containers to lime-light. The future holds a lot. Many of the cloud providers have vouched for Docker integration and we can already see that in action with Microsoft Azure, Amazon Web Services, and Google Cloud Platform. Microsoft announced that the [Docker engine will soon come to the Windows Server][19] (both on-premises and in the cloud).

With the exciting times ahead, it is time for both IT professionals and developers to start looking at the containers. Stay tuned for more in-depth information.

* * *

### Further Reading

Cgroups [[Kernel Documentation][20]]

Namespaces [[Kernel Documentation][21]]

[Resource management: Linux kernel Namespaces and cgroups by Rami Rosen][22]

[Jailing your apps using Linux namespaces][23]

[Getting started with LXC][24]

[1]: /blog/containers-what-are-they-why-do-you-need-one-part-1
[2]: https://www.edx.org/
[3]: https://www.edx.org/course/introduction-linux-linuxfoundationx-lfs101x-2
[5]: http://en.wikipedia.org/wiki/Chroot
[6]: http://en.wikipedia.org/wiki/Solaris_Containers
[7]: https://technet.microsoft.com/en-us/library/cc755084%28v=ws.10%29.aspx
[8]: http://www.infoq.com/news/2014/06/everything-google-containers
[9]: http://slides.eightypercent.net/GlueCon%202014%20-%20Containers%20At%20Scale.pdf
[10]: http://en.wikipedia.org/wiki/Cgroups
[11]: http://linuxcontainers.org
[12]: https://github.com/google/lmctfy
[13]: http://docker.io
[14]: http://blog.docker.com/2014/03/docker-0-9-introducing-execution-drivers-and-libcontainer/
[15]: https://github.com/docker/libcontainer
[16]: https://github.com/GoogleCloudPlatform/kubernetes
[17]: https://coreos.com/blog/rocket/
[18]: https://github.com/coreos/rocket
[19]: https://msopentech.com/blog/2014/10/15/docker-containers-coming-microsoft-linux-server-near/
[20]: https://www.kernel.org/doc/Documentation/cgroups/cgroups.txt
[21]: https://www.kernel.org/doc/Documentation/namespaces/compatibility-list.txt
[22]: http://www.cs.ucsb.edu/~rich/class/cs290-cloud/papers/lxc-namespace.pdf
[23]: http://uwsgi-docs.readthedocs.org/en/latest/Namespaces.html
[24]: http://www.tomsitpro.com/articles/lxc-linux-containers-docker,1-1904.html
