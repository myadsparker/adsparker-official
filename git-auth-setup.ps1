# Git Authentication Setup Script
# This script helps you configure Git authentication and select repositories

Write-Host "🔐 Git Authentication Setup" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check current Git configuration
Write-Host "📋 Current Git Configuration:" -ForegroundColor Yellow
$currentUser = git config --global user.name
$currentEmail = git config --global user.email
Write-Host "   User Name: $currentUser" -ForegroundColor Gray
Write-Host "   Email: $currentEmail" -ForegroundColor Gray
Write-Host ""

# Show current remote
Write-Host "🔗 Current Remote Configuration:" -ForegroundColor Yellow
try {
    $remoteUrl = git remote get-url origin
    Write-Host "   Remote URL: $remoteUrl" -ForegroundColor Gray
} catch {
    Write-Host "   No remote configured" -ForegroundColor Red
}
Write-Host ""

# Menu for actions
Write-Host "Select an action:" -ForegroundColor Green
Write-Host "1. Configure Git credentials (username/email)" -ForegroundColor White
Write-Host "2. Change remote repository URL" -ForegroundColor White
Write-Host "3. Set up GitHub Personal Access Token" -ForegroundColor White
Write-Host "4. Clear cached credentials" -ForegroundColor White
Write-Host "5. Test Git connection" -ForegroundColor White
Write-Host "6. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📝 Configure Git Credentials" -ForegroundColor Cyan
        Write-Host "-" * 40 -ForegroundColor Gray
        
        $newName = Read-Host "Enter your Git username"
        $newEmail = Read-Host "Enter your Git email"
        
        if ($newName -and $newEmail) {
            git config --global user.name $newName
            git config --global user.email $newEmail
            Write-Host "✅ Git credentials updated successfully!" -ForegroundColor Green
            Write-Host "   Name: $newName" -ForegroundColor Gray
            Write-Host "   Email: $newEmail" -ForegroundColor Gray
        } else {
            Write-Host "❌ Both name and email are required" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔗 Change Remote Repository" -ForegroundColor Cyan
        Write-Host "-" * 40 -ForegroundColor Gray
        
        Write-Host "Current remote:" -ForegroundColor Yellow
        try {
            $currentRemote = git remote get-url origin
            Write-Host "   $currentRemote" -ForegroundColor Gray
        } catch {
            Write-Host "   No remote configured" -ForegroundColor Red
        }
        Write-Host ""
        
        Write-Host "Repository URL options:" -ForegroundColor Yellow
        Write-Host "1. HTTPS (recommended for Personal Access Token)" -ForegroundColor White
        Write-Host "2. SSH (requires SSH key setup)" -ForegroundColor White
        Write-Host ""
        
        $urlChoice = Read-Host "Select URL type (1 or 2)"
        
        if ($urlChoice -eq "1") {
            $repoUrl = Read-Host "Enter HTTPS repository URL (e.g., https://github.com/myadsparker/adsparker-official.git)"
        } elseif ($urlChoice -eq "2") {
            $repoUrl = Read-Host "Enter SSH repository URL (e.g., git@github.com:myadsparker/adsparker-official.git)"
        } else {
            Write-Host "❌ Invalid choice" -ForegroundColor Red
            break
        }
        
        if ($repoUrl) {
            # Check if remote exists
            $remoteExists = git remote | Select-String -Pattern "origin" -Quiet
            
            if ($remoteExists) {
                git remote set-url origin $repoUrl
                Write-Host "✅ Remote URL updated successfully!" -ForegroundColor Green
            } else {
                git remote add origin $repoUrl
                Write-Host "✅ Remote added successfully!" -ForegroundColor Green
            }
            
            Write-Host "   New remote: $repoUrl" -ForegroundColor Gray
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔑 GitHub Personal Access Token Setup" -ForegroundColor Cyan
        Write-Host "-" * 40 -ForegroundColor Gray
        Write-Host ""
        Write-Host "To create a Personal Access Token:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor White
        Write-Host "2. Click 'Generate new token' -> 'Generate new token (classic)'" -ForegroundColor White
        Write-Host "3. Give it a name (e.g., 'AdSparker Project')" -ForegroundColor White
        Write-Host "4. Select scopes: repo (full control)" -ForegroundColor White
        Write-Host "5. Click 'Generate token'" -ForegroundColor White
        Write-Host "6. Copy the token (you won't see it again!)" -ForegroundColor White
        Write-Host ""
        
        $token = Read-Host "Enter your Personal Access Token" -AsSecureString
        $tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
        )
        
        if ($tokenPlain) {
            # Get current remote URL
            try {
                $remoteUrl = git remote get-url origin
                
                # If it's HTTPS, update with token
                if ($remoteUrl -like "https://*") {
                    # Extract repo path
                    if ($remoteUrl -match "https://github\.com/(.+)$") {
                        $repoPath = $matches[1]
                        $newUrl = "https://$tokenPlain@github.com/$repoPath"
                        git remote set-url origin $newUrl
                        Write-Host "✅ Remote URL updated with token!" -ForegroundColor Green
                        Write-Host "   Note: Token is embedded in URL. Use credential helper for better security." -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "⚠️  Current remote is not HTTPS. Token authentication works with HTTPS URLs." -ForegroundColor Yellow
                }
                
                # Set up credential helper (Windows Credential Manager)
                Write-Host ""
                Write-Host "Setting up Windows Credential Manager..." -ForegroundColor Yellow
                git config --global credential.helper manager-core
                Write-Host "✅ Credential helper configured!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Next time you push, enter your GitHub username and use the token as password." -ForegroundColor Cyan
            } catch {
                Write-Host "❌ Error: Could not get remote URL. Please set remote first (option 2)." -ForegroundColor Red
            }
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "🧹 Clear Cached Credentials" -ForegroundColor Cyan
        Write-Host "-" * 40 -ForegroundColor Gray
        
        Write-Host "This will clear cached Git credentials from Windows Credential Manager." -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure? (y/n)"
        
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            # Clear Git credentials from Windows Credential Manager
            cmdkey /list | Select-String -Pattern "git:" | ForEach-Object {
                if ($_ -match "Target: (.+)") {
                    $target = $matches[1]
                    cmdkey /delete:$target
                    Write-Host "✅ Deleted: $target" -ForegroundColor Green
                }
            }
            
            Write-Host ""
            Write-Host "✅ Cached credentials cleared!" -ForegroundColor Green
            Write-Host "   You'll be prompted for credentials on next Git operation." -ForegroundColor Gray
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "🧪 Test Git Connection" -ForegroundColor Cyan
        Write-Host "-" * 40 -ForegroundColor Gray
        
        try {
            $remoteUrl = git remote get-url origin
            Write-Host "Testing connection to: $remoteUrl" -ForegroundColor Yellow
            
            # Try to fetch (dry run)
            $result = git ls-remote origin 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Connection successful!" -ForegroundColor Green
                Write-Host "   You have access to this repository." -ForegroundColor Gray
            } else {
                Write-Host "❌ Connection failed!" -ForegroundColor Red
                Write-Host "   Error: $result" -ForegroundColor Red
                Write-Host ""
                Write-Host "Possible solutions:" -ForegroundColor Yellow
                Write-Host "   - Check your credentials (option 3)" -ForegroundColor White
                Write-Host "   - Verify repository URL (option 2)" -ForegroundColor White
                Write-Host "   - Clear cached credentials (option 4)" -ForegroundColor White
            }
        } catch {
            Write-Host "❌ Error: No remote configured. Use option 2 to set remote." -ForegroundColor Red
        }
    }
    
    "6" {
        Write-Host ""
        Write-Host "👋 Goodbye!" -ForegroundColor Cyan
        exit
    }
    
    default {
        Write-Host "❌ Invalid choice. Please select 1-6." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

