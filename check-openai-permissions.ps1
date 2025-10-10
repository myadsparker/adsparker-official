# PowerShell script to check OpenAI API permissions
# Usage: Replace YOUR_API_KEY with your actual OpenAI API key

$apiKey = "YOUR_API_KEY_HERE"

Write-Host "🔍 Checking OpenAI API Permissions..." -ForegroundColor Cyan
Write-Host ""

# Test 1: List assistants (requires api.assistants.read)
Write-Host "1️⃣ Testing Assistants API access..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "OpenAI-Beta" = "assistants=v2"
    }
    $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/assistants" -Method Get -Headers $headers
    Write-Host "✅ SUCCESS: You have access to Assistants API" -ForegroundColor Green
    Write-Host "   Found $($response.data.Count) assistants" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: List available models
Write-Host "2️⃣ Testing Models API access..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $apiKey"
    }
    $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/models" -Method Get -Headers $headers
    Write-Host "✅ SUCCESS: You have access to Models API" -ForegroundColor Green
    
    # Check for specific models
    $models = $response.data | Select-Object -ExpandProperty id
    
    Write-Host ""
    Write-Host "🔍 Checking for required models:" -ForegroundColor Cyan
    
    $requiredModels = @("gpt-4o", "gpt-image-1", "dall-e-3", "dall-e-2")
    foreach ($model in $requiredModels) {
        if ($models -contains $model) {
            Write-Host "   ✅ $model - Available" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $model - Not found" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check API key format
Write-Host "3️⃣ Checking API Key format..." -ForegroundColor Yellow
if ($apiKey -match "^sk-proj-") {
    Write-Host "✅ Project API Key format detected" -ForegroundColor Green
} elseif ($apiKey -match "^sk-") {
    Write-Host "⚠️ Legacy API Key format detected" -ForegroundColor Yellow
    Write-Host "   Consider creating a new project-based key" -ForegroundColor Gray
} else {
    Write-Host "❌ Invalid API Key format" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Permission check complete!" -ForegroundColor Green

