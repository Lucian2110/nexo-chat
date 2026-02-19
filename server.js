const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "client")));

// guardar historial en memoria
const messages = [];

const usuarios = {};   // socket.id -> username

io.on("connection", (socket) => {

  // enviar historial al nuevo usuario
  socket.emit("chat history", messages);

  socket.on("join", (username) => {

    const nombreAnterior = usuarios[socket.id];

    // si ya tenía nombre → es cambio de nombre
    if(nombreAnterior){

      usuarios[socket.id] = username;

      io.emit("system message",
        nombreAnterior + " ahora se llama " + username
      );

    }else{

      usuarios[socket.id] = username;

      io.emit("system message",
        username + " se unió al chat"
      );
    }

    // enviar lista actualizada
    io.emit("user list", Object.values(usuarios));
  });

  socket.on("escribiendo", (nombre) => {
    socket.broadcast.emit("escribiendo", nombre);
  });

  socket.on("dejoDeEscribir", () => {
    socket.broadcast.emit("dejoDeEscribir");
  });

  socket.on("chat message", (data) => {

    // guardar mensaje
    messages.push(data);

    // limitar a últimos 100
    if(messages.length > 100){
      messages.shift();
    }

    io.emit("chat message", data);
  });

  socket.on("disconnect", () => {
    const username = usuarios[socket.id];

    if(username){
      io.emit("system message", username + " salió del chat");
      delete usuarios[socket.id];
      io.emit("user list", Object.values(usuarios));
    }
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
