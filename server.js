const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "client")));

const channels = {
  general: [],
  gaming: [],
  tareas: []
};

const usuarios = {}; // socket.id -> {name, channel}

function enviarUsuarios(){

  const porCanal = {};

  Object.values(usuarios).forEach(u=>{
    if(!porCanal[u.channel]) porCanal[u.channel]=[];
    porCanal[u.channel].push(u.name);
  });

  io.emit("user list",porCanal);

}

io.on("connection", (socket) => {

  socket.on("join",(username)=>{

    username=username.trim();

    const nombreEnUso = Object.values(usuarios).some(u=>u.name===username);
    const anterior = usuarios[socket.id]?.name;

    if(nombreEnUso && anterior!==username){
      socket.emit("name taken");
      return;
    }

    if(!usuarios[socket.id]){
      usuarios[socket.id]={name:username,channel:"general"};
      io.emit("system message", username+" se unió al chat");
    }else if(anterior!==username){
      usuarios[socket.id].name=username;
      io.emit("system message", anterior+" ahora se llama "+username);
    }

    socket.emit("join success",username);

    enviarUsuarios();
  });


  // cambiar canal
  socket.on("switch channel",(channel)=>{

    if(!usuarios[socket.id]) return;

    usuarios[socket.id].channel=channel;
    socket.channel=channel;

    const history=channels[channel]||[];
    socket.emit("chat history",history);

    enviarUsuarios();
  });

  // escribiendo (typing) events per channel
  socket.on("escribiendo", (nombre) => {
    const channel = socket.channel || "general";
    socket.broadcast.emit("escribiendo", {
      nombre,
      channel,
    });
  });

  socket.on("dejoDeEscribir", () => {
    const channel = socket.channel || "general";
    socket.broadcast.emit("dejoDeEscribir", channel);
  });


  socket.on("chat message",(data)=>{

    const channel = socket.channel || "general";

    const msg = {
      user:data.user,
      text:data.text,
      channel
    };

    channels[channel].push(msg);

    if(channels[channel].length>100){
      channels[channel].shift();
    }

    // enviar SOLO a los que están en ese canal
    io.sockets.sockets.forEach(s=>{
      if((s.channel||"general")===channel){
        s.emit("chat message",msg);
      }
    });

  });


  socket.on("disconnect",()=>{

    const user = usuarios[socket.id];

    if(user){
      io.emit("system message", user.name+" salió del chat");
      delete usuarios[socket.id];
      enviarUsuarios();
    }

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=>{
  console.log("Servidor corriendo en puerto "+PORT);
});
