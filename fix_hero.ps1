$content = Get-Content -Path 'E:\Rohan saeed\hackathon_port0\Port0\dashboard\components\sections\hero.tsx' -Raw
$newContent = $content -replace '            \)\)\)\r?\n<p className="mt-8 max-w-xl leading-relaxed text-left text-lg text-zinc-500 ml-0">', "            \)\)\)\r\n          </h1>\r\n\r\n          <p className='mt-8 max-w-xl leading-relaxed text-left text-lg text-zinc-500 ml-0'>"
[System.IO.File]::WriteAllText('E:\Rohan saeed\hackathon_port0\Port0\dashboard\components\sections\hero.tsx', $newContent, [System.Text.Encoding]::UTF8)
