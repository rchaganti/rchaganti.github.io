# Using Bicep to provision Azure Red Hat OpenShift cluster


Azure Red Hat OpenShift (ARO) service provides fully managed and highly available OpenShift clusters on Azure jointly operated by Microsoft and Red Hat. There are different ways to provision an ARO cluster. 

- Azure Portal 
- Azure CLI or Azure PowerShell
- Azure Resource Manager (ARM) / Bicep templates
- Red Hat Advanced Cluster Management (RHACM)

This article will explore using Bicep language to provision an ARO cluster.

> Examples in this article use Azure CLI for interacting with Azure resources and deployments.

## Prerequisites

Before we look at the Bicep template, we need a few prerequisites to be in place. First and foremost, we need an Azure subscription. The subscription must also register the necessary resource providers for the ARO cluster deployment.

```shell
az provider register --namespace 'Microsoft.RedHatOpenShift' --wait
az provider register --namespace 'Microsoft.Compute' --wait
az provider register --namespace 'Microsoft.Storage' --wait
az provider register --namespace 'Microsoft.Authorization' --wait

ARO_RP_SP_OBJECT_ID=$(az ad sp list --display-name "Azure Red Hat OpenShift RP" --query [0].id -o tsv)
```

We need to create a resource group where the ARO cluster will reside.

```shell
RESOURCEGROUP=aro
LOCATION=eastus
az group create --name $RESOURCEGROUP --location $LOCATION
```

The user account must have at least contributor and user access administrator permissions to provision an ARO cluster. We shall create a service principal, which will be assigned the necessary roles at the subscription scope later using the Bicep template.

```shell
SUBSCRIPTION_ID=73f21a5e-7cd2-49f8-b314-6b95b971e7c2
SP_RESULT=$(az ad sp create-for-rbac --name "sp-$RESOURCEGROUP-${RANDOM}")
SP_CLIENT_ID=$(jq -r '.appId' <<<"$SP_RESULT")
SP_CLIENT_SECRET=$(jq -r '.password' <<<"$SP_RESULT")
SP_OBJECT_ID=$(az ad sp show --id $SP_CLIENT_ID | jq -r '.id')

az role assignment create --role 'User Access Administrator' \
                          --scope /subscriptions/$SUBSCRIPTION_ID \
                          --assignee-object-id $SP_OBJECT_ID \
                          --assignee-principal-type 'ServicePrincipal'

az role assignment create --role 'Contributor' \
                          --scope /subscriptions/$SUBSCRIPTION_ID \
                          --assignee-object-id $SP_OBJECT_ID \
                          --assignee-principal-type 'ServicePrincipal'
```

The above commands create a service principal and then set the necessary environment variables for the values we are interested in. We also perform the role assignments to ensure the service principal has the necessary permissions.

We need a Red Hat pull secret to enable Operator Hub within the ARO cluster. The content of this pull secret must be available as pull-secret.txt at the same location as the Bicep template.

## ARO Bicep template

Once the prerequisite configuration is complete, we can start working on the Bicep template. Let us start with a set of parameter definitions.

```bicep
@description('Location')
param location string = resourceGroup().location

@description('Domain Prefix')
param domain string = ''

@description('Name of ARO vNet')
param clusterVnetName string = 'aro-vnet'

@description('ARO vNet Address Space')
param clusterVnetCidr string = '10.100.0.0/15'

@description('Worker node subnet address space')
param workerSubnetCidr string = '10.100.70.0/23'

@description('Controlplane node subnet address space')
param cpSubnetCidr string = '10.100.76.0/24'

@description('Controlplane Node VM Type')
param cpVmSize string = 'Standard_D8s_v3'

@description('Worker Node VM Type')
param workerVmSize string = 'Standard_D4s_v3'

@description('Worker Node Disk Size in GB')
@minValue(128)
param workerVmDiskSize int = 128

@description('Number of Worker Nodes')
@minValue(3)
param workerCount int = 3

@description('Cidr for Pods')
param podCidr string = '10.128.0.0/14'

@description('Cidr of service')
param serviceCidr string = '172.30.0.0/16'

@description('Unique name for the cluster')
param clusterName string

@description('Tags for resources')
param tags object = {
  env: 'Dev'
  dept: 'Ops'
}

@description('Api Server Visibility')
@allowed([
  'Private'
  'Public'
])
param apiServerVisibility string = 'Public'

@description('Ingress Visibility')
@allowed([
  'Private'
  'Public'
])
param ingressVisibility string = 'Public'

@description('Application ID of an Entra client application')
param aadClientId string

@description('Object ID of an Entra client application')
param aadObjectId string

@description('The secret of an Entra client application')
@secure()
param aadClientSecret string

@description('The ObjectID of the Resource Provider Service Principal')
param rpObjectId string

@description('Specify if FIPS validated crypto modules are used')
@allowed([
  'Enabled'
  'Disabled'
])
param fips string = 'Disabled'

@description('Specify if controlplane VMs are encrypted at host')
@allowed([
  'Enabled'
  'Disabled'
])
param cpEncryptionAtHost string = 'Disabled'

@description('Specify if worker VMs are encrypted at host')
@allowed([
  'Enabled'
  'Disabled'
])
param workerEncryptionAtHost string = 'Disabled'
```

The parameters in this template help us customize the ARO cluster deployment. There are customizations such as FIPS and encryption at the host disabled by default. The API server and ingress visibility are configured to be public. This template creates three control plane nodes and three worker nodes by default. We cannot change the number of control plane nodes, but the worker count can be customized using the `workerCount` parameter.

Before provisioning any resource dependencies, we need to set up a few variables.

```bicep
var contributorRoleDefinitionId = resourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')

var resourceGroupId = subscriptionResourceId('${subscription().subscriptionId}', 'Microsoft.Resources/resourceGroups', 'aro-${domain}-${location}')

var cpSubnetId=resourceId('Microsoft.Network/virtualNetworks/subnets', clusterVnetName, 'controlplane')

var workerSubnetId=resourceId('Microsoft.Network/virtualNetworks/subnets', clusterVnetName, 'worker')

var pullSecret = loadTextContent('pull-secret.txt','utf-8')
```

The first variable -- `contributorRoleDefinitionId` -- is used to retrieve the resource ID of the Contributor role definition. We need this later when we assign permissions on the virtual network resource. The remaining variables defined using the built-in `subscriptionResourceId` and resourceId functions are used later in the resource definitions.

To provision an ARO cluster, we need a virtual network with two subnets -- *controlplane* and *worker*. We create this by provisioning a virtual network resource.

```bicep
resource clusterVnetName_resource 'Microsoft.Network/virtualNetworks@2020-05-01' = {
  name: clusterVnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        clusterVnetCidr
      ]
    }
    subnets: [
      {
        name: 'controlplane'
        properties: {
          addressPrefix: cpSubnetCidr
          serviceEndpoints: [
            {
              service: 'Microsoft.ContainerRegistry'
            }
          ]
          privateLinkServiceNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'worker'
        properties: {
          addressPrefix: workerSubnetCidr
          serviceEndpoints: [
            {
              service: 'Microsoft.ContainerRegistry'
            }            
          ]
        }
      }
    ]
  }
}
```

This definition creates a virtual network resource with subnets for the control plane and worker nodes. Next, we must use the *roleAssignments* extension resource to assign contributor access to the service principal and OpenShift Resource Provider on the virtual network resource.

```bicep
resource clusterVnetName_aadObjectId 'Microsoft.Authorization/roleAssignments@2020-10-01-preview' = {
  name: guid(aadObjectId, clusterVnetName_resource.id, contributorRoleDefinitionId)
  scope: clusterVnetName_resource
  properties: {
    roleDefinitionId: contributorRoleDefinitionId
    principalId: aadObjectId
    principalType: 'ServicePrincipal'
  }
}

resource clusterVnetName_rpObjectId 'Microsoft.Authorization/roleAssignments@2020-10-01-preview' = {
  name: guid(rpObjectId, clusterVnetName_resource.id, contributorRoleDefinitionId)
  scope: clusterVnetName_resource
  properties: {
    roleDefinitionId: contributorRoleDefinitionId
    principalId: rpObjectId
    principalType: 'ServicePrincipal'
  }
}
```

With this, we are all set to create an ARO cluster. The following definition helps us with that.

```bicep
resource clusterName_resource 'Microsoft.RedHatOpenShift/OpenShiftClusters@2023-09-04' = {
  name: clusterName
  location: location
  tags: tags
  properties: {
    clusterProfile: {
      domain: domain
      resourceGroupId: resourceGroupId
      pullSecret: pullSecret
      fipsValidatedModules: fips
    }
    networkProfile: {
      podCidr: podCidr
      serviceCidr: serviceCidr
    }
    servicePrincipalProfile: {
      clientId: aadClientId
      clientSecret: aadClientSecret
    }
    masterProfile: {
      vmSize: cpVmSize
      subnetId: cpSubnetId
      encryptionAtHost: cpEncryptionAtHost
    }
    workerProfiles: [
      {
        name: 'worker'
        vmSize: workerVmSize
        diskSizeGB: workerVmDiskSize
        subnetId: workerSubnetId
        count: workerCount
        encryptionAtHost: workerEncryptionAtHost
      }
    ]
    apiserverProfile: {
      visibility: apiServerVisibility
    }
    ingressProfiles: [
      {
        name: 'default'
        visibility: ingressVisibility
      }
    ]
  }
  dependsOn: [
    clusterVnetName_resource
  ]
}
```

This is straightforward. The ARO resource requires us to specify the `clusterProfile`, `networkProfile`, `servicePrincipalProfile`, `masterProfile`, `workerProfiles`, `apiserverProfile`, and `ingressProfiles`. Once this ARO cluster is provisioned, we can retrieve the console and API server URLs using the outputs.

```bicep
output aroCluster object = {
  clusterName: clusterName_resource.name
  clusterApiServerUrl: clusterName_resource.properties.apiserverProfile.url
  clusterConsoleUrl: clusterName_resource.properties.provisioningState == 'Succeeded' ? clusterName_resource.properties.consoleProfile.url : ''
}
```

This template is ready to be deployed. We can use the `az deployment group create` command to deploy the template.

```shell
DOMAIN=hub
ARO_CLUSTER_NAME=hub

az deployment group create --name aroDeployment \
                           --resource-group $RESOURCEGROUP \
                           --template-file main.bicep \
                           --parameters location=$LOCATION \
                           --parameters domain=$DOMAIN \
                           --parameters clusterName=$ARO_CLUSTER_NAME \
                           --parameters aadClientId=$SP_CLIENT_ID \
                           --parameters aadObjectId=$SP_OBJECT_ID \
                           --parameters aadClientSecret=$SP_CLIENT_SECRET \
                           --parameters rpObjectId=$ARO_RP_SP_OBJECT_ID
```

The resource group we provisioned gets used as the base resource group. This base resource group houses the virtual network and the ARO cluster. The ARO resource provider creates another resource group called the infrastructure resource group. In the Bicep template, this infrastructure group is identified using the `resourceGroupId` variable. This infrastructure group can only be managed by the resource provider. The ARO RP provisions a Network Security Group (NSG) within this resource group. We cannot add or remove any inbound or outbound security rules to/from this NSG. This is because all service principals except the one used to create the cluster are denied any API access to this resource group. 

![](/images/aro-nsg-deny.png)

>  Bringing your own NSG is available as a preview feature; we will look at it later.

Similarly, this infrastructure resource group will also contain all virtual machines required for the control plane and worker nodes.

Once the template deployment is complete, we can see the console and API URLs in the deployment output or within the Azure portal.

```json
"outputs": {
  "aroCluster": {
    "type": "Object",
    "value": {
      "clusterApiServerUrl": "https://api.hub.eastus.aroapp.io:6443/",
      "clusterConsoleUrl": "https://console-openshift-console.apps.hub.eastus.aroapp.io/",
      "clusterName": "hub"
    }
  }
}
```

![](/images/aro-connect.png)

ARO does not yet support shutting down a cluster. Therefore, we must monitor the usage of the cluster and take the necessary actions, such as deleting the cluster or shutting down virtual machines, as needed.

