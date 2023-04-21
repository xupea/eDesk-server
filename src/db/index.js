const low = require("lowdb");
const JSONFileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const adapter = new JSONFileSync(path.join(__dirname, "../../db.json"));

const db = low(adapter);

db.defaults({ machines: [], maxId: 0, rooms: [] }).write();

function findMaxId() {
  return db.get("maxId").value();
}

function setMaxId(id) {
  db.set("maxId", id).write();
}

function getMachineId(uuid) {
  return setMachineId(uuid);
}

function setMachineId(uuid) {
  const m = db
    .get("machines")
    .find((machine) => machine.uuid === uuid)
    .value();

  let id = m ? m.id : findMaxId() + 1;

  if (!m) {
    setMaxId(id);
    db.get("machines").push({ uuid, id }).write();
  }

  return id;
}

function setStatus(machineId, status) {
  db.get("machines")
    .find((machine) => machine.id === machineId)
    .assign({ status })
    .write();
}

function getStatus(machineId) {
  const m = db
    .get("machines")
    .find((machine) => machine.id === machineId)
    .value();

  return !!m && m.status === "online";
}

function createRoom(from, to) {
  const room = `${from}-${to}`;

  const r = db
    .get("rooms")
    .find((room) => room.room === room)
    .value();

  if (r) {
    console.log('room exists: ' + room);
    return room;
  }

  db.get("rooms").push({ room, from, to }).write();
  return room;
}

function getRoom(id) {
  const r = db
    .get("rooms")
    .find((room) => room.from === id || room.to === id)
    .value();
  return r ? r.room : null;
}

function getTo(from) {
  const r = db
    .get("rooms")
    .find((room) => room.from === from)
    .value();
  return r ? r.to : null;
}

function deleteRoom(id) {
  db.get("rooms")
    .remove((room) => room.from === id || room.to === id)
    .write();
}

module.exports = {
  setMachineId,
  getMachineId,
  setStatus,
  getStatus,
  createRoom,
  getRoom,
  getTo,
  deleteRoom,
};
