# GenomeGuard Aptos Setup Script (PowerShell)
# Run with: .\setup_aptos.ps1

Write-Host "🧬 GenomeGuard Aptos Setup Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.13+" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Generate ML model
Write-Host ""
Write-Host "🤖 Generating ML model..." -ForegroundColor Yellow
python scripts\quick_model.py

# Install frontend dependencies
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location web
npm install
Set-Location ..

# Create environment files
if (-not (Test-Path .env)) {
    Write-Host ""
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env with your configuration!" -ForegroundColor Yellow
}

if (-not (Test-Path web\.env)) {
    Write-Host ""
    Write-Host "📝 Creating web\.env file..." -ForegroundColor Yellow
    Copy-Item web\.env.example web\.env
    Write-Host "⚠️  Please edit web\.env with your Aptos contract address!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env with your MongoDB and Aptos credentials"
Write-Host "2. Edit web\.env with your Aptos contract address"
Write-Host "3. Deploy smart contract: cd aptos; aptos move publish"
Write-Host "4. Start backend: python start_services.py"
Write-Host "5. Start frontend: cd web; npm start"
Write-Host ""
Write-Host "📖 See APTOS_BOUNTY_README.md for full documentation" -ForegroundColor Cyan
