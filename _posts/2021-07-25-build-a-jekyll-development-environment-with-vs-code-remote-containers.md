---
layout: post
title: Build a Jekyll development environment with VS Code & Remote Containers
titlecolor: orange
date: 2021-07-25 08:12 +0000
id: 028
author: Ben
views: 0
image: /assets/images/2021/07/build-and-change.gif
categories:
    - Jekyll
    - Static Web App
    - VS Code
    - Remote Container
    - Docker
tags:
    - Jekyll
    - Static Web App
    - VS Code
    - Remote Container
    - Docker
---

So you want to build a site, host it on Github (for free) and don't know where to start? Here's how I did it!

<!--more-->

Since moving this site away from WordPress and rebuilding the site from the ground up using [Jekyll](https://jekyllrb.com/), [Tailwind CSS](https://tailwindcss.com/) & [Dracula UI](https://draculatheme.com/ui), I've had lots of questions about **how** others could do the same. Now, this isn't obviously what I normally talk about (PowerShell / Intune), I think the concepts I usually talk about - automation, making tools work better for you, having fun learning new skills are transferrable to this. Plus... It's **my** site!

So what I'm going to cover is how to leverage a **very basic** github template and convert it into a solution that with a click of your mouse will provision a Docker container that has everything you need to develop a Jekyll static web app.

What I will **NOT** be talking about is how to *build* a jekyll website, or how to write HTML / CSS / Javascript. This is an introductory guide to using the [remote repository](https://code.visualstudio.com/blogs/2021/06/10/remote-repositories) extension of VS Code to help you get started with Jekyll - not a website development lesson.

With that out of the way, let's get into the fun!

## Pre-requirements

Before you start, please make sure you have the following installed on your device.

- [Windows Subsystem for Linux (WSL2)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Visual Studio Code](https://code.visualstudio.com/download)
- Visual Studio Code Extensions:
    - [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)
    - [Remote Repositories](https://marketplace.visualstudio.com/items?itemName=GitHub.remotehub)

Once the above has been installed we can begin.

## Create a repository from a Jekyll starter template.

As mentioned, this is just how I've set up my site, it's not the **only** way to do it, but it sure is easy.

Let's begin by generating a project repository from the [jekyll-starter](https://github.com/mloberg/jekyll-starter/generate) repo.

[![Generate repo from template](/assets/images/2021/07/generatefromtemplate.gif)](/assets/images/2021/07/generatefromtemplate.gif "Generate repo from template")

That was easy, wasn't it?!

## Prepare the repository for remote container support.

Now we want to make it so we can open this new repository as a *remote container* in VS Code. The easiest way to do that is to put a link in the readme of the project. Scroll down to the readme.md and hit the edit button. We are going to add the following code to the top of the file.

``` markdown
[![Open in Visual Studio Code](https://img.shields.io/badge/Open%20in-Visal%20Studio%20Code-blue?style=for-the-badge&logo=visualstudiocode)](https://open.vscode.dev/your-github-username/your-repository-name)
```

Copy the above code and edit the URL to reflect your GitHub account name and the name of the repository you created from the previous step. As an example, the URL I would put in for my example would be `https://open.vscode.dev/tabs-not-spaces/Heaps-Cool-Website`.

Commit the changes you've made and you should now have a handy button that we will use in the next step.

[![Create "Open in VSCode" button](/assets/images/2021/07/create-open-button.gif)](/assets/images/2021/07/create-open-button.gif "Create "Open in VSCode" button")

## Clone repo in container volume

Now that we have our new handy dandy button added to our readme - let's click it.

We should be greeted with a jump-off page with two options:

- Open with Remote Repositories
- Clone repo in container volume

By the name of this section, you should know what's about to happen - click on the **Clone repo in container volume** button and accept any prompts that appear.

[![Open repo in container volume](/assets/images/2021/07/open-remote-container.gif)](/assets/images/2021/07/open-remote-container.gif "Open repo in container volume")

Because we have not configured our **dev container** in the repository, we are now going to be asked what exactly our development environment will look like..

## Add development container configuration files

As shown in the image above, we should now have a docker instance loaded that is asking us how we want to set up our environment. Luckily, Microsoft has created a bunch of great reference development container templates we can utilize as a jump off point.

Click on **Show All Definitions...** and search for **Ruby**.

From here we are going to select the latest release of **Ruby (3.0)** and we are going to make sure to include **Node.js** to our container.

Our Docker container will now build based off our configuration and you should be left with an instance of VS Code remotely connected to a Docker container housing your site & all required software to develop the site!

[![Add development container configuration files](/assets/images/2021/07/dev-container-config-files.gif)](/assets/images/2021/07/dev-container-config-files.gif "Add development container configuration files")

## Customize development environment

At this stage everything we have done has been **out of the box** configuration. We now need to make a few changes to customize it to work the way we want.

First, we need to add some Jekyll plugins to the project to make sure we can build the site.

Open up the **gemfile** file and let's add the **webrick** plugin to our config. The file should look like this..

```ruby
source "https://rubygems.org"

gem "jekyll", "~> 4.1"
gem "webrick"

group :jekyll_plugins do
#   gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
#   gem "jekyll-archives"
#   gem "jekyll-redirect-from"
  gem "jekyll-compose"
end
```

Next, open the **webpack.config.js** file and remove the **test.config** line. It should end up looking like this..

```javascript
const Encore = require('@symfony/webpack-encore');

if (!Encore.isRuntimeEnvironmentConfigured()) {
  Encore.configureRuntimeEnvironment(process.env.NODE_ENV || 'dev');
}

process.env.NODE_ENV = Encore.isProduction() ? 'production' : 'dev';

Encore
  .setOutputPath('assets/')
  .setPublicPath('/assets')
  .addStyleEntry('css/app', './_assets/css/app.css')
  .addEntry('js/app', './_assets/js/app.js')
  .enablePostCssLoader()
  .disableSingleRuntimeChunk()
  .enableSourceMaps(!Encore.isProduction());

module.exports = Encore.getWebpackConfig();

```

Next, let's customize some of the basic metadata of our new site. Open the **_config.yml** file and set up all of the properties to reflect the project. Here's mine as an example..

```markdown
title: My Heaps Cool Website
description: This is "HEAPS COOL"
permalink: /:slugified_categories/:title/

date_format: "%b %-d, %Y"

exclude:
  - "package*.json"
  - "*.config.js"
  - netlify.toml
  - README.md
  - LICENSE
  - Makefile
```

Finally, let's build a simple VS Code task to help us start our site for live development.

- Open up the command palette (Ctrl+Shift+P) and search for **Configure Task**
- Scroll to the bottom and select **Create tasks.json file from template**
- Select **others** to build an empty tasks template file.

Now let's add the below code to the .vscode/tasks.json file that has been created in our repository.

```json
{
    "label": "Jekyll: Build Dev",
    "detail": "bundle install && npm install && npm run dev && npm start",
    "type": "shell",
    "linux":{
        "command": "bundle install && npm install && npm run dev && npm start"
    },
    "group":{
        "kind": "build",
        "isDefault": true
    },
    "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
    },
    "problemMatcher":["$eslint-stylish","$jekyll-error-watch", "$jekyll-warning-watch"]
}
```
[![VS Code Tasks](/assets/images/2021/07/vscode-tasks.gif)](/assets/images/2021/07/vscode-tasks.gif "VS Code Tasks")

Now that we have everything configured, the next step is to start the development environment and see if the site displays.

- Open the command palette (Ctrl+Shift+P) and search for **Run Task**
- Select the default option, which is the task we just built.

The site will now build and generate a local web server that will host the site from within the development container. Once it is completed building, you will recieve an option to open the development server from within your browser or from within VS Code!

[![Build and run](/assets/images/2021/07/build-and-change.gif)](/assets/images/2021/07/build-and-change.gif "Build and run")

Now comes the fun part of building your site, designing the theme and of course, writing content!

## Deploy site with GitHub Actions

Now that you have the basic framework for a Jekyll development environment (and maybe written a post or two), you'll want to configure some automation to publish the site to GitHub.

Thankfully, the template we built our project with comes with a GitHub Action Workflow that does most of what we need to prepare the site for GitHub.

So let's commit and push the changes we've made to the project back to the repository and watch the workflow do some magic.

[![Commit and publish](/assets/images/2021/07/gh-action.gif)](/assets/images/2021/07/gh-action.gif "Commit and publish")

Once the action has completed, a new branch is created named **gh-pages**. This is where the processed static files are stored.

The last step of this process is to link that repository to GitHub pages.

Head over to Settings > Pages and set the source to the **gh-pages** branch.

Now if you go to the URL shown on the screen, you should see your shiny new Jekyll site!

[![Link site to GitHub Pages](/assets/images/2021/07/link-gh-page-to-gh-site.gif)](/assets/images/2021/07/link-gh-page-to-gh-site.gif "Link site to GitHub Pages")

Thanks for getting this far - I know this isn't my normal subject matter, but I've been having lots of fun learning and playing with Remote Repositories & Docker and hopefully this helps someone who is just getting started.

— Ben