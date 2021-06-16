---
id: 008
title: 'Control advanced power settings with PowerCfg & PowerShell'
date: 2018-12-10T23:37:41+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=140
permalink: /2018/12/10/control-advanced-power-settings-with-powercfg-powershell/
views:
  - "17175"
image: /assets/images/2018/12/Capture.png
categories:
  - Intune
  - PowerShell
tags:
  - Automation
  - Intune
  - PowerShell
---
One of the most common questions I get asked about Intune & Modern Device Management is "Would it be possible to do X with Intune?"

With the native support to deploy and run PowerShell scripts in either user or system contexts, this allows my answer to always be "Yes! We can do anything you want - you just need to decide on how much time you wish to invest in the solution."

Case in point - I was recently asked if it were possible to configure the power settings of a fleet of laptops to change the behaviour of the device when the lid is closed while on power.

<!--more-->

"Sure thing," I said, immediately going to the CSP policies in Intune and began to dig in looking for a native way to configure it. Unfortunately, I had no such luck.

While the native CSP / OMA-URI policies are growing at an exponential rate, there are still lots that can't be done, especially with regards to power configuration of devices.

Right now, the native <a href="https://docs.microsoft.com/en-us/windows/client-management/mdm/policy-csp-power" rel="noopener" target="_blank">CSP policies around power configuration</a> are more focused around restricting what the end-user can configure themselves rather than what we as device admins can configure centrally.

Luckily, there exists (and has for quite some time) a simple way on Windows 10 devices to control all aspects of the power configuration locally - PowerCFG.

First Introduced in 2003, PowerCFG is a command line tool that allows us to control all configurable power system settings, including hardware-specific configurations that are not configurable through the Control Panel, on a per-user basis. (more info <a href="https://en.wikipedia.org/wiki/Powercfg" rel="noopener" target="_blank">here</a> and <a href="https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/hh875530(v=ws.10)" rel="noopener" target="_blank">here</a>)

Using a batch script I found over at the <a href="https://gallery.technet.microsoft.com/scriptcenter/Quickly-change-the-lid-b78eb77d#content" rel="noopener" target="_blank">TechNet Gallery</a> as a template, I quickly created a simple solution to use PowerCFG in PowerShell to achieve our end goal.

The key to working with most command line tools in PowerShell (especially ones where you need to work with the resultant output of the command line tool) is to store the output in a variable for later use in your script.

The original script had a line that attempts to capture the current power policy GUID from an output string and then trimming to store the GUID as a variable.

```bat
echo Getting current scheme GUID
for /f "tokens=* USEBACKQ" %%a in (`powercfg /getactivescheme`) do @set cfg=%%a
set trimcfg=%cfg:~19,36%
```

With PowerShell, we can do one better - let's capture the GUID using a RegEx match statement!

First, let's run the command and have a look at what the output actually is.

[![CMD output](https://i0.wp.com/i.imgur.com/Z5b1cQU.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/Z5b1cQU.png?w=1170&#038;ssl=1 "CMD output")

Fairly straight-forward stuff, because we know that GUIDs are always the same format, the RegEx is fairly simple to generate.

```PowerShell
$activeScheme = cmd /c "powercfg /getactivescheme"
$regEx = '(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}'
$asGuid = [regex]::Match($activeScheme,$regEx).Value
$asGuid
```

Now if we run the command above, we should have a usable GUID&#8230;

[![PowerShell output](https://i0.wp.com/i.imgur.com/6z917vP.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/6z917vP.png?w=1170&#038;ssl=1 "PowerShell output")

The rest of the code is fairly straightforward - find out the GUIDs that associate to the setting you want to configure (<a href="https://docs.microsoft.com/en-us/windows-hardware/customize/power-settings/configure-power-settings" rel="noopener" target="_blank">detailed documentation exists that will provide that for you</a>).

For this example, we just need to know the GUIDs for the "Power Button & Lid Settings" & the "Lid Switch Close Action". Once we have those, we can form the correct command line argument and execute it via our script.

```PowerShell
# grab powercfg guids necessary for lid switch action
# https://docs.microsoft.com/en-us/windows-hardware/customize/power-settings/power-button-and-lid-settings-lid-switch-close-action

#capture the active scheme GUID
$activeScheme = cmd /c "powercfg /getactivescheme"
$regEx = '(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}'
$asGuid = [regex]::Match($activeScheme,$regEx).Value

#relative GUIDs for Lid Close settings
$pwrGuid = '4f971e89-eebd-4455-a8de-9e59040e7347'
$lidClosedGuid = '5ca83367-6e45-459f-a27b-476b1d01c936'

# DC Value // On Battery // 1 = sleep
cmd /c "powercfg /setdcvalueindex $asGuid $pwrGuid $lidClosedGuid 1"
#AC Value // While plugged in // 0 = do nothing
cmd /c "powercfg /setacvalueindex $asGuid $pwrGuid $lidClosedGuid 0"

#apply settings
cmd /c "powercfg /s $asGuid"
```

This is obviously just the start of what you can do with PowerCFG, but hopefully, it shows you how you can use PowerShell & Intune to answer "Yes!" to any question thrown at you.
