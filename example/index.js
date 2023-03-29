const { io } = require("socket.io-client");

const socket = io("wss://10.0.0.204", {
  rejectUnauthorized: false,
});

socket.on("connect", () => {
  socket.send(
    JSON.stringify({
      event: "login",
      data: {
        userName: 'test'
      }
    })
  );
});

socket.on("connect_error", (error) => {
  console.log("connected error", error);
});

socket.on("logined", (data) => {
  console.log("myself code:", data);
});
