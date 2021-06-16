---
id: 020
title: 'Dynamically set the time zone of a device in Intune using Azure Maps & PowerShell'
date: 2020-08-31T07:20:59+10:00
author: Ben
layout: post
guid: http://powers-hell.com/?p=387
permalink: /2020/08/31/setting-the-time-zone-of-an-intune-managed-device-using-azure-maps-powershell/
views:
  - "4164"
image: /assets/images/2020/08/gpsdata.jpg
categories:
  - Azure
  - Intune
  - PowerShell
tags:
  - Intune
---
Let me start off by saying I wish I didn't have to write this post. Setting the correct time zone of a Windows device shouldn't be this difficult, especially with all of the management possibilities provided to us with Intune and the entire endpoint management stack. But here we are!

<!--more-->

I get it though. At one point, as [Michael Neihaus](https://twitter.com/mniehaus) [has written about previously](https://oofhours.com/2019/12/20/configuring-time-zones-part-2/), even if we could configure the time zone during the Out of Box Experience, everything was hinged on the timings of certificates and policies reaching the device within an agreed time frame.
If the time zone changed on a device during that process it had the possibility to break the entire enrollment process. This has since been (for the most part) resolved if you are using Windows 10 2004 (20h1) as your operating system.

I'm hopeful that eventually, we will be able to configure the time zone as part of the OOBE, but until that time comes, I'd like to share some ways that I currently solve this problem using Azure Maps & PowerShell.

Most solutions I've found involve creating custom OMA-URI policies to set the value of the time zone which works in some scenarios, but isn't elegant enough to handle the real world problem of managing devices and users located all over the world. So let's change that.

## Setting time zone from device GPS data

This one is fun but does require that **location services** are turned on which, by default are disabled. This can be enforced by device configuration policies, but there are obvious security implications and you may need to discuss this with your organization before enabling.

The solution below converts the GPS latitude and longitude data to the required windows time zone data by using an API available through Azure Maps.

Pricing is super affordable and the "included free quantity" means that for small to medium-sized businesses, there is a chance you'd end up not paying a cent. For reference, here are the available [plans](https://docs.microsoft.com/en-us/azure/azure-maps/choose-pricing-tier) and [pricing](https://azure.microsoft.com/en-us/pricing/details/azure-maps/).

### Configuring Azure Maps

This is super easy, but it's still worth documenting!

* Open up your Azure portal and create a new resource.
* Search the marketplace for "Azure Maps" and create an account.
* Fill out the relevant fields and choose your pricing tier (as mentioned above, S0 will be **more** than enough for this demo.

[![Create Azure Maps Account](/assets/images/2020/08/image-4.png)](/assets/images/2020/08/image-4.png "Create Azure Maps Account")

  * Once the account is created, go to the resource and head to the **Authentication** page. Make note of one of the **Shared Keys**. We will use these to authenticate to the service.

### Writing the code

Now let's grab our GPS data and send it to the Azure Maps API!

```PowerShell
Add-Type -AssemblyName System.Device
$gw = New-Object System.Device.Location.GeoCoordinateWatcher
$gw.Start()
while (($gw.Status -ne 'Ready') -and ($gw.Permission -ne 'Denied')) {
    Start-Sleep -Milliseconds 100 #Wait for discovery.
}
```

The above code is fairly simple - we are adding the **System.Device** assembly to our session and creating and starting a new **GeoCoordinateWatcher** object to capture the GPS data of our device.

If we look at the results that are stored in the `$gw` variable we should see the property name **Permission**. If we step into that, we should see the location data required for the next step.

[![$gw variable](/assets/images/2020/08/image-5.png)](/assets/images/2020/08/image-5.png "$gw variable")

Now that we have our Latitude and Longitude data stored in a variable, next we need to form the request to the Azure Maps API.

```PowerShell
$apiKey = "00000000000000000000000000" #replace with your subscription Key
$baseUri = "https://atlas.microsoft.com/timezone"
$restParams = @{
    Method      = "Get"
    Uri         = "$baseUri/byCoordinates/json?subscription-key=$apiKey&api-version=1.0&query=$($gw.Position.Location.Latitude),$($gw.Position.Location.Longitude)"
    ContentType = 'Application/Json'
}
$locData = Invoke-RestMethod @restParams
```

Looking at the contents of `$locData` we should now see some cool data.

[![location data](/assets/images/2020/08/image-6.png)](/assets/images/2020/08/image-6.png "location data")

Stepping into the `$locData.TimeZones` property should give us even more info.

[![Timezones data](/assets/images/2020/08/image-7.png)](/assets/images/2020/08/image-7.png "Timezones data")

The final step is to convert the value we see in **Id** from the IANA code, to the format our computer needs to set the time zone.

```PowerShell
$apiKey = '000000000000000000000000000000' #use a subscription key from your Azure Maps Account
$restParams = @{
    Method = 'Get'
    Uri = "https://atlas.microsoft.com/timezone/enumWindows/json?subscription-key=$apiKey&api-version=1.0"
    ContentType = 'Application/Json'
}
$tzList = Invoke-RestMethod @restParams
$result = $tzList | Where-Object { $locData.TimeZones.id -in $_.IanaIds }
Set-TimeZone -Id $result
```

All we are doing above is getting a list of Windows time zone IDs and matching them to the IANA time zone ID. Once we have a match, using the native `Set-TimeZone` allows us to dynamically set our device time zone with relative ease!

## Setting Time Zone from public IP address

So what if you aren't allowed to enable location services? Or what if you are provisioning virtual machines that don't have access to the GPS data? Luckily, there is another way to get our location data - from the publicly facing IP address of the device.

For this example, we will use a free API from [](https://ipinfo.io)[https://ipinfo.io](https://ipinfo.io/). You can use this API without registering, however, it is heavily rate-limited without providing an access token, so just register an account - it allows 50,000 API calls a month for free which is more than enough for this scenario.

Once you've registered and signed in, grab a copy of the access token from the dashboard - we will use it below.

```PowerShell
$apiKey = '000000000000000000000000000000' # replace with access key from your ipinfo.io account
$locData = Invoke-RestMethod "https://ipinfo.io?token=$apiKey" -ContentType 'Application/Json'
```

If we look at the value of `$locData` we should see similar data from our first example.

[![$locData](/assets/images/2020/08/image-9.png)](/assets/images/2020/08/image-9.png "$locData")

Jackpot! The value of `$locData.timezone` is a properly formatted IANA Id. We could reuse the code from the first example to match up the IANA Id to the Windows time zone Id - or we can save an API call and grab a copy of the results and compare them in the code. Let's see how that would look.

```PowerShell
$tzList = @{
    #region snippet of the countr / iana code table
    "Africa/Abidjan"      = "Greenwich Standard Time"
    "Africa/Accra"        = "Greenwich Standard Time"
    "Africa/Addis_Ababa"  = "E. Africa Standard Time"
    "Africa/Algiers"      = "W. Central Africa Standard Time"
    "Africa/Asmera"       = "E. Africa Standard Time"
    "Africa/Bamako"       = "Greenwich Standard Time"
    "Africa/Bangui"       = "W. Central Africa Standard Time"
    "Africa/Banjul"       = "Greenwich Standard Time"
    "Africa/Bissau"       = "Greenwich Standard Time"
    "Africa/Blantyre"     = "South Africa Standard"
    #endregion
}
$windowsId = $tzList.Get_Item($locData.timezone)
if ($windowsId) {
    $result = $windowsId
}
else {
    $result = ($tzList.GetEnumerator() | Where-Object { $_.Key -like "*$($locData.timezone)*" }).Value
}
Write-Host "Setting timezone to $result.."
Set-TimeZone -Id $result
```

Obviously, that's a LOT more code (cut for readability), but it does save us another API call, which if we are deploying to tens of thousands of devices could in the end save us being charged for API use!

I personally prefer and actually do use the second method for setting time zones as during my testing I'm invariably building VMs before I move to physical devices (sometimes I don't even end up onto physical devices!), so being able to get a rough estimate of the location-based on public IP is much more reliable.

How you deploy this to your devices is up to personal preference and operational requirements of course. I've generally had success simply deploying as a configuration script where I am happy for it to only run once, however bundling this with a scheduled task to run once a week or once a month to maintain time zone reliability is another great option.

I've polished up the code from this article and provided both solutions as ready to deploy scripts, go check them out on my [GitHub](https://github.com/tabs-not-spaces/CodeDump/tree/master/Set-Timezone) - just make sure to update the `$apiKey` for either scenario you choose to utilize.

— Ben
