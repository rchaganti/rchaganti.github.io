# Azure Policy Guest Configuration - Assignments


In the [last part of this series](https://ravichaganti.com/blog/azure-policy-guest-configuration-introduction/) around [Azure Policy Guest Configuration](https://ravichaganti.com/series/azure-policy-guest-configuration/), you got an introduction to what is Guest Configuration. In this part, you will learn about assigning Guest Configuration policies and initiatives.

Azure Policy Guest Configuration (GC) is an extension to Azure Policy and therefore use the same JSON definition structure. For example, here is the (redacted) GC definition for the policy *Audit Windows machines that do not have the specified Windows PowerShell execution policy*. 

```json
{
  "properties": {
    "displayName": "Audit Windows machines that do not have the specified Windows PowerShell execution policy",
    "policyType": "BuiltIn",
    "mode": "Indexed",
    "description": "Requires that prerequisites are deployed to the policy assignment scope. For details, visit https://aka.ms/gcpol. Machines are non-compliant if  the Windows PowerShell command Get-ExecutionPolicy returns a value other than what was selected in the policy parameter.",
    "metadata": {
      "category": "Guest Configuration",
      "version": "3.0.0",
      "requiredProviders": [
        "Microsoft.GuestConfiguration"
      ],
      "guestConfiguration": {
        "name": "WindowsPowerShellExecutionPolicy",
        "version": "1.*",
        "configurationParameter": {
          "ExecutionPolicy": "[PowerShellExecutionPolicy]PowerShellExecutionPolicy1;ExecutionPolicy"
        }
      }
    },
    "parameters": {
      "IncludeArcMachines": {
        "type": "String",
        "metadata": {
          "displayName": "Include Arc connected servers",
          "description": "By selecting this option, you agree to be charged monthly per Arc connected machine.",
          "portalReview": "true"
        },
        "allowedValues": [
          "true",
          "false"
        ],
        "defaultValue": "false"
      },
      "ExecutionPolicy": {
        "type": "String",
        "metadata": {
          "displayName": "PowerShell Execution Policy",
          "description": "The expected PowerShell execution policy."
        },
        "allowedValues": [
          "AllSigned",
          "Bypass",
          "Default",
          "RemoteSigned",
          "Restricted",
          "Undefined",
          "Unrestricted"
        ]
      },
      "effect": {
        "type": "String",
        "metadata": {
          "displayName": "Effect",
          "description": "Enable or disable the execution of this policy"
        },
        "allowedValues": [
          "AuditIfNotExists",
          "Disabled"
        ],
        "defaultValue": "AuditIfNotExists"
      }
    },
    "policyRule": {
      "if": {
        "anyOf": [
          {
            "allOf": [
              {
                "field": "type",
                "equals": "Microsoft.Compute/virtualMachines"
              }
            ]
          }
        ]
      },
      "then": {
        "effect": "[parameters('effect')]",
        "details": {
          "type": "Microsoft.GuestConfiguration/guestConfigurationAssignments",
          "name": "[concat('WindowsPowerShellExecutionPolicy$pid', uniqueString(policy().assignmentId, policy().definitionReferenceId))]",
          "existenceCondition": {
            "allOf": [
              {
                "field": "Microsoft.GuestConfiguration/guestConfigurationAssignments/complianceStatus",
                "equals": "Compliant"
              },
              {
                "field": "Microsoft.GuestConfiguration/guestConfigurationAssignments/parameterHash",
                "equals": "[base64(concat('[PowerShellExecutionPolicy]PowerShellExecutionPolicy1;ExecutionPolicy', '=', parameters('ExecutionPolicy')))]"
              }
            ]
          }
        }
      }
    }
  },
  "id": "/providers/Microsoft.Authorization/policyDefinitions/c648fbbb-591c-4acd-b465-ce9b176ca173",
  "type": "Microsoft.Authorization/policyDefinitions",
  "name": "c648fbbb-591c-4acd-b465-ce9b176ca173"
}
```

As you see in this definition, the overall document structure is same as an Azure Policy definition. However, the category in the metadata section at the top identifies this as a GC policy. This is a built-in GC policy definition.

### Working with GC Policies

The following examples in this section use Azure CLI to work with GC policies. The `az policy` command helps you in working with policy definitions.

```sh
az policy definition list --query "[?metadata.category=='Guest Configuration'].{DisplayName:displayName, Mode:mode, PolicyType:policyType, Name:name}" --output json
```

This command filters policy definitions to only GC policies and then returns JSON output containing only a few selected properties. Here is the sample output.

```json
  {
    "DisplayName": "[Deprecated]: Show audit results from Windows VMs configurations in 'Security Options - Microsoft Network Client'",
    "Mode": "All",
    "Name": "fcbc55c9-f25a-4e55-a6cb-33acb3be778b",
    "PolicyType": "BuiltIn"
  },
  {
    "DisplayName": "[Deprecated]: Show audit results from Linux VMs that do not have the specified applications installed",
    "Mode": "All",
    "Name": "fee5cb2b-9d9b-410e-afe3-2902d90d0004",
    "PolicyType": "BuiltIn"
  },
  {
    "DisplayName": "Azure Stack HCI Best Practices",
    "Mode": "Indexed",
    "Name": "Azure Stack HCI Best Practices",
    "PolicyType": "Custom"
  }
```

As you see in the output, you can see there are built-in and custom GC policies. The custom policies are what you as an end user can create and publish to your Azure subscription. Also, there are different modes -- All and Indexed.  The policies that are defined as *all* mode, the policy gets evaluated for all resource groups, subscriptions, and all resource types. When the policy is in *indexed* mode, it gets evaluated only for resources types that support tags and location.

To retrieve a single policy definition, you can use the `az policy definition show` command.

```sh
az policy definition show -n "e068b215-0026-4354-b347-8fb2766f73a2"
```

You can assign a GC policy using the `az policy assignment` command.

> Note: There is a [guestconfig extension](https://docs.microsoft.com/en-us/cli/azure/guestconfig?view=azure-cli-latest) that you can use to manage guest configuration assignments. However, I prefer az policy.

```sh
az policy assignment create --name "testAssignment" --policy "e068b215-0026-4354-b347-8fb2766f73a2" -g azconf
```

The argument to the `--policy` parameter is the value of name property you saw in the output of all policy definitions. Once this assignment is complete, you can see it in the portal.

{{< figure src="/images/az-gc-assignment.png" >}} {{< load-photoswipe >}}

You can trigger a policy compliance run using the `az policy state` command.

```sh
az policy state trigger-scan -g azconf
```

This will trigger the compliance run and wait for the task to return. If you do not want to block console until the task is complete, add `--no-wait` parameter.

You can check the policy assignment compliance state using the `az policy state summarize` command.

### Working with GC initiatives

Initiatives are groups of policy definition. Initiatives help group related policy definitions and assign them at once to a Azure scope. You can list all available GC initiatives by running the following command.

```sh
az policy set-definition list --query "[?metadata.category=='Guest Configuration'].{DisplayName:displayName, PolicyType:pol
icyType, Name:name}" --output json
```

This returns output similar to what is shown below.

```json
{
    "DisplayName": "[Deprecated]: Audit Windows VMs on which the Log Analytics agent is not connected as expected",
    "Name": "06c5e415-a662-463a-bb85-ede14286b979",
    "PolicyType": "BuiltIn"
  },
  {
    "DisplayName": "Audit machines with insecure password security settings",
    "Name": "095e4ed9-c835-4ab6-9439-b5644362a06c",
    "PolicyType": "BuiltIn"
  },
  {
    "DisplayName": "Deploy prerequisites to enable Guest Configuration policies on virtual machines",
    "Name": "12794019-7a00-42cf-95c2-882eed337cc8",
    "PolicyType": "BuiltIn"
  }
```

You can now assign an GC initiative using the `az policy assignment command` and using `--policy-set-definition` parameter.

```
az policy assignment create --name "testInitiativeAssignment" --policy-set-definition "095e4ed9-c835-4ab6-9439-b5644362a06c" -g azconf
```

Checking the compliance state of an initiative assignment is similar to how you did that for policies. 

This is all for today and in the next part of this series, you will learn about writing custom GC policies.
