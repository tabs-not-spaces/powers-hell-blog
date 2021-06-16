---
id: 003
title: 'Working with GraphAPI & PowerBI the easy way!'
date: 2018-05-15T06:03:30+10:00
excerpt: I'm sure lots of us out there in the IT world have spent some time with PowerBI with varying degrees of headache-inducing successes.
author: Ben
layout: post
guid: http://powers-hell.com/?p=99
permalink: /2018/05/15/working-with-graphapi-powerbi-the-easy-way/
views:
  - "3638"
categories:
  - PowerBI
  - PowerShell
tags:
  - GraphAPI
  - PowerBI
  - PowerShell
---
I'm sure lots of us out there in the IT world have spent some time with PowerBI with varying degrees of headache-inducing successes. I know myself that working with fairly flat data sources, you can very easily create some incredible reports that will make you look like a data wizard to even the most jaded manager out there, however once you want to start working with complex data sets or start veering into the world of custom visualisations, pain is sure to be just around the corner.

This is where I found myself just last year - I was tasked with capturing some data from Intune, AAD & SCCM to present a reporting solution to a prospective client. "Sure, no problem at all" I cluelessly said, as I rapidly pulled in data from SCCM like it was no problem&#8230;
Unfortunately, when it came time to access data from Azure via the fantastic GraphAPI, I ran into some roadblocks. Lets drill into what those roadblocks were.

Firstly, let's try and gather some very basic info - User details & their managers. Pretty simple process.
Open up PowerBI and get some data from a web source

[![web data](https://i1.wp.com/i.imgur.com/xfjBQsa.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/xfjBQsa.png?w=1170&#038;ssl=1 "web data")

Type in your _perfectly_ formed Graph query - in this case, it would be "https://graph.microsoft.com/beta/users?$expand=manager" and hit OK.

[![Graph URL](https://i1.wp.com/i.imgur.com/NFYQx1A.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/NFYQx1A.png?w=1170&#038;ssl=1 "Graph URL")

Oh, we were never given an option to authenticate&#8230; so let's go and do that - go to organizational account and sign in with your details that _totally_ have the right access for what you want (we are all IT professionals after all, are we not?).

[![Auth](https://i2.wp.com/i.imgur.com/q3FcmtA.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/q3FcmtA.png?w=1170&#038;ssl=1 "Auth")

After hitting connect, finally, we are greeted with a very underwhelming result - a single list row.

[![lame list](https://i.imgur.com/w3teEJ3.png?w=1170&#038;ssl=1)](https://i.imgur.com/w3teEJ3.png?w=1170&#038;ssl=1 "lame list")

No worries&#8230; just click on the list value and it'll expand into the results. Very arduous and there are many more steps (that can all be automated and if there is any demand, I'll write about them) but once you have formatted the results, you'll get this data.

[![underwhelming results abound](https://i0.wp.com/i.imgur.com/iIuyrM1.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/iIuyrM1.png?w=1170&#038;ssl=1 "underwhelming results abound")

\*very exciting stuff\*

So cool, that's simple, we've got our generic data for each user in our tenant, lets try and get some data on the devices we manage - it should be the same process, so lets do that, follow the exact steps above but this time, our graph query is going to look like this.

[![device management](https://i1.wp.com/i.imgur.com/TlXjZlK.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/TlXjZlK.png?w=1170&#038;ssl=1 "device management")

Again, yeah, we aren't authenticated, so go through that process - again, the account we are using definitely has access - we are all professionals here&#8230; so alright, authenticate and we should get our data like last time.

[![sad trombone](https://i2.wp.com/i.imgur.com/a7mgxQD.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/a7mgxQD.png?w=1170&#038;ssl=1 "sad trombone")

"cool". Now at this point, you might be going back and thinking you don't have access to that level of data - hey, even as the prestigious IT professionals that we all definitely are, we all make mistakes.

Here's the kicker - that's not the issue. The problem seems to stem from the simple fact that whatever application Id PowerBI is using to authenticate against, it just doesn't have the access required to traverse most of your tenant data.

The solution seemed so obvious - if PowerBI doesn't give me the control to authenticate exactly how I want, then why not make my own middleware data gateway?!

All that is required is a function to non-interactively authenticate into Graph, some fairly basic code to form the GraphAPI URL for each request, and a place to store the code that can expose the code via an HTTP endpoint. (I promise it really is easy).

The simplest way to do this is to create a function app inside your Azure tenant and throw the code into it. I will not go into detail on how to create a function app in this post as I expect it is relatively common knowledge at this point, but if anyone has any questions around it, please feel free to contact me directly.

Alright - we all have our function app created? we've given it some cool name? I've already taken GraphConnector (which I'm very happy about). No, let's add a function to our app.

[![new function](https://i2.wp.com/i.imgur.com/F6hPIjo.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/F6hPIjo.png?w=1170&#038;ssl=1 "new function")

Create a custom function, enable **experimental language support**, filter the language to **PowerShell** and select **HTTP trigger**

[![HTTP Trigger](https://i1.wp.com/i.imgur.com/LOcrgXK.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/LOcrgXK.png?w=1170&#038;ssl=1 "HTTP Trigger")

Give the function a name and create it. You will now be greeted with a **hello world** sample function. Here's where we will place our connector code. For now, delete everything in the code window and save the file.

The most interesting parts of the code we will use are how we extract data from JSON objects as well as how to capture request data that is sent to the code. We will only be using this connector with the Get method, thus all incoming data is given its own variable name. Below we see that we want to be able to receive tenant details, a query string, and a version string (V1.0 or Beta)

```PowerShell
if ($req_query_tenant) {
    $tenant = $req_query_tenant
}
if ($req_query_query) {
    $query = $req_query_query
}
if ($req_query_ver) {
    $ver = $req_query_ver
}
else {
    $ver = 'v1.0'
}
if ($req_query_space) {
    $space = $req_query_space
}
else {
    $space = "AAD"
}
```

As this is a completely non-interactive solution, we need to store relevant credentials somewhere, there are \*many\* ways to do this securely in Azure, one being using a key-vault, another being to store the credentials as strings in the function application settings, but the way I've grown accustomed to is to create an application config file and store it in the directory with the rest of the function code - yes, before you mention anything, there is obviously a security risk storing credentials unencrypted anywhere and I strongly recommend that anyone looking at implementing this solution **be aware of these implications and proceed with care.**

**With that warning out of the way**, let's add some other required files.

On the right, click on **View Files** to expand the file list out, select **upload** and import the Azure AD *.dlls used by the AzureAD module (these will be provided in the final GitHub Repo). Your folder structure should now look like this.

[![file structure](https://i2.wp.com/i.imgur.com/My52dO0.png?w=1170&#038;ssl=1)](https://i2.wp.com/i.imgur.com/My52dO0.png?w=1170&#038;ssl=1 "file structure")

Next, select **add** and give the new file the name **appConfig.json**. Below is the json structure to follow for this solution. You can have as many tenant credentials as you want.

```json
{
    "Accounts": [
        {
            "strUn":    "testaccount@contoso.com.au",
            "strTd":    "contoso.com.au",
            "strPw":    "********"
        },
        {
            "strUn":    "serviceAccount@companyx.it",
            "strTd":    "companyx.it",
            "strPw":    "********"
        }
    ]
}
```

Now save the contents of your appConfig.json file and go back to the main function code - **run.ps1**. The next step is to import the contents of the **appConfig.json** so that we can use the credentials to authenticate into Graph.

```PowerShell
$fp = $EXECUTION_CONTEXT_FUNCTIONDIRECTORY
$config = Get-Content "$fp\appConfig.json" -raw | ConvertFrom-Json
$GLOBAL:adal = "$fp/Microsoft.IdentityModel.Clients.ActiveDirectory.dll"
$GLOBAL:adalforms = "$fp/Microsoft.IdentityModel.Clients.ActiveDirectory.Platform.dll"
```

As you can see above, the variable $EXECUTION\_CONTEXT\_FUNCTIONDIRECTORY is the default variable that gives us the same end result as $PSScriptRoot would do in a normal PowerShell environment.
We are also defining the location of the AzureAD *.dlls for the functions to use each time they are called.

We will now extract the credentials based on the tenant details sent to the function by the requestor.

```PowerShell
$account = $config.accounts | Where-Object {$_.strTd -eq "$tenant"}
```

Now that we have our credentials in the session, we can throw them at our functions along with the other relevant variables. Below is the function to create an authentication header.

```PowerShell
function Get-AuthHeader {
    param (
        [Parameter(Mandatory = $true)]
        $un,
        [Parameter(Mandatory = $true)]
        $pw,
        [parameter(mandatory = $true)] [ValidateSet('Intune', 'AAD')]
        $space
    )

    [System.Reflection.Assembly]::LoadFrom($adal) | Out-Null

    [System.Reflection.Assembly]::LoadFrom($adalforms) | Out-Null

    $userUpn = New-Object "System.Net.Mail.MailAddress" -ArgumentList $un
    $tenantDomain = $userUpn.Host
    switch ($space) {
        "Intune" {
            $cId = "d1ddf0e4-d672-4dae-b554-9d5bdfd93547"
            break;
        }
        "AAD" {
            $cId = "1950a258-227b-4e31-a9cf-717495945fc2"
            break;
        }
    }

    $resourceAppIdURI = "https://graph.microsoft.com"
    $authString = "https://login.microsoftonline.com/$tenantDomain"

    $pw = $pw | ConvertTo-SecureString -AsPlainText -Force
    $cred = New-Object Microsoft.IdentityModel.Clients.ActiveDirectory.UserPasswordCredential -ArgumentList $userUpn, $pw
    $authContext = new-object "Microsoft.IdentityModel.Clients.ActiveDirectory.AuthenticationContext" -ArgumentList $authString
    try {
        $authResult = [Microsoft.IdentityModel.Clients.ActiveDirectory.AuthenticationContextIntegratedAuthExtensions]::AcquireTokenAsync($authContext, $resourceAppIdURI, $cId, $cred).Result
        if ($authResult.AccessToken) {

            # Creating header for Authorization token

            $authHeader = @{
                'Content-Type'  = 'application/json'
                'Authorization' = "Bearer " + $authResult.AccessToken
                'ExpiresOn'     = $authResult.ExpiresOn
            }

            return $authHeader
        }
        else {
            throw;
        }
    }
    Catch {
        return $false
    }
}
```

The only thing I will mention about the above code is that I am specifying what "space" I want to authenticate with - for each token request you need to authenticate against an appropriate **Application Id**. This can be a custom application that you have created in your Azure tenant that has all access you could ever need, or in this example, multiple generic Application Ids - So if I want to access Intune, I switch programmatically to use the generic Intune Application Id, and similarly, if I want to query AAD, I use the AAD Application Id.

Next is the function to form the correct GraphAPI URL, attach the authentication token to the header of the request and send us the results back as an object to work with.

```PowerShell
Function Get-JsonFromGraph {
    [cmdletbinding()]
    param
    (
        [Parameter(Mandatory = $true)]
        $strUn,
        [Parameter(Mandatory = $true)]
        $strPw,
        [Parameter(Mandatory = $true)]
        $strQuery,
        [parameter(mandatory = $true)] [ValidateSet('v1.0', 'beta')]
        $ver,
        [Parameter(Mandatory = $false)]
        $space

    )
    try {
        switch ($space){
            "Intune" {
                $header = Get-AuthHeader -un $strUn -pw $strPw -space Intune
                break;
            }
            "AAD" {
                $header = Get-AuthHeader -un $strUn -pw $strPw -space AAD
                break;
            }
        }

        if ($header) {
            #create the URL
            $url = "https://graph.microsoft.com/$ver/$strQuery"

            #Invoke the Restful call and display content.
            Write-Verbose $url
            $query = Invoke-RestMethod -Method Get -Headers $header -Uri $url -ErrorAction STOP
            if ($query) {
                if ($query.value) {
                    #multiple results returned. handle it
                    $query = Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/$ver/$strQuery" -Headers $header
                    $result = @()
                    while ($query.'@odata.nextLink') {
                        Write-Verbose "$($query.value.Count) objects returned from Graph"
                        $result += $query.value
                        Write-Verbose "$($result.count) objects in result array"
                        $query = Invoke-RestMethod -Method Get -Uri $query.'@odata.nextLink' -Headers $header
                    }
                    $result += $query.value
                    Write-Verbose "$($query.value.Count) objects returned from Graph"
                    Write-Verbose "$($result.count) objects in result array"
                    return $result
                }
                else {
                    #single result returned. handle it.
                    $query = Invoke-RestMethod -Method Get -Uri "https://graph.microsoft.com/$ver/$strQuery" -Headers $header
                    return $query
                }
            }
            else {
                $error = @{
                    errNumber = 404
                    errMsg    = "No results found. Either there literally is nothing there or your query was malformed."
                }
            }
            throw;
        }
        else {
            $error = @{
                errNumber = 401
                errMsg    = "Authentication Failed during attempt to create Auth header."
            }
            throw;
        }

    }
    catch {
        return $error
    }
}

$objRest = Get-JsonFromGraph -strUn $account.strUn -strPw $account.strPw -strQuery $query -ver $ver -space $space
```

Again, nothing revolutionary here - the function just creates the GraphAPI URL and stores the results for us like with the AuthHeader function, there are hundreds of ways to do this and you should simply study my example to understand the basics.

Finally, we will send the results back to the requestor.

```PowerShell
$objRest | ConvertTo-Json | out-file -encoding ascii -FilePath $res
```

Here we are simply converting the GraphRequest object into a properly formed JSON object, storing it in a temporary file that is then sent to the requestor - the default variable for the temp file is $res.

Congratulations for sticking with me so far - we are on the home stretch, I promise.

Once you've saved all that code (you have saved it haven't you?), capture the function URL, by clicking **Get Function URL** above the code editing window - save this to your clipboard and let's move back to PowerBI.
Create a new web request as we did initially. This time instead of accessing the GraphAPI directly, we will go through our newly created data gateway - paste the Function URL from the previous step and now we will build out the URL to include the content to send to the function.

The basic Get Method URL for a GraphAPI call is quite simple - after the URL, you append each variable and value along with an ampersand. So to form the URL to get the data we want, it would look like this (I've broken each URL part into its own row to make it easier to read).

[![url forming is easy](https://i1.wp.com/i.imgur.com/dw067Lt.png?w=1170&#038;ssl=1)](https://i1.wp.com/i.imgur.com/dw067Lt.png?w=1170&#038;ssl=1 "url forming is easy")

Once you've formed your URL, hit OK and if all goes to plan - you should have a beautiful list of records waiting for you to convert to a table!

[![final results](https://i0.wp.com/i.imgur.com/M2Y9yaM.png?w=1170&#038;ssl=1)](https://i0.wp.com/i.imgur.com/M2Y9yaM.png?w=1170&#038;ssl=1 "final results")

—

As always, all of today's code and files will be available on my GitHub (<a href="https://github.com/tabs-not-spaces/CodeDump/tree/master/Invoke-GraphConnector" rel="noopener noreferrer" target="_blank">right here</a>) for your review and use.

Hopefully, this has been helpful to you and always, if you have any improvements/complaints or just wish to discuss the solution provided above, leave a comment below or reach me on twitter <a href="https://twitter.com/powers_hell" rel="noopener noreferrer" target="_blank">@powers_hell</a>

Enjoy,
Ben

_P.S.
I am planning a series of posts that all revolve around what you can do once you start using Azure Functions to work as data-gateways - stay tuned for my next post which will focus on leveraging Azure Functions to monitor Intune for unapproved modifications!
