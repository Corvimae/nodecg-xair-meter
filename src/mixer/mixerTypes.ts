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