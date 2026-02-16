# Hugo shortcode for Deploy to Azure Button in a Static Page


As I moved to this new implementation of the blog using Hugo and GitHub pages, I decided to move older article [series around authoring Azure Resource Manager templates](https://ravichaganti.com/series/arm-templates/). This series was one of the most visited ones on this blog. This series provided an incremental way to learn how to author ARM templates and deploy these ARM templates. In each of these articles, I added a "[Deploy to Azure Button](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-to-azure-button)" that you could just click and open the template directly in Azure Portal ready for deployment. The code behind this button usually looks like this.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "azdeployurl" >}}

As I moved to static page generation using Hugo, I looked around to see if there was an easy way to generate the above HTML snippet. I came across the feature called [shortcodes in Hugo](https://gohugo.io/content-management/shortcodes/). This allows you to embed shortcodes for YouTube videos, images, and so on. Several articles that I moved to this new site use shortcodes. And, it is not too difficult to [write your own shortcode](https://gohugo.io/templates/shortcode-templates/). So, I decided to write one for AzDeploy button.

First, you need a shortcode template.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "azdeploy.html" >}}

I will spare an explanation of this and you can read the documentation of custom shortcodes. But, this is no rocket science. The way you use this shortcode in markdown is simple. You can use either of the methods shown below.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "azdeployuse" >}}


This is it really. If you put that above code in the markdown and generate the static page, you will see the Deploy to Azure button appear like this.

{{<azdeploy "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/101-storage-account-create/azuredeploy.json">}}

Simple and straightforward. I really fell in love with Hugo and static site generation. This has a lot of ways to customize and way faster than any other framework I used so far.
