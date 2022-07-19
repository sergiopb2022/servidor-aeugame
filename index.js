const WebSocket = require('ws')
const express = require('express')
const uuid = require('uuid');
const { request, response } = require('express');
const { debug } = require('console');
const app = express()
const PORT = process.env.PORT || 8080


var admin = require("firebase-admin");

var serviceAccount = require("./app-aeugame-firebase-adminsdk-eu1s3-2a51602fad.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore()


async function lerDocumentos() {
  const registroRef = db.collection('registro');
  const registro = await registroRef.get();
  registro.forEach(doc => {
    //lendo dados dentro de uma coleção, coleção -> documentos -> dados
    console.log(doc.id, '=>', doc.data().nome);
  });
}

async function lerUnicoDocumento(nome, senha) {
  const registroRef = db.collection('registro').doc(nome);
  const doc = await registroRef.get();
  if (!doc.exists) {
    console.log('No such document!');
    return false;
  } else {
    console.log('Document data:', doc.data());
    console.log('senha iguais?', doc.data().senha == senha)
    return true;
  }
}

async function FazerLogin(nome, senha) {
  const registroRef = db.collection('registro').doc(nome);
  const doc = await registroRef.get();
  if (!doc.exists) {
    console.log('No such document!');
    return false;
  } else {
    console.log('Document data:', doc.data());
    if(doc.data().senha == senha){
    console.log('senha ok')
    return true;
    }
    else{
      return false;
    }
  }
}

async function AddDocumentoRandomID() {
  // Add a new document with a generated id.
  const res = await db.collection('registro').add({
    nome: 'Tokyo',
    senha: 'Japan',
    email: '@@@'
  });
  console.log('Added document with ID: ', res.id);
  lerDocumentos()
}

async function AddDocumento(nome, email, senha) {
  let check = await lerUnicoDocumento(nome, senha)
  if(check){
    console.log('o nome já existe!')
  }
  else{
    const data = {
      email: email,
      senha: senha,
    };
    // Add a new document in collection "cities" with ID 'LA'
    const res = await db.collection('registro').doc(nome).set(data);
    console.log('dados enviados! com nome:', nome)
  }
}


app.get("/", (request, response) => {
  response.send('<span style="color": #f00;"> Hello!</span>');
});

const server = app.listen(PORT, () => {
  console.log(`App Express is running!, port: ${PORT}`);
})

const wss = new WebSocket.Server({ server })

const clients = {}
const partidas = {}
const partidaID = uuid.v4(); //teste

let qtdjogadoresingame = 0

wss.on('connection', (ws) => {
  let playerID = uuid.v4();
  clients[playerID] = { id: playerID }
  console.log("conectou jogador de ID: " + playerID)
  let size = Object.keys(clients).length;

  ws.send(JSON.stringify({
    type: 'idplayer',
    id: playerID,
  }))

  ws.send(JSON.stringify({
    type: 'partida',
    partida: partidaID,
  }))

  async function replayLogin(nome, senha) {
    let l = await FazerLogin(nome, senha)
        if(l){
          ws.send(JSON.stringify({
            type: 'enter-lobby',
            id: playerID,
            nome: nome,
          }))
        }
        else{
          ws.send(JSON.stringify({
            type: 'login-error',
            id: playerID,
          }))
        }
  }

  function criarSala(nome, id){
    let c = false
    for(e in partidas){
      console.log("nome atual:"+e.nome+", nomeparametro:"+nome)
      if(e.nome == nome){
      c = true
      break;
      }
    }
    if(!c){
      let vplayers = []
      vplayers.push(id)
      let partidaID = uuid.v4();
      partidas[partidaID] = { nome: nome, players: vplayers }
      console.log("partidaID:" +partidaID+", data:"+ partidas[partidaID])
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'sala-criada',
            nome: partidas[partidaID].nome,
            qtdPlayers: partidas[partidaID].players.length.toString(),
          }))
        }
      });
    }
    else{
      console.log("essa sala já existe!")
    }
    
  }

  ws.on('message', (data) => {
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
        if (fase == "1") {
          console.log("entrou no spawn!!")
          ++qtdjogadoresingame
          ws.send(JSON.stringify({
            type: 'spawn',
          }))
          wss.clients.forEach(function each(client) {
            if (/*client !== ws && */ client.readyState === WebSocket.OPEN) {
              //if (qtdjogadoresingame >= 2) {
              client.send(JSON.stringify({
                type: 'spawn-player',
                id: playerID,
                idpart: partidaID,
                objeto: clients,
              }))
              console.log("2 jogadores na fase1")
              //}
            }
          });
        }
        break;
      case "posicao":
        wss.clients.forEach(function each(client) {
          //console.log(packet.idPlayer, "x", (packet.x).toString(), "y", (packet.y).toString(), "z", (packet.z).toString())
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'posicao-jogadores',
              idPlayer: packet.idPlayer,
              idPartida: packet.idPartida,
              x: (packet.x).toString(),
              y: (packet.y).toString(),
              z: (packet.z).toString(),
              ry: (packet.ry).toString(),
              anim: (packet.anim).toString(),
              vivo: (packet.vivo).toString(),
            }))
          }
        });
        break;
      case "cadastro":
        console.log(packet.nome)
        console.log(packet.email)
        console.log(packet.senha)
        AddDocumento(packet.nome, packet.email, packet.senha)
        break;
      case "login":
        console.log(packet.nome)
        console.log(packet.senha)
        replayLogin(packet.nome, packet.senha)
        break;
      case "chat-global":
        wss.clients.forEach(function each(client) {
          if (/*client !== ws && */ client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'chat-g',
              data: packet.data,
              nome: packet.nome,
            }))
          }
        });
        break;
      case "criar-sala":
        criarSala(packet.nome,packet.id)
        break;
      case "status-salas":
        ws.send(JSON.stringify({
          type: 'todas-salas',
          salas: partidas,
        }))
        break;
    }

  })

  ws.on('close', () => {
    delete clients[playerID];
    console.log("player:" + playerID + " desconectou!")
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'desconectou',
          id: playerID,
        }))
      }
    });
  })

  setInterval(function () {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'ping',
        }))
      }
    });

  }, 5000);


})

