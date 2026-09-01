# Process overview

## What I built

**Spongebot**: a sponge robot stuck in a toybox, across three rooms. Soak up a
puddle and it turns heavy — heavy enough to hold down a pressure plate and raise
the gate. Soak up a battery and the water is gone, replaced by a charged form
that can start a dead toy train, whose roof is the step up to the exit. The last
room needs both, in that order. Pixel art on a canvas; nothing explained in
words.

## The moments that mattered

### A bug no test could see

The train's roof is a platform, and the robot stands at the top edge of its
collision box. My sprite's tallest point was the chimney, not the cab roof, so
the robot stood two pixels in the air. Every test passed.

I only saw it because I had built a fake canvas that renders frames to PNGs.
Rather than nudge the sprite, I levelled the roofline and wrote the rule into
`spec/sprites.test.ts`: the top row of the sprite must be one unbroken run of
pixels.

[`d3c4d33`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/d3c4d33)

### The test that was too lazy

I had a test claiming the exit was unreachable until the train moved. It walked
the robot along the floor, jumping, for twenty seconds, and passed. Then someone
played level 2 and jumped onto the exit in ten seconds — off a shelf four pixels
below it that my test had never stood on.

The wall blocking that took one line. The fix that mattered was to the test,
which now launches from every surface in the level; I confirmed it by taking the
wall back out and watching it fail.

The test wasn't missing. It was reassuring, which is worse.

[`d3c4d33`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/d3c4d33) ·
[full history](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/compare/d2e4964...9ef8315)
