/* countup — pure logic, no DOM.
   Loaded as a classic script by index.html and tests.html so both share one
   copy. Not an ES module: file:// blocks module imports, and the page must
   work when opened straight off disk. Everything hangs off window.Countup. */
(function (global) {
  'use strict';

  var MS_PER_DAY = 86400000;

  /* A 10,000-character title arrives from a URL a stranger wrote. Store the
     clamped form so the hash, the field and the heading all agree. */
  var MAX_TITLE = 120;

  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

  /* The instant that (y, m, d) starts at in UTC, where every day is exactly
     86,400,000 ms long. Date.UTC maps years 0-99 onto 1900-1999, so an early
     year is put back by hand — a link carrying one should not be called
     unreal. */
  function utcDay(y, m, d) {
    var ms = Date.UTC(y, m, d);
    if (y >= 0 && y < 100) {
      var probe = new Date(ms);
      probe.setUTCFullYear(y, m, d);
      ms = probe.getTime();
    }
    return ms;
  }

  /* Strict YYYY-MM-DD, returned as the Date whose *UTC* midnight is that
     calendar day. Read it back with getUTC*().

     A calendar day is not an instant, and asking for a local one can fail:
     Samoa jumped the dateline at the end of 2011 and had no local
     2011-12-30 at any hour, so new Date(2011, 11, 30) silently lands on the
     31st. UTC has no such holes, no DST and no 23- or 25-hour days, so the
     date written down always survives the round trip.

     Date.UTC(2026, 1, 31) still rolls into March instead of failing, so the
     constructed date is read back and compared. Year 0000 is refused: the
     date field cannot hold it. */
  function parseDate(text) {
    if (typeof text !== 'string') return null;
    var m = ISO.exec(text);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var probe = new Date(utcDay(y, mo - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 ||
        probe.getUTCDate() !== d) return null;
    return probe;
  }

  function isValidDate(text) {
    return parseDate(text) !== null;
  }

  /* A whole date is eight digits: two, two and four, in whatever order the
     browser's locale puts them. */
  var DATE_DIGITS = 8;

  /* What to say about a date field that has not produced a usable date.

     Blink hands the page nothing to tell the three cases apart on its own: a
     half-typed date, a complete but impossible one (29 February 2026) and an
     emptied field all read value === '' with validity.badInput === true. So
     the page counts the digits the field has been given since the visitor
     last started on it and passes the count in; eight of them is a whole
     date, and a whole date the field refuses is a date that does not exist.
     Browsers that hand over the text instead (a five-digit year arrives as
     '20260-01-01') are answered from the text, which is better evidence. */
  function dateNote(value, badInput, digits) {
    var text = typeof value === 'string' ? value : '';
    var m = /^(\d+)-(\d{2})-(\d{2})$/.exec(text);
    if (m && (m[1].length > 4 || +m[1] < 1)) {
      return 'That year is out of range. Use a year between 0001 and 9999.';
    }
    if (text !== '') return 'That is not a real date. Pick another one.';
    if (!badInput) return 'Pick a date to start the counter.';
    return (digits >= DATE_DIGITS)
      ? 'That is not a real date. Pick another one.'
      : 'Finish the date to start the counter.';
  }

  /* The visitor's today: the calendar day nowMs falls on by the *local*
     clock, carried as a UTC-midnight Date like every other date here. */
  function today(nowMs) {
    var d = new Date(nowMs);
    return new Date(utcDay(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  /* Whole calendar days between two dates, both read as UTC (y, m, d) and
     differenced in UTC space. No elapsed local time is measured at all, so
     the answer cannot be moved by a DST change, by a half-hour zone or by a
     dateline jump; it is exact by construction. */
  function wholeDays(fromDate, toDate) {
    return (utcDay(toDate.getUTCFullYear(), toDate.getUTCMonth(),
        toDate.getUTCDate()) -
      utcDay(fromDate.getUTCFullYear(), fromDate.getUTCMonth(),
        fromDate.getUTCDate())) / MS_PER_DAY;
  }

  /* Signed days from the local day containing nowMs to the target date.
     Negative = past, 0 = today, positive = future. */
  function daysFrom(nowMs, dateText) {
    var target = parseDate(dateText);
    if (!target) return null;
    return wholeDays(today(nowMs), target);
  }

  /* Time left before the day number changes, i.e. until the next local
     midnight. One Date.now() feeds this and daysFrom on every tick, so the
     two lines can never disagree at a rollover. A fall-back day makes this
     25 hours long, so hours can read 24; that is the honest number.

     Rounded up, not down: with 900 ms left a floor reads 00 s, which is
     both a second short and a full second of a countdown sitting on zero
     while nothing happens. Ceiling counts 03 s, 02 s, 01 s and then the day
     changes. */
  function untilNextMidnight(nowMs) {
    var d = new Date(nowMs);
    var next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    var left = Math.max(0, next.getTime() - nowMs);
    var s = Math.ceil(left / 1000);
    return { h: Math.floor(s / 3600), m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatClock(parts) {
    return pad(parts.h) + ' h ' + pad(parts.m) + ' m ' + pad(parts.s) + ' s';
  }

  /* Digits in threes, separated by a thin space (U+2009). 2912217 is the
     whole product of this page and unreadable in one glance; 2 912 217 is
     not. A thin space rather than a comma or a full stop because those two
     mean opposite things in different countries and this page has no
     locale to consult. */
  function group(digits) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* Big figure plus its unit line. Today gets a word, not a zero.
     `plain` is the same figure in bare digits, for the places grouping does
     not help: the screen-reader line and the tab title. */
  function phrase(days) {
    if (days === 0) return { figure: 'Today', plain: 'Today', unit: '' };
    var n = String(Math.abs(days));
    return {
      figure: group(n),
      plain: n,
      unit: (Math.abs(days) === 1 ? 'day ' : 'days ') +
        (days < 0 ? 'since' : 'until')
    };
  }

  /* Splits a string into code points, dropping any unpaired surrogate.
     slice() counts UTF-16 units, so cutting a title at 120 units can land
     between the two halves of an emoji and leave a lone surrogate;
     encodeURIComponent then throws URIError on it and the page dies. A
     grapheme cluster (a flag, a ZWJ family) can still be split by a
     code-point cut, which is cosmetic — a split surrogate pair is a crash. */
  function codePoints(t) {
    var out = [];
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        var low = i + 1 < t.length ? t.charCodeAt(i + 1) : 0;
        if (low >= 0xdc00 && low <= 0xdfff) {
          out.push(t.charAt(i) + t.charAt(i + 1));
          i++;
        }
        continue;                        // lone high surrogate: drop it
      }
      if (c >= 0xdc00 && c <= 0xdfff) continue;   // lone low surrogate
      out.push(t.charAt(i));
    }
    return out;
  }

  /* A title has to survive being a caption, an input value and a hash at the
     same time. Control characters cannot: a newline shows as a space in the
     caption, vanishes in a single-line field, and the first keystroke then
     writes the shortened form back to the hash. Turn them into the space
     they already look like, at parse time, so all three agree. */
  function cleanTitle(text) {
    var t = String(text == null ? '' : text);
    t = t.replace(/\r\n/g, ' ')
         .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ');
    return codePoints(t);
  }

  /* A title of nothing but spaces is no title: it draws a blank caption,
     writes '#t=%20%20%20' into the link and puts a dangling em dash in the
     tab title. Spaces inside a title are left alone — '  padded  ' is a
     choice someone made — but a title that is only spaces is not one. */
  function clampTitle(text) {
    var cps = cleanTitle(text);
    var whole = cps.join('');
    if (!/\S/.test(whole)) return { text: '', truncated: false };
    if (cps.length <= MAX_TITLE) {
      return { text: whole, truncated: false };
    }
    return { text: cps.slice(0, MAX_TITLE).join(''), truncated: true };
  }

  /* Reads '#t=...&d=...'. Never throws: decodeURIComponent rejects lone
     percent signs, and every value here came from someone else's link.
     notes[] holds plain sentences about anything that was wrong. */
  function parseHash(hash) {
    var out = { title: '', date: '', notes: [] };
    var raw = String(hash == null ? '' : hash).replace(/^#/, '');
    if (raw === '') return out;

    var pairs = raw.split('&');
    var sawKey = false, badEscape = false, rawTitle = null, rawDate = null;

    for (var i = 0; i < pairs.length; i++) {
      var part = pairs[i];
      if (part === '') continue;
      var eq = part.indexOf('=');
      if (eq === -1) continue;
      var key = decodeSafe(part.slice(0, eq));
      var val = decodeSafe(part.slice(eq + 1));
      if (key === null || val === null) { badEscape = true; continue; }
      if (key === 't') { rawTitle = val; sawKey = true; }
      else if (key === 'd') { rawDate = val; sawKey = true; }
    }

    if (badEscape) out.notes.push('Part of the link could not be read.');
    if (!sawKey && !badEscape) {
      out.notes.push('The link carries no counter. Set one below.');
      return out;
    }

    /* A missing title is not worth a sentence. It used to get one, and on a
       link with a broken date that sentence came first — the page opened by
       mentioning the optional thing and then, underneath, the thing that
       actually stopped it. The empty Title field says the same thing
       without spending a line on it. */
    if (rawTitle !== null && rawTitle !== '') {
      var clamped = clampTitle(rawTitle);
      out.title = clamped.text;
      if (clamped.truncated) {
        out.notes.push('Title shortened to ' + MAX_TITLE + ' characters.');
      }
    }

    if (rawDate === null || rawDate === '') {
      out.notes.push('The link has no date. Pick one below.');
    } else if (!isValidDate(rawDate)) {
      /* The shape is named by example rather than by a format string: the
         rest of the page has no jargon in it, and 2026-12-25 says
         four-digit year, two-digit month, two-digit day, hyphens, in that
         order, to a reader who has never heard of YYYY-MM-DD. */
      out.notes.push(/^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? 'That is not a real date. Pick one below.'
        : 'The date in the link is not written like 2026-12-25. ' +
          'Pick one below.');
    } else {
      out.date = rawDate;
    }

    return out;
  }

  function decodeSafe(text) {
    try {
      return decodeURIComponent(text);
    } catch (e) {
      return null;
    }
  }

  /* Round-trips titles holding & = # % and emoji. Control characters do not
     survive as themselves — clampTitle turned them into spaces before they
     ever reached the state. */
  function serialiseHash(state) {
    var parts = [];
    var title = state && state.title ? String(state.title) : '';
    var date = state && state.date ? String(state.date) : '';
    if (title !== '') parts.push('t=' + encodeURIComponent(title));
    if (date !== '') parts.push('d=' + encodeURIComponent(date));
    return parts.length ? '#' + parts.join('&') : '';
  }

  global.Countup = {
    MS_PER_DAY: MS_PER_DAY,
    MAX_TITLE: MAX_TITLE,
    DATE_DIGITS: DATE_DIGITS,
    parseDate: parseDate,
    isValidDate: isValidDate,
    dateNote: dateNote,
    wholeDays: wholeDays,
    daysFrom: daysFrom,
    untilNextMidnight: untilNextMidnight,
    formatClock: formatClock,
    phrase: phrase,
    clampTitle: clampTitle,
    parseHash: parseHash,
    serialiseHash: serialiseHash
  };
})(this);
