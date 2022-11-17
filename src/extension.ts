import { NodeCGServer } from 'nodecg-types/types/lib/nodecg-instance';
import { XAir18 } from './mixer/drivers/xair-18';
import { MixerInterface } from './mixer/mixerTypes';

interface ChannelStatus {
  channel: number;
  meter: number;
  fader: number;
  muted: boolean;
  isBelowFaderThreshold: boolean;
  isBelowMeterThreshold: boolean;
  isActivated: boolean;
}

export = (nodecg: NodeCGServer) => {
  let mixer: MixerInterface = null;
  
  const mixerAddress = nodecg.Replicant<string>('mixerAddress', 'nodecg-xair-meter', {
    defaultValue: nodecg.bundleConfig.defaultMixerAddress,
  });

  const isMixerConnected = nodecg.Replicant<boolean>('isMixerConnected', 'nodecg-xair-meter', {
    defaultValue: false,
    persistent: false,
  });

  const channelLevels = nodecg.Replicant<ChannelStatus[]>('channelLevels', 'nodecg-xair-meter', {
    defaultValue: [...new Array(17)].map((_, index) => ({
      channel: index,
      meter: -128,
      fader: -90,
      muted: false,
      isBelowFaderThreshold: true,
      isBelowMeterThreshold: true,
      isActivated: false,
    })),
    persistent: false,
  });

  function channelStatusWithCalculatedValues(status: ChannelStatus): ChannelStatus {
    const isBelowFaderThreshold = status.fader < (nodecg.bundleConfig.fadeActivationThreshold || -30);
    const isBelowMeterThreshold = status.meter < (nodecg.bundleConfig.meterActivationThreshold || -30);

    return {
      ...status,
      isActivated: !status.muted && !isBelowFaderThreshold && !isBelowMeterThreshold,
      isBelowFaderThreshold,
      isBelowMeterThreshold,
    };
  }

  function connectToMixer() {
    mixer = new XAir18(mixerAddress.value || '0.0.0.0');

    mixer.on('connected', () => {
      isMixerConnected.value = true;
    });

    mixer.on('data', data => {
      switch (data.type) {
        case 'meters':
          channelLevels.value = channelLevels.value.reduce((acc, record) => [
            ...acc,
            channelStatusWithCalculatedValues({
              ...record,
              meter: data.meters[record.channel]
            }),
          ], [] as ChannelStatus[]);

          return;

        case 'faderMute':
          channelLevels.value = channelLevels.value.reduce((acc, record) => [
            ...acc,
            channelStatusWithCalculatedValues({
              ...record,
              fader: data.faders[record.channel],
              muted: data.mutes[record.channel],
            }),
          ], [] as ChannelStatus[]);

          break;
      }
    });

    mixer.on('closed', () => {
      mixer = null;
      isMixerConnected.value = false;
    });

    mixer.on('info', info => {
      nodecg.log.info(`From mixer: ${info}`);
    });

    mixer.on('error', error => {
      nodecg.log.error(`Error from mixer: ${error}`);
    })
  }

  nodecg.listenFor('attemptDisconnect', () => {
    nodecg.log.info('X-Air disconnect requested from dashboard.');

    if (mixer) {
      mixer.close();
      mixer = null;
      isMixerConnected.value = false;
    } else {
      nodecg.log.warn('Mixer is not connected, ignoring.');
    }
  })

  nodecg.listenFor('attemptConnect', () => {
    nodecg.log.info('X-Air connect requested from dashboard.');

    if (mixer) {
      nodecg.log.warn('Mixer is connected or attempting to connect, ignoring.');
    } else {
      connectToMixer();
    }
  });

  connectToMixer();
}