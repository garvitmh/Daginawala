# Setup Desktop Environment
$EnvContent = @"
PORT=3000
NODE_ENV=development
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here
SHOPIFY_STORE=daginawala11.myshopify.com
SCOPES=read_products,write_products,read_inventory,write_inventory
DATABASE_URL="file:./dev.db"
SESSION_SECRET=desktop_session_secret
"@

$FrontendEnvContent = @"
VITE_SHOPIFY_API_KEY=your_shopify_api_key_here
VITE_API_URL=http://localhost:3000
"@

Write-Host "Creating local configuration..."
Set-Content -Path "backend\.env" -Value $EnvContent
Set-Content -Path "frontend\.env" -Value $FrontendEnvContent

Write-Host "Initializing Database..."
cd backend
npx prisma generate
npx prisma migrate dev --name init_desktop

Write-Host "✅ Desktop Setup Complete!"
Write-Host "⚠️  IMPORTANT: Please open and configure 'backend\.env' and 'frontend\.env' with your rotated Shopify API credentials."
Write-Host "Run 'GeminiDesktop.bat' to start the app."
