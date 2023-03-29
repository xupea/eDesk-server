const router = require("koa-router")();
const loginctrl = require("../controller/login");

router.get("/api/user/login", loginctrl.login);

module.exports = router;
