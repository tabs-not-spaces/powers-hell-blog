---
layout: post
title: Authenticating to Microsoft Graph with PowerShell - (2021)
titlecolor: pink
date: 2021-07-18 05:37 +0000
id: 027
author: Ben
views: 0
image: /assets/images/2021/07/msal-authentication-2021.gif
categories:
    - PowerShell
    - Graph
    - ADAL IS DEAD
    - Authentication
tags:
    - PowerShell
    - Graph
    - ADAL IS DEAD
    - Authentication
---

Talking about ways to authenticate to Graph is one of my least favourite subjects. After a while it gets a bit monotonous, but as with all technologies, things change.. 

<!--more-->

So I've decided to try something out - once a year, I'm going to write a revised guide to the BEST ways to authenticate using PowerShell (in my opinion) and make mention of any new notable advances within the space (if there are any!).

Alright, with the intro out of the way, let's dive in.

## Quick Primer

[Microsoft Graph](https://docs.microsoft.com/en-us/graph/overview), for those living under a rock, is the underlying API that unifys Microsoft 365, Windows 10 & Enterprise Mobility + Security, so that all we need to learn is a **single REST API** to give us programmatic access to read and interact with the data within those product ecosystems.

To work with Graph, the first and foremost thing we need to do is authenticate into the service. Using PowerShell makes this SIMPLE.

## How do I authenticate?

Authentication is surprisingly easy, once you understand the underlying concepts.

At a high level, all we are doing is providing some form of proof that we are allowed access to the Graph data in our Azure tenant. We do this using an authentication technology called [OAuth 2.0](https://oauth.net/2/). There are two primary methods of authentication:

- Interactive, or delegated authentication. This allows us to authenticate to Graph utilizing our Azure AD account / password. This generally assumes an interactive experience, meaning you are probably running a script locally, or using a tool on your computer.
- Programmatic, or application authentication. This allows us to authenticate to Graph utilizing the credentials of an application registered in AAD. This allows us to securely authenticate to Graph without requiring user interaction, is not tied to a specific user account and access is controlled via the app registrations portal of AAD.

Regardless of what method you choose to authenticate to Graph, the process is essentially the same and can actually be done very quickly / simply by just correctly forming and sending a HTTP request to the OAuth endpoint. [I've discussed this previously]({% post_url 2018-08-17-authenticate-to-microsoft-graph-in-powershell-in-two-lines-of-code %}), and not much has changed since that article. Below shows how to authenticate both Interactively & Programmatically using nothing but PowerShell.

### Interactive authentication

```PowerShell
$tenantId = 'powers-hell.com'
$requestBody = @{
    resource   = 'https://graph.microsoft.com'
    client_id  = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    grant_type = "password"
    username   = 'ben@powers-hell.com'
    scope      = "openid"
    password   = 'MySuperSecetPassword'
}
$auth = Invoke-RestMethod -Method post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/token" -Body $requestBody
$auth
```

### Programmatic authentication
```PowerShell
$tenantId = 'powers-hell.com'
$reqestBody = @{
    resource      = 'https://graph.microsoft.com'
    client_id     = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    client_secret = $client_secret
    grant_type    = "client_credentials"
    scope         = "openid"
}
$auth = Invoke-RestMethod -Method post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/token" -Body $requestBody
$auth
```

As you should be able to tell from both of those examples, they are almost identical, the only difference is the **grant_type** property, which simple tells the OAuth endpoint what to do with the credential payload we are sending along.

Both of these examples are very simple, but will work for most scenarios - with the key caveat being that you will not be able to handle MFA if your AAD tenant is configured to require it (for interactive authentication only.)

The good news is we can leverage existing authentication libraries provided by Microsoft to overcome these problems, as well as improving error handling and allowing for future changes to the authentication process.

## MSAL? ADAL? What are these acronyms and what do I do with them?

While we can manually build our authentication requests and send them to the OAuth endpoint, we should probably leverage the libraries created by Microsoft to make this experiences more reliable and easier.

To that end, Microsoft has built two authentication libraries over the years, the Active Directory Authentication Library (ADAL) and the Microsoft Authentication Library (MSAL).

<span class="drac-text-yellow-pink drac-text-bold drac-text-lg">
!! DO NOT USE ADAL FOR AUTHENTICATION !!
</span>

If the only thing you take away from the article is the following line, then I feel I have done my job. Microsoft has announced [**end of support timelines** for ADAL](https://techcommunity.microsoft.com/t5/azure-active-directory-identity/update-your-applications-to-use-microsoft-authentication-library/ba-p/1257363), and no further feature development will take place on the library.

Now that we have that out of the way, what does that mean? It means all we need to talk about is MSAL!

## Authenticating with MSAL.PS

By and far the EASIEST way to implement Graph authentication in your PowerShell solution is to leverage the excellent Module [**MSAL.PS**](https://www.powershellgallery.com/packages/MSAL.PS/). [I've already spoken about how to use this module]({% post_url 2020-06-28-managing-intune-with-graph-powershell-7-msal %}), but to keep everything central, let's go through it now.

First, let's install the module

```PowerShell
Install-Module MSAL.PS
```

Now let's authenticate.

### Interactive authentication

Assuming your AAD application has been setup correctly to work with MSAL (at minimum just make sure there's a reply URL set to **http://localhost**) then we can use this code.

```PowerShell
$authParams = @{
    ClientId    = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    TenantId    = 'power-hell.com'
    Interactive = $true
}
$auth = Get-MsalToken @authParams
$auth
```

If it hasn't - or you down own the AAD application and just need to use it interactively (specifically in PowerShell 7), then utilizing the DeviceCode auth flow will be required.

```PowerShell
$authParams = @{
    ClientId    = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    TenantId    = 'powers-hell.com'
    DeviceCode  = $true
}
$auth = Get-MsalToken @authParams
$auth
```

### Programmatic authentication

This one is simple!

```PowerShell
$authparams = @{
    ClientId     = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    TenantId     = 'powers-hell.com'
    ClientSecret = ('MySuperSecretClientSecret' | ConvertTo-SecureString -AsPlainText -Force)
}
$auth = Get-MsalToken @authParams
$auth
```

As is hopefully evident, the only tricky thing to remember here is you need to convert your client secret to a secure string type before sending it to the command.

## Ok I've got my auth token. Now what?

As you can see, there are many ways to authenticate to Graph. But if you don't use it, why did we even bother?

The most important thing to understand is that within the returned authentication object in **any** of the above examples will be the **access token**. With that, we need to build an *Authorization* object to send along with all of our call to Graph. Luckily, this is super easy!

Below is a few examples of how to generate the authorization object to pull back a list of users from Graph.

### Without libraries (AKA the Manual way)

##### PowerShell 5 & 7

```PowerShell
$authorizationHeader = @{
    Authorization = "Bearer $($auth.access_token)"
}
$requestBody = @{
    Method      = 'Get'
    Uri         = 'https://graph.microsoft.com/v1.0/users'
    Headers     = $authorizationHeader
    ContentType = 'Application/Json'
}
$response = Invoke-RestMethod @requestBody
$response
```

##### PowerShell 7 ONLY (AKA the new method)

This method is relatively new & only works in PowerShell 7. Instead of creating the authorization header manually, we can get the Invoke-RestMethod to build it for us!

```PowerShell
$requestBody = @{
    Method          = 'Get'
    Uri             = 'https://graph.microsoft.com/v1.0/users'
    Authentication  = 'OAuth'
    Token           = ($auth.access_token | ConvertTo-SecureString -AsPlainText -Force)
    ContentType     = 'Application/Json'
}
$response = Invoke-RestMethod @requestBody
$response
```

As you can see, this is a bit cleaner - all we need to do is define that the token was derived from an OAuth request, and then convert the access token to a secure string.

### With MSAL

##### PowerShell 5 & 7

The MSAL.PS module exposes some of the methods within the libraries to help us build the authorization header - if you find typing things difficult..

```PowerShell
$authorizationHeader = @{
    Authorization = $auth.CreateAuthorizationHeader()
}
$requestBody = @{
    Method      = 'Get'
    Uri         = 'https://graph.microsoft.com/v1.0/users'
    Headers     = $authorizationHeader
    ContentType = 'Application/Json'
}
$response = Invoke-RestMethod @requestBody
$response
```

##### PowerShell 7 ONLY (AKA the new method)

And finally, for completeness, we can use the new Invoke-RestMethod parameters with MSAL to really show off. The only thing to note of difference here is that the *access token* property returned from the MSAL call is named **AccessToken** compared to the native HTTP request which is **Access_Token**

```PowerShell
$requestBody = @{
    Method          = 'Get'
    Uri             = 'https://graph.microsoft.com/v1.0/users'
    Authentication  = 'OAuth'
    Token           = ($auth.AccessToken | ConvertTo-SecureString -AsPlainText -Force)
    ContentType     = 'Application/Json'
}
$response = Invoke-RestMethod @requestBody
$response
```

And there it is - Authentication to Graph with PowerShell in 2021. If you learned anything from this article, please feel free to share it and let me know via [twitter](https://twitter.com/powers_hell).

Hopefully that's the last time I need to speak about authentication for another year!

— Ben
