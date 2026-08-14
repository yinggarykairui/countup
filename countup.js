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

  /* Strict YYYY-MM-DD. new Date(2026, 1, 31) rolls into March instead of
     failing, so the constructed date is read back and compared. */
  function parseDate(text) {
    if (typeof text !== 'string') return null;
    var m = ISO.exec(text);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var probe = new Date(y, mo - 1, d);
    /* new Date(99, 0, 2) means 1999, not year 99. Restore the literal year
       so a link carrying an early date is not called unreal. */
    if (y >= 0 && y < 100) probe.setFullYear(y, mo - 1, d);
    probe.setHours(0, 0, 0, 0);
    if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 ||
        probe.getDate() !== d) return null;
    return probe;
  }

  function isValidDate(text) {
    return parseDate(text) !== null;
  }

  function midnight(ms) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* Whole calendar days between two local midnights. Rounding, not flooring a
     raw millisecond quotient: a span crossing a DST change is 23 or 25 hours
     long and floor() would be off by one. */
  function wholeDays(fromDate, toDate) {
    return Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
  }

  /* Signed days from the local day containing nowMs to the target date.
     Negative = past, 0 = today, positive = future. */
  function daysFrom(nowMs, dateText) {
    var target = parseDate(dateText);
    if (!target) return null;
    return wholeDays(midnight(nowMs), target);
  }

  /* Time left before the day number changes, i.e. until the next local
     midnight. One Date.now() feeds this and daysFrom on every tick, so the
     two lines can never disagree at a rollover. A fall-back day makes this
     25 hours long, so hours can read 24; that is the honest number. */
  function untilNextMidnight(nowMs) {
    var d = new Date(nowMs);
    var next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    var left = Math.max(0, next.getTime() - nowMs);
    var s = Math.floor(left / 1000);
    return { h: Math.floor(s / 3600), m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatClock(parts) {
    return pad(parts.h) + ' h ' + pad(parts.m) + ' m ' + pad(parts.s) + ' s';
  }

  /* Big figure plus its unit line. Today gets a word, not a zero. */
  function phrase(days) {
    if (days === 0) return { figure: 'Today', unit: '' };
    var n = Math.abs(days);
    return {
      figure: String(n),
      unit: (n === 1 ? 'day ' : 'days ') + (days < 0 ? 'since' : 'until')
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

  function clampTitle(text) {
    var cps = cleanTitle(text);
    if (cps.length <= MAX_TITLE) {
      return { text: cps.join(''), truncated: false };
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

    if (rawTitle === null || rawTitle === '') {
      out.notes.push('The link has no title.');
    } else {
      var clamped = clampTitle(rawTitle);
      out.title = clamped.text;
      if (clamped.truncated) {
        out.notes.push('Title shortened to ' + MAX_TITLE + ' characters.');
      }
    }

    if (rawDate === null || rawDate === '') {
      out.notes.push('The link has no date. Pick one below.');
    } else if (!isValidDate(rawDate)) {
      out.notes.push(/^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? 'That is not a real date. Pick one below.'
        : 'The date in the link is not YYYY-MM-DD. Pick one below.');
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

  /* Round-trips titles holding & = # % newlines and emoji. */
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
    parseDate: parseDate,
    isValidDate: isValidDate,
    midnight: midnight,
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
