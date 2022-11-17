import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useReplicant } from './utils/hooks';

const BUNDLE_NAMESPACE = 'nodecg-xair-meter';

const BINDING_SLOTS = [
  { id: 'runner1', name: 'Runner 1' },
  { id: 'runner2', name: 'Runner 2' },
  { id: 'runner3', name: 'Runner 3' },
  { id: 'runner4', name: 'Runner 4' },
  { id: 'commentary1', name: 'Comm. 1' },
  { id: 'commentary2', name: 'Comm. 2' },
  { id: 'commentary3', name: 'Comm. 3' },
  { id: 'commentary4', name: 'Comm. 4' },
  { id: 'host', name: 'Host' },
];

const SLOT_MAPPINGS_DEFAULT = BINDING_SLOTS.reduce((acc, { id }) => ({
  ...acc,
  [id]: null,
}), {}); 

interface SlotRowProps {
  id: string;
  name: string;
}
const SlotRow: React.FC<SlotRowProps> = ({ id, name }) => {
  const [channelLevels] = useReplicant('channelLevels', [], { namespace: BUNDLE_NAMESPACE });
  const [slotMappings, setSlotMappings] = useReplicant('slotMappings', SLOT_MAPPINGS_DEFAULT, { namespace: BUNDLE_NAMESPACE });

  const handleUpdateSlotMapping = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    const parsedValue = Number(event.target.value);

    if (!event.target.value || Number.isNaN(parsedValue)) {
      setSlotMappings({
        ...slotMappings,
        [id]: null
      });
    } else {
      setSlotMappings({ 
        ...slotMappings,
        [id]: parsedValue,
      });
    }
  }, [slotMappings, setSlotMappings]);

  const levelData = useMemo(() => channelLevels[slotMappings[id]], [channelLevels, slotMappings, id]);

  return (
    <SlotRowContainer key={id}>
      <SlotName>{name}</SlotName>
      <SlotInputContainer>
        <input onBlur={handleUpdateSlotMapping} defaultValue={slotMappings[id] || ''}/>
      </SlotInputContainer>
      {levelData ? (
        <>
          <SlotEnabled>{levelData.isActivated ? 'On' : 'Off'}</SlotEnabled>
          <SlotLevelData isBelowThreshold={levelData.isBelowMeterThreshold}>
            Meter: {levelData.meter.toFixed(2)}
          </SlotLevelData>
          <SlotLevelData isBelowThreshold={levelData.isBelowFaderThreshold}>
            Fader: {levelData.fader.toFixed(2)}
          </SlotLevelData>
          {levelData.muted ? <SlotMuted>Muted</SlotMuted> : <div />}
        </>
      ) : <NoLevelData />}
    </SlotRowContainer>
  )
}
export const DashboardApp: React.FC = () => {
  const [mixerAddress, setMixerAddress] = useReplicant('mixerAddress', '', { namespace: BUNDLE_NAMESPACE });
  const [isMixerConnected] = useReplicant('isMixerConnected', false, { namespace: BUNDLE_NAMESPACE });
  const [debugActionsEnabled, setDebugActionsEnabled] = useState(false);
  const [_slotMappings, setSlotMappings] = useReplicant('slotMappings', SLOT_MAPPINGS_DEFAULT, { namespace: BUNDLE_NAMESPACE });

  const handleToggleDebugEnabled = useCallback(() => {
    setDebugActionsEnabled(!debugActionsEnabled);
  }, [debugActionsEnabled]);
  
  const handleUpdateMixerAddress = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMixerAddress(event.target.value);
  }, [setMixerAddress]);

  const handleToggleConnection = useCallback(() => {
    if (isMixerConnected) {
      nodecg.sendMessage('attemptDisconnect');
    } else {
      nodecg.sendMessage('attemptConnect');
    }
  }, [isMixerConnected]);

  const handleClearChannelMappings = useCallback(() => {
    setSlotMappings({})
  }, [setSlotMappings]);

  return (
    <Container>
      {!isMixerConnected && (
        <MixerDisconnectedWarning>Mixer is not connected!</MixerDisconnectedWarning>
      )}
      {BINDING_SLOTS.map(({ id, name }) => (
        <SlotRow key={id} id={id} name={name} />
      ))}
      <ActionsContainer>
        <button onClick={handleClearChannelMappings}>
          Clear channel mappings
        </button>
        <button onClick={handleToggleDebugEnabled}>
          {debugActionsEnabled ? 'Disable' : 'Enable'} Debug Actions
        </button>
      </ActionsContainer>
      {debugActionsEnabled && (
        <DebugSection>
          <label>DEBUG ZONE - Don&apos;t touch if you don&apos;t know what you&apos;re doing!</label>
          <DebugActions>
            <MixerAddressContainer>
              <label htmlFor="mixerAddress">Mixer IP:</label>
              <input id="mixerAddress" onChange={handleUpdateMixerAddress} value={mixerAddress} disabled={isMixerConnected} />
            </MixerAddressContainer>
            <button onClick={handleToggleConnection}>{isMixerConnected ? 'Disconnect from' : 'Connect to'} mixer</button>
          </DebugActions>
        </DebugSection>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: grid;
  padding: 0.5rem 1rem;
  grid-template-columns: max-content 4rem 1fr repeat(3, max-content);
`;

const SlotRowContainer = styled.div`
  display: contents;
  margin-bottom: 0.5rem;

  & > div {
    display: flex;
    flex-direction: row;
    padding: 0.25rem 0.25rem;
    align-items: center;
  }

  & > div + div {
    margin-left: 0.25rem;
  }
`;

const SlotName = styled.div`
  text-align: right;
`;

const SlotInputContainer = styled.div`
  position: relative;

  & > input {
    width: 100%;
    text-align: center;
  }
`;


const SlotEnabled = styled.div`
  font-weight: 700;
  font-size: 0.75rem;
`

const MixerDisconnectedWarning = styled.div`
  grid-column: 1 / -1;
  background-color: #990000;
  color: #fff;
  margin-bottom: 1rem;
  font-weight: 700;
  font-size: 1.25rem;
  text-align: center;
  padding: 0.25rem 0.5rem;
`;

const SlotLevelData = styled.div<{ isBelowThreshold: boolean }>`
  font-family: monospace;
  font-size: 0.75rem;
  color: ${({ isBelowThreshold }) => isBelowThreshold && '#ff7676'};
`;

const SlotMuted = styled.div`
  display: flex;
  font-family: monospace;
  justify-content: center;
  align-items: center; 
  color: #ff7676;
  font-size: 0.75rem;
  padding: 0.125rem;
  font-weight: 700;
`;

const NoLevelData = styled.div`
  grid-column: span 4;
`;

const ActionsContainer = styled.div`
  grid-column: 1 / -1;
  margin-top: 0.5rem;

  & button + button {
    margin-left: 1rem;
  }
`;

const DebugSection = styled.div`
  display: flex;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #990000;
  grid-column: 1 / -1;
  flex-direction: column;
  align-items: center;

  & label {
    color: #ffa2a2;
    text-align: center;
    font-weight: 700;
  }
`;

const DebugActions = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 0.5rem;
  
  & button + button {
    margin-left: 1rem;
  }
`;

const MixerAddressContainer = styled.div`
  margin-right: 1rem;

  & label {
    margin-right: 0.25rem;
  }
`;