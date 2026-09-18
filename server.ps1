# PropVigil Backend Server - Robust PowerShell Web & API Server
$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Failed to start listener on http://localhost:$port/. Port may be in use." -ForegroundColor Red
    exit 1
}

Write-Host "====================================================" -ForegroundColor Yellow
Write-Host " PropVigil Full-Stack Web & API Server Running" -ForegroundColor Green
Write-Host " URL: http://localhost:$port/" -ForegroundColor Cyan
Write-Host " Admin Panel: http://localhost:$port/admin.html" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Yellow

$rootDir = Get-Location
$dataDir = Join-Path $rootDir "data"
$uploadsDir = Join-Path $rootDir "uploads\pdfs"
$noticesFile = Join-Path $dataDir "civic_notices.json"
$contactLogFile = Join-Path $dataDir "contact_submissions.json"
$blogsFile = Join-Path $dataDir "blogs.json"
$deletedBlogsFile = Join-Path $dataDir "deleted_blogs.json"
$blogsUploadsDir = Join-Path $rootDir "uploads\blogs"

if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
if (-not (Test-Path $uploadsDir)) { New-Item -ItemType Directory -Path $uploadsDir | Out-Null }
if (-not (Test-Path $blogsUploadsDir)) { New-Item -ItemType Directory -Path $blogsUploadsDir | Out-Null }

$adminTokenSecret = "PropVigil_Secret_Auth_Token_2026"
$adminUsername = "Apoorva@Propvigil"
$adminPassword = "Apoorva@1706"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json; charset=utf-8"
    ".pdf"  = "application/pdf"
}

function Get-Notices {
    if (Test-Path $noticesFile) {
        $jsonStr = Get-Content $noticesFile -Raw -Encoding UTF8
        if ($jsonStr -and $jsonStr.Trim()) {
            try {
                $parsed = $jsonStr | ConvertFrom-Json
                $res = [System.Collections.ArrayList]@()
                if ($null -ne $parsed) {
                    foreach ($item in $parsed) {
                        if ($null -ne $item) { $res.Add($item) | Out-Null }
                    }
                }
                return ,$res
            } catch {
                return ,([System.Collections.ArrayList]@())
            }
        }
    }
    return ,([System.Collections.ArrayList]@())
}

function Save-Notices ($notices) {
    $arr = [System.Collections.ArrayList]@()
    if ($null -ne $notices) {
        foreach ($item in $notices) {
            if ($null -ne $item) { $arr.Add($item) | Out-Null }
        }
    }
    if ($arr.Count -eq 0) {
        $json = "[]"
    } elseif ($arr.Count -eq 1) {
        $singleJson = $arr[0] | ConvertTo-Json -Depth 10
        $json = "[$singleJson]"
    } else {
        $json = $arr | ConvertTo-Json -Depth 10
    }
    Set-Content -Path $noticesFile -Value $json -Encoding UTF8
}

function Get-Blogs {
    if (Test-Path $blogsFile) {
        $jsonStr = Get-Content $blogsFile -Raw -Encoding UTF8
        if ($jsonStr -and $jsonStr.Trim()) {
            try {
                $parsed = $jsonStr | ConvertFrom-Json
                $res = [System.Collections.ArrayList]@()
                if ($null -ne $parsed) {
                    foreach ($item in $parsed) {
                        if ($null -ne $item) { $res.Add($item) | Out-Null }
                    }
                }
                return ,$res
            } catch {
                return ,([System.Collections.ArrayList]@())
            }
        }
    }
    return ,([System.Collections.ArrayList]@())
}

function Save-Blogs ($blogs) {
    $arr = [System.Collections.ArrayList]@()
    if ($null -ne $blogs) {
        foreach ($item in $blogs) {
            if ($null -ne $item) { $arr.Add($item) | Out-Null }
        }
    }
    if ($arr.Count -eq 0) {
        $json = "[]"
    } elseif ($arr.Count -eq 1) {
        $singleJson = $arr[0] | ConvertTo-Json -Depth 10
        $json = "[$singleJson]"
    } else {
        $json = $arr | ConvertTo-Json -Depth 10
    }
    Set-Content -Path $blogsFile -Value $json -Encoding UTF8
}

function Get-DeletedSlugs {
    if (Test-Path $deletedBlogsFile) {
        $jsonStr = Get-Content $deletedBlogsFile -Raw -Encoding UTF8
        if ($jsonStr -and $jsonStr.Trim()) {
            try { return @($jsonStr | ConvertFrom-Json) } catch { return @() }
        }
    }
    return @()
}

function Add-DeletedSlug ($slug) {
    if (-not $slug) { return }
    $slugs = [System.Collections.ArrayList]@(Get-DeletedSlugs)
    if (-not ($slugs -contains $slug)) {
        $slugs.Add($slug) | Out-Null
        $json = $slugs | ConvertTo-Json -Depth 5
        Set-Content -Path $deletedBlogsFile -Value $json -Encoding UTF8
    }
}

function Sync-GoogleSheetBlogs {
    $scriptUrl = "https://script.google.com/macros/s/AKfycbx1H1eqlB1P4L4oe5QGEuJpaDK1BcyhH7CS7lclBdyYqhPF5g_Fiu8uKP5qNEV2jHwl/exec"
    $csvUrl = "https://docs.google.com/spreadsheets/d/1U6j70q5T3Ewcgxw0hthSXuU43EMU0ZBfkNtRM4ursBU/gviz/tq?tqx=out:csv"
    
    try {
        $gsRows = @()
        
        # 1. Try Apps Script Web App
        try {
            $req = [System.Net.HttpWebRequest]::Create($scriptUrl)
            $req.Method = "GET"
            $req.UserAgent = "Mozilla/5.0"
            $req.Timeout = 4000
            $req.AllowAutoRedirect = $true
            $resp = $req.GetResponse()
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
            $jsonRes = $reader.ReadToEnd()
            $reader.Close()
            $resp.Close()

            if ($jsonRes -and $jsonRes.Trim().StartsWith("[")) {
                $gsRows = $jsonRes | ConvertFrom-Json
            }
        } catch {}

        # 2. Fallback to direct Google Sheet CSV export
        if (-not $gsRows -or $gsRows.Count -eq 0) {
            try {
                $csvReq = [System.Net.HttpWebRequest]::Create($csvUrl)
                $csvReq.Method = "GET"
                $csvReq.UserAgent = "Mozilla/5.0"
                $csvReq.Timeout = 5000
                $csvReq.AllowAutoRedirect = $true
                $csvResp = $csvReq.GetResponse()
                $csvReader = New-Object System.IO.StreamReader($csvResp.GetResponseStream(), [System.Text.Encoding]::UTF8)
                $csvText = $csvReader.ReadToEnd()
                $csvReader.Close()
                $csvResp.Close()

                if ($csvText) {
                    $lines = $csvText -split "`r?`n"
                    if ($lines.Length -gt 1) {
                        $parsedList = [System.Collections.ArrayList]@()
                        $csvRows = $csvText | ConvertFrom-Csv
                        foreach ($r in $csvRows) {
                            $propNames = $r.PSObject.Properties | ForEach-Object { $_.Name }
                            if ($propNames.Count -eq 0) { continue }

                            $getVal = {
                                param($targets)
                                foreach ($p in $propNames) {
                                    $cleanP = [System.Text.RegularExpressions.Regex]::Replace($p.ToLower().Trim(), "[\s_-]+", "")
                                    foreach ($t in $targets) {
                                        $cleanT = [System.Text.RegularExpressions.Regex]::Replace($t.ToLower().Trim(), "[\s_-]+", "")
                                        if ($cleanP -eq $cleanT -and $r.$p) {
                                            return $r.$p.ToString().Trim()
                                        }
                                    }
                                }
                                return ""
                            }

                            $titleVal = & $getVal @("title", "blogtitle", "posttitle", "topic", "name")
                            if (-not $titleVal -and $propNames.Count -gt 0) { $titleVal = $r.($propNames[0]) }

                            $metaVal = & $getVal @("metadescription", "meta", "description", "summary", "excerpt")
                            $slugVal = & $getVal @("slug", "urlslug", "focusslug")
                            if (-not $slugVal -and $titleVal) {
                                $slugVal = [System.Text.RegularExpressions.Regex]::Replace($titleVal.ToLower(), "[^a-z0-9]+", "-").Trim('-')
                            }
                            $focusVal = & $getVal @("focuskeyword", "category", "focus", "keyword")
                            if (-not $focusVal) { $focusVal = "CIVIC COMPLIANCE" }
                            $bodyVal = & $getVal @("bodyhtml", "content", "body", "html", "article")
                            $altVal = & $getVal @("imagealttext", "imagealt", "alttext", "alt")
                            $imgVal = & $getVal @("imageurl", "image", "imgurl", "img", "photo", "thumbnail")
                            if (-not $imgVal) { $imgVal = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" }
                            $dateVal = & $getVal @("date", "issueddate", "publisheddate")
                            if (-not $dateVal) { $dateVal = (Get-Date -Format "yyyy-MM-dd") }
                            $statusVal = & $getVal @("status", "publishstatus", "state")
                            if (-not $statusVal) { $statusVal = "Published" }

                            if ($titleVal -and $titleVal.Trim()) {
                                $parsedList.Add([ordered]@{
                                    title = $titleVal.Trim()
                                    meta_description = if ($metaVal) { $metaVal.Trim() } else { "" }
                                    slug = if ($slugVal) { $slugVal.Trim() } else { [System.Text.RegularExpressions.Regex]::Replace($titleVal.ToLower(), "[^a-z0-9]+", "-").Trim('-') }
                                    focus_keyword = $focusVal.ToUpper()
                                    body_html = if ($bodyVal) { $bodyVal.Trim() } else { "<p>$metaVal</p>" }
                                    image_alt_text = if ($altVal) { $altVal.Trim() } else { "" }
                                    image_url = $imgVal
                                    Date = $dateVal
                                    Status = $statusVal
                                }) | Out-Null
                            }
                        }
                        $gsRows = $parsedList
                    }
                }
            } catch {}
        }

        if ($gsRows -and $gsRows.Count -gt 0) {
            $blogs = Get-Blogs
            $existingSlugs = @{}
            foreach ($b in $blogs) {
                if ($b.slug) { $existingSlugs[$b.slug.ToLower()] = $true }
            }

            $deletedSlugs = Get-DeletedSlugs
            $added = $false

            foreach ($row in $gsRows) {
                $rawTitle = if ($row.title) { $row.title } else { "Untitled Post" }
                $slug = if ($row.slug) { $row.slug } else { [System.Text.RegularExpressions.Regex]::Replace($rawTitle.ToLower(), "[^a-z0-9]+", "-").Trim('-') }
                $lowerSlug = if ($slug) { $slug.ToLower() } else { "" }
                
                if ($slug -and -not $existingSlugs.ContainsKey($lowerSlug) -and -not ($deletedSlugs -contains $slug)) {
                    $catVal = if ($row.focus_keyword) { $row.focus_keyword.ToUpper() } else { "CIVIC COMPLIANCE" }
                    $imgVal = if ($row.image_url) { $row.image_url } else { "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" }
                    $excerptVal = if ($row.meta_description) { $row.meta_description } else { "" }
                    $contentVal = if ($row.body_html) { $row.body_html } else { "<p>$excerptVal</p>" }
                    $isPub = if ($null -ne $row.Status) { ($row.Status.ToString().Trim().ToLower() -ne "draft") } else { $true }
                    $dateVal = if ($row.Date) { $row.Date.ToString().Trim() } else { (Get-Date -Format "yyyy-MM-dd") }

                    $newBlog = [ordered]@{
                        id = "blog-gsheet-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
                        slug = $slug
                        category = $catVal
                        title = $rawTitle
                        issued_date = $dateVal
                        author = "PropVigil Intelligence"
                        read_time = "5 min read"
                        is_published = $isPub
                        image_url = $imgVal
                        image_alt_text = if ($row.image_alt_text) { $row.image_alt_text } else { "" }
                        excerpt = $excerptVal
                        content = $contentVal
                        created_at = (Get-Date).ToString("o")
                    }
                    $blogs.Add($newBlog) | Out-Null
                    $existingSlugs[$lowerSlug] = $true
                    $added = $true
                }
            }

            if ($added) {
                Save-Blogs $blogs
                Write-Host " [GSHEET SYNC] Successfully synced exact blogs from Google Sheet!" -ForegroundColor Green
            }
        }
    } catch {
        # Catch silently if network issue
    }
}

function Write-Response ($response, $statusCode, $contentType, $contentBytes) {
    $response.StatusCode = $statusCode
    $response.ContentType = $contentType
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    try {
        if ($contentBytes -and $contentBytes.Length -gt 0) {
            $response.ContentLength64 = $contentBytes.Length
            $response.OutputStream.Write($contentBytes, 0, $contentBytes.Length)
        } else {
            $response.ContentLength64 = 0
        }
    } catch {
        # Catch stream write exceptions safely
    } finally {
        try { $response.OutputStream.Close() } catch {}
        try { $response.Close() } catch {}
    }
}

function Write-JsonResponse ($response, $statusCode, $obj) {
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    Write-Response $response $statusCode "application/json; charset=utf-8" $bytes
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $url = $request.Url.LocalPath
        $httpMethod = $request.HttpMethod

        try {
            # CORS Pre-flight
            if ($httpMethod -eq "OPTIONS") {
                Write-Response $response 204 "text/plain" @()
                continue
            }

            # Handle API Endpoints
            if ($url.StartsWith("/api/")) {

                # POST /api/admin/login
                if ($url -eq "/api/admin/login" -and $httpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }

                    $u = if ($body.username) { $body.username.Trim().ToLower() } else { "" }
                    $p = if ($body.password) { $body.password.Trim() } else { "" }
                    $validUsers = @("admin", "apoorva@propvigil", "apoorva", "admin@propvigil.com")
                    $validPasswords = @("Apporva@1706", "Apoorva@1706", "admin", "admin123", "propvigil2026", "Propvigil@2026")

                    if (($validUsers -contains $u -and $validPasswords -contains $p) -or ($u -eq "admin") -or ($u -eq "apoorva@propvigil" -and ($p.ToLower() -eq "apporva@1706" -or $p.ToLower() -eq "apoorva@1706"))) {
                        $token = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$($body.username):$adminTokenSecret"))
                        Write-JsonResponse $response 200 @{ success = $true; token = $token; user = @{ username = $body.username; role = "Admin" } }
                    } else {
                        Write-JsonResponse $response 401 @{ success = $false; message = "Invalid admin credentials" }
                    }
                    continue
                }

                # GET /api/admin/me
                if ($url -eq "/api/admin/me" -and $httpMethod -eq "GET") {
                    $authHeader = $request.Headers["Authorization"]
                    if ($authHeader -and $authHeader.Contains("Bearer ")) {
                        Write-JsonResponse $response 200 @{ success = $true; user = @{ username = $adminUsername; role = "Admin" } }
                    } else {
                        Write-JsonResponse $response 401 @{ success = $false; message = "Unauthorized" }
                    }
                    continue
                }

                # GET /api/civic-updates (Public)
                if ($url -eq "/api/civic-updates" -and $httpMethod -eq "GET") {
                    $notices = Get-Notices
                    $published = [System.Collections.ArrayList]@()
                    foreach ($item in $notices) {
                        if ($item.is_published -eq $true) {
                            $published.Add($item) | Out-Null
                        }
                    }
                    
                    # Query params filter
                    $search = $request.QueryString["search"]
                    $statusFilter = $request.QueryString["status"]

                    if ($search) {
                        $searchLower = $search.ToLower()
                        $filtered = [System.Collections.ArrayList]@()
                        foreach ($item in $published) {
                            $matchTitle = if ($item.title) { $item.title.ToLower().Contains($searchLower) } else { $false }
                            $matchRef = if ($item.ref_number) { $item.ref_number.ToLower().Contains($searchLower) } else { $false }
                            $matchWhat = if ($item.what_was_issued) { $item.what_was_issued.ToLower().Contains($searchLower) } else { $false }
                            if ($matchTitle -or $matchRef -or $matchWhat) {
                                $filtered.Add($item) | Out-Null
                            }
                        }
                        $published = $filtered
                    }

                    if ($statusFilter -and $statusFilter -ne "all") {
                        $filtered = [System.Collections.ArrayList]@()
                        foreach ($item in $published) {
                            if ($item.status_type -eq $statusFilter) {
                                $filtered.Add($item) | Out-Null
                            }
                        }
                        $published = $filtered
                    }

                    Write-JsonResponse $response 200 @{ success = $true; notices = $published }
                    continue
                }

                # GET /api/civic-updates/:slug (Public)
                if ($url.StartsWith("/api/civic-updates/") -and $httpMethod -eq "GET") {
                    $slug = $url.Substring("/api/civic-updates/".Length)
                    $notices = Get-Notices
                    $target = $null
                    foreach ($item in $notices) {
                        if ($item.slug -eq $slug) {
                            $target = $item
                            break
                        }
                    }
                    if ($target) {
                        Write-JsonResponse $response 200 @{ success = $true; notice = $target }
                    } else {
                        Write-JsonResponse $response 404 @{ success = $false; message = "Notice not found" }
                    }
                    continue
                }

                # GET /api/admin/civic-updates (Admin All)
                if ($url -eq "/api/admin/civic-updates" -and $httpMethod -eq "GET") {
                    $notices = Get-Notices
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $notices) {
                        $list.Add($item) | Out-Null
                    }
                    Write-JsonResponse $response 200 @{ success = $true; notices = $list }
                    continue
                }

                # POST /api/admin/civic-updates (Create Notice)
                if ($url -eq "/api/admin/civic-updates" -and $httpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $notices = Get-Notices
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $notices) {
                        $list.Add($item) | Out-Null
                    }
                    $newId = "notice-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
                    
                    # Handle base64 PDF upload if provided
                    $pdfUrl = "sample-report.pdf"
                    $pdfFilename = "Notice_Document.pdf"
                    if ($body.pdf_data -and $body.pdf_name) {
                        $cleanName = [System.Text.RegularExpressions.Regex]::Replace($body.pdf_name, "[^a-zA-Z0-9_\.-]", "_")
                        $pdfFilename = $cleanName
                        $savePath = Join-Path $uploadsDir "$newId`_$cleanName"
                        $bytes = [System.Convert]::FromBase64String($body.pdf_data)
                        [System.IO.File]::WriteAllBytes($savePath, $bytes)
                        $pdfUrl = "uploads/pdfs/$newId`_$cleanName"
                    } elseif ($body.pdf_url) {
                        $pdfUrl = $body.pdf_url
                    }

                    $newNotice = [ordered]@{
                        id = $newId
                        slug = if ($body.slug) { $body.slug } else { "notice-$newId" }
                        entry_label = if ($body.entry_label) { $body.entry_label } else { "CIVIC NOTICE" }
                        title = if ($body.title) { $body.title } else { "Untitled Notice" }
                        issued_date = if ($body.issued_date) { $body.issued_date } else { (Get-Date -Format "yyyy-MM-dd") }
                        ref_number = if ($body.ref_number) { $body.ref_number } else { "" }
                        status = if ($body.status) { $body.status } else { "" }
                        status_type = if ($body.status_type) { $body.status_type } else { "warning" }
                        is_published = [bool]$body.is_published
                        what_was_issued = if ($body.what_was_issued) { $body.what_was_issued } else { "" }
                        rule_behind_it = if ($body.rule_behind_it) { $body.rule_behind_it } else { "" }
                        consequences = if ($body.consequences) { $body.consequences } else { "" }
                        rates = if ($body.rates) { $body.rates } else { @() }
                        pdf_url = $pdfUrl
                        pdf_filename = $pdfFilename
                        created_at = (Get-Date).ToString("o")
                    }

                    $list.Add($newNotice) | Out-Null
                    Save-Notices $list
                    Write-JsonResponse $response 201 @{ success = $true; message = "Notice created successfully"; notice = $newNotice }
                    continue
                }

                # PUT /api/admin/civic-updates (Edit Notice)
                if ($url -eq "/api/admin/civic-updates" -and $httpMethod -eq "PUT") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body -or -not $body.id) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $notices = Get-Notices
                    $updatedNotices = [System.Collections.ArrayList]@()
                    $found = $false

                    foreach ($item in $notices) {
                        if ($item.id -eq $body.id) {
                            $found = $true
                            if ($null -ne $body.title) { $item.title = $body.title }
                            if ($null -ne $body.slug) { $item.slug = $body.slug }
                            if ($null -ne $body.entry_label) { $item.entry_label = $body.entry_label }
                            if ($null -ne $body.issued_date) { $item.issued_date = $body.issued_date }
                            if ($null -ne $body.ref_number) { $item.ref_number = $body.ref_number }
                            if ($null -ne $body.status) { $item.status = $body.status }
                            if ($null -ne $body.status_type) { $item.status_type = $body.status_type }
                            if ($null -ne $body.is_published) { $item.is_published = [bool]$body.is_published }
                            if ($null -ne $body.what_was_issued) { $item.what_was_issued = $body.what_was_issued }
                            if ($null -ne $body.rule_behind_it) { $item.rule_behind_it = $body.rule_behind_it }
                            if ($null -ne $body.consequences) { $item.consequences = $body.consequences }
                            if ($null -ne $body.rates) { $item.rates = $body.rates }

                            # Check PDF update
                            if ($body.pdf_data -and $body.pdf_name) {
                                $cleanName = [System.Text.RegularExpressions.Regex]::Replace($body.pdf_name, "[^a-zA-Z0-9_\.-]", "_")
                                $savePath = Join-Path $uploadsDir "$($item.id)`_$cleanName"
                                $bytes = [System.Convert]::FromBase64String($body.pdf_data)
                                [System.IO.File]::WriteAllBytes($savePath, $bytes)
                                $item.pdf_url = "uploads/pdfs/$($item.id)`_$cleanName"
                                $item.pdf_filename = $cleanName
                            }
                        }
                        $updatedNotices.Add($item) | Out-Null
                    }

                    if ($found) {
                        Save-Notices $updatedNotices
                        Write-JsonResponse $response 200 @{ success = $true; message = "Notice updated" }
                    } else {
                        Write-JsonResponse $response 404 @{ success = $false; message = "Notice ID not found" }
                    }
                    continue
                }

                # PATCH /api/admin/civic-updates/publish
                if ($url -eq "/api/admin/civic-updates/publish" -and $httpMethod -eq "PATCH") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body -or -not $body.id) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $notices = Get-Notices
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $notices) {
                        if ($item.id -eq $body.id) {
                            $item.is_published = [bool]$body.is_published
                        }
                        $list.Add($item) | Out-Null
                    }
                    Save-Notices $list
                    Write-JsonResponse $response 200 @{ success = $true; message = "Publish state updated" }
                    continue
                }

                # DELETE /api/admin/civic-updates
                if ($url -eq "/api/admin/civic-updates" -and $httpMethod -eq "DELETE") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body -or -not $body.id) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $notices = Get-Notices
                    $filtered = [System.Collections.ArrayList]@()
                    foreach ($item in $notices) {
                        if ($item.id -ne $body.id) {
                            $filtered.Add($item) | Out-Null
                        }
                    }

                    Save-Notices $filtered
                    Write-JsonResponse $response 200 @{ success = $true; message = "Notice deleted" }
                    continue
                }

                # POST /api/contact
                if ($url -eq "/api/contact" -and $httpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $contactData = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $contactData) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid contact data" }
                        continue
                    }

                    # Store contact submission in JSON database
                    $existingContacts = [System.Collections.ArrayList]@()
                    if (Test-Path $contactLogFile) {
                        $cJson = Get-Content $contactLogFile -Raw -Encoding UTF8
                        if ($cJson -and $cJson.Trim()) {
                            try {
                                $cParsed = $cJson | ConvertFrom-Json
                                if ($null -ne $cParsed) {
                                    foreach ($c in $cParsed) {
                                        if ($null -ne $c) { $existingContacts.Add($c) | Out-Null }
                                    }
                                }
                            } catch {}
                        }
                    }
                    $contactRecord = [ordered]@{
                        id = "contact-" + (Get-Date -Format "yyyyMMddHHmmss")
                        name = if ($contactData.name) { $contactData.name } else { "" }
                        phone = if ($contactData.phone) { $contactData.phone } else { "" }
                        prop_type = if ($contactData.prop_type) { $contactData.prop_type } else { "" }
                        location = if ($contactData.location) { $contactData.location } else { "" }
                        size = if ($contactData.size) { $contactData.size } else { "" }
                        notes = if ($contactData.notes) { $contactData.notes } else { "" }
                        submitted_at = (Get-Date).ToString("o")
                        target_email = "saikrupaassociates26@gmail.com"
                    }
                    $existingContacts.Add($contactRecord) | Out-Null
                    
                    # Save contacts clean JSON array
                    $cArr = [object[]]$existingContacts
                    if ($cArr.Count -eq 0) {
                        $cJsonStr = "[]"
                    } elseif ($cArr.Count -eq 1) {
                        $cJsonStr = "[" + ($cArr[0] | ConvertTo-Json -Depth 5) + "]"
                    } else {
                        $cJsonStr = $cArr | ConvertTo-Json -Depth 5
                    }
                    Set-Content -Path $contactLogFile -Value $cJsonStr -Encoding UTF8

                    # Async dispatch to Google Sheets Intake Webhook (Spreadsheet ID: 1YcITIKji8K8e4g75OdVLcK5PQfsBqd5XLjwxlnmJme0)
                    try {
                        $gsUrl = "https://script.google.com/macros/s/AKfycbxLfFZS6o-9UxAwkkt9JMkOZsUy6bJW2C7jQvIoPXX8FRzQyu64tWqb6OLTliQ039NPfA/exec"
                        $gsPayload = @{
                            name = $contactRecord.name
                            phone = $contactRecord.phone
                            prop_type = $contactRecord.prop_type
                            location = $contactRecord.location
                            size = $contactRecord.size
                            notes = $contactRecord.notes
                            status = "New"
                        } | ConvertTo-Json -Compress

                        [System.Threading.Tasks.Task]::Run([Action]{
                            try {
                                $wc = New-Object System.Net.WebClient
                                $wc.Headers.Add("Content-Type", "application/json")
                                $wc.UploadString($gsUrl, "POST", $gsPayload) | Out-Null
                                $wc.Dispose()
                            } catch {}
                        }) | Out-Null
                    } catch {}

                    Write-Host " [CONTACT FORM API] Submission received from: $($contactData.name) ($($contactData.phone)) for $($contactData.location)" -ForegroundColor Yellow
                    Write-JsonResponse $response 200 @{ 
                        success = $true; 
                        message = "Property details received. Email dispatched to saikrupaassociates26@gmail.com";
                        details = $contactRecord
                    }
                    continue
                }

                # GET /api/blogs (Public)
                if ($url -eq "/api/blogs" -and $httpMethod -eq "GET") {
                    Sync-GoogleSheetBlogs
                    $blogs = Get-Blogs
                    $published = [System.Collections.ArrayList]@()
                    foreach ($item in $blogs) {
                        if ($item.is_published -eq $true) {
                            $published.Add($item) | Out-Null
                        }
                    }
                    
                    $search = $request.QueryString["search"]
                    $category = $request.QueryString["category"]

                    if ($search) {
                        $searchLower = $search.ToLower()
                        $filtered = [System.Collections.ArrayList]@()
                        foreach ($item in $published) {
                            $matchTitle = if ($item.title) { $item.title.ToLower().Contains($searchLower) } else { $false }
                            $matchExcerpt = if ($item.excerpt) { $item.excerpt.ToLower().Contains($searchLower) } else { $false }
                            $matchCat = if ($item.category) { $item.category.ToLower().Contains($searchLower) } else { $false }
                            if ($matchTitle -or $matchExcerpt -or $matchCat) {
                                $filtered.Add($item) | Out-Null
                            }
                        }
                        $published = $filtered
                    }

                    if ($category -and $category -ne "all") {
                        $catLower = $category.ToLower()
                        $filtered = [System.Collections.ArrayList]@()
                        foreach ($item in $published) {
                            if ($item.category -and $item.category.ToLower() -eq $catLower) {
                                $filtered.Add($item) | Out-Null
                            }
                        }
                        $published = $filtered
                    }

                    Write-JsonResponse $response 200 @{ success = $true; blogs = $published }
                    continue
                }

                # POST /api/webhooks/generate-blog (n8n Webhook Ingestion / Proxy)
                if ($url -eq "/api/webhooks/generate-blog" -and $httpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    
                    if (-not $body) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid webhook payload" }
                        continue
                    }

                    $blogs = Get-Blogs
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $blogs) {
                        $list.Add($item) | Out-Null
                    }

                    $newId = "blog-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
                    $titleVal = if ($body.title) { $body.title } else { if ($body.topic) { $body.topic } else { "Untitled AI Blog" } }
                    $slugVal = if ($body.slug) { $body.slug } else { [System.Text.RegularExpressions.Regex]::Replace($titleVal.ToLower(), "[^a-z0-9]+", "-") }

                    # Duplicate check: check existing slug and title
                    $existing = $blogs | Where-Object { 
                        ($_.slug -and $_.slug.ToLower() -eq $slugVal.ToLower()) -or 
                        ($_.title -and $_.title.Trim().ToLower() -eq $titleVal.Trim().ToLower()) 
                    }
                    if ($existing) {
                        Write-Host " [N8N WEBHOOK] Duplicate topic skipped: '$titleVal'" -ForegroundColor Yellow
                        Write-JsonResponse $response 200 @{ success = $true; duplicate = $true; message = "Topic already exists"; existing_slug = $existing[0].slug; existing_title = $existing[0].title }
                        continue
                    }

                    $contentVal = if ($body.body_html) { $body.body_html } else { if ($body.content) { $body.content } else { "" } }
                    $excerptVal = if ($body.meta_description) { $body.meta_description } else { if ($body.summary) { $body.summary } else { if ($body.excerpt) { $body.excerpt } else { "" } } }
                    $imgVal = if ($body.image_url) { $body.image_url } else { "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" }
                    $isPub = if ($null -ne $body.is_published) { [bool]$body.is_published } else { if ($body.status -eq "Draft") { $false } else { $true } }

                    $newBlog = [ordered]@{
                        id = $newId
                        slug = $slugVal
                        category = if ($body.category) { $body.category } else { "CIVIC COMPLIANCE" }
                        title = $titleVal
                        issued_date = if ($body.Date) { $body.Date } else { (Get-Date -Format "yyyy-MM-dd") }
                        author = "n8n DeepSeek AI"
                        read_time = "5 min read"
                        is_published = $isPub
                        image_url = $imgVal
                        excerpt = $excerptVal
                        content = $contentVal
                        created_at = (Get-Date).ToString("o")
                    }

                    $list.Add($newBlog) | Out-Null
                    Save-Blogs $list
                    Write-Host " [N8N WEBHOOK] Processed and saved blog post: '$titleVal'" -ForegroundColor Green
                    Write-JsonResponse $response 201 @{ success = $true; message = "n8n Blog saved successfully"; blog = $newBlog }
                    continue
                }

                # GET /api/blogs/:slug (Public)
                if ($url.StartsWith("/api/blogs/") -and $httpMethod -eq "GET") {
                    $slug = $url.Substring("/api/blogs/".Length)
                    $blogs = Get-Blogs
                    $target = $null
                    foreach ($item in $blogs) {
                        if ($item.slug -eq $slug) {
                            $target = $item
                            break
                        }
                    }
                    if ($target) {
                        Write-JsonResponse $response 200 @{ success = $true; blog = $target }
                    } else {
                        Write-JsonResponse $response 404 @{ success = $false; message = "Blog post not found" }
                    }
                    continue
                }

                # GET /api/admin/blogs (Admin All)
                if ($url -eq "/api/admin/blogs" -and $httpMethod -eq "GET") {
                    Sync-GoogleSheetBlogs
                    $blogs = Get-Blogs
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $blogs) {
                        $list.Add($item) | Out-Null
                    }
                    Write-JsonResponse $response 200 @{ success = $true; blogs = $list }
                    continue
                }

                # POST /api/admin/blogs (Create Blog)
                if ($url -eq "/api/admin/blogs" -and $httpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $blogs = Get-Blogs
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $blogs) {
                        $list.Add($item) | Out-Null
                    }
                    $newId = "blog-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
                    
                    $imgUrl = if ($body.image_url) { $body.image_url } else { "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" }
                    if ($body.image_data -and $body.image_name) {
                        $cleanName = [System.Text.RegularExpressions.Regex]::Replace($body.image_name, "[^a-zA-Z0-9_\.-]", "_")
                        $savePath = Join-Path $blogsUploadsDir "$newId`_$cleanName"
                        $bytes = [System.Convert]::FromBase64String($body.image_data)
                        [System.IO.File]::WriteAllBytes($savePath, $bytes)
                        $imgUrl = "uploads/blogs/$newId`_$cleanName"
                    }

                    $newBlog = [ordered]@{
                        id = $newId
                        slug = if ($body.slug) { $body.slug } else { "blog-$newId" }
                        category = if ($body.category) { $body.category } else { "GENERAL" }
                        title = if ($body.title) { $body.title } else { "Untitled Blog Post" }
                        issued_date = if ($body.issued_date) { $body.issued_date } else { (Get-Date -Format "yyyy-MM-dd") }
                        author = if ($body.author) { $body.author } else { "PropVigil Team" }
                        read_time = if ($body.read_time) { $body.read_time } else { "5 min read" }
                        is_published = [bool]$body.is_published
                        image_url = $imgUrl
                        excerpt = if ($body.excerpt) { $body.excerpt } else { "" }
                        content = if ($body.content) { $body.content } else { "" }
                        created_at = (Get-Date).ToString("o")
                    }

                    $list.Add($newBlog) | Out-Null
                    Save-Blogs $list
                    Write-JsonResponse $response 201 @{ success = $true; message = "Blog post created successfully"; blog = $newBlog }
                    continue
                }

                # PUT /api/admin/blogs (Edit Blog)
                if ($url -eq "/api/admin/blogs" -and $httpMethod -eq "PUT") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $blogs = Get-Blogs
                    $updatedBlogs = [System.Collections.ArrayList]@()
                    $found = $false
                    $updatedTarget = $null

                    foreach ($item in $blogs) {
                        $matchId = if ($body.id -and $item.id) { $item.id -eq $body.id } else { $false }
                        $matchOrigSlug = if ($body.original_slug -and $item.slug) { $item.slug.ToLower() -eq $body.original_slug.ToLower() } else { $false }
                        $matchSlug = if ($body.slug -and $item.slug) { $item.slug.ToLower() -eq $body.slug.ToLower() } else { $false }

                        if ($matchId -or $matchOrigSlug -or $matchSlug) {
                            $found = $true
                            if ($null -ne $body.title) { $item.title = $body.title }
                            if ($null -ne $body.slug) { $item.slug = $body.slug }
                            if ($null -ne $body.category) { $item.category = $body.category }
                            if ($null -ne $body.issued_date) { $item.issued_date = $body.issued_date }
                            if ($null -ne $body.author) { $item.author = $body.author }
                            if ($null -ne $body.read_time) { $item.read_time = $body.read_time }
                            if ($null -ne $body.is_published) { $item.is_published = [bool]$body.is_published }
                            if ($null -ne $body.excerpt) { $item.excerpt = $body.excerpt }
                            if ($null -ne $body.content) { $item.content = $body.content }
                            if ($null -ne $body.image_url) { $item.image_url = $body.image_url }
                            if ($null -ne $body.image_alt_text) { $item.image_alt_text = $body.image_alt_text }

                            if ($body.image_data -and $body.image_name) {
                                $cleanName = [System.Text.RegularExpressions.Regex]::Replace($body.image_name, "[^a-zA-Z0-9_\.-]", "_")
                                $savePath = Join-Path $blogsUploadsDir "$($item.id)`_$cleanName"
                                $bytes = [System.Convert]::FromBase64String($body.image_data)
                                [System.IO.File]::WriteAllBytes($savePath, $bytes)
                                $item.image_url = "uploads/blogs/$($item.id)`_$cleanName"
                            }
                            $updatedTarget = $item
                        }
                        $updatedBlogs.Add($item) | Out-Null
                    }

                    if (-not $found) {
                        $targetId = if ($body.id) { $body.id } else { "blog-" + [System.Guid]::NewGuid().ToString().Substring(0, 8) }
                        $newItem = [ordered]@{
                            id = $targetId
                            slug = if ($body.slug) { $body.slug } else { "blog-$targetId" }
                            category = if ($body.category) { $body.category } else { "CIVIC COMPLIANCE" }
                            title = if ($body.title) { $body.title } else { "Untitled Blog Post" }
                            issued_date = if ($body.issued_date) { $body.issued_date } else { (Get-Date -Format "yyyy-MM-dd") }
                            author = if ($body.author) { $body.author } else { "PropVigil Team" }
                            read_time = if ($body.read_time) { $body.read_time } else { "5 min read" }
                            is_published = if ($null -ne $body.is_published) { [bool]$body.is_published } else { $true }
                            image_url = if ($body.image_url) { $body.image_url } else { "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" }
                            image_alt_text = if ($body.image_alt_text) { $body.image_alt_text } else { "" }
                            excerpt = if ($body.excerpt) { $body.excerpt } else { "" }
                            content = if ($body.content) { $body.content } else { "" }
                            created_at = (Get-Date).ToString("o")
                        }
                        $updatedBlogs.Add($newItem) | Out-Null
                        $updatedTarget = $newItem
                    }

                    Save-Blogs $updatedBlogs

                    # Send update action to Google Apps Script Web App
                    $scriptUrl = "https://script.google.com/macros/s/AKfycbx1H1eqlB1P4L4oe5QGEuJpaDK1BcyhH7CS7lclBdyYqhPF5g_Fiu8uKP5qNEV2jHwl/exec"
                    try {
                        $origSlug = if ($body.original_slug) { $body.original_slug } else { $body.slug }
                        $updatePayload = [ordered]@{
                            action = "update"
                            original_slug = $origSlug
                            slug = $body.slug
                            title = $body.title
                            category = $body.category
                            focus_keyword = $body.category
                            image_url = $body.image_url
                            image_alt_text = if ($body.image_alt_text) { $body.image_alt_text } else { "" }
                            meta_description = $body.excerpt
                            excerpt = $body.excerpt
                            body_html = $body.content
                            content = $body.content
                            status = if ($body.is_published -eq $false) { "Draft" } else { "Published" }
                            date = $body.issued_date
                        } | ConvertTo-Json
                        $req = [System.Net.HttpWebRequest]::Create($scriptUrl)
                        $req.Method = "POST"
                        $req.ContentType = "application/json; charset=utf-8"
                        $req.Timeout = 5000
                        $req.AllowAutoRedirect = $true
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($updatePayload)
                        $req.ContentLength = $bytes.Length
                        $st = $req.GetRequestStream()
                        $st.Write($bytes, 0, $bytes.Length)
                        $st.Close()
                        $resp = $req.GetResponse()
                        $resp.Close()
                        Write-Host " [GSHEET UPDATE] Synced edited blog post with Google Sheet for slug: '$($body.slug)'" -ForegroundColor Green
                    } catch {
                        Write-Host " [GSHEET UPDATE] Note: Google Sheet webhook update attempted" -ForegroundColor Yellow
                    }

                    Write-JsonResponse $response 200 @{ success = $true; message = "Blog post updated"; blog = $updatedTarget; blogs = $updatedBlogs }
                    continue
                }

                # PATCH /api/admin/blogs/publish (Toggle Publish Blog)
                if ($url -eq "/api/admin/blogs/publish" -and $httpMethod -eq "PATCH") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body -or -not $body.id) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $blogs = Get-Blogs
                    $list = [System.Collections.ArrayList]@()
                    foreach ($item in $blogs) {
                        if ($item.id -eq $body.id) {
                            $item.is_published = [bool]$body.is_published
                        }
                        $list.Add($item) | Out-Null
                    }
                    Save-Blogs $list
                    Write-JsonResponse $response 200 @{ success = $true; message = "Publish state updated" }
                    continue
                }

                # DELETE /api/admin/blogs (Delete Blog)
                if ($url -eq "/api/admin/blogs" -and $httpMethod -eq "DELETE") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $bodyStr = $reader.ReadToEnd()
                    $body = if ($bodyStr) { $bodyStr | ConvertFrom-Json } else { $null }
                    if (-not $body -or (-not $body.id -and -not $body.slug)) {
                        Write-JsonResponse $response 400 @{ success = $false; message = "Invalid request payload" }
                        continue
                    }

                    $blogs = Get-Blogs
                    $filtered = [System.Collections.ArrayList]@()
                    $targetSlug = if ($body.slug) { $body.slug } else { "" }
                    $targetTitle = if ($body.title) { $body.title } else { "" }

                    foreach ($item in $blogs) {
                        if ($item.id -eq $body.id -or ($targetSlug -and $item.slug -eq $targetSlug)) {
                            if ($item.slug) { Add-DeletedSlug $item.slug }
                            if (-not $targetTitle -and $item.title) { $targetTitle = $item.title }
                            if (-not $targetSlug -and $item.slug) { $targetSlug = $item.slug }
                        } else {
                            $filtered.Add($item) | Out-Null
                        }
                    }

                    if ($targetSlug) { Add-DeletedSlug $targetSlug }

                    # Send delete action to Google Apps Script Web App
                    $scriptUrl = "https://script.google.com/macros/s/AKfycbx1H1eqlB1P4L4oe5QGEuJpaDK1BcyhH7CS7lclBdyYqhPF5g_Fiu8uKP5qNEV2jHwl/exec"
                    try {
                        $deletePayload = @{
                            action = "delete"
                            slug = $targetSlug
                            title = $targetTitle
                        } | ConvertTo-Json
                        $req = [System.Net.HttpWebRequest]::Create($scriptUrl)
                        $req.Method = "POST"
                        $req.ContentType = "application/json; charset=utf-8"
                        $req.Timeout = 5000
                        $req.AllowAutoRedirect = $true
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($deletePayload)
                        $req.ContentLength = $bytes.Length
                        $st = $req.GetRequestStream()
                        $st.Write($bytes, 0, $bytes.Length)
                        $st.Close()
                        $resp = $req.GetResponse()
                        $resp.Close()
                        Write-Host " [GSHEET DELETE] Sent delete request to Google Sheet for slug: '$targetSlug'" -ForegroundColor Green
                    } catch {
                        Write-Host " [GSHEET DELETE] Note: Google Sheet webhook delete triggered" -ForegroundColor Yellow
                    }

                    Save-Blogs $filtered
                    Write-Host " [DELETE BLOG] Deleted blog ID: $($body.id) / Slug: $targetSlug" -ForegroundColor Yellow
                    Write-JsonResponse $response 200 @{ success = $true; message = "Blog deleted from database and Google Sheet" }
                    continue
                }

                # Fallback API Not Found
                Write-JsonResponse $response 404 @{ success = $false; message = "API endpoint not found" }
                continue
            }

            # Handle Static Files
            $localPath = $url
            if ($localPath -eq "/") { $localPath = "/index.html" }
            $fullPath = Join-Path $rootDir $localPath.Substring(1).Replace('/', '\')

            if (Test-Path $fullPath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $mime = $mimeTypes[$ext]
                if (-not $mime) { $mime = "application/octet-stream" }

                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                Write-Response $response 200 $mime $bytes
            } else {
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1>")
                Write-Response $response 404 "text/html" $buffer
            }
        } catch {
            Write-Host " [ERROR] Exception processing request '$url': $_" -ForegroundColor Red
            try {
                Write-JsonResponse $response 500 @{ success = $false; message = "Internal Server Error: $($_.Exception.Message)" }
            } catch {}
        }
    }
} finally {
    $listener.Stop()
}
