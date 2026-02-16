# GitHub workflow for streamlined publishing of static pages


Ever since I moved to this site/blog to static pages using Hugo and GitHub pages, I have been finding ways to optimize the publishing experience. If you ever used Wordpress, the plugins that are available to customize the site look and feel and functionality will spoil you. They make your life easy by extending base functionality and you can achieve pretty much anything you want as long as there is a plugin for that and you will always find one. Moving from such an environment to a static page generator makes you feel that you have to do all the heavy lifting. 

For example, tweeting an article once it is published is super simple when using Wordpress. You can simply integrate with Jetpack or use an external plugin to do that job for you. However, with static pages hosted on GitHub pages, your options are limited. If your static site generator generates an RSS feed, you can use a service like [IFTTT](https://ifttt.com/) to retrieve changes to the feed and then send out a tweet announcing a new article. In the absence of an RSS feed, you must manually tweet the article.

As a part of this move to Hugo and GitHub pages, I wanted more control over publishing articles on this blog. I started writing a couple of longer series of articles. These articles will be written in advance but published one after another. So, I will have a lot of articles in draft state until the time I want to publish them. Now, you may say that I may be over engineering this but this becomes an important aspect as I move [PowerShell Magazine](https://www.powershellmagazine.com/) to a static site as well. PowerShell Magazine has multiple authors contributing and we need a way to ensure that the content submitted by these contributors is reviewed and allowed to publish only after the review and subsequent updates are complete. We cannot let anyone commit to a master or a live branch. So, figuring out these details before PowerShell Magazine goes live as a static site will help on-board other contributors quickly. Essentially, my site is a playground for all that! :)

So, here is the GitHub flow that I implemented as of today. I am going to optimize this further based on what I need for PowerShell Magazine.

{{<img src="/images/gitflow.png" width="860">}}

> You will need [GitHub CLI](https://cli.github.com/) try out commands in this article.

To implement this flow, I have two different GitHub repositories -- blog and rchaganti.github.io. Blog repository is a private repository that contains all the markdown files for the articles on this blog and rchaganti.github.io is a public repository to which the generated static pages will be pushed to. 

Blog repository has two branches -- draft and live. Draft branch is where I author all the articles and keep them ready for publishing. Live branch has the content that should be live on the public website. Whenever there is content that needs to be pushed into the live branch, I submit a pull request.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "ghcreatepull.sh" >}}

I use the blog article title as the argument to `--title` parameter and the permalink to the new article as the argument to `--body` parameter. I use these values specifically since I want to be able to send a tweet once the static page is generated and public site is updated. You will see how it gets used in the workflow file.

Here is how (example from an earlier test) the created pull request will appear.

{{<img src="/images/ghpull.png" width="860">}}

At this point in time, since I am the only author on my site, I can simply merge the pull request. In case of a multi-author blog or external contributions, we can go through the review workflow after the PR is submitted.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "ghprmerge.sh" >}}

The above command will merge the PR. Now, at this point, we can trigger a GitHub workflow to use Hugo to generate the static pages, push to an external public repository, and finally tweet that change. Here is the workflow YAML from my repository.

{{< gist rchaganti 056a02f289d7d5415c17d27082ee753b "workflow.yml" >}}

The above workflow gets triggered only when a pull request is associated with the live branch and the PR is closed. I have chosen a ubuntu runner to ensure all actions that I specified can run. And, this is a multi-step workflow.

In the first step, live branch of the blog repository gets checked out. In step 2, I am using [peaceiris/actions-hugo@v2](peaceiris/actions-hugo@v2) action from the marketplace to setup Hugo and I am using extended version (specified using `extended: true`) since I have custom CSS that needs to be compiled. 

Step 3 builds the static pages using Hugo command and step 4 publishes those static pages to an external public repository. This step uses [peaceiris/actions-gh-pages@v3](peaceiris/actions-gh-pages@v3) from the actions marketplace. This action a few options. If you do not specify an external repository, it will simply create a new branch in the same repository that was checked out earlier and publish your static pages there. It will also auto-configure the cname based on what is configured in the static pages. I did not want this behavior since my Blog repository is a private repository and do not want a public facing site in that repository. For this action to be able to access the external repository and commit the new build of static pages, it needs the [GitHub personal token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token#:~:text=Personal%20access%20tokens%20%28PATs%29%20are%20an%20alternative%20to,uses%20SAML%20SSO%2C%20you%20must%20authorize%20the%20PAT.). 

Finally, the last step sends out a tweet using the [ethomson/send-tweet-action@v1](ethomson/send-tweet-action@v1) action. This action requires Twitter API token and secrets. You can create your own app on [Twitter developer portal](https://developer.twitter.com/en/apps). If everything else goes fine, this last step will send the tweet out using the pull request title and body arguments you have seen earlier. 

Here is a test tweet that was sent out at the end of an earlier test run.

tweet 1279720259801530368

Now, there is one thing I still need to implement is the conditional execution of the GitHub action. For example, I may update an already published article for whatever reasons but may not want a tweet to go out after this update. I can implement this based on the pull request labels. And, I want to be able to schedule article publishing which may be possible using cron syntax within the workflows. More on these later.
