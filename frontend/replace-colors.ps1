$map = @{
    '#0a0d14' = 'bg-bg-main text-text-primary';
    '#0a0f1c' = 'bg-bg-side border-bg-side';
    '#0d121f' = 'bg-bg-side';
    '#111726' = 'bg-bg-side border-bg-main';
    '#111827' = 'bg-bg-main border-bg-main';
    '#1a2336' = 'border-bg-side';
    '#1f293d' = 'border-bg-main';
    '#0f172a' = 'bg-bg-main';
    '#1f1018' = 'bg-bg-side';
}
Get-ChildItem -Path "$PSScriptRoot/src" -Recurse -Include *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    foreach ($hex in $map.Keys) {
        $class = $map[$hex]
        $pattern = [regex]::Escape($hex) + '(\/\d+)?'
        $content = [regex]::Replace($content, $pattern, $class)
    }
    Set-Content -Path $_.FullName -Value $content -Encoding utf8
    Write-Host "Processed $($_.FullName)"
}
