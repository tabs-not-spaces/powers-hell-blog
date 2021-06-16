---
id: 004
title: 'Monitor changes to Intune using Azure Functions, GraphAPI &#038; PowerShell'
date: 2018-05-17T11:14:46+10:00
excerpt: 'In my last post, I showed you how to move a very common task – authenticating into the GraphAPI, up into an Azure Function App'
author: Ben
layout: post
guid: http://powers-hell.com/?p=112
permalink: /2018/05/17/monitor-changes-to-intune-using-azure-functions-graphapi-powershell/
views:
  - "3311"
categories:
  - Intune
  - PowerShell
tags:
  - Azure
  - GraphAPI
  - Intune
  - Microsoft
  - PowerShell
---
<a href="http://powers-hell.com/working-with-graphapi-powerbi-the-easy-way/" rel="noopener" target="_blank">In my last post</a>, I showed you how to move a very common task - authenticating into the GraphAPI, up into an Azure Function App.

Now that our authentication function has been turned into a REST Endpoint, we can stop focusing on _how_ we get authenticated and start doing some really interesting stuff inside the environment. Case in point, myself and a colleague <a href="https://twitter.com/onpremcloudguy" rel="noopener" target="_blank">@OnPremCloudGuy</a> were wondering if we could create a solution to monitor the Intune configuration of a tenant for any changes that might get made without our approval. After a bit of digging around the GraphAPI documentation, and a few beers later, we had a very rough proof of concept to show that, indeed you can indeed report on changes in Intune!

The basic requirements of the solution involve 3 things:

* A way to capture the existing configuration
* Somewhere to store that configuration
* And finally, a way to compare that configuration against the current Intune configuration

We can achieve all three of these requirements with a single Azure Function App, so let's jump right in and configure everything.

First, let's create the Function App - give it a cool name, stick it in a resource group, and make note of the storage account used (new or existing doesn't matter - we just need to know where everything is stored).

[![Function App](https://i2.wp.com/i.imgur.com/n0hvpGt.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/n0hvpGt.png?w=1170&#038;ssl=1 "Function App")

Once your new Function App is created, we will now set up a container to store the configuration snapshots.

Remember the storage account name? Let's go into the storage accounts blade and select that account, and head into the containers blade.

[![Containers](https://i2.wp.com/i.imgur.com/chCbFWu.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/chCbFWu.png?w=1170&#038;ssl=1 "Containers")

You won't see much here - just a single container housing your Function App. Let's create a new container - I'll call mine **intunesnapshots**. Keep the public access level at private.

[![New containers](https://i0.wp.com/i.imgur.com/k4N1GYm.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/k4N1GYm.png?w=1170&#038;ssl=1 "New containers")

Go into the properties of your freshly made container and make a note of the URL - you'll need this later.

While we are in the storage account, lets also create a **Shared Access Signature** so that we can access the snapshots without too much effort - there are better ways to do this and if I wasn't specifically using PowerShell as the language of choice, I'd go into this, but for now, lets just create SAS codes and move on to the cool stuff. Set the expiry time to a few days from now (or years, it's your tenant, just **be aware of the security implications**), generate the SAS codes and again, store it for later.

[![SASSSSSSY](https://i0.wp.com/i.imgur.com/ggkJE4D.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/ggkJE4D.png?w=1170&#038;ssl=1 "SASSSSSSY")

Alright - your storage is set up, access & security is set up to it, now let's set up the functions. Head over to the Function App blade and add a new function to your newly created Function App. Let's start with the snapshot creation endpoint.

As always (or until PowerShell moves out of the experimental phase), set **Experimental Language Support** to **Enabled**, choose **PowerShell** as your language of choice, and create a **HTTP trigger**.

[![Snapshot function](https://i2.wp.com/i.imgur.com/c96Tqph.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/c96Tqph.png?w=1170&#038;ssl=1 "Snapshot function")

As you will come to learn, I am a big fan of moving any user customizable settings/script configuration out of the main code block and into an appConfig.json file. It's a handy way for the end user to be able to modify what the script does without being overwhelmed by a wall of code (and it makes demoing code that might have sensitive data all that easier!), so like in the last post, we are going to add a new file to the function. Your file structure should end up looking like this:

[![appconfig.json](https://i1.wp.com/i.imgur.com/p2pxuy3.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/p2pxuy3.png?w=1170&#038;ssl=1 "appconfig.json")

We aren't going to put much into this config file right now - we just want to move the URL of the GraphAPI Connector that we made in the last post outside of the code so that if we ever want to change it, we know where to do so! The layout of your config should look as follows:

```PowerShell
{
    "BasicConfig":
        {
            "graphConnectorURI" : "https://graphconnectorPOC.azurewebsites.net/api/GraphConnector?code=SuperSecretCode"
        }
}
```

Now we need to add some extra outputs into our function, so head over to the **Integrate** section, hit **New Output** and select **Azure Blob Storage**

[![Azure blob storage](https://i0.wp.com/i.imgur.com/CsFb0Oc.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/CsFb0Oc.png?w=1170&#038;ssl=1 "Azure blob storage")

Set your storage account connection to AzureWebJobsStorage and update your path as shown in the screenshot below (anything in curly braces is a variable placeholder that gets its value from user input - very cool, very handy!).

[![blobby!](https://i1.wp.com/i.imgur.com/GGnDVP4.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/GGnDVP4.png?w=1170&#038;ssl=1 "blobby!")

Back to the main script file **run.ps1**, replace the default "hello world" sample code with the following:

```PowerShell
$requestBody = Get-Content $req -Raw | ConvertFrom-Json
$fp = $EXECUTION_CONTEXT_FUNCTIONDIRECTORY
$config = Get-Content "$fp/appConfig.json" -Raw | ConvertFrom-Json
$graphConnectorURI = $config.basicConfig.graphConnectorURI
$tenant = $requestBody.tenant
$ver = $config.basicConfig.graphVer
$query = "deviceManagement/$($requestBody.query)"
$graphURI = "$($graphConnectorURI)&tenant=$($tenant)&Ver=$($ver)&query=$($query)"

$objResult = Invoke-RestMethod -Method Get -Uri $graphURI
$objResult | ConvertTo-Json -Depth 20 | out-file -Encoding ascii -FilePath $outputBlob

if ($objResult) {
    $result = $true
}
else {
    $result = $false
}
$objReturn = [pscustomobject]@{
    Date = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    Result = $result
}

$objReturn | ConvertTo-Json | out-file -Encoding ascii -FilePath $res
```

A quick breakdown of the code above - we are capturing the tenant details & the final endpoint of the intune graphAPI from end-user input - I'll show how this is done in the next step. Everything else is set up from the appConfig.json file. All we are doing is querying the GraphAPI (using our handy-dandy GraphConnector function), storing the resultant JSON file in our storage account and then sending the requestor a pass/fail object back.

To validate that this function is working how we want it, let's go open the test pane and well&#8230; test it out!

For this demonstration, let's just pull back the list of sidecar scripts in our Intune environment - use a tenant you have configured in your GraphConnector function and the query value as shown below:

```json
{
    "tenant":"contoso.com.au",
    "query": "deviceManagementScripts"
}
```

If all is good, you should receive the following in the output pane:

[![success!](https://i1.wp.com/i.imgur.com/JlQ37z8.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/JlQ37z8.png?w=1170&#038;ssl=1 "success!")

We can now validate that the blob file was created by going to the **intunesnapshots** in the Function App storage account and confirming that the file exists.

[![More success](https://i2.wp.com/i.imgur.com/bFfLI1u.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/bFfLI1u.png?w=1170&#038;ssl=1 "More success")

See how the name has been created using our tenant name & the value of the query we provided in the test? The benefit of this is that we can query multiple tenants and multiple endpoints of the Intune environment and store everything inside the same location.

Alright, now we have our snapshots being created, let's create a CRON Job Function to periodically monitor our Intune environment for any changes.

This time when creating the function, select **Timer Trigger**. Again as always, give the function a cool name, but this time, set up a schedule - for those who know their CRON expressions you won't have any issues here. For those of you that see the sunlight from time to time, here's a <a href="https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer#cron-expressions" rel="noopener" target="_blank">handy guide</a> on how Azure Function Apps expect the format.

In the below screenshot, I've set my schedule to run every hour.

[![CRON Job](https://i2.wp.com/i.imgur.com/Je9zfXN.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/Je9zfXN.png?w=1170&#038;ssl=1 "CRON Job")

As always, create yourself an appConfig.json file. You'll want to get the URL of the container that you stored at the top of this guide and place it at the start of the currentSnapshot property, followed by the SAS code. The graphConnectorURI is the full function URL of the graphConnector function that you created from the last post.

Unlike in the last function, because we are triggering this script on a schedule where there will be no input, we will be placing the tenant details & the query property in here as well - if you want to monitor multiple tenants, it is as simple as duplicating this function and updating the appConfig.json file.

Finally, the graphVer property is there because right now, most of the Intune config data is only accessible via the beta GraphAPI, this will eventually change, so it's best to move this variable outside of the code for easy modification once it becomes GA.

```json
{
    "BasicConfig":
        {
            "tenant" : "contoso.com.au",
            "query" : "deviceManagementScripts",
            "currentSnapshot" : "https://storageaccountURL.blob.core.windows.net/ContainerName/$($tenant)_$($query).json?SuperSecretSASCode",
            "graphConnectorURI" : "https://graphconnectorPOC.azurewebsites.net/api/GraphConnector?code=SuperSecretCode",
            "graphVer": "beta"
        }
}
```

Now in the main script file, again as before, replace the default "hello world" sample code with the following:

```PowerShell
$fp = $EXECUTION_CONTEXT_FUNCTIONDIRECTORY
$config = Get-Content "$fp/appConfig.json" -Raw | ConvertFrom-Json
$tenant = $config.basicConfig.tenant
$query = $config.basicConfig.query
$graphConnectorURI = $config.basicConfig.graphConnectorURI
$graphVer = $config.basicConfig.graphVer
$graphQuery = "deviceManagement/$($query)"
$currentSnapshot = $ExecutionContext.InvokeCommand.ExpandString($config.basicConfig.currentSnapshot)
Function Compare-ObjectProperties {
    # cleaned up from https://blogs.technet.microsoft.com/janesays/2017/04/25/compare-all-properties-of-two-objects-in-windows-powershell/
    Param(
        [PSObject]$ReferenceObject,
        [PSObject]$DifferenceObject
    )
    $objprops = $ReferenceObject | Get-Member -MemberType Property, NoteProperty | ForEach-Object Name
    $objprops += $DifferenceObject | Get-Member -MemberType Property, NoteProperty | ForEach-Object Name
    $objprops = $objprops | Sort-Object | Select-Object -Unique
    $diffs = @()
    foreach ($objprop in $objprops) {
        $diff = Compare-Object $ReferenceObject $DifferenceObject -Property $objprop
        if ($diff) {
            $diffprops = @{
                PropertyName = $objprop
                RefValue     = ($diff | Where-Object {$_.SideIndicator -eq '<='} | ForEach-Object $($objprop))
                DiffValue    = ($diff | Where-Object {$_.SideIndicator -eq '=>'} | ForEach-Object $($objprop))
            }
            $diffs += New-Object PSObject -Property $diffprops
        }
    }
    if ($diffs) {return ($diffs | Select-Object PropertyName, RefValue, DiffValue)}
}

$intuneSnapshot = Invoke-RestMethod -Uri $currentSnapshot

$graphURI = "$($graphConnectorURI)&tenant=$($tenant)&Ver=$($graphVer)&query=$($graphQuery)"
$latestCapture = Invoke-RestMethod -Method Get -Uri $graphURI
$results = @()
for ($i = 0; $i -le ($intuneSnapshot.count - 1) ; $i ++) {
    $tmpCompare = Compare-ObjectProperties -ReferenceObject $intuneSnapshot[$i] -DifferenceObject $latestCapture[$i]
    if ($tmpCompare) {
        $tmpobject = [psCustomObject]@{
            TimeStamp         = Get-date -Format "yyyy-MM-ddTHH:mm:ss"
            Tenant            = $tenant
            ChangesFound      = $true
            SnapshotObject    = $intuneSnapshot[$i]
            ModifiedObject    = $latestCapture[$i]
            ChangedProperties = $tmpCompare
        }
        $results += $tmpobject
    }
}
if ($results) {
    return $results | ConvertTo-Json | out-file -encoding ascii -FilePath $res
}
else {
    $tmpObject = [psCustomObject]@{
        TimeStamp        = Get-date -Format "yyyy-MM-ddTHH:mm:ss"
        Tenant           = $tenant
        ChangesFound     = $false
    }
    return $tmpObject | ConvertTo-Json | out-file -encoding ascii -FilePath $res
}
```

Code above, again is fairly simple - the heavy lifting is done by the **Compare-ObjectProperties** function that appears on Jamie Nelson's TechNet article (<a href="https://blogs.technet.microsoft.com/janesays/2017/04/25/compare-all-properties-of-two-objects-in-windows-powershell/" rel="noopener" target="_blank">found here</a>). What we are doing is simply loading up the snapshot JSON object, capturing a new copy of the intune config and comparing each property and its value. If there are any changes, they are noted and reported back to the requestor. If there are no changes found, that is also noted and sent back.

Alright, so let's see this in action! Before we make any changes, let's just make sure that when we trigger this new function that it confirms there are no changes. Run the code and you should receive the output as shown below.

[![Success - nothing changed](https://i2.wp.com/i.imgur.com/EP0Rhn8.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/EP0Rhn8.png?w=1170&#038;ssl=1 "Success - nothing changed")

ChangesFound = False.

Perfect - the script has run, compared itself against the snapshot and of course, nothing has changed.

Now, let's break stuff.

I'll go into my Intune environment and change one of our scripts to run as the logged on user instead of the system account (Nothing groundbreaking I know, but if this happened in a production environment, there's a high chance the script would fail).

[![Very scary stuff](https://i0.wp.com/i.imgur.com/Pkfe410.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/Pkfe410.png?w=1170&#038;ssl=1 "Very scary stuff")

Alright, now we could wait an hour to see the function work, but let's rush things along and force the script to run.

For this, I'm going to use PostMan because it handles the large amount of data we will be returning back better than the test pane does in Azure. Remember to grab the function URL from the Function App!

All you'll need to do here is paste the URL into PostMan, set the method to **post** and hit **send**.

[![Changes ahoy](https://i0.wp.com/i.imgur.com/QocK8cb.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/QocK8cb.png?w=1170&#038;ssl=1 "Changes ahoy")

Success!! as you can see, we receive back very detailed information about the original snapshot configuration, what the new configuration looks like as well as an itemized breakdown of each value that changed!

Ahh but Ben, I hear you say, the current way that the monitoring script is configured, the resultant output will not have anywhere to go&#8230; It's on a timer and it is designed to spit the output back to a requestor!

You are correct - but now that we know we can detect changes, lets mull over what we could possibly do now that we have all this power&#8230;

As always, code from this post will be available on my <a href="https://github.com/tabs-not-spaces/CodeDump/tree/master/IntuneMonitoring" rel="noopener" target="_blank">GitHub</a> and I always appreciate feedback, so either leave a comment below or reach me on twitter <a href="https://twitter.com/powers_hell" rel="noopener" target="_blank">@powers_hell</a>

— Ben
