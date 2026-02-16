# Fully automated Kubernetes cluster deployment on Azure in under 8 minutes


In an earlier article, I wrote about provisioning a virtual Kubernetes cluster with kubeadm](https://ravichaganti.com/blog/2022-11-13-installing-and-configuring-kubernetes-cluster-using-kubeadm-on-ubuntu/). I use this method on a laptop with limited resources. This is good to a large extent but not good enough when I want to scale my experiments and learning. This is where I began planning my Kubernetes lab on Azure. I needed something I could spin quickly with no manual intervention. Given my interest in the Bicep language, I naturally wrote a Bicep template to perform this deployment.

> **Shameless plug:** If you are new to Bicep language or know nothing about Bicep, take a look at my [Azure Biicep - Zero to Hero](https://leanpub.com/azurebicep) book.

This article is not about how I used Bicep templates or the techniques [there are certainly a few lessons I learned] I followed in building the Bicep template. Instead, it is more about how you can use this template and what you will get when you deploy it. I am adding a bonus chapter to my Azure Bicep book to describe the techniques I used in this Bicep template.

### Announcing K8sAzLab

As a part of this experiment to automate Kubernetes deployment on Azure, I created a set of Bicep modules and a Bicep template that uses these modules. This is available in my GitHub repo [github.com/rchaganti/k8sazlab](https://github.com/rchaganti/k8sazlab). 

Here is how you use this template. First, start by cloning this repository.

```shell
git clone https://github.com/rchaganti/K8sAzLab.git
```

This repository contains a devcontainer definition that you can use to start a container (assuming you have Docker Desktop installed) with the necessary tooling to build and deploy Bicep templates. This is my preferred way of development these days. If you do not have Docker Desktop or do not prefer devcontainers, you can simply install Bicep binary on the local machine to provision this template.

Before you deploy template, the `main.bicep` template contains a few parameters that are needed for template deployment.

| Parameter Name       | Description                                                  | Default Value            |
| -------------------- | ------------------------------------------------------------ | ------------------------ |
| location             | Location for all resources created using this template       | resourceGroup().location |
| storageAccountName   | Specifies the name of the Azure Storage account              |                          |
| storageFileShareName | Specifies the SMB share name for sharing files between nodes | temp                     |
| numCP                | Number of control plane VMs                                  | 1                        |
| numWorker            | Number of worker VMs                                         | 3                        |
| username             | Username for the Linux VM                                    | ubuntu                   |
| authenticationType   | Type of authentication to use on the Virtual Machine. SSH key is recommended | password                 |
| passwordOrKey        | SSH Key or password for the Virtual Machine. SSH key is recommended |                          |
| cniPlugin            | CNI plugin to install                                        | calico                   |
| cniCidr              | CNI Pod Network CIDR                                         | 10.244.0.0/16            |

This is still a very early version of my work and gets you from nothing to a fully functional Kubernetes cluster with a single control plane node in under 8 minutes. 

{{< figure src="/images/k8s-az-1.png" >}} {{< load-photoswipe >}}

At the moment, this can only support single control plane node. I have not added HA configuration yet and will do that in the coming days/weeks. For CNI, Calico is supported and I plan to add Cilium support soon. The overall structure of the module enables extending the overall automation in a easy manner. A storage account and an SMB share are created for the purpose of sharing the `kubeadm join` command between control plane and worker nodes.

Here is how you provision the template using Azure CLI.

```shell
az deployment group create --template-file main.bicep \
              --parameters storageAccountName=someUniqueName \
              --resource-group k8s
```

The resource group that you specify in the above command must already exist. You will be prompted to enter a password / ssh key.

At the end of deployment, you will see the ssh commands to connect to each node in the cluster. You can query the deployment output using the following command.

```shell
vscode ➜ /workspaces/azk8slab $ az deployment group show -g k8s -n main --query properties.outputs
{
  "vmInfo": {
    "type": "Array",
    "value": [
      {
        "connect": "ssh ubuntu@cplane1lmwuauibze44k.eastus.cloudapp.azure.com",
        "name": "cplane1"
      },
      {
        "connect": "ssh ubuntu@worker1lmwuauibze44k.eastus.cloudapp.azure.com",
        "name": "worker1"
      },
      {
        "connect": "ssh ubuntu@worker2lmwuauibze44k.eastus.cloudapp.azure.com",
        "name": "worker2"
      },
      {
        "connect": "ssh ubuntu@worker3lmwuauibze44k.eastus.cloudapp.azure.com",
        "name": "worker3"
      }
    ]
  }
}
```

You can connect to the control plane node as the user you specified (default is ubuntu.) and verify if all nodes are in ready state or not and if all control plane pods are running or not.

{{< figure src="/images/k8s-az-2.png" >}} 

This is it for now. I spent a good part of my weekend validating this template and making sure it is ready to be shared. Nothing is perfect and I may have missed a few corner cases. If you run into any issues, [you know the drill](https://github.com/rchaganti/K8sAzLab/issues)! If you want to [contribute](https://github.com/rchaganti/K8sAzLab/pulls) or suggest ideas, please [feel free to add a discussion thread](https://github.com/rchaganti/K8sAzLab/discussions).

