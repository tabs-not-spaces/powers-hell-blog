---
id: 019
title: 'Managing Intune with Graph, PowerShell 7 & MSAL'
date: 2020-06-28T08:39:24+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=361
permalink: /2020/06/28/managing-intune-with-graph-powershell-7-msal/
views:
  - "4395"
categories:
  - Graph
  - Intune
  - PowerShell
tags:
  - Intune
---
So it seems we need to talk about Graph and authentication again..

Recently, Microsoft announced an official ["end of support timeline" for Azure Active Directory Authentication Library (ADAL)](https://techcommunity.microsoft.com/t5/azure-active-directory-identity/update-your-applications-to-use-microsoft-authentication-library/ba-p/1257363) which means, any scripts or automation workflows that you use will need to be migrated over to the newer Microsoft Authentication Libraries (MSAL).

<!--more-->

There are many differences between the two libraries, but the workflows are very similar - a request is sent using the libraries for access to specific areas of Azure and an authentication token is sent back giving you the keys into your Azure tenant.

While the announcement from Microsoft gives us a few years to move on, right now if you have moved your workloads over to PowerShell 7 (which you 100% should be), you may have noticed that working with ADAL is tricky.

Lets have a look at that now - using [Dave's](https://twitter.com/davefalkus) [sample code](https://github.com/microsoftgraph/powershell-intune-samples/blob/master/LOB_Application/Win32_Application_Add.ps1), let's try and authenticate using the "well-known" Intune application in PowerShell 7.

[![failing authentication in pwsh7](/assets/images/2020/06/adalauthPS7.gif)](/assets/images/2020/06/adalauthPS7.gif "failing authentication in pwsh7")

And for reference, the same code in PowerShell 5.1.

[![passing auth in pwsh5.1](/assets/images/2020/06/adalauthPS5.gif)](/assets/images/2020/06/adalauthPS5.gif "passing auth in pwsh5.1")

The primary issue here is that PowerShell 7 just doesn't natively support the old authentication libraries - you can work around it if you have your existing authentication scripts in a module that you import using the `-UseWindowsPowerShell` compatibility flag, but that's not an ideal scenario.

So how do we authenticate successfully in PowerShell 7 then? With MSAL of course!

For simplicities sake, I will not deep dive into manually creating MSAL requests, as luckily there is already a great module available to us on the PowerShell Gallery - [MSAL.PS](https://www.powershellgallery.com/packages/MSAL.PS) (Written by [Jason Thompson](https://github.com/jasoth)). So Let's go ahead and install that on our computer.

```PowerShell
Install-Module MSAL.PS -Scope CurrentUser
```

One of the benefits of MSAL is that it has been designed from the ground up to be completely cross-platform compatible, which means we get a few new ways to authenticate to devices that are "input constrained". This is called "device code flow".

Using the well-known Intune app id, lets try out Device Code Flow.

```PowerShell
Get-MsalToken -ClientId 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547' -TenantId 'powers-hell.com' -DeviceCode
```

[![device code flow](/assets/images/2020/06/msalDeviceCode.gif)](/assets/images/2020/06/msalDeviceCode.gif "device code flow")

This is pretty cool - adding `-DeviceCode` to our command generates a code that we can use on another device to authenticate "on behalf of" the initial requesting device.

But what if we want to keep it "old school" ? Can we just interactively authenticate?

The answer to that is "Yes. But not with the well-known Intune app id.."

Let's try it now..

```PowerShell
Get-MsalToken -ClientId 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547' -TenantId 'powers-hell.com' -DeviceCode
```

[![failing interactive auth](/assets/images/2020/06/msalInteractiveFail.gif)](/assets/images/2020/06/msalInteractiveFail.gif "failing interactive auth")

How annoying! But what does this error mean?

Simply put, the reply URLs in the AAD application we went to try and authenticate are missing the specific reply URL that MSAL needs registered, which is `http://localhost`.

So, what this means, is that until the maintainer of the "PowerShell Intune" application updates the app to include the correct scope, the only way we can use it with MSAL is by following the device code flow.

Until that time, we can create our own AAD application with the same permissions contained within the well-known app and use that instead.

For those interested in this, the permissions required are below.

| **Intune Client Scope:**                                  |
|-----------------------------------------------------------|
| DeviceManagementApps\.ReadWrite\.All                      |
| DeviceManagementConfiguration\.ReadWrite\.All             |
| DeviceManagementManagedDevices\.PrivilegedOperations\.All |
| DeviceManagementManagedDevices\.ReadWrite\.All            |
| DeviceManagementRBAC\.ReadWrite\.All                      |
| DeviceManagementServiceConfig\.ReadWrite\.All             |
| Directory\.Read\.All Group\.Read\.All                     |
| Group\.ReadWrite\.All                                     |

I've already gone ahead and created this in my tenant and will be using it for all of my existing workflows and tools.

So now we have a new AAD application registered with the correct permission scopes AND the correct reply URL, let's see the authentication flow in a simple Graph call.

```PowerShell
[cmdletbinding()]
param (
    [Parameter(Mandatory = $true)]
    [guid]$clientId,

    [Parameter(Mandatory = $true)]
    [string]$tenantId
)
#region Get the auth token and build the auth header
$auth = Get-MsalToken -ClientId $clientId -TenantId $tenantId -Interactive
$authHeader = @{Authorization = $auth.CreateAuthorizationHeader()}
#endregion

#region Build the request and return the ID and Name of all win32 apps
$baseGraphUri = "https://graph.microsoft.com/beta/deviceappmanagement/mobileapps"
$results = (Invoke-RestMethod -Method Get -Uri "$baseGraphUri`?`$filter=isOf('microsoft.graph.win32LobApp')" -Headers $authHeader -ContentType 'Application/Json').value
$results | Select-Object id, displayName
#endregion
```

The code above is a very simple example that grabs the authentication interactively and then queries Intune for any Win32 applications that have been packaged. Let's see it in action..

[![Get Win32 Apps](/assets/images/2020/06/get-win32apps.gif")](/assets/images/2020/06/get-win32apps.gif" "Get Win32 Apps")

Hopefully this has helped you understand the importance of migrating over to MSAL and gives you and idea how to begin migrating your workflows over to this new authentication library!

For more light reading on MSAL and how to plan migrations away from ADAL, check the links below:

* [Update your applications to use Microsoft authentication library](https://techcommunity.microsoft.com/t5/azure-active-directory-identity/update-your-applications-to-use-microsoft-authentication-library/ba-p/1257363)
* [MSAL Overview](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
* [MSAL Migration](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-migration)

As always, code from this blog is available [on my GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Get-Win32AppsUsingMSAL) and I can be reached on [Twitter](https://twitter.com/powers_hell).

— Ben
