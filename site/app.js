// All DB-sourced text is inserted with textContent (never innerHTML).
(function () {
  "use strict";
  var cfg = window.GG_CONFIG || {};

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function num(v) { return v === null || v === undefined || v === "" ? null : Number(v); }
  function fmtOdds(o) { o = num(o); return o === null ? "—" : (o > 0 ? "+" + o : String(o)); }
  function fmtPct(v, digits) { v = num(v); return v === null ? "—" : v.toFixed(digits === undefined ? 1 : digits) + "%"; }
  function fmtSigned(v, digits, suffix) {
    v = num(v); if (v === null) return "—";
    return (v > 0 ? "+" : "") + v.toFixed(digits) + (suffix || "");
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return isNaN(d) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }
  function metric(k, v, cls) {
    var m = el("div", "metric");
    m.appendChild(el("div", "k", k));
    m.appendChild(el("div", "v" + (cls ? " " + cls : ""), v));
    return m;
  }
  function getJson(url) {
    return fetch(url, { headers: { accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function showError(node, msg) {
    clear(node);
    node.appendChild(el("p", "error", msg));
  }

  // Subscribe button is shown only when a signup URL is configured.
  if (cfg.SUBSCRIBE_URL) {
    var s = document.getElementById("subscribe");
    s.href = cfg.SUBSCRIBE_URL;
    s.hidden = false;
  }

  function renderLatest(picks) {
    var body = document.getElementById("latest-body");
    clear(body);
    if (!picks.length) {
      body.appendChild(el("p", "muted", "No pick has been published yet. The first one appears here after kickoff."));
      return;
    }
    var p = picks[0];
    var evi = num(p.evi), kelly = num(p.kelly_fractional), prob = num(p.model_prob);
    body.appendChild(el("h3", "pick-title", p.pick));
    body.appendChild(el("p", "pick-sub", p.game + " · " + (p.sport || "").toUpperCase() + " · logged " + fmtDate(p.logged_at)));

    var m = el("div", "metrics");
    m.appendChild(metric("Price", fmtOdds(p.odds)));
    m.appendChild(metric("Model win prob", prob === null ? "—" : fmtPct(prob * 100)));
    m.appendChild(metric("EVI (edge)", fmtSigned(evi, 1, "%"), evi === null ? "" : (evi >= 0 ? "pos" : "neg")));
    m.appendChild(metric("Kelly stake", kelly === null ? "—" : (kelly > 0 ? fmtPct(kelly * 100, 2) : "No stake"), kelly > 0 ? "pos" : "warn"));
    body.appendChild(m);

    if (evi !== null && evi < 0) {
      body.appendChild(el("p", "note warn", "The model's edge on this pick was negative, so it recommended no stake. It is published for the record."));
    }
    if (p.driver_text) body.appendChild(el("p", "", p.driver_text));
    if (Array.isArray(p.flags) && p.flags.length) {
      var ul = el("ul", "flags");
      p.flags.forEach(function (f) { ul.appendChild(el("li", "", String(f))); });
      body.appendChild(ul);
    }
    if (p.audit) {
      var d = el("details");
      d.appendChild(el("summary", "", "Audit data (raw)"));
      d.appendChild(el("pre", "", JSON.stringify(p.audit, null, 2)));
      body.appendChild(d);
    }
  }

  function renderLedger(data) {
    var stats = document.getElementById("ledger-stats");
    var body = document.getElementById("ledger-body");
    clear(stats); clear(body);
    var s = data.summary || {}, rows = data.rows || [];

    if (!rows.length) {
      var e = el("div", "empty");
      e.appendChild(el("strong", "", "Tracking begins " + (cfg.TRACKING_START_LABEL || "Week 6")));
      e.appendChild(el("p", "", "Weeks 1–5 were a testing phase and are not counted. From the first tracked pick on, every result lands here — wins, losses and pushes — with a post-mortem on each miss."));
      body.appendChild(e);
      return;
    }

    stats.appendChild(metric("Record", s.wins + "–" + s.losses + (s.pushes ? "–" + s.pushes : "")));
    stats.appendChild(metric("Win rate", s.winRate === null ? "—" : fmtPct(s.winRate)));
    stats.appendChild(metric("Units", fmtSigned(s.units, 2, "u"), s.units >= 0 ? "pos" : "neg"));
    stats.appendChild(metric("Graded picks", String(s.graded)));

    var wrap = el("div", "table-wrap"), t = el("table"), thead = el("thead"), hr = el("tr");
    ["Date", "Game", "Pick", "Price", "Result", "Units", "Proof"].forEach(function (h) { hr.appendChild(el("th", "", h)); });
    thead.appendChild(hr); t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", "", r.game_date ? String(r.game_date).slice(0, 10) : "—"));
      tr.appendChild(el("td", "", r.game));
      tr.appendChild(el("td", "", r.pick));
      tr.appendChild(el("td", "", fmtOdds(r.odds)));
      var cls = r.outcome === "win" ? "pos" : r.outcome === "loss" ? "neg" : "warn";
      tr.appendChild(el("td", cls, (r.outcome || "").toUpperCase() + (r.final_score ? " · " + r.final_score : "")));
      tr.appendChild(el("td", cls, fmtSigned(r.units, 2, "u")));
      var proof = el("td");
      if (r.source_url && /^https:\/\//.test(r.source_url)) {
        var a = el("a", "", "post");
        a.href = r.source_url; a.rel = "noopener noreferrer"; a.target = "_blank";
        proof.appendChild(a);
      } else { proof.textContent = "—"; }
      tr.appendChild(proof);
      tb.appendChild(tr);
      if (r.outcome === "loss" && r.post_mortem) {
        var pm = el("tr", "postmortem"), td = el("td");
        td.colSpan = 7;
        var inner = el("div", "pm-inner");
        inner.appendChild(el("strong", "", "Post-mortem: "));
        inner.appendChild(document.createTextNode(r.post_mortem));
        td.appendChild(inner);
        pm.appendChild(td); tb.appendChild(pm);
      }
    });
    t.appendChild(tb); wrap.appendChild(t); body.appendChild(wrap);
  }

  getJson("/api/picks").then(function (d) { renderLatest(d.picks || []); })
    .catch(function () { showError(document.getElementById("latest-body"), "Live data is temporarily unavailable. We do not show placeholder numbers — please check back shortly."); });

  getJson("/api/ledger").then(renderLedger)
    .catch(function () { showError(document.getElementById("ledger-body"), "The ledger is temporarily unavailable. We do not show placeholder numbers — please check back shortly."); });
})();
