const code2ws = new Map();

class LoginController {
  async login(ctx, next) {
    let name = ctx.query.name;

    const code =
      code2ws.get(name) ||
      Math.floor(Math.random() * (999999 - 100000)) + 100000;

    code2ws.set(name, code);

    ctx.body = {
      status: true,
      code,
    };
  }
}

module.exports = new LoginController();
