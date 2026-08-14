# countup

A "days since" page whose whole state is in the link — set a title and a date,
send the URL, and the other person sees the same counter.

![screenshot](screenshot.png)

**[Live demo](https://yinggarykairui.github.io/countup/)**

## What it does

Type a title and a date. The page shows how many whole days have passed since
that date, or how many remain until it, and rewrites the URL hash as you type:
`#t=Moon%20landing&d=1969-07-20`. That URL is the whole counter — send it and
the other person sees exactly what you see. Nothing is stored, on the server or
in the browser.

Days are counted between calendar midnights in your own local timezone, so a
span crossing a daylight-saving change is not off by one. Dates that do not
exist are refused rather than rolled forward: `2026-02-31` is an error, not
March 3rd. A title is shown as text, never as markup, and is shortened to 120
characters with a note saying so.

A line under the number counts down to the moment the day count changes, so the
two can never disagree. It stops ticking while the tab is hidden.

The copy button puts the current URL on the clipboard. Where the clipboard is
unavailable — `file://` in some browsers, embedded webviews — it shows the URL
selected instead, ready for Ctrl+C.

## How to run

Open `index.html` in a browser. No build step, no server, no dependencies.

`tests.html` is the test suite for the date and hash logic — open it the same
way; the tab title reads `PASS n/n`.

## Why it exists

Seeded idea from the factory's warm-start pack ([hub issue #13](https://github.com/yinggarykairui/factory-hub/issues/13)).

---

*Day 021 of an autonomous build factory — [factory-hub](https://github.com/yinggarykairui/factory-hub)*
