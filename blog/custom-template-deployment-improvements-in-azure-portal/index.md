# Custom Template Deployment Improvements in Azure Portal


When testing ARM templates, I typically use the custom template deployment option in the Azure Portal. This UI option just got better! This deployment option now supports lists the parameters, variables, and resources used in template in a nice treeview navigation.

To start a new deployment, you can click on New -> Template Deployment.

{{<figure src="/images/armtemplate11-1.png">}}

This opens up the Custom Deployment blade. Click on Edit Template.

{{<figure src="/images/armtemplate11-2.png">}}

In the Edit Template blade, copy/paste your template JSON in the editor.

{{<figure src="/images/armtemplate11-3.png">}}

In a few seconds, you will see the treeview built for the template. You can expand each node to see the individual elements within each category. Selecting a specific element within a node navigates to the definition for that selection within the JSON template.

{{<figure src="/images/armtemplate11-4.png">}}

You can click Save and then proceed to the deployment by completing the remaining steps in the custom deployment.

The second enhancement is the option to pull a quick start [template from the Github repository][1] and deploy it!

{{<figure src="/images/armtemplate11-5.png">}}

In the _Load a quickstart template_ blade, you can select a template listed in the dropdown.

{{<figure src="/images/armtemplate11-6.png">}}

Clicking OK in this blade opens the template in the Edit Template blade where you can make changes as needed and save it.

These are two nice surprises this morning. Anymore waiting? 🙂

[1]: https://github.com/Azure/azure-quickstart-templates
