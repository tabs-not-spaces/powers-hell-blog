---
id: 012
title: 'Synchronize SharePoint sites with Intune & PowerShell'
date: 2020-03-15T09:01:43+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=216
permalink: /2020/03/15/synchronize-sharepoint-sites-with-intune-powershell/
views:
  - "5585"
categories:
  - Intune
  - PowerShell
  - SharePoint
tags:
  - Automation
  - Intune
  - PowerShell
---

I recently spent some time with my good friend and frequent collaborator [Steven Hosking](https://twitter.com/OnPremCloudGuy). We spoke about a solution I came up with to synchronize SharePoint sites to devices using PowerShell & Intune.

<!--more-->

This is something I've had in my drafts for quite a while, but it kept ending up being too long to write about. As it turns out, Steve ( and [Adam](https://twitter.com/AdamGrossTX)) runs a very valuable and informative [youtube channel](http://intune.training) that is dedicated to everything that is "Intune".

As the solution I wrote for this is directly linked with Intune, we figured it'd be perfect for the channel. We decided to film this little video to show how my solution works better than the official one provided by Microsoft.

<div class="video-container">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/Zoac9lbUuG0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

To summarize everything in the video:

* SharePoint sites can be synchronized natively through Intune Administrative Template Policies
* The native policy has a URI character limit which is very easy to hit
* Capturing the details required to sync SharePoint sites is very easy using Chrome / Edge Chromium
* Using PowerShell can overcome current limitations with the native policy solutions.

Here is [a link to the code mentioned in the video](https://github.com/tabs-not-spaces/CodeDump/tree/master/Sync-SharepointFolder) - if anyone wants further info, please let me know!

Enjoy!

— Ben
