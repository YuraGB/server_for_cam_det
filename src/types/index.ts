export type WSData = {
  peerId?: string;
  lastSeenAt?: number;
};

export type RegisterMessage = {
  type: "register";
  peerId: string;
};

export type SignalMessage = {
  type: string;
  targetPeerId: string;
  [key: string]: unknown;
};
