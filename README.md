# nodecg-xair-meter

NodeCG bundle for exposing channel data from the Behringer X-Air series of mixers to
an overlay for speedrun commentary.

Most of this was made by [Mark Schwartzkopf](https://github.com/markschwartzkopf), I just adapted it for the X-Air 18 and cleaned it up a bit.

## Config

`mixerAddress` - The LAN address of the mixer (NOT the WLAN address!).

`meterActivationThreshold` - The minimum pre-fader dB to consider a channel as activated. Defaults to `-30`.

`fadeActivationThreshold` - The minimum fader level to consider a channel as activated. Defaults to `-30`.
