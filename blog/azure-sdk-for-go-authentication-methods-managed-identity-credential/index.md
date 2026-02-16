# Azure SDK for Go - Authentication methods - Managed Identity Credential


When you have applications or services that run in the Azure cloud infrastructure and require access to Azure services, the best way to authenticate to Azure is to use the [managed identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview). Using managed identity, you can eliminate the need to manage artifacts such as secrets, certificates, and credentials. For example, if you need to access Azure Key Vault to retrieve an API key for authentication purposes. To do this, you must first authenticate to the Key Vault service. With managed identity, you get automatically authenticated.

There are two types of managed identities. The [Azure.Identity](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity) package provides the [ManagedIdentityCredential](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity#ManagedIdentityCredential) to access Azure tokens via these identities to access target Azure services. This article will teach you how to use these identities in your Go code. You will need an Azure Linux virtual machine to try the examples in this article.

## System-assigned

The system-assigned managed identity is associated with an Azure resource and is tied to the resource lifecycle. There is only one system-assigned managed identity per resource. And it is not available for every Azure resource. For example, you can create a virtual machine and assign a system-assigned managed identity. This identity can now access authorized (based on role assignments) Azure services from within the virtual machine.

Before you proceed, you must [enable the system-assigned managed identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/qs-configure-cli-windows-vm?source=recommendations#enable-system-assigned-managed-identity-on-an-existing-azure-vm) on the Azure VM resource where the following code will run.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources"
)

const subscriptionID = "21e034f70820"

func main() {
	cred, err := azidentity.NewManagedIdentityCredential(nil)
	if err != nil {
		log.Fatal(err)
	}
	rcFactory, err := armresources.NewClientFactory(subscriptionID, cred, nil)
	if err != nil {
		log.Fatal(err)
	}
	rgClient := rcFactory.NewResourceGroupsClient()

	ctx := context.Background()
	resultPager := rgClient.NewListPager(nil)

	resourceGroups := make([]*armresources.ResourceGroup, 0)
	for resultPager.More() {
		pageResp, err := resultPager.NextPage(ctx)
		if err != nil {
			log.Fatal(err)
		}
		resourceGroups = append(resourceGroups, pageResp.ResourceGroupListResult.Value...)
	}

	jsonData, err := json.MarshalIndent(resourceGroups, "\t", "\t")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(string(jsonData))

}
```

For a system-assigned managed identity, you can call the [NewManagedIdentityCredential()](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity#NewManagedIdentityCredential) method. You can simply run this program to verify if the system-assigned identity is working inside the VM.

```shell
$ go run managedIdentity.go 
[
        {
                "id": "/subscriptions/21e034f70820/resourceGroups/cloud-shell-storage-southeastasia",
                "location": "southeastasia",
                "name": "cloud-shell-storage-southeastasia",
                "properties": {
                        "provisioningState": "Succeeded"
                },
                "type": "Microsoft.Resources/resourceGroups"
        },
        {
                "id": "/subscriptions/21e034f70820/resourceGroups/NetworkWatcherRG",
                "location": "eastus",
                "name": "NetworkWatcherRG",
                "properties": {
                        "provisioningState": "Succeeded"
                },
                "type": "Microsoft.Resources/resourceGroups"
        },
        {
                "id": "/subscriptions/21e034f70820/resourceGroups/DefaultResourceGroup-EUS",
                "location": "eastus",
                "name": "DefaultResourceGroup-EUS",
                "properties": {
                        "provisioningState": "Succeeded"
                },
                "type": "Microsoft.Resources/resourceGroups"
        },
        {
                "id": "/subscriptions/21e034f70820/resourceGroups/az",
                "location": "eastus",
                "name": "az",
                "properties": {
                        "provisioningState": "Succeeded"
                },
                "tags": {},
                "type": "Microsoft.Resources/resourceGroups"
        },
        {
                "id": "/subscriptions/21e034f70820/resourceGroups/u01_group",
                "location": "eastus",
                "name": "u01_group",
                "properties": {
                        "provisioningState": "Succeeded"
                },
                "type": "Microsoft.Resources/resourceGroups"
        }
]
```

## User-assigned

Like any other Azure resource, you can [create](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/how-to-manage-ua-identity-portal) a user-assigned managed identity as a standalone resource and assign it to one or more Azure resources. You can authorize the user-assigned managed identity to access one or more Azure services. The application consuming the user-assigned identity gets access to the authorized resources. You manage the lifecycle of a user-assigned identity like any other Azure resource.

Before proceeding to try the example, you must [create and assign the user-assigned identity]() to the virtual machine.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources"
)

const subscriptionID = "21e034f70820"

func main() {
	clientID := azidentity.ClientID("08f09d2f-a6e9-48c7-b3f4-9b14934c9952")
	opts := azidentity.ManagedIdentityCredentialOptions{ID: clientID}
	cred, err := azidentity.NewManagedIdentityCredential(&opts)

	if err != nil {
		log.Fatal(err)
	}
	rcFactory, err := armresources.NewClientFactory(subscriptionID, cred, nil)
	if err != nil {
		log.Fatal(err)
	}
	rgClient := rcFactory.NewResourceGroupsClient()

	ctx := context.Background()
	resultPager := rgClient.NewListPager(nil)

	resourceGroups := make([]*armresources.ResourceGroup, 0)
	for resultPager.More() {
		pageResp, err := resultPager.NextPage(ctx)
		if err != nil {
			log.Fatal(err)
		}
		resourceGroups = append(resourceGroups, pageResp.ResourceGroupListResult.Value...)
	}

	jsonData, err := json.MarshalIndent(resourceGroups, "\t", "\t")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(string(jsonData))

}
```

In this example, you supply the client ID of the user-assigned identity as an option to the `NewManagedIdentityCredential()` method. Assuming that you have assigned the necessary roles to this user-assigned identity, you should see the same output as the earlier example.

The next article of this series, you will learn about credential chaining. Stay tuned.

