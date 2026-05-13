# Best-effort fetch of the four AOL sound clips into public/sounds/.
# Any miss is non-fatal — boot sequence treats missing audio as silence.

$ErrorActionPreference = "Continue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dir  = Join-Path $root "public\sounds"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

Write-Host "Fetching to $dir"
Write-Host "(if any of these miss, drop the file in by hand — see public/sounds/README.md)"
Write-Host ""

$files = @(
  @{ name = "modem.mp3";           url = "https://archive.org/download/DialupInternet/Dialup%20Internet.mp3" },
  @{ name = "welcome.mp3";         url = "https://archive.org/download/AOLClassic/welcome.mp3" },
  @{ name = "youve-got-mail.mp3";  url = "https://archive.org/download/AOLClassic/youve_got_mail.mp3" },
  @{ name = "buddy-in.mp3";        url = "https://archive.org/download/AIMBuddySounds/buddyin.mp3" }
)

foreach ($f in $files) {
  $out = Join-Path $dir $f.name
  if ((Test-Path $out) -and ((Get-Item $out).Length -gt 0)) {
    Write-Host ("skip  {0}  (already present)" -f $f.name)
    continue
  }
  try {
    Invoke-WebRequest -Uri $f.url -OutFile $out -UseBasicParsing -ErrorAction Stop
    Write-Host ("ok    {0}" -f $f.name)
  } catch {
    Write-Host ("miss  {0}  ({1})" -f $f.name, $f.url)
    if (Test-Path $out) { Remove-Item $out -Force }
  }
}

Write-Host ""
Write-Host "Done. Files in $dir:"
Get-ChildItem $dir | Format-Table Name, Length -AutoSize
