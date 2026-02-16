# Building Azure Resource Manager Templates – The Basics


As a part of this series, we will go through the language semantics of writing ARM templates. We will explore each and every aspect of the ARM template language and go through multiple examples to understand the concepts better. We won&#8217;t focus much on the resource types and resource definitions until we complete the discussion around the language semantics and artifacts.

Let us get started.

#### Tools for the job

JSON templates for ARM can be edited in notepad too. But, there are better tools that can help us with this.

##### Visual Studio

Visual Studio, along with [Azure SDK][1], provides an easy way to get started with the template creation. You get started by creating a Resource Group project and just keep adding resources to the project and VS automatically generates the JSON for you. You can then customize it the way you want. More than the auto-generation of JSON, what I like is the intellisense capability that shows me the properties I can use within a template for a resource type.

{{<figure src="/images/armtemplate2-1.png">}}

For more information on how to get started with using [Visual Studio to create ARM templates][3], read this [Azure team blog post][3].

##### Visual Studio Code

Visual Studio Code is my favorite. It loads up much faster than the full-blown Visual Studio and it is very easy to use. However, at the time of this writing, there is no ARM template authoring support like what VS has. However, it has some minimal auto-completion support based on what the editor understands from the schema.

{{<figure src="/images/armtemplate2-2.png">}}

##### Sublime Text

Sublime Text has a [Azure Resource Manager package][5] that gives a bunch of snippets for quick ARM template authoring. For example, after you activate ARM package, you can type _arm:t_ and press tab to add a skeleton of the ARM template.

{{<figure src="/images/armtemplate2-3.png">}}

Sublime does provide some level of property auto-completion but it is still buggy. But, if your first choice is sublime, you have ARM template authoring support to some extent.

There may be many other editors or IDEs with JSON support. Visual Studio is the first-class citizen as far as ARM template support is concerned and I hope VS code gets a similar level of template authoring support soon. Now that we know what we need to start template authoring, let us start with the language discussion.

#### Introducing ARM template language

I have mentioned this several times already but will say it one more time before I start. ARM templates are based on JSON syntax. So, to be able to appreciate and understand the way we write ARM templates, you need to know how JSON synatx works. I am not going to write about the JSON syntax here but I have an article that I [published on PowerShell Magazine and that should give you a good overview][7].

Here is the basic structure of an ARM template.

```json
{
   "$schema": "http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
   "contentVersion": "",
   "parameters": {  },
   "variables": {  },
   "resources": [  ],
   "outputs": {  }
}
```


##### $schema

This element is mandatory and the value must be the location of JSON schema file for the ARM template language. The JSON schema is what is used to find the right set of properties for resources etc. You can find the latest schema URL listed at <https://github.com/Azure/azure-resource-manager-schemas/>. When you start a new resource group project using Visual Studio, this property gets filled for you.

##### ContentVersion

This is another mandatory element and you can use this to specify the version of the template you are authoring. As a part of the ARM authoring process, I suggest that you use the source control and build process to auto-update this element value instead of manually entering a version number.

##### Parameters

Think of parameters like parameters in any other programming language. In any programming language, parameters are used to provide flexibility within the function/method and not hard code any values that are really user-specific. ARM parameters are no exception. By defining parameters, you get the capability to collect user input for resource properties prior to starting the deployment.Parameters are what we use to draw a line between the free-form and known configurations. We will discuss this in-depth later. There are several properties within the parameters element. These properties can be used to set the allowed values or default value for a parameter or even set the minimum and maximum values for a parameter. Instead of just describing what those are, we will see real examples with those properties in the upcoming parts of this series.

##### Variables

Variables, once again like any other programming language, helps us simplify the template language. For example, you can use variables element to store values for different resource properties and re-use them wherever applicable instead of writing the same value again and again. Also, within the ARM template language, variables can be used to construct values at runtime. You can use the user provided input in terms of parameters and construct the value for a specific resource property. Variables in ARM template can have standard type values as well as complex types. We will see examples of all this as we move forward in this series.

##### Resources

Resource is a mandatory element and defines a collection of resources that you plan to deploy as a part of the template deployment. For each resource type that you define within this collection, there are certain standard sub-elements such as name, type, apiVersion, location, properties and so on. The properties element is used to describe the resource specific properties and the valid values for this are dependent on the resource type. Within this series, we will see a different set of resource types and use them within the templates that we build. However, we will not get into the details of each and every template. You can always refer to JSON schema and online documentation to find more about the properties for any given resource type.

##### Outputs

The outputs element is used to return data and objects from a deployment. For example, once a web application deployment is complete, you may want to return the URL at which the application is hosted. Also, outputs element is what we use to share state and data between multiple templates in a nested template deployment.

#### Functions and Expressions

Apart from the six elements I described above, the ARM template syntax provides support for different [functions and expressions][8] to simplify the deployment. For example, when you want to construct resource property values at runtime, you may need support for concatenating strings. As a part of our exploration here, we will look different functions and expressions that we can use within the ARM templates.

This brings us to the end of today&#8217;s article. In the remaining parts going forward, we will take an example scenario and start building a template for that. In the process of doing that, we will see how different elements and artifacts such as functions and expressions within the template can be used. Before we start with that, I recommend that you get yourself familiarized with a tool that can be used to build these templates. Stay tuned for more.

[1]: https://azure.microsoft.com/en-us/downloads/
[2]: http://139.59.40.198/blog/uploads/2015/11/VS-AutoComplete.png
[3]: https://azure.microsoft.com/en-us/blog/azure-resource-manager-2-5-for-visual-studio/
[4]: http://139.59.40.198/blog/uploads/2015/11/VS-Code-AutoComplete.png
[5]: https://packagecontrol.io/packages/AzureResourceManager
[6]: http://139.59.40.198/blog/uploads/2015/11/Sublime-AutoComplete-1.png
[7]: http://www.powershellmagazine.com/2014/12/01/a-json-primer-for-administrators/
[8]: https://azure.microsoft.com/en-in/documentation/articles/resource-group-authoring-templates/#expressions-and-functions
