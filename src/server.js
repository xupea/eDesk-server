const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const static = require("koa-static");
const log4js = require("log4js");
const { Server } = require("socket.io");

const { getMachineId, setMachineId } = require("./db");

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

const code2ws = new Map();

io.on("connection", async (socket) => {
  const { userName } = socket;

  await setMachineId(userName);

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
          data: { code: await getMachineId(userName) },
          event: "logined",
        })
      );
    } else if (event === "control") {
      let remote = data.remote;

      if (code2ws.has(remote)) {
        socket.send(JSON.stringify({ data: { remote }, event: "controlled" }));

        const constrolledClientSocket = code2ws.get(remote);

        constrolledClientSocket.emit(
          "be-controlled",
          JSON.stringify({ remote: code })
        );
      }
    } else if (event === "forward") {
      if (
        data.event === "puppet-candidate" ||
        data.event === "control-candidate"
      ) {
        console.log(data.event, data.data);
      }

      socket.broadcast.emit(
        "message",
        JSON.stringify({ event: data.event, data: data.data })
      );
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("disconnect", JSON.stringify(reason));
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
