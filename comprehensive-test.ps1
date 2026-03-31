Import-Module Pester

# Configuration
$baseUrl = "http://localhost:3000"
$authorId = "test-teacher-001"
$testResults = @()

function Test-API {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Body,
        [int]$ExpectedStatus = 200
    )
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
            $params["Headers"] = @{"Content-Type" = "application/json"}
        }
        
        $response = Invoke-WebRequest @params
        $success = $response.StatusCode -eq $ExpectedStatus
        
        $result = @{
            Name = $Name
            Status = "✓ PASS"
            Details = "Status: $($response.StatusCode)"
        }
        
        if ($response.Content) {
            try {
                $content = $response.Content | ConvertFrom-Json
                $result["Details"] += " | Response: $($content | ConvertTo-Json -Compress)"
            } catch {
                $result["Details"] += " | Response: Valid Response"
            }
        }
        
        $testResults += $result
        Write-Host "✓ $Name - PASS" -ForegroundColor Green
        return $response
    } catch {
        $status = $_.Exception.Response.StatusCode.Value__
        $testResults += @{
            Name = $Name
            Status = "✗ FAIL"
            Details = "Status: $status | Error: $($_.Exception.Message)"
        }
        Write-Host "✗ $Name - FAIL (Status: $status)" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n========== SYSTEM HEALTH CHECK ==========" -ForegroundColor Cyan
Write-Host "Testing Dynamic Page Management System`n" -ForegroundColor White

# Test 1: Check if server is running
Write-Host "1. Testing Server Connection..." -ForegroundColor Yellow
$healthResponse = Test-API -Name "Server Health Check" -Method Get -Uri "$baseUrl/api/pages?authorId=$authorId"

if ($healthResponse) {
    # Test 2: Create a new page
    Write-Host "`n2. Creating New Page..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $pageBody = @{
        title = "Bài 1: Giới thiệu Web Development"
        slug = "bai-1-web-dev-$timestamp"
        description = "Bài giảng về cơ bản HTML, CSS, JavaScript"
        authorId = $authorId
        parentId = $null
    }
    $pageResponse = Test-API -Name "Create Page" -Method Post -Uri "$baseUrl/api/pages" -Body $pageBody -ExpectedStatus 201
    
    if ($pageResponse) {
        $page = $pageResponse.Content | ConvertFrom-Json
        $pageId = $page.id
        Write-Host "Page created: ID=$pageId`n"
        
        # Test 3: Create video block
        Write-Host "3. Creating Video Block..." -ForegroundColor Yellow
        $videoBody = @{
            pageId = $pageId
            type = "VIDEO"
            order = 0
        }
        $videoResponse = Test-API -Name "Create Video Block" -Method Post -Uri "$baseUrl/api/blocks" -Body $videoBody -ExpectedStatus 201
        
        if ($videoResponse) {
            $videoBlock = $videoResponse.Content | ConvertFrom-Json
            $videoBlockId = $videoBlock.id
            Write-Host "Video block created: ID=$videoBlockId`n"
            
            # Test 4: Update video block with YouTube URL
            Write-Host "4. Adding YouTube Video to Block..." -ForegroundColor Yellow
            $updateVideoBody = @{
                videoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
                videoType = "youtube"
                poster = "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
            }
            Test-API -Name "Update Video Block" -Method Put -Uri "$baseUrl/api/blocks/$videoBlockId" -Body $updateVideoBody
        }
        
        # Test 5: Create document block
        Write-Host "`n5. Creating Document Block..." -ForegroundColor Yellow
        $documentBody = @{
            pageId = $pageId
            type = "DOCUMENT"
            order = 1
        }
        $docResponse = Test-API -Name "Create Document Block" -Method Post -Uri "$baseUrl/api/blocks" -Body $documentBody -ExpectedStatus 201
        
        if ($docResponse) {
            $docBlock = $docResponse.Content | ConvertFrom-Json
            $docBlockId = $docBlock.id
            Write-Host "Document block created: ID=$docBlockId`n"
            
            # Test 6: Add document to block
            Write-Host "6. Adding Document to Block..." -ForegroundColor Yellow
            $addDocBody = @{
                title = "HTML Cheat Sheet"
                fileUrl = "https://example.com/html-cheatsheet.pdf"
                fileType = "pdf"
                fileSize = 2048000
            }
            Test-API -Name "Add Document" -Method Post -Uri "$baseUrl/api/blocks/$docBlockId/documents" -Body $addDocBody -ExpectedStatus 201
        }
        
        # Test 7: Create embed block
        Write-Host "`n7. Creating Embed Block..." -ForegroundColor Yellow
        $embedBody = @{
            pageId = $pageId
            type = "EMBED"
            order = 2
            embedCode = '<iframe src="https://example.com/quiz" width="100%" height="600" frameborder="0" allowfullscreen></iframe>'
        }
        $embedResponse = Test-API -Name "Create Embed Block" -Method Post -Uri "$baseUrl/api/blocks" -Body $embedBody -ExpectedStatus 201
        
        # Test 8: Fetch complete page with all blocks
        Write-Host "`n8. Fetching Complete Page Data..." -ForegroundColor Yellow
        Test-API -Name "Get Page with Blocks" -Method Get -Uri "$baseUrl/api/pages/$pageId"
        
        # Test 9: Update page (publish it)
        Write-Host "`n9. Publishing Page..." -ForegroundColor Yellow
        $updatePageBody = @{
            isPublished = $true
        }
        Test-API -Name "Update Page (Publish)" -Method Put -Uri "$baseUrl/api/pages/$pageId" -Body $updatePageBody
        
        # Test 10: Access public page
        Write-Host "`n10. Accessing Public Page..." -ForegroundColor Yellow
        $pageSlug = $page.slug
        Test-API -Name "Get Public Page" -Method Get -Uri "$baseUrl/api/public/pages/$pageSlug"
        
        # Test 11: Create child page
        Write-Host "`n11. Creating Child Page..." -ForegroundColor Yellow
        $childTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $childPageBody = @{
            title = "Bài 1.1: HTML Basics"
            slug = "bai-1-1-html-basics-$childTimestamp"
            description = "Tìm hiểu cấu trúc HTML"
            authorId = $authorId
            parentId = $pageId
        }
        $childResponse = Test-API -Name "Create Child Page" -Method Post -Uri "$baseUrl/api/pages" -Body $childPageBody -ExpectedStatus 201
    }
}

# Summary
Write-Host "`n========== TEST RESULTS SUMMARY ==========" -ForegroundColor Cyan
Write-Host "Total Tests: $($testResults.Count)" -ForegroundColor White

$passed = ($testResults | Where-Object { $_.Status -eq "✓ PASS" } | Measure-Object).Count
$failed = ($testResults | Where-Object { $_.Status -eq "✗ FAIL" } | Measure-Object).Count

Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed`n" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "✗ FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`n========== SYSTEM STATUS ==========" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "✓ All tests passed! System is healthy." -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed. Check details above." -ForegroundColor Red
}
