---
id: 017
title: Rapidly build Autopilot VMs with Hyper-V and PowerShell!
date: 2020-05-18T16:27:00+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=309
permalink: /2020/05/18/rapidly-build-autopilot-vms-with-hyper-v-and-powershell/
views:
  - "5986"
image: /assets/images/2020/05/new-clientVMDemo-1.gif
categories:
  - Azure
  - Intune
  - PowerShell
tags:
  - Hyper-V
  - Intune
---
Picture this scenario - you are at the pointy end of a major modern management project and it's time to test every policy, configuration and application at scale and quickly.

What do you do? With infinite money, infinite time and a willing client, you take over their VC meeting room and stack dozens of devices on a desk and blast slayer while you verify your builds ( this literally has happened to me)..

<!--more-->

But what if you don't have infinite money, time or an understanding client? That's where Hyper-V and my latest module [Intune.HV.Tools](https://www.powershellgallery.com/packages/Intune.HV.Tools) come in handy!

Over the last few days, me and my fellow nerd army ([Steve](https://twitter.com/OnPremCloudGuy), [Adam](https://twitter.com/AdamGrossTX) and [Bruce](https://twitter.com/BruceSaaaa)) have polished our VM provisioning script to something that we are proud enough to publish to the PowerShell Gallery.

Enough intro - let's dive right in.

Open your favourite terminal as admin - PowerShell 5.1 or 7 will work. Haven't installed 7 yet? [give it a go](https://github.com/PowerShell/powershell/releases), it's easy to install and awesome.

Let's begin by installing the module..

```PowerShell
Install-Module Intune.HV.Tools -Scope CurrentUser -Force
```

Once the module is installed, we need to set up our device using the functions contained within..

Now let's initialize everything..

```PowerShell
Initialize-HVTools -Path "C:\lab"
```

All we are doing here is specifying where we want our VMs to be stored and preparing the configuration file - which we can look at by running the "Get-HVToolsConfig" command..

[![Initialize](/assets/images/2020/05/initialize.gif)](/assets/images/2020/05/initialize.gif "Initialize")

Now that we have our configuration file initialized, let's add stuff to it!

The next thing we need to add is details of our windows installation media - in the example below we are using the latest "2004" build of windows 10..

```PowerShell
Add-ImageToConfig -ImageName "2004" -IsoPath C:\Path\To\Images\en_windows_10_business_editions_version_2004_x64_dvd_d06ef8c5.iso
```

We can add as many images to the solution as we want - all we need to do is make sure each one has a unique name - as shown below, I've added builds 1909 and 2004 to my lab..

[![Add image to config](/assets/images/2020/05/add-imagetoconfig.gif)](/assets/images/2020/05/add-imagetoconfig.gif "Add image to config")

Once we have our image library added to the config, let's add some of our tenants (one at a time of course..)

```PowerShell
Add-TenantToConfig -TenantName "Powers-Hell" -ImageName "2004" -AdminUpn "AdminEmail@Powers-Hell.com"
```

What's cool about the **Add-TenantToConfig** cmdlet is that the **ImageName** parameter autocompletes from the available images that we added in the step before. Only have one image? press Tab and it'll autocomplete. You added a few images? Tab through and find the one you want to use!

[![Add tenant to config](/assets/images/2020/05/add-tenantoconfig.gif)](/assets/images/2020/05/add-tenantoconfig.gif "Add tenant to config")

Alright, we've got our images and our tenants configured, lastly we need to add our Hyper-V VLAN details - most of us probably just have the "Default Switch" that was set up when we install Hyper-V, but \*some\* of us have complex setups, so let's solve that.

```PowerShell
Add-NetworkToConfig -VSwitchName 'SuperUniqueSwitchName'
```

The cmdlet actually auto-completes against any virtual switches you might have set up, so as always, just tab through and find the switch you want to assign to your machines..

[![Add network to config](/assets/images/2020/05/add-networktoconfig.gif)](/assets/images/2020/05/add-networktoconfig.gif "Add network to config")

If you have a virtual network that requires a **VLanID** you can also apply that by using the **-VlandID** parameter..

Alright, once our configuration is set up, it's time to build our VMs. For this example I'm going to build 3 VMs with a single CPU and 2gb of memory to enroll to the "Powers-Hell" tenant..

```PowerShell
New-ClientVM -TenantName 'Powers-Hell' -NumberOfVMs 3 -CPUsPerVM 1 -VMMemory 2gb
```

The first time you build a VM from an image it needs to create a **reference image** which can take some time - this will only need to be done once per image.

We will also check for any available Autopilot configuration profiles. If we want to skip that and just spin up test machines we can use the **-SkipAutoPilot** switch..

Once we've captured the Autopilot configuration profile we will use the local copy moving forward..

Let's watch what happens once we already have the reference image created..

[![Run the code](https://i0.wp.com/i.imgur.com/ix05KH2.gif?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/ix05KH2.gif?w=1170&#038;ssl=1 "Run the code")

Awesome - we now have 3 machines we can use to verify our Autopilot configuration, all other Intune policies, configurations and applications work.

The usual caveat emptor rules apply - this works for me - I've tested it pretty heavily, **but it may not work for you.**

If it doesn't work for you, please raise an issue on the [GitHub](https://github.com/tabs-not-spaces/Intune.HV.Tools) and I'll try fix it for you.

There are plenty of things I plan to add to this - so please check back regularly!

As always, [Source code for this post can be found here](https://github.com/tabs-not-spaces/Intune.HV.Tools), the official module can be found [here](https://www.powershellgallery.com/packages/Intune.HV.Tools), and I can always be reached on [twitter](https://twitter.com/powers_hell).

— Ben
