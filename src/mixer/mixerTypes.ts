import { Socket } from 'dgram';
import EventEmitter from 'events';

export type OSCArgument =
  { type: 'i'; data: number } |
  { type: 'f'; data: number } |
  { type: 's'; data: string } |
  { type: 'b'; data: Buffer };

export type MeterData = {
  type: 'meters';
  meters: number[];
};

export type FaderMuteData = {
  type: 'faderMute';
  faders: number[];
  mutes: boolean[];
}

export type ConnectionNotice = {
  type: 'connectionNotice';
  consoleInfo: string;
}

export type ConsoleError = {
  type: 'error',
  error: string;
}

export type MixerBufferResponse =
  MeterData |
  FaderMuteData |
  ConnectionNotice |
  ConsoleError;

interface MixerInterfaceEvents {
  data: (data: MixerBufferResponse) => void;
  error: (error: Error) =>void;
  closed: () => void;
  info: (info: string) => void;
  connected: () => void;
}
  
export interface MixerInterface {
  socket: Socket;
  isConnected: boolean;
  lastValidMessage: number;
  heartbeatIntervalId: NodeJS.Timer;
  subscriptionIntervalId: NodeJS.Timer;

  on<U extends keyof MixerInterfaceEvents>(event: U, listener: MixerInterfaceEvents[U]): this;
  emit<U extends keyof MixerInterfaceEvents>(event: U, ...args: Parameters<MixerInterfaceEvents[U]>): boolean;
  close: () => void;
}