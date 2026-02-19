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

const usuarios = {};

io.on("connection", (socket) => {

  socket.on("join", (username)=>{

    username = username.trim();

    const nombreEnUso = Object.values(usuarios).includes(username);
    const anterior = usuarios[socket.id];

    if(nombreEnUso && anterior!==username){
      socket.emit("name taken");
      return;
    }

    if(!anterior){
      usuarios[socket.id]=username;
      io.emit("system message", username+" se unió al chat");
    } else if(anterior!==username){
      usuarios[socket.id]=username;
      io.emit("system message", anterior+" ahora se llama "+username);
    }

    socket.emit("join success", username);
    io.emit("user list", Object.values(usuarios));
  });


  // cambiar canal
  socket.on("switch channel",(channel)=>{

    socket.channel = channel;

    const history = channels[channel] || [];

    socket.emit("chat history", history);

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

    const username = usuarios[socket.id];

    if(username){
      io.emit("system message", username+" salió del chat");
      delete usuarios[socket.id];
      io.emit("user list", Object.values(usuarios));
    }

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=>{
  console.log("Servidor corriendo en puerto "+PORT);
});
