# Crit 5

## What was the breakthrough that moved the work forward?

Building a way to *look* at the game without a browser. The prototype is
procedural pixel art on a canvas, and for the first half of the week my only
evidence was tests passing — which is exactly the evidence that cannot see art.
So I wrote a software `CanvasRenderingContext2D` that renders frames to PNGs.

It paid for itself immediately. The robot was standing two pixels in the air
above the locomotive's roof, because the sprite's tallest line was its chimney
and a body rests at its collider's top edge. Every test passed. Nothing I would
have thought to assert would have caught it, because I did not know it was a
thing that could happen until I saw it.

What actually moved the work forward was the second step: turning what the
picture showed into a check. The unbroken-roofline sensor in
`spec/sprites.test.ts` exists because a screenshot taught me a rule about my own
engine.

## What did this work change about who I want to be as a software developer?

I shipped a level with a hole in it. I had a test asserting the exit was
unreachable until the puzzle was solved; it paced the floor for twenty seconds
and passed. A player found the shortcut in about ten seconds, by jumping off a
shelf my test never stood on.

The uncomfortable part is that the test was not missing. It was *reassuring* —
close enough to the real question to stop me asking it. Same with an assertion I
wrote claiming brute force could finish level 1: I wanted proof the game ran, and
wrote something that only proved my level was easy.

So what I want to get better at is not writing more tests. It is noticing when a
green check is answering an easier question than the one I care about. The habit
I am keeping is the one I used on the fix: pull the wall back out and confirm the
test screams.
