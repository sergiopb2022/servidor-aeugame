const WebSocket = require('ws')
const express = require('express')
const uuid = require('uuid');
const { request, response } = require('express');
const app = express()
const PORT = process.env.PORT || 8080
/* const wss = new WebSocket.Server({port: 8080}, ()=>{
    console.log('server iniciado!')
}) */
app.get("/", (request, response)=>{
  response.send('<span style="color": #f00;"> Hello!</span>');
});

const server = app.listen(PORT, () => {
  console.log(`App Express is running!, port: ${PORT}`);
})

const wss = new WebSocket.Server({ server })

const clients = {}
let qtdjogadoresingame = 0

wss.on('connection', (ws)=>{
    let playerID = uuid.v4();
    clients[playerID]= {id:playerID}
    console.log("conectou jogador de ID: "+playerID)
    let size = Object.keys(clients).length;
   /*  if(qtdjogadoresingame >1){
        console.log("spawn players!!")
        wss.clients.forEach(function each(client) {
            if ( client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'spawn-player',
              }))
            }
          });
    }
     */
    ws.on('message', (data)=>{
        //console.log('dado recebido: '+data)
       /*  ws.send(JSON.stringify({
            type: 'dados',
            data: JSON.parse(data),
          })) */
        const packet = JSON.parse(data); // Converte Para Objeto
        //console.log('jsonParseData:'+packet.data)
        switch (packet.type) {
            case "Ping":
                console.log("Ping!!")
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN) {
                          client.send(JSON.stringify({
                            type: 'ping',
                          }))
                        }
                      });
            break;
            case "Fase":
                let fase = packet.data
                if(fase == "1"){
                    console.log("entrou no spawn!!")
                    ++qtdjogadoresingame
                    wss.clients.forEach(function each(client) {
                        if (/*client !== ws && */ client.readyState === WebSocket.OPEN) {
                          client.send(JSON.stringify({
                            type: 'spawn',
                          }))
                          if(qtdjogadoresingame == 2){
                            console.log("2 jogadores na fase1")
                            client.send(JSON.stringify({
                                type: 'spawn-player',
                             }))
                            }
                        }
                      });
                }
            break;
            case "posicao":
                    wss.clients.forEach(function each(client) {
                        //console.log("x",(packet.x).toString(),"y",(packet.y).toString(),"z",(packet.z).toString())
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                          client.send(JSON.stringify({
                            type: 'posicao-jogadores',
                            x: (packet.x).toString(),
                            y: (packet.y).toString(),
                            z: (packet.z).toString()
                          }))
                        }
                      });
            break;
        }
        
    })
    ws.on('close', () => {
        console.log("desconectou!")
    })

    setInterval(function() {
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'ping',
          }))
        }
      });
      
  }, 5000);

  
  })

/* wss.on('listening', , ()=>{
    console.log('server is listening on port 8080')
}) */
