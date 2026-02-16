# Retrieve and save Project Bicep examples from GitHub


{{<img src="/images/bicep.png">}}

[Project Bicep](https://github.com/azure/bicep) aims to simplify how you author Azure Resource Manager (ARM) templates. Bicep is a new declarative language and a transpiler. This transparent abstraction takes a bicep file and transpiles it into an ARM template JSON. The Bicep CLI provides the necessary capablities to compile bicep files to ARM templates and decompile ARM templates into bicep files.

Bicep language itself is very easy to understand and start using. However, as you start learning it may be helpful to see a few examples and draw some inspiration as you build your won bicep files. Project Bicep respository on GitHub has a good number of examples for varied level of complexity. While looking at these, I thought it may be a good idea to create scripts that can retrieve and save selected example locally. 

These scripts are a part of larger [Bicep helper scripts and tools project](https://github.com/rchaganti/bicephelpers) I just published on GitHub. Within this repository I have two PowerShell scripts -- `getBicepExample.ps1` and `saveBicepExample.ps1`.

### Retrieve Bicep Examples

To retieve a list of all examples available in the Bicep repository, you can run:

```powershell
.\getBicepExample.ps1 -Verbose
```

To retrieve a specific level (complexity) of examples:

```powershell
.\getBicepExample.ps1 -TemplateLevel 101
```

To retrieve examples that contains a specific keyword in the description:

```powershell
.\getBicepExample.ps1 -TemplateLevel 101 -Keyword ad -Verbose
```

### Save Bicep Examples

Once you retrieve and identify the necessary bicep example decripton, you can run:

```powershell
.\saveBicepExample.ps1 -TemplateDescription '101/aad-domainservices' -Path C:\sandbox -Verbose
```

This command will save the 101/aad-domainservices/main.bicep to the local folder C:\sandbox.

This is just a quick 10 minutes of work this morning while playing with bicep. I will update these scripts and add more helper scripts and tools soon.
