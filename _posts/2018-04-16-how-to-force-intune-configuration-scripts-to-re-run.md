---
id: 001
title: How to force Intune configuration scripts to re-run
date: 2018-04-16T02:30:57+10:00
excerpt: With a little PowerShell magic, everything is easy!!!
author: Ben
layout: post
guid: http://powers-hell.azurewebsites.net/?p=58
permalink: /2018/04/16/how-to-force-intune-configuration-scripts-to-re-run/
views:
  - "30869"
categories:
  - Intune
  - PowerShell
tags:
  - Azure
  - Intune
  - PowerShell
  - Sidecar
---
\*\* EDIT \*\*

Due to constant requests, I've updated this solution to use newer authentication methods that allow MFA as well as native support in PowerShell 7.

Please note - the code below is provided as reference material only - authentication is NOT the point of the article and there are countless ways to acquire the correct authentication token.

\***

Hi All and welcome.

As I am about to reach the pointy end of a project to implement an Intune MDM solution for a client, I've taken a moment to take stock of the lessons learned, problems faced and for the most part; the cool things I've run into and decided now is the time to start writing about them! Hopefully you find my posts interesting and I hope to keep the page updated fairly regularly.

Anyway, lets move onto the fun stuff!

<!--more-->

As I mentioned, I've been working on an Intune MDM solution for a client who currently has no other management solutions in place (no SCCM, no mobile device management, nothing, nada, zilch. you get the idea) which was daunting to say the least, but it did give us a great opportunity to provide an entirely cloud-centric management solution (absolutely no on-premise requirements - devices are not domain-joined!).

Because of these design decisions, we have had to be very creative with how we deploy applications & how we can replicate group policy configurations - what that essentially means is that we relied **very heavily** on the <a href="https://docs.microsoft.com/en-us/intune/intune-management-extension" target="_blank" rel="noopener noreferrer">Intune Management Extension</a> - previously known as **sidecar**.

Because Intune _currently_ only allows single file line-of-business applications, for anything more complex than that (read: most legacy LOB applications), handling the installation using PowerShell via the Intune Management Extension is the best solution.

Now, while I am ecstatic that there is a script deployment solution within Intune; there is definitely challenges with the current implementation - case in point, the client reached out to me and asked me a very good question the other day&#8230; "how can we re-run the script if the script returned a successful result, but the expected result of the script was not achieved??"

A quick explanation - The way that the Intune Management Extension handles execution of scripts is that it will attempt to run the script until it successfully completes. If it fails, it will attempt again in an hour (the Intune Management Extension synchronizes to Intune once every hour), however if for any reason you want a script to re-run, the only obvious solution is to delete the configuration item from within the Intune portal, recreate the configuration item and restart the **IntuneManagementExtension** service on the local device (as well as any other device or user that is in the assignment group).

If you are shaking your head and saying "there has to be a better way", then read on for the solution!

The Intune Management Extension stores details of configuration scripts that have executed in a specific registry location: **HKLM:\SOFTWARE\Microsoft\IntuneManagementExtension\Policies**
If you have a look there, you'll see a list of executed items - all with unique GUIDs.

[![Intune Management Extension - policies location](https://i1.wp.com/i.imgur.com/RrX1wcZ.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/RrX1wcZ.png?w=1170&#038;ssl=1 "Intune Management Extension - policies location")

Inside each folder, you will see a breakdown of what is stored locally.

[![Policy results](https://i2.wp.com/i.imgur.com/aEfuv4l.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/aEfuv4l.png?w=1170&#038;ssl=1 "Policy results")

As you can see above, the script has downloaded once, there are no errors, and even cooler - the **ResultDetails** property has the full transcript of the script.

Now, the downside here is that aside from digging into the **ResultDetails** item property, there isn't an easy way to decipher which configuration item you are looking at. If you can figure out how to identify the script from the **ResultDetails** item property, then all that is required to trigger a re-run is to delete that item from the registry and restart the **IntuneManagementExtension** service on the local device.

Now we are getting somewhere.

Because the configuration items are stored in keys named with GUIDs, this should give anyone with experience with Intune or Azure in general, that if we can get a GUID id, then we should be able to extract more data by using the Graph API.

Alright, lets break down the solution.

First up - lets connect to the API&#8230;

In the code below I am using a module written by [Jason Thompson](https://github.com/jasoth) called [MSAL.PS](https://www.powershellgallery.com/packages/MSAL.PS/4.10.0.2) to allow easy authentication to the Graph API using the new **MSAL** authentication libraries.

```PowerShell
if (!(Get-Module -Name MSAL.PS -ListAvailable -ErrorAction SilentlyContinue)) {
    Install-Module -Name MSAL.PS -Scope CurrentUser -Force
}
$clientId = "d1ddf0e4-d672-4dae-b554-9d5bdfd93547" # well known Intune application Id
$auth = Get-MsalToken -ClientId $clientId -deviceCode #deviceCode requires interaction and solves MFA challenges
$token = @{ Authorization = $auth.CreateAuthorizationHeader() }
```

Once we have our authentication token, lets capture some handy information to identify each script stored in the **IntuneManagementExtension** registry hive.

First up, lets get some info about the device.

```PowerShell
$deviceProps = (invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/v1.0/devices?`$filter=DisplayName eq '$env:ComputerName'" -Headers $token).value
```

Next, using the device id captured above, lets grab some info about the registered user of that device.

```PowerShell
$owner = (Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/v1.0/devices/$($deviceProps.id)/registeredOwners" -Headers $token).value
```

and finally, lets capture the script properties from Intune.

```PowerShell
$sidecarScripts = (Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/beta/deviceManagement/deviceManagementScripts" -Headers $token).value
```

Here's an example of the data returned from the above API call.

[![Intune device management script member types](https://i2.wp.com/i.imgur.com/PfGgps7.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/PfGgps7.png?w=1170&#038;ssl=1 "Intune device management script member types")

Now, using the user id GUID, we simply iterate through each script object stored in Intune, match it up with the policy objects stored locally and present the combined data to the end user.

```PowerShell
$deviceScriptStatus = foreach ($script in $sidecarScripts) {
    $tmpItem = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\IntuneManagementExtension\Policies\$($owner.id)\$($script.id)" -ErrorAction SilentlyContinue
    if ($tmpItem) {
        $tmpObj = [PSCustomObject]@{
            displayName = $script.displayName
            fileName    = $script.fileName
            Result      = $tmpItem.Result
            id          = $script.id
            psPath      = $tmpItem.PSPath
        }
        $tmpObj
    }
}
$intuneScriptToRerun = $deviceScriptStatus | Select-Object displayName,fileName,Result,id | Out-GridView -Title "Intune Script Configuration" -PassThru
```

Here's the example result of the above snippet - an interactive out-gridview datatable that will pass back any selected objects to the powershell window.

[![outgrid results](https://i1.wp.com/i.imgur.com/YKLP9Wf.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/YKLP9Wf.png?w=1170&#038;ssl=1 "outgrid results")

So, for this example, I want to re-run the "ConfigureScheduledTask.ps1" script, so we select that row, hit OK on the Out-GridView to send that object back to the script, and using that object, we simply force a removal of that registry key and restart the **IntuneManagementExtension** service to trigger the script to re-run.

```PowerShell
foreach ($item in $intuneScriptToRerun){
    $itemPath = ($deviceScriptStatus | Where-Object {$_.displayName -eq $item.displayName}).psPath
    Remove-Item $itemPath -Force
}
Get-Service -Name IntuneManagementExtension | Restart-Service
```

You will find that the script / policy will re-run almost immediately once the registry key has been removed. This will save you countless hours over the course of setting up your sidecar scripts - something I wish I had worked out at the start of the project and not the end!!

Well that wraps up my first post - I will have the full solution available on my [GitHub account](https://github.com/tabs-not-spaces/CodeDump/tree/master/Reset-SidecarScript), so please have a look, have a play, and if you use the example, or improve the solution, please feel free to let me know below in the comments or on my twitter <a href="https://twitter.com/powers_hell" target="_blank" rel="noopener noreferrer">@powers_hell</a>.

Enjoy,
Ben
