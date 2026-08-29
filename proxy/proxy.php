<?php
// CORS Header für deinen Angular Client setzen
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, KB-Region, KB-Store-Region");

// Preflight-Anfragen (OPTIONS) direkt bestätigen
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ziel-Pfad aus der URL ermitteln (z. B. v4/user/login)
// Ziel-Pfad aus der URL ermitteln
$path = $_GET['path'] ?? '';

// Query-String ohne den internen 'path'-Parameter neu aufbauen
$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);

// Ziel-URL inklusive Query-Parametern zusammensetzen
$targetUrl = 'https://api.kickbase.com/' . ltrim($path, '/');
if (!empty($queryString)) {
    $targetUrl .= '?' . $queryString;
}

// Header aufbauen und Mobile User-Agent erzwingen
$headers = [
    'User-Agent: Kickster/4.8.2/9013 (iPhone; iOS 26.6; Scale/3.00)',
    'KB-Region: DE',
    'KB-Store-Region: DEU',
    'Content-Type: application/json',
    'Accept: application/json'
];

// Authorization Header weiterleiten, wenn vorhanden
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}

// cURL Request vorbereiten
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Body weiterleiten bei POST/PUT Requests
$inputBody = file_get_contents('php://input');
if (!empty($inputBody)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $inputBody);
}

// Aufruf an Kickbase ausführen
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Ergebnis an Angular zurückgeben
http_response_code($httpCode);
header('Content-Type: application/json');
echo $response;