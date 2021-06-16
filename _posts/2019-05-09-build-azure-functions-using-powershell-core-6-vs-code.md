---
id: 010
title: 'Build Azure Functions using PowerShell Core 6 & VS Code!'
date: 2019-05-09T05:06:33+10:00
author: Ben
excerpt: Now that the public preview of PowerShell support for Azure Functions V2 has been released, it only seems fitting that I demonstrate not only how to create a PowerShell function app, but how to create, test AND deploy the function entirely in VS Code!
layout: post
guid: http://powers-hell.com/?p=160
permalink: /2019/05/09/build-azure-functions-using-powershell-core-6-vs-code/
views:
  - "4475"
categories:
  - Azure
  - Function Apps
  - PowerShell
tags:
  - PowerShell
---
I've been creating Azure Function using PowerShell since it was added as an option in their "Experimental Language Support" in V1.0. In fact, It was almost a year to the day that I wrote my first blog post about how I used [Azure Functions to make PowerBI work nicely with Graph](http://powers-hell.com/2018/05/15/working-with-graphapi-powerbi-the-easy-way/).

<!--more-->

So, it only seems fitting now that the public preview of [PowerShell support for Azure Functions V2 has been released](https://devblogs.microsoft.com/powershell/public-preview-of-powershell-in-azure-functions-2-x/), that I demonstrate not only how to create a PowerShell function, but how to create, test AND deploy the function entirely in VS Code!

Before we get into this amazing new era of serverless computing, we need to set up our development environment with the following pre-requirements:

* [PowerShell Core (6.2 Minimum)](https://github.com/PowerShell/PowerShell/releases/download/v6.2.0/PowerShell-6.2.0-win-x64.msi)
* [.NET Core SDK 2.2+](https://www.microsoft.com/net/download)
* [Node.js & NPM](https://nodejs.org/en/download/)
* [Azure Functions Core Tools v2.x](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2)
* [Visual Studio Code](https://code.visualstudio.com/) [](https://code.visualstudio.com/)
* [PowerShell extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.PowerShell)
* [Azure Functions extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)

For the sake of brevity, this guide will assume you are setting your development environment up using a 64-bit Windows operating system.

Once you've set up your development environment, fire up VS Code and select the Azure icon in the sidebar.

[![VSCode](/assets/images/2019/05/Snag_33ca9090.png)](/assets/images/2019/05/Snag_33ca9090.png "VSCode")

Sign in to your Azure account by clicking the very obvious link and following the bouncing ball. (This isn't necessary right now, but it's handy to connect to you Azure tenant.)

Once you are signed in, you will see your subscription, along with any other existing functions previously created.

[![Azure subscription](/assets/images/2019/05/Snag_33d1dde3.png)](/assets/images/2019/05/Snag_33d1dde3.png "Azure subscription")

Now let's get started onto the fun stuff. Open up the command palette (F1), search for **Azure Functions** and select **Create New Project&#8230;**

[![Create new project](/assets/images/2019/05/Snag_33d35030.png)](/assets/images/2019/05/Snag_33d35030.png "Create new project")

Save your project somewhere locally, then select **PowerShell (Preview)** as your development language.

[![PowerShell as language](/assets/images/2019/05/Snag_33d46fe8.png)](/assets/images/2019/05/Snag_33d46fe8.png "PowerShell as language")

For this scenario we are going to create a basic web API, so select HTTP trigger, but take some time to view all the options now made available to us in Azure Functions V2.0

[![HTTP Trigger](/assets/images/2019/05/Snag_33d5af3e.png)](/assets/images/2019/05/Snag_33d5af3e.png "HTTP Trigger")

Give your function a name, and set the **authorization level** to **Function**

[![Set auth level to function](/assets/images/2019/05/Snag_33d6a0a3.png)](/assets/images/2019/05/Snag_33d6a0a3.png "Set auth level to function")

Finally, select **Add to Workspace.**

[![Add to workspace](/assets/images/2019/05/Snag_33d76a2d.png)](/assets/images/2019/05/Snag_33d76a2d.png "Add to workspace")

You should now be greeted with the basic scaffold of an Azure Function App. Key files of mention here are:

* Function.json - Where all IN / OUT bindings for your function are defined and configured.
* Run.ps1 - The PowerShell code that is run when the function is triggered.
* Host.json - The configuration file for the entire project.
* Local.settings.json - Where all environment variables can be defined.

Now let's run the sample function to make sure everything is working as it should be.

Open **run.ps1** - the first thing we will need to do is switch the Terminal session from the default **5.1** to **PowerShell Core.**

On the notifications tray of VS Code click on the green 5.1 PowerShell icon to launch the session menu.

[![Switch to PWSH](/assets/images/2019/05/Snag_33e109ec.png)](/assets/images/2019/05/Snag_33e109ec.png "Switch to PWSH")

In the session menu, select **Switch to: PowerShell Core (x64)** and select **Yes** when asked to start a new session.

You should now see a green 6.2 PowerShell icon in the notifications tray.
Finally, Hit **F5** to launch the function app into VS Code!

Once the app has finished launching, you should see the endpoint URL in the terminal output. Select and copy this to the clipboard.

[![endpoint url](/assets/images/2019/05/Snag_33e7ac68.png)](/assets/images/2019/05/Snag_33e7ac68.png "endpoint url")

Now, let's switch over to the **PowerShell Console** (or just open up another PowerShell terminal window!)

[![Open terminal](/assets/images/2019/05/Snag_33fbf75b.png)](/assets/images/2019/05/Snag_33fbf75b.png "Open terminal")

The template Function that is provided with the scaffold is a simple "Hello World" HTTP trigger which is simply looking for a **Name** property, so using the URL generated from the Function App, let's send a request and see what happens.

<pre class="wp-block-code"><code>Invoke-RestMethod -Method Get -Uri http://localhost:7071/api/Powers-Hell_HTTP-Trigger?Name=Ben</code></pre>

When we run that command we should receive back a very exciting response from the Function!

[![Run the command!](/assets/images/2019/05/Snag_34050019.png)](/assets/images/2019/05/Snag_34050019.png "Run the command!")

And there you have it - a locally run Function App using PowerShell Core 6 & VS Code!

Stay tuned for my next post, where I'll take everything we've gone over here and turn it into a way to modernize logon scripts for Intune managed devices!
