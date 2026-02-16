# Containerization in Microsoft Azure


Containerization is everywhere -- from on-premises data centers to the edge and in the cloud. We have been using containers right from development to production. I wrote about VS Code development containers and how [I have standardized my development environment using devcontainers.](https://ravichaganti.com/blog/bicep-feature-in-vscode-devcontainer/) There are several options for companies to run containerized applications in production. we can run individual application containers on a container host using engines like Docker. We can use tools like Docker [Compose](https://docs.docker.com/compose/) or [Swarm](https://docs.docker.com/engine/swarm/) for slightly complex multi-container, multi-host environments. However, it becomes complex to manage such environments. This needs us to implement a physical or virtualized server environment and handle all operational overhead associated with running our data center.

Many cloud providers offer managed environments to run containerized applications. Microsoft Azure, too,  offers several options for running containerized applications.

### Azure Container Instances (ACI)

[ACI service](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-overview) offers the capability to spin a container in the Azure cloud, similar to running a container from an image using the `docker run` command. With ACI, we can quickly deploy and scale containers for running short-lived and bursty workloads. We don't need to worry about owning and deploying any infrastructure. ACI offers faster startup times. We can access the container instance using a Fully-Qualified Domain Name (FQDN). ACI integrates with other Azure services, such as Virtual Networks and Storage. We can use Azure PowerShell or Azure CLI to provision container instances in the Azure cloud.

ACI uses the concept of container groups to group together multiple containers, deploy to the same host, share the same network, and share any mounted volumes. We can have up to 60 containers and 20 volumes per container group. 

ACI service runs containers inside a Hyper-V virtual machine to provide higher isolation levels. We can use resource requests to allocate CPU and memory per container group. ACI is not a container orchestrator like Kubernetes. Azure Container Instances can be virtual Azure Kubernetes Service (AKS) nodes.

### Azure Kubernetes Service (AKS)

Azure Kubernetes Service is the hosted Kubernetes service from Azure. When using AKS, the operational overhead is offloaded to Azure. This is done by automatically provisioning the Kubernetes control plane. This control plane is provided at no additional cost, and we only pay for the worker nodes. An AKS cluster contains at least one node, an Azure virtual machine running the Kubernetes node components, and a container runtime. AKS supports thousands of nodes in a single cluster. In an AKS cluster, nodes are grouped as node pools based on the configuration. These node pools can contain both Windows and Linux nodes.

AKS offers a built-in load balancer, automated scaling, and upgrades. We can use the recently used Kubernetes Fleet Manager (preview) for resource propagation and multi-cluster load balancing. While AKS offers an excellent way to run cloud-native applications and removes the overhead of managing a Kubernetes cluster, developers must still be aware of creating Kubernetes deployments specs written in YAML and managing the health of applications. This is where Azure Container Apps (ACA) help.

### Azure Container Apps

Azure Container Apps (ACA) offer a fully managed serverless platform on which we can run microservices ad containerized applications. With ACA, we can run application code packaged in container format and not worry about managing cloud infrastructure. A group of containers share a secure environment within which all containers share the same network and write logs to the same destination. Azure handles the updates, resource balancing, scaling, and failover procedures. ACA supports Distributed Application Runtime (DAPR) and Kubernetes Event-Driven Autoscaling (KEDA) and is best suited for applications that implement microservice and event-driven architectures. 

In future posts, we will dive into each of these services, understand the concepts, implement applications, and finally gain the knowledge to help us decide to choose one of the services for our applications.  


