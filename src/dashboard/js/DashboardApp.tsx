import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useReplicant } from './utils/hooks';

const BUNDLE_NAMESPACE = 'nodecg-xair-meter';

const BINDING_SLOTS = [
  { id: 'game1', name: 'Game 1', group: 'Game Feeds' },
  { id: 'game2', name: 'Game 2', group: 'Game Feeds' },
  { id: 'game3', name: 'Game 3', group: 'Game Feeds' },
  { id: 'game4', name: 'Game 4', group: 'Game Feeds' },
  { id: 'runner1', name: 'Runner 1', group: 'Runner Voice' },
  { id: 'runner2', name: 'Runner 2', group: 'Runner Voice' },
  { id: 'runner3', name: 'Runner 3', group: 'Runner Voice' },
  { id: 'runner4', name: 'Runner 4', group: 'Runner Voice' },
  { id: 'commentary1', name: 'Comm. 1', group: 'Commentary Voice' },
  { id: 'commentary2', name: 'Comm. 2', group: 'Commentary Voice' },
  { id: 'commentary3', name: 'Comm. 3', group: 'Commentary Voice' },
  { id: 'commentary4', name: 'Comm. 4', group: 'Commentary Voice' },
  { id: 'host', name: 'Host', group: 'Other' },
];

const SLOT_MAPPINGS_DEFAULT = BINDING_SLOTS.reduce((acc, { id }) => ({
  ...acc,
  [id]: null,
}), {}); 

interface SlotRowProps {
  id: string;
  name: string;
  group: string;
  isNewGroup: boolean;
}
const SlotRow: React.FC<SlotRowProps> = ({ id, name, group, isNewGroup }) => {
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
    <>
      {isNewGroup && <GroupHeader>{group}</GroupHeader>}
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
    </>
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
      {BINDING_SLOTS.map(({ id, name, group }, index) => (
        <SlotRow
          key={id}
          id={id}
          name={name}
          group={group}
          isNewGroup={BINDING_SLOTS[index - 1]?.group !== group}
        />
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

const GroupHeader = styled.h4`
  grid-column: 1 / -1;
  margin: 0.75rem 0 0.25rem;
  font-size: 1rem;
  font-weight: 700;
`;
