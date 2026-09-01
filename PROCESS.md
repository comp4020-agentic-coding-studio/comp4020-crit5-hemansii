# Process overview

<!-- DRAFT — still mine to do:
     - rewrite "What I built" in my own voice
     - trim to the 3 strongest moments if this runs long against the word count
     - consider committing a before/after screenshot into docs/ for moment 2
       and linking it relatively; a broken image shows on render, so only add
       one once the file is actually committed -->

## What I built

*Spongebot* — a small browser game: a sponge robot in a toybox, built as
procedural pixel art drawn to a `<canvas>` at a fixed 256x144 and scaled up
crisply. Three short levels, each one screen, each ending at a lit doorway.

The robot has two abilities, and the rule that matters is that it can only hold
one. Walking into a puddle swells it into a heavier **water** form, the only
thing weighty enough to hold down a pressure plate and raise a portcullis.
Walking into a battery replaces whatever it was holding with a **charged** form
— brighter, quicker, throwing sparks — which is the only thing a dead toy
locomotive will answer to. Powered, the locomotive drives out of its tunnel and
its roof becomes the one step high enough to reach the exit.

Level 1 is water, level 2 is electricity, and level 3 is both in one room —
which is the only place the one-at-a-time rule bites, because the plate has to be
solved while the robot still has the water the battery will take away. Every
puzzle is taught by layout and animation; the only text in the game is the word
"COMPLETE" at the end.

## The moments that mattered

### 1. The art got a test, because I could not count

The sprites are hand-authored grids of palette indices. Reviewing a wall of
numbers, I could not tell a correct sprite from one with a miscounted row — and
a malformed grid renders as slightly wrong art, never as an error.

The obvious fix was to check my arrays more carefully. Instead I changed how the
art is written and what it runs against: sprites are now authored as rows of
characters, so the shape is legible in source, and `spec/sprites.test.ts`
asserts every grid is rectangular and only uses palette indices its palette
actually defines.

I knew it was right because the test failed on its first run and named three
miscounted rows in the teddy sprite that I had already read past and would have
shipped. It caught a fourth later when I added the water form.

[`f4752e0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/f4752e0)

### 2. A rewrite instead of a retry, when the bug would not reproduce

Movement was reported dead in the browser. It worked in every test I ran. The
real defect surfaced underneath: identical scripted runs sometimes ended with
the robot falling through the floor, `vy` climbing past 700, and sometimes did
not — the same input, different outcomes.

> I shouldn't have to click or focus the canvas first for the controls to work.
> Movement should work as soon as the game loads.

The obvious move was to keep re-running until I caught it, or nudge the
collision epsilons until the failures stopped. I traced it instead to real
frame-timing jitter: a large `dt` let a fast fall skip clean through a thin
platform in one step, and once the body is past, the transition check can never
fire again. Tuning numbers would have hidden that, not fixed it. I replaced the
variable-`dt` update with a fixed-timestep accumulator, so displacement per
physics step is bounded no matter how long a frame takes.

I knew it was right because the same script that had been flaky then returned
byte-identical results across eight consecutive runs.

[`d2e4964`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/d2e4964)

### 3. Reading the level's geometry instead of trusting it

> The water transformation works, but right now it doesn't have a clear purpose
> and some of the platforms are too high to reach.

Rather than nudge platforms until they felt reachable, I computed it. Max jump
height is `v²/2g`, so the numbers were checkable: the level asked for a 40px
rise, leaving the dry form 5.9px of margin and the water form **−3.4px**. The
platforms were not "a bit high" — for the heavy form they were arithmetically
impossible, and no amount of play-testing would have told me by how much.

Respacing surfaced a second thing the arithmetic knew and I did not: a low shelf
can be unreachable even when the jump clears it, because the robot's head meets
the underside before its feet clear the top. My first respacing had a *negative*
launch window.

The fix landed in the harness, not just the layout: `spec/puzzle.test.ts` now
derives each form's jump height from its own tuning and asserts every climb in
the level clears it with margin, so a future tuning change cannot quietly make a
platform unreachable again.

[`94a0708`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/94a0708)

### 4. Believing the browser over the design

I built the pressure plate as a shallow 3px step so the robot would visibly sink
into it. Playing it in a real browser, the robot stopped dead at the button's
edge and never reached it — collision resolution has no step-up, so a 3px lip is
a wall, and it would also have trapped the robot behind the plate on the way
back.

The obvious fix was to add step-up handling to the collision code. I chose not
to: that touches the physics every other behaviour depends on, to serve one
button. The plate became a flush trigger pad that depresses *under* the robot
instead of lifting it — no collision change, and arguably the clearer read.

I knew it was right by playing the whole puzzle end to end in a headless
browser, on a fresh load with no click or focus: dry robot refused by the plate,
blocked by the gate, back for the water, plate latched, gate raised, reward
ledge climbed.

[`7b6570e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/7b6570e)

### 5. A bug that no test I would have written could see

The locomotive's roof is a platform, and a body rests at its *collider's* top
edge. My engine sprite had a tall chimney over a lower boiler, so the collider's
top was the chimney — and the robot stood two pixels in the air above the cab
roof. Every test passed. The geometry was right, the reachability arithmetic was
right, and the game looked subtly broken.

I only saw it because I had built a software `CanvasRenderingContext2D` in
`tools/preview/` that renders frames to PNGs, so I could look at the game
without a browser. The obvious response was to nudge the sprite. Instead I
redesigned the engine so chimney, saddle tank and cab roof are all the same
height — one unbroken roofline — and wired the reason into `spec/sprites.test.ts`
as a sensor: the top row's opaque pixels must form a single contiguous run at
least as wide as the widest form. The picture found it once; the sensor finds it
from now on.

[`d3c4d33`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/d3c4d33)

### 6. The bug my "cannot be short-cut" test was too lazy to find

I wrote a test asserting the exit shelf was unreachable until the locomotive
moved. It paced the floor, jumping every frame, for twenty seconds. It passed.
Then a player walked up to level 2 and jumped straight onto the exit.

The route was real: level 2 had a decorative shelf at y=74, four pixels below
the exit shelf at y=70, and a running jump off its edge crossed the fifty-pixel
gap. Level 3 has the same near-level shelf and was never vulnerable, purely
because its door beam happens to sit in the flight path. My test had only ever
tried launching from the floor.

The fix in the level was one wall. The fix in the harness was the real one: the
test now stands the robot on *every* surface in the level, at both edges, and
runs it at the exit jumping every frame with the locomotive pinned asleep. I
checked it has teeth by pulling the wall back out — it fails and names the
culprit: `launching right off the platform at (100, 74) reached the exit with the
train asleep`.

[`d3c4d33`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/d3c4d33)

That is the second time this class of bug has bitten: a climb the arithmetic
approves of that the geometry allows or forbids anyway. It is why the strongest
check in this repo is `spec/playthrough.test.ts`, which drives the real
simulation with a scripted controller and walks all three levels to their exits.
Geometry can only tell you a route ought to work.

### 7. A particle that stopped moving without going away

Replaying the game left a frozen shower of confetti hanging in mid-air over the
new level. The cause was one line in the wrong scope: the confetti's `update`
sat inside the `if (complete)` branch alongside the code that spawns it, so
Replay — which clears `complete` — stopped *stepping* the flecks without
removing them.

The obvious fix was to clear the confetti on replay. I did that, and also moved
the update out of the branch, because either fix alone leaves the same hole open
somewhere else: anything that ends a celebration early strands whatever is still
on screen. Spawning is conditional; simulating is not.

Worth recording because of where it came from. This is the one part of the game
`spec/playthrough.test.ts` cannot see — it drives the simulation, and confetti
is not simulation, it is decoration on top of it. Everything the tests own has
held; both bugs that reached a player this week lived in the gap between the
simulation and what is drawn over it.

[`9ef8315`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/commit/9ef8315)

## A note on what kept being wrong

Across this work, my *tests* were wrong more often than the game was — five
separate "failures" turned out to be the harness, not the code: a jump asserted
from a spot with 6px of headroom under a platform, a platform landing checked
after the robot had already walked off the far edge, and a retry loop that never
repositioned the robot between attempts, so every try after the first launched
from the wrong place. Each time the honest move was to trace the actual state
before touching the game — twice the game was already correct, and "fixing" it
would have introduced the bug.

Two more joined that list in the second half: a coordinate that went stale when a
level moved its battery, and an assertion that brute force could finish level 1 —
which it cannot, because it is a puzzle. That last one is the sharpest of them.
I had reached for a test that would prove the game ran end to end, and written
one that only asserted my level was easy.

Full history:
[`d2e4964...9ef8315`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-hemansii/compare/d2e4964...9ef8315)
