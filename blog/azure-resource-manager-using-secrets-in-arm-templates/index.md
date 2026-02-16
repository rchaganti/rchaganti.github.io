# Azure Resource Manager - Using secrets in ARM templates


{{<img src="/images/armin30/templatearchitecture.png" width="760">}}

In this series so far, you have seen how to get started with ARM templates, parameterize them by adding parameters, and optimize them using variables, expressions, and user-defined functions. It is now time to move on to more advanced topics and begin building the template for the remaining components of the architecture shown above. In the architecture shown above, you will implement an ARM template that provisions virtual machines, requiring the administrator and domain-join credentials as inputs. Also, the configuration scripts used to configure the guest OS may need to access an internal storage account blob, which requires the storage connection strings and access keys. Storing these secrets in plain text is not recommended. Also, as an architect, you may want to standardize on passwords for local administrator accounts and avoid sharing domain-join credentials with any user when provisioning an ARM template. This needs a more centralized credential and secret store. Azure Vault provides this capability. Today, you will learn how to handle secrets such as passwords, access keys, certificates, and more in an ARM template.

## Azure Key Vault

[Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/) is a service that provides a centralized secret store. You can use the Key Vault for cryptographic keys, API keys, passwords, connection strings, and certificates. For the cryptographic keys, you can use a Hardware Security Module (HSM) as well. Once a key vault is provisioned, you can add your secrets and retrieve them in an ARM template for use with other resource types such as virtual machines.

### Creating a key vault

To create a key vault, you need few mandatory input parameters such as `tenantId`, `objectId` of the user or service principal or the security group in Azure Active Directory (AAD), key and secret permissions. The specified tenant will be used for authenticating requests to the key vault and the object Id of the AAD user will be used to provide the necessary permissions to interact with the Key Vault. 

Here is a simple starter template that you can use.

{{< gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2 "azKVbeginner.azrm.json" >}}

In this starter template, you see that the value of `tenantId` defaults to the value of the `tenantId` property from the `subscription()` standard template function. The value to the `objectId` property is coming from a template parameter. You can retrieve the object ID of an AAD user using `az ad user show` command.

```shell
az ad user show --id Ravikanth@azure.com --query objectId
```

You can deploy the template above to create a Key Vault by clicking the Deploy To Azure button below. 

{{<azdeploy "https://gist.githubusercontent.com/rchaganti/d7e35878c6687da07ae5fa5dfb7d54c2/raw/a5b15709b6803abaf3d4eca4308052eb37c31fbd/azKVbeginner.azrm.json">}}

If you prefer the Azure CLI, you can run the following commands to deploy this template.

{{< gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2 "azKVbeginner.azcli" >}}

In the template above, as part of the access policies [line 22], for the key, secrets, and `certificates` permissions, you have used `all` as the value. As it literally means, this permission level provides full permission set to the service principal specified using `objectId` property. This is not recommended in a production Key Vault. You must also secure the key vault and restrict access to only what is needed. The allowed values for the key and secret permissions are listed in the [resource provider reference](https://docs.microsoft.com/en-us/azure/templates/microsoft.keyvault/2015-06-01/vaults). 

To this end, the template above can be modified to add a few more parameters to specify permission values. 

{{< gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2 "azKVbeginnerParameterized.azrm.json" >}}

In this updated template, three additional parameters are added to gather key, secret, and certificate permissions. While these parameters have default values, you can provide an updated set of permissions as an array during deployment. If you notice, there are additional resource properties as well added to the Key Vault resource definition.

**enabledForDeployment** specifies whether Azure virtual machines can retrieve certificates from the key vault.

**enabledForTemplateDeployment** specifies whether Azure Resource Manager is allowed to retrieve secrets from the vault or not.

For the architecture you are building, both properties must be set to `true`.

You can deploy this template by clicking the Deploy to Azure button below.

{{<azdeploy "https://gist.githubusercontent.com/rchaganti/d7e35878c6687da07ae5fa5dfb7d54c2/raw/4a5cb89ed7d2b3a5c08230450a38799e1f6d6f0e/azKVbeginnerParameterized.azrm.json">}}

Now, with this updated template, you have a functional key vault that can store secrets used by other resource configurations. So, how do you use ARM templates to store secrets in a key vault?

### Adding secrets to the vault

Once you have a key vault provisioned, you can add the `Microsoft.KeyVault/vaults/secrets` resource to the template to add secrets to the vault. The following resource definition will do that job.

```
{
	"type": "Microsoft.KeyVault/vaults/secrets",
	"name": "[concat(variables('keyVaultName'), '/', parameters('secretName'))]",
	"apiVersion": "2018-02-14",
	"location": "[resourceGroup().location]",
	"properties": {
		"value": "[parameters('secretValue')]",
		"contentType" : "string"
	}
}
```

In this resource definition, the resource type is `Microsoft.KeyVault/vaults/secrets`. The `secretName` you want to use will be used as the resource name, and the value will be set in the resource properties.

Here is the full template to provision a key vault and add a secret to it.

{{< gist rchaganti d7e35878c6687da07ae5fa5dfb7d54c2 "azKVbeginnerStoreSecret.azrm.json" >}}

This updated template added two additional parameters: `secretName` and `secretValue`. `secretValue` is a secure string. Try deploying the template using the deploy to Azure button below.

{{<azdeploy "https://gist.githubusercontent.com/rchaganti/d7e35878c6687da07ae5fa5dfb7d54c2/raw/b605dc41251aea40dae877f352a0b35998944076/azKVbeginnerStoreSecret.azrm.json">}}

### Retrieve vault secret

Finally, when you need to use the secret as another resource property value, you can do so using a property definition, as shown below.

```
"adminPassword": {
    "reference": {
        "keyVault": {
        "id": "/subscriptions/<SubscriptionID>/resourceGroups/mykeyvaultdeploymentrg/providers/Microsoft.KeyVault/vaults/<KeyVaultName>"
        },
        "secretName": "vmAdminPassword"
    }
}
```

You will learn more about this pattern in the later articles of this series when you attempt creating virtual machines using ARM template.

## Summary

In this part, you learned how to create an Azure Key Vault, add secrets to the vault, and retrieve the secrets. This knowledge will come handy when you attempt creating virtual machines that require a predefined administrator password. In the next part, you will learn about resource dependencies in ARM templates.
