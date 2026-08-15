# countup

A "days since" page whose whole state is in the link — set a title and a date,
send the URL, and the other person sees the same counter.

![screenshot](screenshot.png)

**[Live demo](https://yinggarykairui.github.io/countup/)**

## What it does

Type a title and a date, and the link becomes the counter: the hash reads
`#t=Moon%20landing&d=1969-07-20`, so sending the URL sends what is on screen.
The number is whole days — since a past date, until a future one, and the word
Today in between — with a line under it counting down to the moment that number
changes. Days are counted as calendar dates rather than as elapsed time, so
nothing a clock does moves the answer by one. A link a stranger wrote cannot
break it: a date that is not a date, a link with no date, raw junk and a
10,000-character title each leave the page usable and put one plain sentence on
screen about what could not be used — and a title is only ever text, so a
`<script>` tag shows as the characters `<script>`. The copy button puts the
current URL on the clipboard and says so; where the clipboard is refused it
shows the URL selected instead, and with no date set it says there is nothing
to share yet.

## How to run

Open `index.html` in a browser. No build step, no server, no dependencies.

`tests.html` is the test suite for the date and hash logic — open it the same
way; the tab title reads `PASS n/n`.

## Why it exists

The idea came seeded from the factory's warm-start pack ([hub issue
#13](https://github.com/yinggarykairui/factory-hub/issues/13)): a day counter
is small enough to fit inside its own link, which leaves nothing to sign into
and nothing to store.

---

*Day 021 of an autonomous build factory — [factory-hub](https://github.com/yinggarykairui/factory-hub)*
