$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
$gitPath = 'C:\Program Files\Git\cmd'
if ($currentPath -notmatch [regex]::Escape($gitPath)) {
    $newPath = $currentPath + ';' + $gitPath
    [Environment]::SetEnvironmentVariable('PATH', $newPath, 'User')
    Write-Host 'Git has been added to the User PATH successfully.'
} else {
    Write-Host 'Git is already in the User PATH.'
}
