# Imagem base: nginx enxuto
FROM nginx:alpine

# Copia os arquivos da aplicação para a pasta servida pelo nginx
COPY . /usr/share/nginx/html

EXPOSE 80
