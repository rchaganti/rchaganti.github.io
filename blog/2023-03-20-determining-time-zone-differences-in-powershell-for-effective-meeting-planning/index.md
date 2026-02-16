# Determining time zone differences in PowerShell for effective meeting planning


I work on a team with members across multiple time zones. It is important to schedule meetings so that team members do not have to stay late or wake up early. Being a command line person, I quickly wrote this PowerShell script to help me determine the time differences.

```powershell
param
(
    [Parameter(Mandatory = $true)]
    [String[]]
    $Timezone,

    [Parameter()]
    [Datetime]
    $Target
)

if (!$Target)
{
    # Get the local time as the target
    $Target = Get-Date
}

$tzObject = [System.Collections.Arraylist]::new()
$tzObject.Add(
    [PSCustomObject]@{
        'Timezone' = 'Local'
        'Time' = $Target
        'DifferenceInHours' = 0
    }
) | Out-Null

foreach ($tz in $Timezone)
{
    # Get the timezone difference
    $localTz = [System.TimeZoneInfo]::Local
    $remoteTz = [System.TimeZoneInfo]::FindSystemTimeZoneById($tz)
    $tzDifference = [float]($remoteTz.BaseUtcOffset.TotalHours - $localTz.BaseUtcOffset.TotalHours)
    $remoteTime = [System.TimeZoneInfo]::ConvertTime($Target, $localTz, $remoteTz)
    $tzObject.Add(
        [PSCustomObject]@{
            'Timezone' = $tz
            'Time' = $remoteTime
            'DifferenceInHours' = $tzDifference
        }
    ) | Out-Null
}

return $tzObject
```

This one is simple to use.

```shell
PS> .\tzDiff.ps1 -Timezone 'China Standard Time','Eastern Standard Time','Central Standard Time','Pacific Standard Time'

Timezone              Time                  DifferenceInHours
--------              ----                  -----------------
Local                 3/20/2023 10:49:40 AM                 0
China Standard Time   3/20/2023 1:19:40 PM                2.5
Eastern Standard Time 3/20/2023 1:19:40 AM              -10.5
Central Standard Time 3/20/2023 12:19:40 AM             -11.5
Pacific Standard Time 3/19/2023 10:19:40 PM             -13.5
```

When you do not specify any target time to convert, this script uses the current local time and converts to the time zones specified at the command line.

```powershell
PS> .\tzDiff.ps1 -Timezone 'China Standard Time','Eastern Standard Time','Central Standard Time','Pacific Standard Time' -Target (Get-Date "3/24/2023 15:30")

Timezone              Time                 DifferenceInHours
--------              ----                 -----------------
Local                 3/24/2023 3:30:00 PM                 0
China Standard Time   3/24/2023 6:00:00 PM               2.5
Eastern Standard Time 3/24/2023 6:00:00 AM             -10.5
Central Standard Time 3/24/2023 5:00:00 AM             -11.5
Pacific Standard Time 3/24/2023 3:00:00 AM             -13.5
```

You can specify a target time to convert using the `-Target` parameter. You can specify a future target time to schedule the meeting using this parameter.

I hope you find this useful as well.
