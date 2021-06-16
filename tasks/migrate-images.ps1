[cmdletbinding()]
param (
  [string]$WorkspaceFolder
)
$imagePath = "$WorkspaceFolder/assets/images/$(get-date -Format yyyy/MM)"
if (!(test-path $imagePath)) {
  new-item $imagePath -itemType Directory -Force
}
else {
  "Folder already exists."
}
Move-Item -Path "$env:OneDrive\Pictures\pwsh-blog-screenshots\*.*" -Destination $imagePath -Force
