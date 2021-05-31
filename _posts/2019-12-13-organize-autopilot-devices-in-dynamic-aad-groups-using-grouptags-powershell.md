---
id: 202
title: 'Organize AutoPilot devices in dynamic AAD groups using GroupTags & PowerShell'
date: 2019-12-13T08:28:06+10:00
author: Ben
layout: post
guid: http://www.powers-hell.com/?p=202
permalink: /2019/12/13/organize-autopilot-devices-in-dynamic-aad-groups-using-grouptags-powershell/
views:
  - "3883"
categories:
  - Intune
  - Powershell
tags:
  - Automation
  - Intune
  - Powershell
---
Don't ever say Microsoft doesn't listen! One of my biggest pet peeves was solved at the beginning of the month when Microsoft announced the ability to edit device group tags!

This doesn't sound like much, but it essentially unlocks the potential of group tags that was never really there before - we can now use group tags to dynamically control device group membership.

<!--more-->

While there have been [quite](https://oofhours.com/2019/11/25/now-you-can-edit-group-tags-and-computer-names-for-windows-autopilot-devices/) a few great [posts](https://blog.alschneiter.com/2019/11/26/edit-group-tag-and-computer-name-in-windows-autopilot/) about this, most of the code in the articles I've read are using community modules that, while there's nothing wrong with using other people's code, I find the best way to understand how something works is to dig in and figure out the inner-workings myself.

The good news is that because almost \*everything\* in Azure is accessible through the omnipresent Microsoft Graph, so it only took a few minutes of analyzing the requests to figure out what was going on. Let's dive right in!

First let's set up a few dynamic groups in AAD.

The first one - let's call this our "baseline" group, will have the following dynamic rule that will capture **all** devices.

<pre class="wp-block-code"><code>(device.devicePhysicalIDs -any _ -contains "[ZTDId]")</code></pre>

The second group - let's call this our "exclusion" group, will have the following dynamic rule that will capture all devices with a specific group tag.

<pre class="wp-block-code"><code>(device.devicePhysicalIds -any _ -eq "[OrderID]:EXCLUDE")</code></pre>

Once set up and given enough time to update, you should now see all of your devices in the "baseline" group and nothing in the "exclusion" group. Let's fix that now.

Go and grab the serial numbers of the devices you wish to move to the exclusion group (you can grab this directly from AAD or from the Windows AutoPilot Devices section of Intune - here's mine as an example - note that there are no group tags assigned)

[![Autopilot devices](/assets/images/2019/12/image.png)](/assets/images/2019/12/image.png "Autopilot devices")

For this example, let's exclude the first device in the screenshot above.

The first step when we interact with Microsoft Graph, as always, is to authenticate and store the Authentication Token in a variable so that we can use it for the next few steps - I've spoken about this before, so if you aren't sure how to do this, [read this and come back when you are ready](https://powers-hell.com/2018/08/17/authenticate-to-microsoft-graph-in-powershell-in-two-lines-of-code/)!

Alright - we've got our auth token, put your serial number into a variable, and then we will form out the first Graph Call.

If we've formed our request properly, if we look at the contents of $result, we should see details on the device in question.

[![$result data](/assets/images/2019/12/image-1.png)](/assets/images/2019/12/image-1.png "$result data")

Next, we are going to grab the id of the device from the graph call, build the group tag data and post it back to Graph..

Finally, we are going to perform a sync on our AutoPilot device list..

Now if we jump over to our AutoPilot devices list we should see the group tag updated..

[![Updated group tag](/assets/images/2019/12/image-2.png)](/assets/images/2019/12/image-2.png "Updated group tag")

And of course, our dynamic groups should now be populated correctly..

[![Dynamic groups](/assets/images/2019/12/image-3.png)](/assets/images/2019/12/image-3.png "Dynamic groups")

That's it! - 3 calls to Graph and a little bit of patience.

Now of course, 3 REST API calls is not how I'm going to leave you - with a little bit of error handling and polish we can build out a very reliable function..

As always, all code from this post will be available on my GitHub and I am always available to chat on [Twitter](https://twitter.com/powers_hell).

-- Ben
