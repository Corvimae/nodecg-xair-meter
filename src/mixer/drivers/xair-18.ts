import { Socket, createSocket } from 'dgram';
import { EventEmitter } from 'events';
import { calculateFaderFloatDb, formatMixerCommand } from '../behringerUtils';
import { MixerBufferResponse, MixerInterface, OSCArgument } from '../mixerTypes';

export class XAir18 extends EventEmitter implements MixerInterface {
  socket: Socket;
  isConnected: boolean = false;
  address: string;
  lastValidMessage: number = Date.now();
  frequency: number = 10;
  heartbeatIntervalId: NodeJS.Timer;
  subscriptionIntervalId: NodeJS.Timer;

  constructor(address: string, frequency?: number) {
    super();

    if (frequency) this.frequency = frequency;

    this.address = address;
    this.socket = createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('close', () => {
      this.emit('close');
    });

    this.socket.on('error', error => {
      this.emit('error', error);
    });

    this.socket.on('message', buf => {
      const data = parseBufferResponse(buf);

      switch (data.type) {
        case 'error':
          this.emit('error', new Error(data.error));
          break;

        case 'connectionNotice':
          this.lastValidMessage = Date.now();

          this.emit('info', `Connected to XAIR interface. Connection info: ${data.consoleInfo}`);
          this.emit('connected');
          break;

        case 'faderMute':
        case 'meters':
          this.lastValidMessage = Date.now();
          this.emit('data', data);
          break;
      }
    });

    this.socket.bind(52361, '0.0.0.0', () => {
      this.emit('info', `Connecting to XAIR interface at ${address}.`);
      this.socket.connect(10024, address);
    });
    
    this.socket.on('connect', () => {
      this.socket.send(formatMixerCommand('/info'), error => {
        if (error) this.emit('error', error);
      });
    });

    this.on('connected', () => {
      const subscribe = () => {
        this.isConnected = true;

        let faderMuteSubscribe: OSCArgument[] = [
          { type: 's', data: '/cg' },
          { type: 's', data: '/mix/fader' },
          { type: 's', data: '/mix/on' },
          { type: 'i', data: 0 },
          { type: 'i', data: 15 },
          { type: 'i', data: this.frequency },
        ];

        let meterSubscribe: OSCArgument[] = [
          { type: 's', data: '/meters/1' },
          { type: 'i', data: 0 },
          { type: 'i', data: 0 },
          { type: 'i', data: this.frequency },
        ];

        this.socket.send(formatMixerCommand('/meters', meterSubscribe), error => {
          if (error) this.emit('error', error);
        });

        this.socket.send(formatMixerCommand('/batchsubscribe', faderMuteSubscribe), error => {
          if (error) this.emit('error', error);
        });
      };

      subscribe();

      this.subscriptionIntervalId = setInterval(() => {
        // Keep resubscribing once the subscription has lapsed
        if (this.isConnected) subscribe();
      }, 9000);
    });

    this.heartbeatIntervalId = setInterval(() => {
      const secondsInactive = Math.round((Date.now() - this.lastValidMessage) / 1000);

      if (secondsInactive > 15) {
        if (this.isConnected) {
          this.emit('error', new Error(`${secondsInactive}s have passed since the last valid message from the XAIR interface; closing connection.`));
        } else {
          this.emit('error', new Error(`Unable to connect to the XAIR interface at ${this.address}.`));
        }

        this.close();
      } else if(secondsInactive > 5 && this.isConnected) {
        this.emit('info', `Warning: ${secondsInactive} seconds have passed since the last valid message from the XAIR interface.`);
      }
    }, 5000);

    this.on('close', () => {
      this.removeAllListeners();
    });
  }

  close() {
    this.emit('info', 'Closing connection to the XAIR interface.');
    this.isConnected = false;
    
    clearInterval(this.subscriptionIntervalId);
    clearInterval(this.heartbeatIntervalId);

    try {
      this.socket.close();
    } catch (e) {
      console.log('Unable to close socket to mixer: ');
      console.error(e);
    }
  }
}


function parseBufferResponse(buf: Buffer): MixerBufferResponse {
  let split = buf.indexOf(0);
  let oscAddress = buf.subarray(0, split).toString();

  split = Math.ceil(split / 4) * 4;
  buf = buf.subarray(split);
  split = buf.indexOf(0);

  let oscFormat = buf.subarray(0, split).toString();

  split = Math.ceil(split / 4) * 4;
  buf = buf.subarray(split);

  switch (oscAddress) {
    case '/cg':
      if (oscFormat !== ',b') {
        return {
          type: 'error',
          error: `Unexpected data from XAIR interface, OSC address: ${oscAddress} (cg format)`,
        };
      }

      const faders = [0];
      const mutes = [false];

      buf = buf.subarray(8);

      for (let i = 0; i < buf.length; i += 8) {
        const faderFloat = buf.readFloatLE(i);
        const db = calculateFaderFloatDb(faderFloat);

        if (!db) {
          return {
            type: 'error',
            error: `Unexpected data from XAIR interface, OSC address: ${oscAddress} (cg fader float calculation)`,
          };
        }

        faders.push(db);
        mutes.push(!buf.readInt32LE(i + 4)); // cast as boolean
      }

      return {
        type: 'faderMute',
        faders,
        mutes,
      };

    case '/meters/1':
      if (oscFormat !== ',b') {
        return {
          type: 'error',
          error: `Unexpected data from XAIR interface, OSC address: ${oscAddress} (meters format)`,
        };
      }

      buf = buf.subarray(8);

      const meters: number[] = [0];

      for (let i = 0; i < 64; i += 2) {
        meters.push(buf.readInt16LE(i) / 256);
      }
      
      return {
        type: 'meters',
        meters,
      }

    case '/info':
      let consoleInfo = '';

      while (buf.length > 3 && !(buf.length === 4 && buf.indexOf(0) === 0)) {
        split = buf.indexOf(0);

        if (split === 0) {
          buf = buf.subarray(4);
          split = buf.indexOf(0);
        }

        if (consoleInfo !== '') consoleInfo += ' ';

        consoleInfo += buf.subarray(0, split).toString();

        if (split >= -1) split = Math.ceil(split / 4) * 4;

        buf = buf.subarray(split);
      }

      return {
        type: 'connectionNotice',
        consoleInfo,
      };

    default:
      return {
        type: 'error',
        error: `Unexpected data from XAIR interface, OSC address: ${oscAddress} (unhandled message)`,
      };
  }
}