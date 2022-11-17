import { OSCArgument } from './mixerTypes';

export function stringToBuffer(str: string): Buffer {
  const buffer = Buffer.from(str);
  const bufferPadding = Buffer.alloc(4 - (buffer.length % 4));
  
  return Buffer.concat([buffer, bufferPadding]);
}

export function formatOSCArgument(arg: OSCArgument): Buffer {
	switch (arg.type) {
		case 'b':
			return arg.data;

		case 'f':
			let floatBuf = Buffer.allocUnsafe(4);

			floatBuf.writeFloatBE(arg.data, 0);

			return floatBuf;

		case 'i':
			let intBuf = Buffer.allocUnsafe(4);

			intBuf.writeInt32BE(arg.data, 0);

			return intBuf;

		case 's':
			return stringToBuffer(arg.data);
	}
}

export function formatMixerCommand(cmd: string, args: OSCArgument[] = []): Buffer {
	const commandBuffer = stringToBuffer(cmd);
	const argumentBuffer: Buffer[] = [];
	let argumentTypes = ',';

	if (args.length > 0) {
		for (let i = 0; i < args.length; i++) {
			argumentTypes += args[i].type;
			argumentBuffer.push(formatOSCArgument(args[i]));
		}
	}

	const typesBuffer = stringToBuffer(argumentTypes);
	const argsBuffer = Buffer.concat(argumentBuffer);

	return Buffer.concat([commandBuffer, typesBuffer, argsBuffer]);
}

export function calculateFaderFloatDb(faderFloat: number): number | null {
  if (faderFloat >= 0.5) {
    return faderFloat * 40 - 30;
  } else if (faderFloat >= 0.25) {
    return faderFloat * 80 - 50;
  } else if (faderFloat >= 0.0625) {
    return faderFloat * 160 - 70;
  } else if (faderFloat >= 0.0) {
    return faderFloat * 480 - 90;
  }

  return null;
}