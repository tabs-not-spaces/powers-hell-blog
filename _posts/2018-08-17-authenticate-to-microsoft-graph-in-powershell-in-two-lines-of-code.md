---
id: 005
title: Authenticate to Microsoft Graph in PowerShell in two lines of code!
date: 2018-08-17T07:04:29+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=122
permalink: /2018/08/17/authenticate-to-microsoft-graph-in-powershell-in-two-lines-of-code/
views:
  - "3680"
categories:
  - Graph
  - PowerShell
tags:
  - Azure
  - Graph
  - Microsoft
  - OAuth2
  - PowerShell
---
TWO LINES???!!! you bet!!

One of my biggest gripes over the last few years with IT blogs and general talk of working with Azure & PowerShell is how much time is wasted on talking about how to authenticate into Azure\Graph\AAD.

<!--more-->

I'd suggest it is one of the harder hurdles to getting into the modern DevOps way of working. OAuth & OAuth 2 can be a very daunting thing and is not what most people want to learn just to get some company data out of Azure AD!

So today while quickly scaffolding out an Azure Function to handle some end-user calls into Graph, I realized there just \*has\* to be a better way to get authenticated than how I've been doing it in the past. thankfully, there is.

```PowerShell
$body = "resource=*ENDPOINT*&client_id=*APPLICATIONID*&grant_type=password&username=*USERNAME*&scope=openid&password=*PASSWORD*"
$auth = Invoke-RestMethod -Method post -Uri "https://login.microsoftonline.com/Common/oauth2/token" -Body $body
```

All you need to do is replace a few of those placeholders (ResourceURL, ClientID, Username, Password) with your own data and you are on your way. The token you need to do further work will be stored in `$auth.access_token`

I found this handy little solution on an old <a href="https://www.sepago.de/blog/how-to-generate-a-bearer-access-token-for-azure-rest-access-with-username-and-password-only-feasibility-test/" rel="noopener" target="_blank">blog post</a> from <a href="https://twitter.com/MarcelMeurer" rel="noopener" target="_blank">Marcel Meurer</a>.

To understand how this works a little better, I broke everything down and created the Post request in PostMan - to me, this makes a hell of a lot more sense than two busy lines of code.

Below is an example of a request for a Microsoft Graph Token.

[![Postman example](https://i0.wp.com/i.imgur.com/6FYeHig.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/6FYeHig.png?w=1170&#038;ssl=1 "Postman example")

So once I realized the simplicity of the request, I decided to turn the solution into a simple function to create an Authentication Header for use in more advanced solutions.

```PowerShell
function Get-AuthHeader {
    param (
        [Parameter(mandatory = $true)]
        [string]$un,
        [Parameter(mandatory = $true)]
        [string]$pw,
        [Parameter(mandatory = $true)]
        [string]$cid,
        [Parameter(mandatory = $true)]
        [string]$resourceURL
    )
    $body = @{
        resource   = $resourceURL
        client_id  = $cid
        grant_type = "password"
        username   = $un
        scope      = "openid"
        password   = $pw
    }
    $response = Invoke-RestMethod -Method post -Uri "https://login.microsoftonline.com/Common/oauth2/token" -Body $body
    $headers = @{}
    $headers.Add("Authorization", "Bearer " + $response.access_token)
    return $headers
}
```

Now I can use this function in a script to retrieve the details of a user in your organization.

```PowerShell
$authHeader = Get-AuthHeader -un "breader@company.onmicrosoft.com" -pw "password" -cid "1950a258-227b-4e31-a9cf-717495945fc2" -resourceURL "https://graph.microsoft.com/"

$restParams = @{
    Method  = "get"
    Uri     = "https://graph.microsoft.com/v1.0/me"
    Headers = $authHeader
}
Invoke-RestMethod @restParams
```

And the result&#8230;

[![Result of rest call](https://i1.wp.com/i.imgur.com/yucKPNq.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/yucKPNq.png?w=1170&#038;ssl=1 "Result of rest call")

So simple!

The usual caveats apply here - you are storing your passwords in plain-text, so use common-sense if you choose to use this. Realistically, I'd suggest using this during the development stages of a solution.

And to echo Marcel, this works right now - If Microsoft decides to change how they accept OAuth2 requests, this may break without warning, so again - do not rely on this for production solutions without thoroughly testing and understanding the risks involved.

— Ben
