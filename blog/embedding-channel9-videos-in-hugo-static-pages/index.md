# Embedding Channel9 Videos in Hugo Static Pages

I have been trying a few things with my new blogging platform here and in the preparation for a new series of articles, I wanted the ability to embed [Channel9](https://channel9.msdn.com/) videos. This is Hugo platform! So, it was not a big deal. I just had to create another [shortcode](https://gohugo.io/content-management/shortcodes/) like the one I created for [Deploy to Azure button](https://ravichaganti.com/blog/adding-azdeploy-button-in-static-pages-using-hugo/).

Here is the code for the shortcode.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "channel9.html">}}

You can save this as channel9.html under the layouts/shortcode folder of your site content. And, then use this shortcode as shown here.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "channel9use">}}

You can use either of the methods shown above. The first one uses an named parameter while the second one avoids named parameter specification. Here is how the embed appears on the static page.

{{<channel9 "https://channel9.msdn.com/Events/Build/2020/KEY01">}}

It is good to be writing here again! Can't wait to start publishing the new series of articles that I am writing now. Stay tuned!
