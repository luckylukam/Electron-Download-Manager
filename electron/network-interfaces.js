const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Runs `netsh interface show interface` to get friendly adapter names and
 * their live admin/connect state. os.networkInterfaces() alone doesn't
 * expose either of these, only IP addresses keyed by an internal name that
 * doesn't always match what the user sees in Windows' network settings.
 *
 * Typical netsh output:
 *   Admin State    State          Type             Interface Name
 *   -------------------------------------------------------------------
 *   Enabled        Connected      Dedicated        Ethernet
 *   Enabled        Disconnected   Dedicated        Wi-Fi
 */
async function getNetshInterfaceStates() {
  if (process.platform !== 'win32') return [];

  try {
    const { stdout } = await execFileAsync('netsh', ['interface', 'show', 'interface']);
    const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const dataLines = lines.slice(3); // skip header + column titles + separator
    return dataLines.map((line) => {
      const parts = line.trim().split(/\s{2,}/); // columns are separated by 2+ spaces
      const [adminState, state, type, ...nameParts] = parts;
      return {
        name: nameParts.join(' ').trim(),
        adminState,
        state, // "Connected" | "Disconnected"
        type
      };
    });
  } catch (err) {
    console.error('[network-interfaces] netsh query failed:', err.message);
    return [];
  }
}

/**
 * Returns the list of adapters for the interface-selection dropdown:
 *   [{ name, ip, ipv6, status, isUp }]
 * `name` is the value passed straight through to aria2's --interface option
 * (aria2 accepts either an interface name or a bound IP on Windows).
 */
async function listInterfaces() {
  const osInterfaces = os.networkInterfaces();
  const netshStates = await getNetshInterfaceStates();

  const entries = Object.entries(osInterfaces).map(([name, addrs]) => {
    const ipv4 = addrs.find((a) => a.family === 'IPv4' && !a.internal);
    const ipv6 = addrs.find((a) => a.family === 'IPv6' && !a.internal);
    const netshMatch = netshStates.find((n) => n.name === name);

    return {
      name,
      ip: ipv4 ? ipv4.address : null,
      ipv6: ipv6 ? ipv6.address : null,
      status: netshMatch ? netshMatch.state : (ipv4 || ipv6 ? 'Connected' : 'Unknown'),
      isUp: netshMatch ? netshMatch.state === 'Connected' : Boolean(ipv4 || ipv6)
    };
  });

  // Drop the loopback adapter and any adapter with neither address nor a
  // recognizable netsh entry (virtual/disabled clutter).
  return entries.filter((e) => e.name.toLowerCase() !== 'lo' && (e.ip || e.ipv6 || e.status !== 'Unknown'));
}

module.exports = { listInterfaces, getNetshInterfaceStates };
