const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const static = require("koa-static");
const log4js = require("log4js");
const { Server } = require("socket.io");

const {
  getMachineId,
  setMachineId,
  setStatus,
  getStatus,
  createRoom,
  getRoom,
  deleteRoom,
} = require("./db");

const apiRouter = require("./router");

log4js.configure({
  appenders: {
    file: {
      type: "file",
      filename: "app.log",
      layout: {
        type: "pattern",
        pattern: "%r %p - %m",
      },
    },
  },

  categories: {
    default: {
      appenders: ["file"],
      level: "debug",
    },
  },
});

const logger = log4js.getLogger();

const app = new Koa();
app.use(bodyParser());
app.use(apiRouter.routes());
app.use(static(path.join(__dirname, "../public")));

const httpServer = http.createServer(app.callback());
httpServer.listen(80, "0.0.0.0");

const options = {
  key: fs.readFileSync(path.join(__dirname, "./certs/server.key")),
  cert: fs.readFileSync(path.join(__dirname, "./certs/server.crt")),
};
const httpsServer = https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end("Hello World!");
});

const io = new Server(httpsServer);

io.on("connection", (socket) => {
  const { userName } = socket;

  const uuid = userName;
  const machineId = setMachineId(userName);
  setStatus(machineId, "online");

  socket.on("message", async (message) => {
    let parsedMessage = {};
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      logger.error(error);
    }

    const { event, data } = parsedMessage;

    if (event === "login") {
      socket.send(
        JSON.stringify({
          data: { code: getMachineId(userName) },
          event: "logined",
        })
      );
    } else if (event === "control") {
      let { from, to } = data;

      const toStatus = getStatus(to);

      console.log("control", from, to, toStatus);

      if (toStatus) {
        const room = createRoom(from, to);
        console.log("主控端进入房间: ", room);
        socket.join(room);
      }

      const sockets = await io.fetchSockets();
      const toSocket = sockets.find((s) => getMachineId(s.userName) === to);
      if (toSocket) {
        toSocket.send(
          JSON.stringify({
            data: { from },
            event: "asking-control",
          })
        );
      }

      socket.send(
        JSON.stringify({
          data: { to, status: toStatus ? "online" : "failed" },
          event: "control",
        })
      );
    } else if (event === "control-allow") {
      const room = getRoom(machineId);
      console.log("傀儡端进入房间: ", room);
      socket.join(room);

      socket
        .to(room)
        .emit("message", JSON.stringify({ event: "control-ready" }));
    } else if (event === "control-deny") {
      const room = getRoom(machineId);
      socket
        .to(room)
        .emit("message", JSON.stringify({ event: "control-deny" }));
      // dismiss room
      io.socketsLeave(room);
      deleteRoom(room);
    } else if (event === "forward") {
      const room = getRoom(machineId);
      console.log("forward", room);
      socket
        .to(room)
        .emit(
          "message",
          JSON.stringify({ event: data.event, data: data.data })
        );
    } else if (event === "control-end") {
      const room = getRoom(machineId);
      console.log("control-end", room);
      socket.to(room).emit("message", JSON.stringify({ event: "control-end" }));
      io.socketsLeave(room);
      deleteRoom(room);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("disconnect", JSON.stringify(reason));
    deleteRoom(machineId);
    setStatus(machineId, "offline");
  });
});

io.use((socket, next) => {
  const { userName } = socket.handshake.auth;

  if (!userName) {
    return next(new Error("invalid userName"));
  }

  socket.userName = userName;

  next();
});

httpsServer.listen(443, "0.0.0.0");
