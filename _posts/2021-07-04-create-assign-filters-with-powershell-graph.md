---
layout: post
title: Create & assign filters with PowerShell & Graph
titlecolor: yellow
date: 2021-07-04 12:17 +1000
id: 026
author: Ben
views: 0
image: /assets/images/2021/07/image2.gif
categories:
    - PowerShell
    - Automation
    - Graph
    - Intune
tags:
    - PowerShell
    - Automation
    - Graph
    - Intune
---

As I've said before, working with dynamic groups in Intune [isn't my favourite thing]({% post_url 2021-06-16-create-advanced-dynamic-groups-with-powershell-azure-functions %}).

Luckily, Microsoft has been listening and have provided us with a better way to dynamically apply policies to devices with [filters!](https://docs.microsoft.com/en-us/mem/intune/fundamentals/filters)

<!--more-->

I recently sat down with [Scott Duffey](https://twitter.com/scottduf) (who brought us this amazing new feature) to dive into how filters work and how they can improve our endpoint management workflows.

<div class="video-container">
<iframe width="560" height="315" src="https://www.youtube.com/embed/_UuMfbvY8hw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media;" allowfullscreen></iframe>
</div>

As is always the case, after finishing our chat, I immediately wanted to figure out how to work with Filters in a more programmatic way. Turns out, it was super easy!

## Overview

At a high level, what makes filters so much better for use in Intune comes down to two primary factors.

1. The filter evaluation is done when the device enrolls, checks in with the Intune service or basically any time a policy is evaluated - which means the speed of evaluation is *significantly* faster than that of dynamic groups.
2. Filters are decoupled from groups, which means they are now **reusable**. This means we can now create **one** filter and use it for **many** policies!

So let's get started and create our first filter.

## Create a filter

##### Authenticate

As we are using PowerShell & Graph, we will need to authenticate.

Using the MSAL.PS module makes this easy.

```PowerShell
$authParams = @{
    ClientId    = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    TenantId    = 'powers-hell.com'
    DeviceCode  = $true
}
$authToken = Get-MsalToken @authParams
```

##### Build and post

Now we need to build out a new filter object to post to Graph. This is just a simple json object that we will publish to the **assignedFilters** endpoint.

For this example we want a filter that finds all corporate owned virtual machines.

```PowerShell
$filter = @{
    displayName = 'Example Filter'
    description = 'This filter will select all virtual machines'
    platform    = 'Windows10AndLater'
    rule        = '(device.deviceOwnership -eq "Corporate") and (device.model -startsWith "Virtual Machine")'
} | ConvertTo-Json -Depth 10
```
As you can see from above, the actual request body is quite simple. The actual filter rule uses the same syntax and formatting as dynamic rules, so the learning curve is quite low.

Now lets post our filter to graph.

```PowerShell
$baseGraphUri = 'https://graph.microsoft.com/beta/deviceManagement/assignmentFilters'
$graphParams = @{
    Method          = 'Post'
    Uri             = $baseGraphUri
    Authentication  = 'OAuth'
    Token           = $authToken.AccessToken | ConvertTo-SecureString -AsPlainText -Force
    ContentType     = 'Application/Json'
    Body            = $filter
}
Invoke-RestMethod @graphParams
```

If successful, we should see the results of the post sent back to us. Make note of the returned id, and let's move on!

[![Successful filter post](/assets/images/2021/07/image1.gif)](/assets/images/2021/07/image1.gif "Successful filter post")

## Assign a filter

Now that we've got our filter created, let's assign it to a policy. In this example, I've got an application I want to deploy (as required) to all of my virtual machines. To make sure I capture all possible virtual machines, I'll assign the application to **all devices** and then filter down to the virtual machines using the filter object we've already created.

The first most obvious thing we need to do is know what the id of the policy is that we want. The easiest way to get that is to simply go to the policy in the endpoint portal.

Once you've got both the policy id and the filter id (from the creation steps above) , all that we need to do is build another post request to graph.

First, let's build the body of the post.

```PowerShell
$filterId = '2727f0f4-d030-4792-8aba-b6ef5efe602d' #your filter id
$assignments = @{
    mobileAppAssignments = @(
        @{
            '@odata.type' = '#microsoft.graph.mobileAppAssignment'
            intent        = 'Required'
            target        = @{
                '@odata.type'                              = '#microsoft.graph.allDevicesAssignmentTarget'
                deviceAndAppManagementAssignmentFilterId   = $filterId
                deviceAndAppManagementAssignmentFilterType = 'include'
            }
        }
    )
} | ConvertTo-Json -Depth 10
```

This is a *little* more complicated that the previous request we built, but only because we are dealing with nested objects. Simply speaking, all we are doing is creting a new **required** assignment pointing at the **microsoft.graph.allDevicesAssignmentTarget** object, and **including** our filter as part of the assignment.

If you were to replicate this experience, but use your own security groups, you'd simply change the target **odata.type** to `microsoft.graph.groupAssignmentTarget` and add a **groupId** property underneath it, as shown below.

```PowerShell
$filterId = '2727f0f4-d030-4792-8aba-b6ef5efe602d' #your filter id
$groupId = 'da630732-10ac-47ae-94f9-2e5b9042109c' #your group id
$assignments = @{
    mobileAppAssignments = @(
        @{
            '@odata.type' = '#microsoft.graph.mobileAppAssignment'
            intent        = 'Required'
            target        = @{
                '@odata.type'                              = '#microsoft.graph.groupAssignmentTarget',
                groupId                                    = $groupId,
                deviceAndAppManagementAssignmentFilterId   = $filterId
                deviceAndAppManagementAssignmentFilterType = 'include'
            }
        }
    )
} | ConvertTo-Json -Depth 10
```

Similarly, if you wanted to **exclude** the objects captured in the filter group, change the **deviceAndAppManagementAssignmentFilterType** property to **exclude** - amazing, isn't it!

Now that we have our request body formed, let's post it to our policy.

```PowerShell
$policyId = '149bf3d2-56cf-4cda-a3ea-79b6adb1c638' #your application policy id
$baseGraphUri = 'https://graph.microsoft.com/beta/deviceAppManagement/mobileApps/{0}/assign' -f $policyId
$graphParams = @{
    Method         = 'Post'
    Uri            = $baseGraphUri
    Authentication = 'OAuth'
    Token          = $authToken.AccessToken | ConvertTo-SecureString -AsPlainText -Force
    ContentType    = 'Application/Json'
    Body           = $assignments
}
Invoke-RestMethod @graphParams
```

Post requests to the assign endpoint don't return anything back to us, but as long as we don't get any errors, we should be good to go.

[![Successful assignment](/assets/images/2021/07/image2.gif)](/assets/images/2021/07/image2.gif "Successful assignment")

How simple is that!

Now, thanks to filters, you can start scoping policies and applications to larger groups, and use filters to tighten up the scope in a simple reusable fashion.

— Ben
