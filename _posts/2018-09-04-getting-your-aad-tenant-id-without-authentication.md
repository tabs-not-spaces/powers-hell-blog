---
id: 007
title: Getting your AAD Tenant Id without authentication!
date: 2018-09-04T06:35:23+10:00
excerpt: I've been doing some work with silent configuration of OneDrive & I needed my tenant Id without having to log in to the tenant - can PowerShell help??
author: Ben
layout: post
guid: http://powers-hell.com/?p=133
permalink: /2018/09/04/getting-your-aad-tenant-id-without-authentication/
views:
  - "3055"
image: /assets/images/2018/09/rAjvdrX1.png
categories:
  - PowerShell
tags:
  - AAD
  - Automation
  - Azure
  - PowerShell
---
Another quick post - I've been doing some work with silent configuration of OneDrive and the new **[Known Folder Migration](https://techcommunity.microsoft.com/t5/Microsoft-OneDrive-Blog/Migrate-Your-Files-to-OneDrive-Easily-with-Known-Folder-Move/ba-p/207076)** GPO solution all being deployed via Intune for multiple clients.

<!--more-->

One thing that is required for the KFM solution is the Azure Tenant Id. Being the nerd I am, I wanted to see if I could get the Id without having to log in to the tenant.

After a quick search, I found this [great article](https://blog.tyang.org/2018/01/07/getting-azure-ad-tenant-common-configuration-such-as-tenant-id-using-powershell/) written by [Tao Yang](https://twitter.com/MrTaoYang) which talks about the open REST endpoints that return valuable information on your AAD tenant!

Since Tao posted his findings, Microsoft has [updated the endpoints](https://cloudblogs.microsoft.com/enterprisemobility/2015/03/06/simplifying-our-azure-ad-authentication-flows/) to improve and simplify the authentication flow.

So with the findings of Tao & the updated endpoint info, below is a simple function to retrieve the Azure AD Tenant Id via the client domain!

```PowerShell
function Get-TenantIdFromDomain {
    param (
        [Parameter(Mandatory = $true)]
        [string]$FQDN
    )
    try {
        $uri = "https://login.microsoftonline.com/$($FQDN)/.well-known/openid-configuration"
        $rest = Invoke-RestMethod -Method Get -UseBasicParsing -Uri $uri
        if ($rest.authorization_endpoint) {
            $result = $(($rest.authorization_endpoint | Select-String '\w{8}-\w{4}-\w{4}-\w{4}-\w{12}').Matches.Value)
            if ([guid]::Parse($result)) {
                return $result.ToString()
            }
            else {
                throw "Tenant ID not found."
            }
        }
        else {
            throw "Tenant ID not found."
        }
    }
    catch {
        Write-Error $_.Exception.Message
    }
}
```

Now, if I run the function against my own Azure Tenant..

<pre class="wp-block-code"><code>Get-TenantIdFromDomain -FQDN "powers-hell.com"</code></pre>

[![Successfully captured GUID](/assets/images/2018/09/rAjvdrX1.png)](/assets/images/2018/09/rAjvdrX1.png "Successfully captured GUID")

There we have it! A very simple way to **programmatically** retrieve the Id of your AAD Tenant. Now that I have this information I can implement it in my OneDrive KFM solution - which of course will be published here once it's done!

As always, code from today's post will be available on my [GitHub](https://github.com/tabs-not-spaces) & I am always keen to discuss anything PowerShell related on [<g class="gr_ gr\_10 gr-alert sel gr\_spell gr\_replaced gr\_inline\_cards gr\_disable\_anim\_appear ContextualSpelling ins-del multiReplace" id="10" data-gr-id="10">Twitter</g>](https://twitter.com/powers_hell).
