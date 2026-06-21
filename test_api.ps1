$baseUrl = "https://going-slacking-backhand.ngrok-free.dev"
$headers = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

# 1. Login
$loginBody = @{
    email = "gurutest1@gmail.com"
    password = "password123"
} | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/login" -Method Post -Headers $headers -Body $loginBody
$token = $loginRes.data.token

# Set auth header
$authHeaders = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# 2. Create quiz (default is private)
$quizBody = @{
    judul = "Kuis Rahasia"
    kategori = "Matematika"
    mata_pelajaran = "Matematika"
    kelas = "X"
    soal_waktu = 10
    akses = "private"
    status = "draft"
} | ConvertTo-Json
$quizRes = Invoke-RestMethod -Uri "$baseUrl/api/kuis" -Method Post -Headers $authHeaders -Body $quizBody
$quizId = $quizRes.data.kuis_id
$quizCode = $quizRes.data.kode_kuis
Write-Host "Created quiz ID: $quizId, Code: $quizCode"

# 3. Create question
$soalBody = @{
    kuis_id = [int]$quizId
    soal_soal = "Berapakah 2 + 2?"
    jawaban_a = "3"
    jawaban_b = "4"
    jawaban_c = "5"
    jawaban_d = "6"
    jawaban_benar = "b"
    bobot_poin = 10
    poin = 10
    tipe_soal = "pilihan_ganda"
} | ConvertTo-Json
$soalRes = Invoke-RestMethod -Uri "$baseUrl/api/soal" -Method Post -Headers $authHeaders -Body $soalBody

# 4. Publish quiz
$publishRes = Invoke-RestMethod -Uri "$baseUrl/api/kuis/$quizId/publish" -Method Post -Headers $authHeaders -Body "{}"

# 5. Join quiz as student (no auth token)
$joinBody = @{
    kode_kuis = $quizCode
} | ConvertTo-Json
$joinRes = Invoke-RestMethod -Uri "$baseUrl/api/kuis/join" -Method Post -Headers $headers -Body $joinBody
Write-Host "Join response:"
$joinRes | ConvertTo-Json -Depth 5
