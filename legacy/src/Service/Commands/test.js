
async function ping(args) {
  return `pong! ${args.join(" ")}`;
}

module.exports = {
  ping,
};

