// Terminal styling colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

function printServerBanner({ port = 5000, connectedAt = null, env = 'development' } = {}) {
  const c = colors;
  const serverTime = connectedAt
    ? new Date(connectedAt).toLocaleTimeString()
    : 'Active';

  console.log(`
${c.cyan}${c.bold}  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ${c.magenta}⚡ V I S T O R A   B A C K E N D   S E R V E R${c.cyan}             ║
  ║   ${c.dim}Production-Grade Property Rental & Booking Engine${c.reset}${c.cyan}          ║
  ║                                                              ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║   ${c.green}●${c.reset}${c.cyan} ${c.bold}API URL:${c.reset}       ${c.yellow}http://localhost:${port}${c.reset}${c.cyan}                          ║
  ║   ${c.green}●${c.reset}${c.cyan} ${c.bold}PostgreSQL:${c.reset}    Aiven Cloud ${c.green}(Connected at ${serverTime})${c.reset}${c.cyan}     ║
  ║   ${c.green}●${c.reset}${c.cyan} ${c.bold}Environment:${c.reset}   ${env.padEnd(43)}║
  ║                                                              ║
  ║   ${c.bold}Mounted Modules:${c.reset}${c.cyan}                                           ║
  ║     ${c.dim}├──${c.reset}${c.cyan} 🔐 Auth        ${c.dim}->${c.reset} ${c.yellow}/api/auth${c.reset}${c.cyan}                                ║
  ║     ${c.dim}├──${c.reset}${c.cyan} 🏡 Properties  ${c.dim}->${c.reset} ${c.yellow}/api/properties${c.reset}${c.cyan}                          ║
  ║     ${c.dim}└──${c.reset}${c.cyan} 🩺 Health      ${c.dim}->${c.reset} ${c.yellow}/health${c.reset}${c.cyan}                                  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝${c.reset}
  `);
}

module.exports = {
  printServerBanner,
};
