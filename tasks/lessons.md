# Lessons

## Verifying visual work with stills alone hides "not happening"

**Failure mode.** Enhanced the visualization with drift, travelling signals, and
activation cascades, verified each against screenshots, and reported it done. The
user's response was "I haven't seen any visible change" — and they were right. Four
rounds of fixing an over-bright first attempt had driven every amplitude down until
the effects were present in code and absent to the eye. Drift displaced the cloud 1.6
units against a 160-unit span; a signal took 5.5 seconds to cross one 1px edge.

**Detection signal.** It was already in the data I had collected and skimmed past:
`litPixels` was 614k for the original and 518k for the "enhanced" version. The new
build was measurably *dimmer* than the thing it was meant to improve. Any metric
moving the wrong way against the baseline deserves an explanation before shipping.

**Prevention rule.** For anything animated, verify against a *moving* reference, not
a still. Capture frames over time and measure inter-frame delta with the camera or
other ambient motion frozen, so the measurement isolates the thing actually being
added. A filmstrip of several frames is worth more than one perfect screenshot. And
when a metric contradicts the story being told about the work, resolve it rather than
noting it in passing.

## Tune the cause, not the symptom, before reaching for the volume knob

**Failure mode.** The first attempt blew out to white. Each subsequent round reduced
amplitudes — cascade brightness, signal brightness, bloom — which fixed the blowout
by making everything faint. The actual cause was structural: an accent colour of
near-white `#e1f5fe` pumping red into dense regions under additive blending, plus
depth grading that brightened lines *upward* toward core cyan.

**Detection signal.** `warmPixels` measured 0 in every frame, so the "warm haze" I
kept trying to dim was never warm — it was desaturation. Brightest-pixel red read 167
against the baseline's 80. That distinction was invisible by eye and obvious in data.

**Prevention rule.** When output looks wrong, measure before adjusting. Fixing the
cause (a cold accent, grading downward from a per-mesh base tint) restored the
headroom to run every effect two to five times louder than the "fixed" version, with
a better result. Turning things down is what you do when you do not yet know why.
