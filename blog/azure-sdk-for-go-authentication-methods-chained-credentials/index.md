# Azure SDK for Go - Authentication methods - Chained Credentials


So far [in this series](https://ravichaganti.com/series/azure-go/), you learned how to use different types of credentials that the Azure SDK for Go offers. You used specific credential types to authenticate with Azure in all the examples. You use a set of credential types for the development environment and a different set for production use cases. However, what if you want to use the code unmodified between development and production? What if you must test the code that uses managed identity credentials locally where the type of credentials you must use are different? This is where credential chaining comes to the rescue. 

The [azidentity](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity#section-readme) package offers two ways to implement credential chaining.

## DefaultAzureCredential

The DefaultAzureCredential type is most commonly used for applications deployed to Azure. This type combines the production credentials with the development credentials. This credential type attempts to authenticate using different credentials in a specific order.

Environment -> Workload Identity -> Managed Identity -> Azure CLI

The chain stops when one of the methods succeeds. Here is an example. This example implements logging of all authentication events to demonstrate that this method attempts different types of credentials through chaining.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	azlog "github.com/Azure/azure-sdk-for-go/sdk/azcore/log"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources"
)

const subscriptionID = "21e034f70820"

func main() {
	azlog.SetListener(func(event azlog.Event, s string) {
		fmt.Println(s)
	})

	azlog.SetEvents(azidentity.EventAuthentication)

	cred, err := azidentity.NewDefaultAzureCredential(nil)
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

You can try and execute this in the development environment first, where you already have Azure CLI credentials locally.

```shell
$ go run defaultAzureCred.go 
Managed Identity Credential will use IMDS managed identity
NewDefaultAzureCredential failed to initialize some credentials:
        EnvironmentCredential: missing environment variable AZURE_TENANT_ID
        WorkloadIdentityCredential: no client ID specified. Check pod configuration or set ClientID in the options
2023/08/16 15:06:15 DefaultAzureCredential authentication failed
GET http://169.254.169.254/metadata/identity/oauth2/token
--------------------------------------------------------------------------------
RESPONSE 403 connecting to 169.254.169.254:80: connecting to 169.254.169.254:80: dial tcp 169.254.169.254:80: connectex: A socket operation was attempted to an unreachable network.
--------------------------------------------------------------------------------
connecting to 169.254.169.254:80: connecting to 169.254.169.254:80: dial tcp 169.254.169.254:80: connectex: A socket operation was attempted to an unreachable network.
--------------------------------------------------------------------------------
exit status 1
```

As you can see in the output here, the `DefaultAzureCredential` type attempted `EnvironmentCredential` and `WorkloadIdentityCredential` in that order. It then attempted the ManagedIdentityCredential type but failed with an error the "socket operation was attempted to an unreachable network". So, what happened to the final type -- `AzureCliCredential`? Interestingly, it is working as designed. According to the [response on one of the issues](https://github.com/Azure/azure-sdk-for-go/issues/21029#issuecomment-1601175070), the reason this method errors out is because of the way the `ManagedIdentityCredential` constructor exits once it fails to connect to the metadata endpoint causing the `NewDefaultAzureCredential` to skip attempting Azure CLI credential.

However, if you execute the same code inside an Azure service (like an Azure VM), you will see that it attempts the Azure CLI credential.

```go
$ go run defaultAzureCred.go 
Managed Identity Credential will use IMDS managed identity
NewDefaultAzureCredential failed to initialize some credentials:
        EnvironmentCredential: missing environment variable AZURE_TENANT_ID
        WorkloadIdentityCredential: no client ID specified. Check pod configuration or set ClientID in the options
2023/08/16 16:18:52 DefaultAzureCredential: failed to acquire a token.
Attempted credentials:
        EnvironmentCredential: missing environment variable AZURE_TENANT_ID
        WorkloadIdentityCredential: no client ID specified. Check pod configuration or set ClientID in the options
        ManagedIdentityCredential: no default identity is assigned to this resource
        AzureCLICredential: Azure CLI not found on path
exit status 1
```

The managed identity endpoint can still be reached inside an Azure VM, even when there is no managed identity (system or user-assigned). This endpoint does not result in a valid token credential; therefore, the `NewDefaultAzureCredential()` method attempts the Azure CLI credential check.

As you see above, the `NewDefaultAzureCredential()` method implements a fixed authentication flow in a specific order. What if you want to customize the authentication flow? You can achieve that using `ChainedTokenCredential`.

## ChainedTokenCredential

The `ChainedTokenCredential` method can link multiple credentials to be tried sequentially. Here is an example.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azlog "github.com/Azure/azure-sdk-for-go/sdk/azcore/log"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources"
)

const subscriptionID = "5073fd4c-3a1b-4559-8371-21e034f70820"

func main() {
	azlog.SetListener(func(event azlog.Event, s string) {
		fmt.Println(s)
	})

	azlog.SetEvents(azidentity.EventAuthentication)

	cli, err := azidentity.NewAzureCLICredential(nil)
	if err != nil {
		log.Fatal(err)
	}

	env, err := azidentity.NewEnvironmentCredential(nil)
	if err != nil {
		log.Fatal(err)
	}

	mic, err := azidentity.NewManagedIdentityCredential(nil)
	if err != nil {
		log.Fatal(err)
	}

	cred, err := azidentity.NewChainedTokenCredential([]azcore.TokenCredential{cli, mic, env}, nil)
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

As shown in the code, you must first create the credentials you want to chain together and use the `NewChainedTokenCredential()` method to specify the authentication flow. When you run this example, you will see that the authentication flow attempts each credential type.

```shell
$ go run chainedCredential.go 
EnvironmentCredential will authenticate with ClientSecretCredential
Managed Identity Credential will use IMDS managed identity
2023/08/17 04:54:12 ChainedTokenCredential: failed to acquire a token.
Attempted credentials:
        AzureCLICredential: Azure CLI not found on path
        ManagedIdentityCredential: no default identity is assigned to this resource
        ClientSecretCredential: unable to resolve an endpoint: http call(https://login.microsoftonline.com/test/v2.0/.well-known/openid-configuration)(GET) error: reply status code was 400:
{"error":"invalid_tenant","error_description":"AADSTS90002: Tenant 'test' not found. Check to make sure you have the correct tenant ID and are signing into the correct cloud. Check with your subscription administrator, this may happen if there are no active subscriptions for the tenant.\r\nTrace ID: a21cd225-ecbb-419b-b73e-b78595fd6c00\r\nCorrelation ID: 38d1a094-e650-495e-8797-134839aad177\r\nTimestamp: 2023-08-17 04:54:12Z","error_codes":[90002],"timestamp":"2023-08-17 04:54:12Z","trace_id":"a21cd225-ecbb-419b-b73e-b78595fd6c00","correlation_id":"38d1a094-e650-495e-8797-134839aad177","error_uri":"https://login.microsoftonline.com/error?code=90002"}
exit status 1
```

With `ChainedTokenCredential`, you can customize the authentication flow and use it across both development and production environments.

