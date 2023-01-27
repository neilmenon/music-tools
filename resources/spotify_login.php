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

    if (isset($data->emailNotifs)) {
        $log_string = sprintf("[%s | %s | %s | %s] Email notification pref change: %s", $now->format("Y-m-d\TH:i:sO"), $data->display_name, $data->email, $data->id, $data->emailNotifs ? 'ON': 'OFF');
    } else if (isset($data->logout)) {
        $log_string = sprintf("[%s | %s | %s | %s] Spotify account disconnected", $now->format("Y-m-d\TH:i:sO"), $data->display_name, $data->email, $data->id);
    } else {
        $log_string = sprintf("[%s | %s | %s | %s] New Spotify login", $now->format("Y-m-d\TH:i:sO"), $data->display_name, $data->email, $data->id);
    }

    $current = file_get_contents($configs['log_file_location']);
    $current .= $log_string . "\n";
    file_put_contents($configs['log_file_location'], $current);

    header('Content-Type: application/json; charset=utf-8');
    $result['log'] = $log_string;
    echo json_encode($result);
}

?>