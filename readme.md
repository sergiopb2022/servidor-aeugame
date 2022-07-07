conectar no heroku:
heroku login

comandos com git e heroku:
heroku git:remote aeugame2022
git add .
git commit -m "comentario"
git push heroku master

log em tempo real:
heroku logs --tail

ativar desativar aplicacao:
heroku ps:scale web=1 --app aeugame2022
heroku ps:scale web=0 --app aeugame2022

verificar situacao/estado da app no heroku:
heroku ps

abrir aplicacao no navegador:
heroku open

