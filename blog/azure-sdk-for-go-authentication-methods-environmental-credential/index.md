# Azure SDK for Go - Authentication methods - Environmental credential


In the last part of this series, you learned how to use different credential types in a local development environment. Another method you can use within local development and in a hosted/deployed service is providing credentials through environment variables. This is done using the [`NewEnvironmentCredential()`](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity#NewEnvironmentCredential) method in the `azidentity` package.

```go
// github.com/rchaganti/azure-go/02-auth101/envCredential.go
cred, err := azidentity.NewEnvironmentCredential(nil)
if err != nil {
    log.Fatal(err)
}
```

This credential type supports multiple types of authentication in the following order.

## Service principal with client secret

In this method, you can export the tenant ID, client ID, and client secret of an Azure AD application as environment variables. These variable values get retrieved using `NewEnvironmentCredential(),` and the client will be authenticated using these values. 

To use this method, you need an [Azure AD application](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal) with a [client secret](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#option-3-create-a-new-application-secret), a necessary role assignment for the user, and [admin consent should be granted](https://learn.microsoft.com/en-us/azure/active-directory/manage-apps/grant-admin-consent?pivots=portal).

Once you complete the appropriate Azure AD application registration and configuration, you can set the environment variables for this authentication method. 

```shell
$ export AZURE_TENANT_ID='tenant-id'
$ export AZURE_CLIENT_ID='client-id'
$ export AZURE_CLIENT_SECRET='client-secret'
```

You will receive an appropriate error message if these values are invalid. You will receive the following error if the application does not have the right permissions or role assignment.

```shell
$ go run envCredential.go 
EnvironmentCredential will authenticate with ClientSecretCredential
ClientSecretCredential.GetToken() acquired a token for scope "https://management.core.windows.net//.default"\n
2023/07/18 04:43:16 GET https://management.azure.com/subscriptions/5073ff70820/resourcegroups
--------------------------------------------------------------------------------
RESPONSE 403: 403 Forbidden
ERROR CODE: AuthorizationFailed
--------------------------------------------------------------------------------
{
  "error": {
    "code": "AuthorizationFailed",
    "message": "The client '8887f900' with object id '8887f900' does not have authorization to perform action 'Microsoft.Resources/subscriptions/resourcegroups/read' over scope '/subscriptions/5073ff70820' or the scope is invalid. If access was recently granted, please refresh your credentials."
  }
}
--------------------------------------------------------------------------------
exit status 1
```

## Service principal with a certificate

To use a client certificate instead of a client secret, you can use the `AZURE_CLIENT_CERTIFICATE_PATH` environment variable. If you set both the client secret and certificate variables, the client secret gets precedence.

```shell
$ export AZURE_TENANT_ID='tenant-id'
$ export AZURE_CLIENT_ID='client-id'
$ export AZURE_CLIENT_CERTIFICATE_PATH='path-to-client-certificate'
```

The prerequisites for using this method are the same as the earlier one. Instead of creating a client secret, you must [create a client certificate](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-self-signed-certificate). If the certificate you created requires a password, you can specify that using the optional`AZURE_CLIENT_CERTIFICATE_PASSWORD` variable.

## With username and password

This method is not recommended, but if you prefer username and password-based authentication, you can set the AZURE_CLIENT_ID, AZURE_USERNAME, and AZURE_PASSWORD environment variables.

```shell
$ export AZURE_CLIENT_ID='client-id'
$ export AZURE_USERNAME='user@domain'
$ export AZURE_PASSWORD='P@ssw0rd'
```

To specify a tenant to authenticate, use the optional `AZURE_TENANT_ID` environment variable. The authentication methods you saw in the previous article support optional options parameter to customize the behavior. With these options, you can specify additional tenants allowed for multitenant authentication. When using environment credentials, this can be specified using an optional environment variable called `AZURE_ADDITIONALLY_ALLOWED_TENANTS`. You can specify a comma-separated list of tenant IDs as a value. If you specify '*' as the value of this variable, you enable requesting tokens from any tenant.

If all three methods are set as environment variables, the client secret takes precedence over the others. The Go code for using any of these methods is the same as shown at the beginning of this article. The environment credential method can be used in development and production (hosted/deployed) service scenarios. 

In the next part of this series, you will learn how to use managed identity credentials within your Go code.

