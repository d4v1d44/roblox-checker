# Usa uma imagem leve do PHP com o Apache
FROM php:8.2-apache

# Copia todos os ficheiros da pasta para a pasta raiz do servidor
COPY . /var/www/html/

# Garante que o check.php está na raiz
EXPOSE 80
