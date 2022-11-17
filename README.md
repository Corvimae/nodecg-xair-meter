# nodecg-xair-meter

NodeCG bundle for exposing channel data from the Behringer X-Air series of mixers to
an overlay for speedrun commentary.

Most of this was made by [Mark Schwartzkopf](https://github.com/markschwartzkopf), I just adapted it for the X AIR 18 and cleaned it up a bit.

## Config

`defaultMixerAddress` - The IP address of the mixer (as shown in the header of X AIR Edit). This is just the default value when `nodecg-xair-mixer` launches for the first time; after that, you can change the value from the debug section in the dashboard panel.

`meterActivationThreshold` - The minimum pre-fader dB to consider a channel as activated. Defaults to `-30`.

`fadeActivationThreshold` - The minimum fader level to consider a channel as activated. Defaults to `-30`.

## FAQ

#### Does this work with the Behringer X AIR 12 and 16?

They _should_, according to the API docs. I don't own either of those, though, so I can't test that.

#### Does this work with the [mixer that's not in the Behringer X AIR Series]?

Almost certainly not; you'll need to create your own driver. Drivers for the Wing and X32 exist, but I'm not comfortable porting them without the ability to verify they work on hardware.

#### Can you port this to [my mixer]?

sure buy me one :)