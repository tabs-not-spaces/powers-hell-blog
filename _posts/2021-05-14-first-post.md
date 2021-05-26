---
layout: post
title:  First Post!
date:   2021-05-14 11:55:30 +1000
categories: First-Post Pretty-Cool
---
<link href="http://github.com/yrgoldteeth/darkdowncss/raw/master/darkdown.css" rel="stylesheet">

Amet eiusmod fugiat Lorem magna in occaecat id non exercitation Lorem elit sunt exercitation culpa. Est nulla ut amet labore cupidatat duis enim laborum culpa. Fugiat non exercitation veniam exercitation deserunt consectetur ullamco. Et minim qui aliquip nisi adipisicing duis nostrud esse consequat qui ea cillum. Qui elit voluptate velit fugiat dolore eiusmod mollit.  
<!--more-->

## First Post!!!

Labore sunt dolore ea sint elit reprehenderit magna. Deserunt sint elit et ut consequat deserunt. Velit reprehenderit eu dolor exercitation sint exercitation.  

Quis labore est ut nulla commodo eiusmod reprehenderit. Eu ad sit minim excepteur eu Lorem eiusmod in ad laborum aute. Ullamco exercitation et cillum minim ea laboris reprehenderit sunt ea pariatur esse. Occaecat quis eiusmod nulla dolor elit nostrud reprehenderit pariatur ea minim irure.

### Code snippet

`Invoke-Death`

### Code block

```powershell
$policyId = $configPolicies.value[0].id
$restParam = @{
    Method = 'Get'
    Uri = "$baseUri/configurationPolicies('$policyId')/settings"
    Headers = $authHeaders
    ContentType = 'Application/json'
}

$configPolicySettings = Invoke-RestMethod @restParam
$configPolicySettings.value
```

### Lists

1. test
2. this should be a thing
3. hell0

- what about this?
- or this?

### Tables

| name  | age   | thing |
|---    |---    |---    |
| Ben   | 35    | hates himself |

