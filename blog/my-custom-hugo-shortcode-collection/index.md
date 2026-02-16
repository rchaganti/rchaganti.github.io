# My custom Hugo shortcode collection


In the past I wrote here about the [Az Deploy button shortcode](https://ravichaganti.com/blog/adding-azdeploy-button-in-static-pages-using-hugo/) and the [channel9 video embed shortcode](https://ravichaganti.com/blog/embedding-channel9-videos-in-hugo-static-pages/) for Hugo generated static pages. I have been creating some simple shortcodes for my own use on this blog as I start writing on different technologies again. A couple of more shortcodes I added recently are for the ARM template visualize button and launching Azure Cloud Shell. 

Today I decided to publish these [shortcodes as a collection on GitHub](https://github.com/rchaganti/hugo-shortcodes). Instead of writing about each and every shortcode -- unless it has significant value to others as well -- this article will get updated every time I publish a new shortcode.

## AzDeploy

If you ever read the Microsoft documentation around ARM templates or visited the [ARM templates quickstart repository](https://github.com/Azure/azure-quickstart-templates), you might have noticed a *deploy to Azure* button. Clicking on the button will take you to the Azure Portal to a page that provides a blade to input parameter values to deploy the ARM template. This shortcode enables the same functionality on a statically generated page. Here is how you use it.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "azdeployuse" >}}

The link to JSON file should be a publicly accessible raw URL. The above shortcode when gets compiled to a static page will generate a button as shown below.

{{<azdeploy "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/101-storage-account-create/azuredeploy.json">}}

## ArmVisualize

Along with the deploy to Azure button, you may have also seen a Visualize button that will show a visual representation of the ARM template. This shortcode helps implement the same functionality in a Hugo generated static page. Here is how you use it.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "armvisualize" >}}

The link to JSON file should be a publicly accessible raw URL.

This shortcode displays a button as shown below.

{{<armvisualize "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/101-1vm-2nics-2subnets-1vnet/azuredeploy.json">}}

## AzCloudShell

Many Azure related documents have a button that is used to launch Azure cloud shell in a browser. This shortcode can be used to add the same functionality in a static web page.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "azcloudshell" >}}

You can specify to open Bash or PowerShell by specifying that as the target argument. If you skip target parameter, the last opened shell will be launched. Here is how the Launch cloud shell button will appear.

{{<azcloudshell target="bash">}}

## Channel9

Hugo has built-in shortcodes for YouTube and Vimeo. However, I refer to a few channel9 videos that I want to embed in my articles. So, I decided to write a shortcode that helps me embed Channel 9 videos. Here is how you use it.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "channel9use" >}}

Here is how the embed will appear.

{{<channel9 "https://channel9.msdn.com/Events/Build/2020/KEY01">}}


