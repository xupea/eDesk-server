const low = require("lowdb");
const JSONFileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const adapter = new JSONFileSync(path.join(__dirname, "../../db.json"));

const db = low(adapter);

db.defaults({ machines: [] }).write();

function findMaxId() {
  let max = 0;

  db.get("machines").forEach((machine) => {
    if (machine.id > max) {
      max = machine.id;
    }
  });

  return max;
}

function getMachineId(uuid) {
  return setMachineId(uuid);
}

function setMachineId(uuid) {
  const m = db.get("machines").find((machine) => machine.uuid === uuid).value();

  let id = m ? m.id : findMaxId() + 1;

  if (!m) {
    db.get("machines").push({ uuid, id }).write();
  }

  return `${id}`.padStart(9, "0");
}

module.exports = { setMachineId, getMachineId };
