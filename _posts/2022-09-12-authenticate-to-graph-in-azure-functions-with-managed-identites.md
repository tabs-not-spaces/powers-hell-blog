---
layout: post
title: Authenticate to Graph in Azure Functions with Managed Identites (Part 1)
titlecolor: orange
date: 2022-09-12 02:32 +0000
id: 032
author: Ben
views: 0
image: /assets/images/2022/09/setRoles.gif
categories:
- PowerShell
- Azure Functions
- Graph
- Authentication

tags:
- PowerShell
- Azure Functions
- Graph
- Authentication
---

When creating Azure Functions, there has always been a way to create and use "managed identities" to securely and simply access resources within the resource group that the function app resides. 

With a little bit of PowerShell and a basic understanding of how API permissions are programmatically applied, we can use the managed identity to access Graph without needing to store credentials anywhere! Secure AND cool, right? 

<!--more-->

In part 1 of a 2 part series, first, let's spend some time understanding how to assign the Graph permissions to a managed identity.

I was lucky enough to be accepted to speak at the recent [PSConf.EU](https://psconf.eu/) 2022 conference in Austria, where I got to hang out with 350 of the most PowerShell obsessed people on the planet. It's always been a highlight of my year to attend PSConf and this year was no different.

While there I presented two talks - one on how [PowerShell & "Code Reuse" can optimise and elevate your career](https://www.youtube.com/watch?v=PkqLLW7DCMM), and the other - which is of relevance to this article, was how to leverage PowerShell & Azure Functions to build better dynamic groups in AAD.

<div class="video-container">
<iframe width="560" height="315" src="https://www.youtube.com/embed/n3jjq68leKs" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media;" allowfullscreen></iframe>
</div>

One of the cool things that I ran into while writing the demos for this session was that I could leverage the **Managed Identity** authentication that is "automagically" configured for me to handle the authentication / authorization duties that are required for any calls to Graph.

## So, what is a managed identity?

The simplest way to understand what a managed identity is is to think of it as a service account / service principal, but one that you NEVER need to know what the credentials are and will exist in your Azure tenant as long as the resource that generated the identity exists. For a deeper understanding of this - [read the official documentation!](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/how-managed-identities-work-vm)

Makes sense? Let's make one then!

## Create the Function app & managed identity

I've already discussed fairly at length how to create an Azure Function, so I wont discuss it further, but for now, if you haven't created a function app to play with, go do that first and then come back - I'll wait right here..

Back? Cool, let's continue!

Hop into the Azure Function app and select the **Identity** link in the side menu.

[![Managed Identities](/assets/images/2022/09/managed-identities.png)](/assets/images/2022/09/managed-identities.png "Managed Identities")

We are just going to focus on creating **system assigned** identities today, so just switch the feature **ON**, save the changes and accept the prompt that appears.

After a few minutes we should have the identity created and available for us!

Make a note of the name of the Function app name and the Managed Identity Id - we will need those for later.

[![Managed Identities](/assets/images/2022/09/managed-identities2.png)](/assets/images/2022/09/managed-identities2.png "Managed Identities")

## Apply the Graph API roles to the managed identity

Let's go and look at the managed identity. First head over to AAD > Enterprise Applications. Change the **Application type** filter to **Managed Identities** and search for the identity via the name OR the Id. Once you've found the identity, open it up and head to **Permissions**.

Here we should see the first wrinkle - currently there is no way to manage assigned API permissions of an enterprise application - so if we can't do it from the UI, then let's open up PowerShell to solve the problem!

This is where I had hoped I could stop my research into this - surely a problem as basic as this has already been solved?! Well, as it turns out, the answer to that is... "kind of".

I found dozens of blog posts ([here's one that showed real promise...](https://baswijdenes.com/how-to-use-managed-identities-with-microsoft-graph-api/)) and solutions that have been written that leverage Microsoft's old Azure PowerShell modules, but with the release of the new Az modules, none of these solutions work and even more frustatingly, the solutions written for the old modules do NOT migrate across - which leaves us stuck.

Thankfully, once I realized what was required - It became easier to focus my search and I [found into a blog post](https://gotoguy.blog/2022/03/15/add-graph-application-permissions-to-managed-identity-using-graph-explorer/) written by [Jan Vidar Elven](https://twitter.com/JanVidarElven) that shows the native Graph calls required to interact with the managed identity AND how to manage the API permissions of the enterprise application!

So let's use with Jan has figured out to write a solution to add Graph roles to our identity!

#### Authentication

First let's authenticate - to make this easy, let's just use the Az.Accounts module so that we can have the correct scope and permissions to do the work we need to do.

```PowerShell
Connect-AzAccount
$token = (Get-AzAccessToken -ResourceUrl "https://graph.microsoft.com").Token
```

Nice and simple - we just use our authenticated identity to Azure to generate an auth token scoped to Graph - which will let us make the Graph calls we will need to make.

#### Grab the identity objects

Next, let's get all of the identities we need..

```PowerShell
$baseUri = 'https://graph.microsoft.com/v1.0/servicePrincipals'
$graphAppId = '00000003-0000-0000-c000-000000000000'
$spSearchFiler = '"displayName:{0}" OR "appId:{1}"' -f $ApplicationName, $graphAppId
$msiParams = @{
    Method  = 'Get'
    Uri     = '{0}?$search={1}' -f $baseUri, $spSearchFiler
    Headers = @{Authorization = "Bearer $Token"; ConsistencyLevel = "eventual" }
}
$spList = (Invoke-RestMethod @msiParams).Value
$msiId = ($spList | Where-Object { $_.displayName -eq $applicationName }).Id
$graphId = ($spList | Where-Object { $_.appId -eq $graphAppId }).Id
```

This here is kind of cool - first we are grabbing a list of all service principal identities in our tenant - nothing super complicated. Then we cherry pick out the Managed Identity that we want as well as the unique Graph identity that exists in our tenant!

#### Get the role objects from Graph

Now that we have the identities we need, let's prepare the roles / permissions. For this example, lets use a few common API permissions that people need..

```PowerShell
$roles = @(
    "DeviceManagementApps.ReadWrite.All"
    "DeviceManagementConfiguration.Read.All"
    "DeviceManagementManagedDevices.Read.All"
    "GroupMember.Read.All"
)
@graphRoleParams = @{
    Method  = 'Get'
    Uri     = "$baseUri/$($GraphId)/appRoles"
    Headers = @{Authorization = "Bearer $Token"; ConsistencyLevel = "eventual" }
}
$graphRoles = (Invoke-RestMethod @graphRoleParams).Value | 
        Where-Object {$_.value -in $GraphApiRole -and $_.allowedMemberTypes -Contains "Application"} |
        Select-Object allowedMemberTypes, id, value
```
If we expand out the results of `$graphRoles` we can see all of the data we get back from the Graph application for each role - specifically all we really need is the Id of the role.

[![List of the app roles!](/assets/images/2022/09/approles.png)](/assets/images/2022/09/approles.png "List of the app roles!")

#### Apply the roles to the Managed Identity

Finally once we have the role info, we need to build out a request to attach each role to the Managed Identity.

```PowerShell
$baseUri = 'https://graph.microsoft.com/v1.0/servicePrincipals'
foreach ($role in $graphRoles) {
    $postBody = @{
        "principalId" = $msiId
        "resourceId"  = $graphId
        "appRoleId"   = $role.Id
    }
    $restParams = @{
        Method      = "Post"
        Uri         = "$baseUri/$($graphId/appRoleAssignedTo"
        Body        = $postBody | ConvertTo-Json
        Headers     = @{Authorization = "Bearer $token" }
        ContentType = 'Application/Json'
    }
    $roleRequest = Invoke-RestMethod @restParams
    $roleRequest
}
```

Now if we go back to the Managed Identity in our AAD portal, we should see the permissions shown!

[![Assigned Roles in Portal](/assets/images/2022/09/assignedRoles.png)](/assets/images/2022/09/assignedRoles.png "Assigned Roles in Portal")

We can also validate this using PowerShell...

```PowerShell
$header = @{Authorization = "Bearer $token" }
$roles = irm -Method get -Uri "$baseUri/$msiId/appRoleAssignments" -Headers $header
```

#### Put it all together!

Now that we know the basic code to get all of this working, with a little bit of error handling, we should be able to build out a neat little function to help us with this work in the future!

```PowerShell
function Add-GraphApiRoleToMSI {
    [cmdletbinding()]
    param (
        [parameter(Mandatory = $true)]
        [string]$ApplicationName,

        [parameter(Mandatory = $true)]
        [string[]]$GraphApiRole,

        [parameter(mandatory = $true)]
        [string]$Token
    )

    $baseUri = 'https://graph.microsoft.com/v1.0/servicePrincipals'
    $graphAppId = '00000003-0000-0000-c000-000000000000'
    $spSearchFiler = '"displayName:{0}" OR "appId:{1}"' -f $ApplicationName, $graphAppId

    try {
        $msiParams = @{
            Method  = 'Get'
            Uri     = '{0}?$search={1}' -f $baseUri, $spSearchFiler
            Headers = @{Authorization = "Bearer $Token"; ConsistencyLevel = "eventual" }
        }
        $spList = (Invoke-RestMethod @msiParams).Value
        $msiId = ($spList | Where-Object { $_.displayName -eq $applicationName }).Id
        $graphId = ($spList | Where-Object { $_.appId -eq $graphAppId }).Id
        $msiItem = Invoke-RestMethod @msiParams -Uri "$($baseUri)/$($msiId)?`$expand=appRoleAssignments"

        $graphRoles = (Invoke-RestMethod @msiParams -Uri "$baseUri/$($graphId)/appRoles").Value | 
        Where-Object {$_.value -in $GraphApiRole -and $_.allowedMemberTypes -Contains "Application"} |
        Select-Object allowedMemberTypes, id, value
        foreach ($roleItem in $graphRoles) {
            if ($roleItem.id -notIn $msiItem.appRoleAssignments.appRoleId) {
                Write-Host "Adding role ($($roleItem.value)) to identity: $($applicationName).." -ForegroundColor Green
                $postBody = @{
                    "principalId" = $msiId
                    "resourceId"  = $graphId
                    "appRoleId"   = $roleItem.id
                }
                $postParams = @{
                    Method      = 'Post'
                    Uri         = "$baseUri/$graphId/appRoleAssignedTo"
                    Body        = $postBody | ConvertTo-Json
                    Headers     = $msiParams.Headers
                    ContentType = 'Application/Json'
                }
                $result = Invoke-RestMethod @postParams
                if ( $PSBoundParameters['Verbose'] -or $VerbosePreference -eq 'Continue' ) {
                    $result
                 }
            }
            else {
                Write-Host "role ($($roleItem.value)) already found in $($applicationName).." -ForegroundColor Yellow
            }
        }
        
    }
    catch {
        Write-Warning $_.Exception.Message
    }
}
```

Now whenever you need to add Graph API permissions to a Managed Identity, you just call this function with an auth token, the name of the function app / Managed Identity and a list of permissions you want to apply!

As always, the code for todays post is available on [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/GraphApiToMSI). Stay tuned for the next article where I will show you how to use what we have learned here to leverage Managed Identities to create graph calls in function apps!

[— Ben](https://twitter.com/powers_hell)