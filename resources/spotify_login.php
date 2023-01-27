<?php

$configs = include('app-config.php');

if ($configs['prod'] == false) {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: OPTIONS,POST");
header("Access-Control-Allow-Headers: *");

// Records when a user logs in, in case they want to be notified of new app updates

$json = file_get_contents('php://input');
$data = json_decode($json);

if (!empty($data)) {
    $now = new DateTime(null, new DateTimeZone('America/New_York'));

    $log_string = sprintf("[%s] New Spotify login from: %s | %s | %s", $now->format("Y-m-d\TH:i:sO"), $data->display_name, $data->email, $data->id);

    $current = file_get_contents($configs['log_file_location']);
    $current .= $log_string . "\n";
    file_put_contents($configs['log_file_location'], $current);

    header('Content-Type: application/json; charset=utf-8');
    $result['log'] = $log_string;
    echo json_encode($result);
}

?>