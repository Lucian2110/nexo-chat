const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "client")));

const activeUsers = new Set(); // 👈 guarda nombres conectados

io.on("connection", (socket) => {

  socket.on("join", (username) => {

    // si el nombre ya existe → rechazar
    if(activeUsers.has(username)){
      socket.emit("name taken");
      return;
    }

    // aceptar usuario
    socket.username = username;
    activeUsers.add(username);

    socket.emit("join success", username);
    io.emit("system message", username + " se unió al chat");
  });

  socket.on("chat message", (data) => {
    io.emit("chat message", data);
  });

  socket.on("disconnect", () => {
    if(socket.username){
      activeUsers.delete(socket.username);
      io.emit("system message", socket.username + " salió del chat");
    }
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
