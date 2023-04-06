const { LowSync } = require("lowdb/lib");
const { JSONFileSync } = require("lowdb/lib/adapters");

const adapter = new JSONFileSync(path.join(__dirname, "../db.json"));
const db = new LowSync(adapter);

db.read();

db.data ||= { machines: [] };

const { machines } = db.data;

function findMaxId() {
  let max = 0;

  machines.forEach((machine) => {
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
  const m = machines.find((machine) => machine.uuid === uuid);

  let id = m ? m.id : findMaxId() + 1;

  if (!m) {
    machines.push({ uuid, id });

    db.write();
  }

  return `${id}`.padStart("0", 9);
}

module.exports = { getMachineId, setMachineId };
