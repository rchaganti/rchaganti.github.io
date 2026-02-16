# Building Azure Resource Manager Templates – An Introduction


[Azure Resource Manager][1] isn&#8217;t a new thing! It was announced during [Build 2014][2]. ARM is certainly the preferred way, with more and more services getting ARM support, to deploy Azure services. Microsoft also announced that the upcoming [Azure Stack release][3] will feature Azure Resource Manager and the template deployment. This means that learning how to use ARM and write you own templates is an essential skill not just for public cloud but also for the private and hybrid cloud administrators.

There is lot of Microsoft and community content out there that describes why ARM is important and how you can use the templates to deploy multi-tier and multi-service cloud deployments and manage all of them as a single entity. I am not going to repeat all that here. My focus, here, will be a thorough coverage of template language and design patterns. Through this series, you will get a complete and in-depth coverage of what you need to know to build world-class ARM templates. ARM uses [JSON formatted][4] templates to perform these cloud deployments. You can see a bunch of these sample templates in the [Azure quick start templates Github repo][5] that you can use as a starting point to create your own template or understand how to use the template language and best practices. This series of posts is about sharing my learning &#8211; the way I learned authoring ARM templates.

Before you we go ahead start our discussion of ARM template language, let us first quickly review different methods of deploying these templates. This is not a detailed walk-through of these different methods since the focus of this article series is not on the deployment but building templates. After you write a custom ARM template, you can choose between any of these methods to deploy those templates.

#### New Template Deployment (Preview Portal)

The Azure Preview portal has an option to supply the ARM template contents (JSON) and then use a wizard-based method to start the deployment.

{{<figure src="/images/armtemplate1-1.png">}}

To start this, as shown in the picture, click on the _+ icon_ and scroll down to click on _Template Deployment_. The wizard that starts after this pretty much self-explanatory. As with any GUI and click-here methods, this is a manual method. I do not prefer this method.

#### Azure PowerShell

[Azure PowerShell][7] (the following example uses 1.0 preview) is my preferred option. You can just supply a template file and template parameter file to the _New-AzureRmResourceGroupDeployment_ cmdlet.

```powershell
Login-AzureRmAccount
New-AzureRmResourceGroup -Name ExampleResourceGroup -Location "West US"
New-AzureRmResourceGroupDeployment -Name ExampleDeployment -ResourceGroupName ExampleResourceGroup -TemplateFile C:\ARMTemplates\SingleVMDeploy.json -TemplateParameterFile C:\ARMTemplates\SingleVMDeploy-parameter.json
```


This method, like any other PowerShell-based method, can be completely automated and can be made a part of your CI/CD pipeline.

If you prefer, you can do the same with [Azure CLI][8] as well.

#### ARM REST API

The [template deployment API in the ARM REST API][9] provides a way to deploy custom ARM templates programatically using any language that supports REST interfaces. For example, you can use the following API request to create a template deployment. You can supply the JSON template along with all parameter information in the same request or as a link to a blob in your storage account.

https://management.azure.com/subscriptions/{subscription-id}/resourcegroups/{resource-group-name}/providers/microsoft.resources/deployments/{deployment-name}?api-version={api-version}


This method, like the Azure PowerShell or CLI method, can be easily integrated into an existing CI/CD pipeline.

#### Click to Deploy Method

Finally, there is a click to deploy method that Azure Preview portal gets integrated into. For example, most or all of the sample templates within the Azure quick start templates gallery contain the [Deploy to Azure button][10].

Clicking on the above button will take you to the new template deployment option in the preview portal where you can add the parameter values and start the deployment. Similar to this, you can embed these buttons on any webpage and redirect the user to Azure Preview portal to start the deployment.

#### Visual Studio

For developers creating ARM custom templates, it might be an easier option to both author and test deployment using [Visual Studio][11]. VS provides necessary tooling to do this. VS provides the options to add new resources through a wizard and then later use the VS editor to customize and deploy those templates. Note that VS does not have all the resource types available in the wizard interface. For some of these missing resource types, you might still have to refer to the [schema and resource definitions][12].

VS is my preferred (and only option at the moment) to start ARM template development. So, in this series, going forward, we will use VS for most of our scenarios but do the deployments using Azure PowerShell.

This brings us to the end of today&#8217;s article. We have not yet seen any basics of authoring Azure Resource Manager templates. We will start discussing the basics and go in-depth starting the next part in this series. Before that, familiarize yourself with at least one of the custom template deployment methods.

[1]: https://azure.microsoft.com/en-in/documentation/articles/resource-group-overview/
[2]: https://channel9.msdn.com/Events/TechEd/NorthAmerica/2014/DEV-B224
[3]: https://www.youtube.com/watch?v=fuAmcfmo3X0
[4]: http://json.org/
[5]: https://github.com/Azure/azure-quickstart-templates
[6]: http://139.59.40.198/blog/uploads/2015/10/1-1_Azure-Portal_Template-Deployment.png
[7]: https://github.com/Azure/azure-powershell/releases
[8]: https://github.com/Azure/azure-xplat-cli/releases
[9]: https://msdn.microsoft.com/en-in/library/azure/dn790549.aspx
[10]: https://azure.microsoft.com/en-us/blog/deploy-to-azure-button-for-azure-websites-2/
[11]: https://azure.microsoft.com/en-in/documentation/articles/arm-template-deployment/#step-2-create-the-visual-studio-project-the-template-file-and-the-parameters-file
[12]: https://github.com/Azure/azure-resource-manager-schemas
