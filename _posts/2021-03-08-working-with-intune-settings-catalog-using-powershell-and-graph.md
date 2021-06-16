---
id: 024
title: Working with Intune Settings Catalog using PowerShell and Graph
date: 2021-03-08T22:46:00+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=514
permalink: /2021/03/08/working-with-intune-settings-catalog-using-powershell-and-graph/
views:
  - "901"
image: /assets/images/2021/03/settingsCatapalooza.gif
categories:
  - Azure
  - Graph
  - Intune
  - PowerShell
tags:
  - Azure
  - Intune
  - PowerShell
---

Microsoft has recently introduced even more ways to create device configuration profiles..

The new profile type, named **Settings Catalog**, allows us to explicitly define and configure a policy that has **only** the settings that they want for that profile, nothing more. Additionally, the existing configuration profiles and ADMX templates have been migrated to the **templates** profile type.

<!--more-->

[![](https://user-images.githubusercontent.com/33951277/119915226-66caae00-bfa5-11eb-8cc5-4eccfce7787e.png)](https://user-images.githubusercontent.com/33951277/119915226-66caae00-bfa5-11eb-8cc5-4eccfce7787e.png "Create a setting profile")

I sat down with [Mike Danoski](https://twitter.com/MikeDanoski) for an in-depth chat about this on the <a href="https://intune.training" data-type="URL" data-id="https://intune.training">Intune.Training</a> Channel (video below).

<div class="video-container">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/sqIKcWXPvyI" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

After spending time with Mike and seeing how settings catalog profiles work from the endpoint portal user interface, I immediately wanted to see what I could do with this new device management framework via graph.

So let's dive in and play!

## **Pulling settings catalog policies from Graph**



First, let's create a policy from the endpoint portal and see what is required to retrieve the policy data.

For this demo, I've created a simple settings catalog with a few settings around bitlocker as shown below.

[![image-1](https://user-images.githubusercontent.com/33951277/119915357-ad200d00-bfa5-11eb-97fc-2cef877def1a.png)](https://user-images.githubusercontent.com/33951277/119915357-ad200d00-bfa5-11eb-97fc-2cef877def1a.png)

The first thing we need to do, as always, is authenticate to graph - At this point I shouldn't need to explain what is happening here. We will use the msal.ps module to make things easier.

<pre class="wp-block-code" title="Configure Authentication for Graph."><code lang="powershell" class="language-powershell">$params = @{
    ClientId = 'd1ddf0e4-d672-4dae-b554-9d5bdfd93547'
    TenantId = 'powers-hell.com'
    DeviceCode = $true
}
$AuthHeader = @{Authorization = (Get-MsalToken @params).CreateAuthorizationHeader()}</code></pre>

Now that we've authenticated to graph, let's use the new graph endpoint **configurationPolicies** to have a look at how this new feature looks in the backend.

<pre class="wp-block-code" title="Get configurationPolicies"><code lang="powershell" class="language-powershell">$baseUri = "https://graph.microsoft.com/beta/deviceManagement"
$restParam = @{
    Method = 'Get'
    Uri = "$baseUri/configurationPolicies"
    Headers = $authHeaders
    ContentType = 'Application/json'
}

$configPolicies = Invoke-RestMethod @restParam
$configPolicies.value</code></pre>

As you can see, the code above is quite simple, and looking at the resultant data shows we get some basic data back showing all available **settings catalog** policies that are in our tenant (in our case just the one).

[![image-2](https://user-images.githubusercontent.com/33951277/119915408-ca54db80-bfa5-11eb-9be7-d9d02f8cd82c.png)](https://user-images.githubusercontent.com/33951277/119915408-ca54db80-bfa5-11eb-9be7-d9d02f8cd82c.png)

Ok, so we've got the basic metadata of our policy - so let's grab the id from the previous call and dive in further..

```PowerShell
$policyId = $configPolicies.value[0].id #grabbing the id from the previous code block
$restParam = @{
    Method = 'Get'
    Uri = "$baseUri/configurationPolicies('$policyId')/settings"
    Headers = $authHeaders
    ContentType = 'Application/json'
}

$configPolicySettings = Invoke-RestMethod @restParam
$configPolicySettings.value
```

The code above returns data on all available settings that we configured in our policy..

[![image-3](https://user-images.githubusercontent.com/33951277/119915446-e5bfe680-bfa5-11eb-95ee-c997cae4af14.png)](https://user-images.githubusercontent.com/33951277/119915446-e5bfe680-bfa5-11eb-95ee-c997cae4af14.png)

if we drill in to one of the **settingInstance** objects, we should see more info..

[![image-4](https://user-images.githubusercontent.com/33951277/119915455-ea849a80-bfa5-11eb-8e0a-e3b960be372e.png)](https://user-images.githubusercontent.com/33951277/119915455-ea849a80-bfa5-11eb-8e0a-e3b960be372e.png)

As we can see, this particular setting is for **allow warning for other disk encryption** - as clearly defined in the **definitionId** value. If we drill into the **choiceSettingValue** item, we will see the applied value and any other child properties within that setting..

[![image-5](https://user-images.githubusercontent.com/33951277/119915465-efe1e500-bfa5-11eb-868b-3201648c081f.png)](https://user-images.githubusercontent.com/33951277/119915465-efe1e500-bfa5-11eb-868b-3201648c081f.png)

Here we can see the value of **allow warning for other disk encryption** is set to 0 - or false, which correlates to our policy set from the endpoint portal.

[![image-6](https://user-images.githubusercontent.com/33951277/119915536-1011a400-bfa6-11eb-8421-eeca2c61bcb9.png)](https://user-images.githubusercontent.com/33951277/119915536-1011a400-bfa6-11eb-8421-eeca2c61bcb9.png)

Here we can see the **child** setting of **allow standard user encryption** with the setting value of 1 - or true.

This example shows how simple it is to capture the basic building blocks of a settings catalog policy. But for those interested to dig deeper, why not check out what happens when you run the same example from above while expanding the **settingDefinitions** property..

[![settingsDefinition](https://user-images.githubusercontent.com/33951277/119915557-1acc3900-bfa6-11eb-8374-b50a0a1b2d82.gif)](https://user-images.githubusercontent.com/33951277/119915557-1acc3900-bfa6-11eb-8374-b50a0a1b2d82.gif)

Cool, huh? literally everything about each and every setting is available to us if we just spend the time to dig into graph a little bit!

## Building a policy from scratch

Now, before we begin, I'm going to put this out there - settings catalog policies are probably not the easiest things to build from scratch..

There is LOTS of metadata that you need to know for each setting before you can build out the policies. However, the concepts shown below can also be leveraged to maintain **reference templates** that can be captured and redeployed to other tenants to allow seamless management of multiple tenants with minimal effort.

Enough stalling, let's see what's required.

### Getting all settings data

So the first question that you may be asking, is, "How do I get the data that I need for the settings that I want to add to my catalog policy?" Luckily, Microsoft has an endpoint in graph that will return all possible settings currently available for the settings catalog.

We can capture all necessary metadata on those available settings by using the **deviceManagement/configurationSettings** endpoint.

```PowerShell
$restParam = @{
    Method = "Get"
    Uri = "$baseUri/configurationSettings"
    Headers = $authHeaders
    ContentType = 'Application/Json'
}
$settingsData = Invoke-RestMethod @restParam
$settingsData.value
```

Let's run the above code and see what we get back..

[![settingsCatapalooza](https://user-images.githubusercontent.com/33951277/119915626-40f1d900-bfa6-11eb-9bd0-cab0d19c0e2f.gif)](https://user-images.githubusercontent.com/33951277/119915626-40f1d900-bfa6-11eb-9bd0-cab0d19c0e2f.gif)

Well&#8230; that was a bit much wasn't it! at the time of writing, there is around 2,100 settings available in the settings catalog library with more to come until it is at parity with all existing methods of device configuration (configuration items, ADMX templates, endpoint baselines etc).

Let's filter the settings by a setting **definitionId** that we know (notice that the definitionId isnt a GUID? welcome to the future&#8230;)

```PowerShell
$settingsData.value | where {$_.id -eq 'device_vendor_msft_bitlocker_allowwarningforotherdiskencryption'}
```

[![image-7](https://user-images.githubusercontent.com/33951277/119915662-52d37c00-bfa6-11eb-8d82-623eafe6e2b1.png)](https://user-images.githubusercontent.com/33951277/119915662-52d37c00-bfa6-11eb-8d82-623eafe6e2b1.png)

Weird&#8230; doesn't that look the same as the expanded **settingsDefinitions** content from earlier? That's because it is literally the same data! We can dig into this data to find out the available options for each setting, but let's skip that for now and just build our example policy from scratch..

### Posting a settings catalog policy to Intune from Graph

Conceptually we now should understand what's required here. We have some metadata around what the policy is called to which we attach whichever settings we want attributed to our new policy profile. So let's rebuild the original policy in PowerShell!

```PowerShell
$baseUri = 'https://graph.microsoft.com/beta/deviceManagement/configurationPolicies'

#region build the policy
$newPolicy = [pscustomobject]@{
    name         = "Bitlocker Policy from PowerShell"
    description  = "we built this from PowerShell!"
    platforms    = "windows10"
    technologies = "mdm"
    settings     = @(
        @{
            '@odata.type'   = "#microsoft.graph.deviceManagementConfigurationSetting"
            settingInstance = @{
                '@odata.type'       = "#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance"
                settingDefinitionId = "device_vendor_msft_bitlocker_allowwarningforotherdiskencryption"
                choiceSettingValue  = @{
                    '@odata.type' = "#microsoft.graph.deviceManagementConfigurationChoiceSettingValue"
                    value         = "device_vendor_msft_bitlocker_allowwarningforotherdiskencryption_0"
                    children      = @(
                        @{
                            '@odata.type'       = "#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance"
                            settingDefinitionId = "device_vendor_msft_bitlocker_allowstandarduserencryption"
                            choiceSettingValue  = @{
                                '@odata.type' = "#microsoft.graph.deviceManagementConfigurationChoiceSettingValue"
                                value         = "device_vendor_msft_bitlocker_allowstandarduserencryption_0"
                            }
                        }
                    )
                }
            }
        }
        @{
            '@odata.type'   = "#microsoft.graph.deviceManagementConfigurationSetting"
            settingInstance = @{
                '@odata.type'       = "#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance"
                settingDefinitionId = "device_vendor_msft_bitlocker_requiredeviceencryption"
                choiceSettingValue  = @{
                    '@odata.type' = "#microsoft.graph.deviceManagementConfigurationChoiceSettingValue"
                    value         = "device_vendor_msft_bitlocker_requiredeviceencryption_1"
                }
            }
        }
    )
}
#endregion
#region post the request
$restParams = @{
    Method      = 'Post'
    Uri         = $baseUri
    body        = ($newPolicy | ConvertTo-Json -Depth 20)
    Headers     = $authHeaders
    ContentType = 'Application/Json'
}
Invoke-RestMethod @restParams
#endregion
```

Once we run this - within seconds we should have a replicated policy in our tenant!

[![image-8](https://user-images.githubusercontent.com/33951277/119915697-65e64c00-bfa6-11eb-8cab-06a15f01b7e8.png)](https://user-images.githubusercontent.com/33951277/119915697-65e64c00-bfa6-11eb-8cab-06a15f01b7e8.png)

As mentioned earlier, building these from scratch is tricky - but if you read between the lines, knowing how to capture pre-built policies via graph and using the captured JSON payload to post the same policy to a new tenant (or a few hundred tenants) should make multi-tenant device management less painful.

— Ben
