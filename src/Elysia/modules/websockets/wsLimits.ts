const connectionsPerIp = new Map<string, number>();

const MAX_CONNECTIONS_PER_IP = 10;

export function canConnect(ip: string) {
  const count = connectionsPerIp.get(ip) ?? 0;

  if (count >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }

  connectionsPerIp.set(ip, count + 1);

  return true;
}

export function disconnect(ip: string) {
  const count = connectionsPerIp.get(ip);

  if (!count) return;

  if (count <= 1) {
    connectionsPerIp.delete(ip);
    return;
  }

  connectionsPerIp.set(ip, count - 1);
}