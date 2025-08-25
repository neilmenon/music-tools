<?php

$configs = include('app-config.php');

if ($configs['prod'] == false) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: *");
    header("Access-Control-Allow-Credentials: true");
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}


if(isset($_GET["code"])) { // return the auth details
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://accounts.spotify.com/api/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=authorization_code&redirect_uri=" . $configs['redirect_uri'] . "/" . $_GET["tool"] . "&code=" . $_GET["code"]); 
    curl_setopt($ch, CURLOPT_HTTPHEADER, array("Authorization: Basic " . base64_encode($configs['client_id'] . ":" . $configs['client_secret']))); 

    if ($configs['prod'] == false) {
        // for local developement, do not use elsewhere.
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    }

    $result = curl_exec($ch);
    
    $responseInfo = curl_getinfo($ch);
    http_response_code($responseInfo['http_code']);
    
    curl_close($ch);

    header('Content-Type: application/json; charset=utf-8');
    echo $result;
} else if(isset($_GET["error"])) { // handle user clicking cancel on auth page (?error=access_denied)
    http_response_code(403);
} else if(isset($_POST["refresh_token"])) { // refresh token
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://accounts.spotify.com/api/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=refresh_token&redirect_uri=" . $configs['redirect_uri'] . "&refresh_token=" . $_POST["refresh_token"]); 
    curl_setopt($ch, CURLOPT_HTTPHEADER, array("Authorization: Basic " . base64_encode($configs['client_id'] . ":" . $configs['client_secret']))); 

    // for local developement, do not use elsewhere.
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $result = curl_exec($ch);
    
    $responseInfo = curl_getinfo($ch);
    http_response_code($responseInfo['http_code']);
    
    curl_close($ch);
    
    header('Content-Type: application/json; charset=utf-8');
    echo $result;
} else { // redirect to spotify auth page
    $auth_headers = (object) [
        "client_id" => $configs['client_id'],
        "response_type" => "code",
        "redirect_uri" => $configs['redirect_uri'],
        "scope" => "user-library-read user-read-email"
    ];

    header("Location: https://accounts.spotify.com/authorize?" . http_build_query($auth_headers));
}

?>