---
layout: post
title: Create advanced dynamic groups with PowerShell & Azure Functions
date: 2021-06-15 16:56 +1000
id: 
author: Ben
views: 0
image: 
categories:
    - PowerShell
    - Azure
    - Intune
    - Azure Functions
---

I've never been entirely happy with dynamic groups in Intune. The primary reason for this boils down to two primary issues:

- The time it takes to analyze the dynamic group rules is nowhere near fast enough.
- The available properties available for dynamic group rules is limited to the data available in AAD - not Intune.

<!--more-->

While the first issue has been remediated by the introduction of [filters](https://docs.microsoft.com/en-us/mem/intune/fundamentals/filters), the fact that I can't create a rule on ANY property I want still bugs me.

I recently sat down with my good friend [Steven Hosking](https://twitter.com/OnPremCloudGuy) and discussed ways to create our own dynamic groups using proactive remediation scripts & Power Automate which proved that with a little bit of effort (and deep diving into Graph) you can easily build your own dynamic groups using custom logic. Check out the video below.

<div class="video-container">
    <iframe src="https://www.youtube.com/embed/OLIA5_YW0Pg" title="S02E36 - Building Custom Dynamic Groups with Power Automate - (I.T)" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media;" allowfullscreen></iframe>
</div>

Now that we know how *relatively simple* it is to build out custom dynamic groups with Power Automate, I wanted to spend a little bit of time showing how to achieve something similar with nothing but PowerShell & Azure Functions - so let's get started!

## Overview

Let's check to see if an application is installed on a device. If it is, it will be added to a security group. If it's not, it'll be removed from the group.

The solution we will build has 3 core elements:

- An AAD application configured with **application scoped** api permissions.
- An Azure function app to handle the group membership logic.
- A PowerShell script that will run on the client machines and trigger the function app.

## AAD application

- [Create an AAD application](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app) with the following API permissions:

| API Permission Name | Type |
|---|---|
| Device.Read.All | Application |
| DeviceManagementManagedDevices.Read.All | Application |
| Group.Read.All | Application |
| GroupMember.ReadWrite.All | Application |

- Grant admin consent for the above permissions.
- Generate a **client secret** and store it, along with the **application ID** for furture use.

## Function application

- Create a **consumption** function app (either in the Azure portal, or via VS Code as I've [previously documented](https://powers-hell.com/2019/05/09/build-azure-functions-using-powershell-core-6-vs-code/))
- 

## Client script

