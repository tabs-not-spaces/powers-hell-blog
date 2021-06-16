---
id: 016
title: Create a bootable Windows 10 Autopilot device with PowerShell!
date: 2020-05-04T13:58:14+10:00
author: Ben
excerpt: "The most common complaint that I've received from people over the last few years around Intune / Autopilot / Modern Management is that people find it frustrating how much effort is involved in getting a device prepared to handover to a client for Autopilot enrollment."
layout: post
guid: http://powers-hell.com/?p=291
permalink: /2020/05/04/create-a-bootable-windows-10-autopilot-device-with-powershell/
views:
  - "16178"
image: /assets/images/2020/05/usb-provision.gif
categories:
  - Azure
  - Intune
  - PowerShell
tags:
  - Autopilot
  - Intune
  - PowerShell
---
The most common complaint that I've received from people over the last few years around Intune / Autopilot / Modern Management is that people find it frustrating how much effort is involved in getting a device prepared to handover to a client for Autopilot enrollment.

<!--more-->

I totally agree - the sales pitch we are all given is that your staff can go out to a big-box store, buy a laptop and in minutes be greeted with a "welcome to mega-corp" login screen.

What is never told to us is that before we do any of this, we need to:

* make sure a CLEAN copy of windows 10 is installed on the device - which it never is.
* Capture the hardware hash of the device and upload it to Intune.
* Finally, if the device is already past the OOBE, re-image the device and hand it over to the staff member..

Hardly the autonomous, streamlined sales pitch we've been sold - is it?

Well, I'm here to say I want to make it a little less painful with my first published PowerShell module - [Intune.USB.Creator](https://www.powershellgallery.com/packages/Intune.USB.Creator/1.0.0.420)!

This is a solution developed over the last few years and road-tested with multiple clients and environments - something that is reliable enough that I'm happy enough to share it as a complete solution - something I rarely do due to being an obsessive perfectionist&#8230;

Let's get into how we use it!

## Pre-Requirements

First things first, we need to make sure the device you are going to use to build the Autopilot device has a few pre-requisites:

The module was written primarily for [PowerShell 7](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-windows?view=powershell-7) - if you don't have it yet, there's a bunch of ways to get it on your machine. Below is probably the easiest of the lot..

```PowerShell
Invoke-Expression "& { $(Invoke-RestMethod -Method Get -Uri "https://aka.ms/install-powershell.ps1") } -UseMSI"
```

Some of the helper functions rely on other modules - so let's install those (using PowerShell 7 of course..)

```PowerShell
Install-Module WindowsAutoPilotIntune -Scope CurrentUser -Force
Install-Module Microsoft.Graph.Intune -Scope CurrentUser -Force
```

The module uses Windows 10 installation media to create the bootable media. This can be procured from many locations - if you do not have access to this, someone you work with will - just make sure you have a copy of the latest *.iso on your device.

Finally, let's install the Intune.USB.Creator module..

```PowerShell
Install-Module Intune.USB.Creator -Scope CurrentUser -Force
```

## How to use

Once all the pre-requirements are installed, plug a USB into our device and let's create an Autopilot provisioning device.

Open up PowerShell 7 as an administrator and we will type in the following command:

```PowerShell
Publish-ImageToUSB -winPEPath "https://githublfs.blob.core.windows.net/storage/WinPE.zip" -windowsIsoPath "C:\path\to\win10.iso" -getAutopilotCfg
```

Hitting enter will kick off the device provisioning code..

[![Using the module](https://i1.wp.com/i.imgur.com/u4HOn0y.gif?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/u4HOn0y.gif?w=1170&#038;ssl=1 "Using the module")

A few things to note on each parameter:

* **WinPEPath** (Required) - I've put a copy of WinPE up on my own storage account - feel free to use it, but if the cost of storage ends up too much, I will take this down. So grab a copy now and store it locally. Consider this fair warning.
* **WindowsIsoPath** (Not required) - as mentioned in the pre-requirements section, you need to source your own copy of Windows 10. This shouldn't be difficult. Try and get a copy of the "multi-edition" so you can build different variants if required. If you don't provide a path to a copy of Windows 10, the device will still be provisioned, but there will be nothing added to the solution except for WinPE.
* **GetAutopilotCfg** (Not required) - this is a simple switch to allow you to log in to an Azure tenant and capture the Autopilot configuration files. If you omit this, you will end up with a provisioning device that installs windows 10 and does nothing else.

Once our USB has been created, all that is required to do is plug it into our target device and boot from it.

WinPE will load and trigger the built in provisioning script which will load the operating system onto the device and inject the Autopilot configuration file.

[![WinPE](https://i2.wp.com/i.imgur.com/v9Ls50M.gif?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/v9Ls50M.gif?w=1170&#038;ssl=1 "WinPE")

Once the device has been provisioned - remove the USB and reboot. We should now be greeted with the standard Out of Box Experience, ending with the ability to log in to the tenant we captured the Autopilot configuration from!

[![OOBE](https://i0.wp.com/i.imgur.com/KcMT5OP.gif?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/KcMT5OP.gif?w=1170&#038;ssl=1 "OOBE")

Pretty cool, if I do say so myself.

Using this solution should provide you with a bootable USB that will get you from "out of box" to "ready to enrol" in less than 5 minutes.

As usual, source code for everything demonstrated here is available on [GitHub](https://github.com/tabs-not-spaces/Intune.USB.Creator), the module itself is available on the [PowerShell Gallery](https://www.powershellgallery.com/packages/Intune.USB.Creator) and I am always up for a chat on [Twitter](https://twitter.com/powers_hell).

— Ben
