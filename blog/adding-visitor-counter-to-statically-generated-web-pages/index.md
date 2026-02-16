# Adding visitor counter to statically generated web pages


One of the to-do list items I had for this static blog site was to figure out a way to add page views counter to every article. This is especially important for PowerShell Magazine articles as we move that to a static site as well. I tried looking for a few solutions but found mostly things that would require playing with JavaScript. 

While looking at different GitHub profile pages this morning, I came across a visitor counter on [Tyler's page](https://github.com/TylerLeonhardt). This piqued my interest and looked at how he was generating it. It was made possible through a service hosted on [glitch.me](https://visitor-badge.glitch.me/). There is a [GitHub repo](https://github.com/jwenjian/visitor-badge) that contains the source for this. At first, it seemed like a thing only for GitHub readme markdown but looking at the docs, I realized that I can embed that in simple webpages too.

So, I updated single.html in my Hugo theme to add the following code. Single.html is the template for the article content in Hugo.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "visitorbadge" >}}

With Hugo framework, this becomes relatively easy since the variables provided within the page context while building the static pages will help us build the necessary URL for tracking the visitors to the page. Depending on what static page generator framework you use, you may have to change the code above.


