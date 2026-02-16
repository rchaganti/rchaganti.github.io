# How I use GitHub Gists to store and display code snippets in blog posts


After I moved to a static site hosted on GitHub Pages, I was looking at different options to share the code snippets in a better way. With the Hugo generated static pages, there are a few options for code sharing in an article. 

You can use the simple pre-formatted text in markdown. This is usually done by enclosing code snippet in ```. This appears (in Hugo Coder theme I am using) as a big black block and has no way to choose the right syntax highlighting based on what programming language the snippet is written in. There are no line numbers or no highlighting of lines in a code snippet and so on.  

The second method involves Hugo's default [Highlight shortcode](https://gohugo.io/content-management/syntax-highlighting/). This is a good method that supports line numbers, language type, and line highlights. But, the only shortcoming is that I have to now store the code snippet locally in the same static page. So, if I need to update the code snippet, I end up updating the static page itself.

So, wanted to explore something better and then I found the [Gist shortcode](https://gohugo.io/content-management/shortcodes/#gist) in Hugo. Using this shortcode, you can embed a GitHub Gist on a static page. This seemed like a good fit for me since I get the line numbers, language based syntax highlighting, and nothing saved locally in the static page. However, for adding the code snippets as Gists, I first need to upload the Gist and then use it in my article. For this, I need to navigate to the GitHub site and then return once I am done uploading Gists. This is where I found [GistPad VS Code extension](https://marketplace.visualstudio.com/items?itemName=vsls-contrib.gistfs) quite helpful. With this extension in place, I can now create/update/delete Gists right inside VS Code where I am writing all the markdown content for the articles. So, I never have to leave VS Code. Here is how it appears in VS Code.

{{<figure src="/images/vscodegist.png">}}

As you see in the screenshot, I can group all Gists that belong a specific article or category and then simply use them here in an article. With this integration, I simply write all code as a Gist and then use the following syntax to make it appear here.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "gistshortcode" >}}

Simple. I will be using this method of sharing code snippets within an upcoming article series. Stay tuned.
