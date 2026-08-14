/* notice-detail — 공지 상세, 변경 전/후 비교(신규, 2026-08-14). GET /api/notices/{id}.
   2026-08-14 후속 — 문단(블록) 단위로 diff를 계산해서 바뀐 곳만 형광펜처럼 하이라이트한다. */
(function () {
  var titleEl = document.getElementById("noticeTitle");
  var effectiveDateEl = document.getElementById("noticeEffectiveDate");
  var postedAtEl = document.getElementById("noticePostedAt");
  var prevBody = document.getElementById("noticePrevBody");
  var prevMeta = document.getElementById("noticePrevMeta");
  var newBody = document.getElementById("noticeNewBody");
  var newMeta = document.getElementById("noticeNewMeta");

  function getNoticeId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  // 본문 HTML을 최상위 블록 요소(h2/h3/p/ol/ul 등) 단위로 쪼갠다 — 태그 안쪽을 건드리지 않고
  // "문단 하나가 통째로 바뀌었는지"만 비교하면 HTML이 깨질 위험 없이 안전하게 diff할 수 있다.
  function extractBlocks(html) {
    var container = document.createElement("div");
    container.innerHTML = html;
    return Array.prototype.map.call(container.children, function (el) {
      return { html: el.outerHTML, text: el.textContent.replace(/\s+/g, " ").trim() };
    });
  }

  // 표준 LCS(최장 공통 부분열) 기반 diff — 문단 리스트를 두 줄로 보고 안 바뀐 문단은 그대로 매칭하고,
  // 나머지는 "이전 쪽에서만 있던 것(제거)"/"새 쪽에서만 있던 것(추가)"으로 나눈다.
  function diffBlocks(oldBlocks, newBlocks) {
    var n = oldBlocks.length, m = newBlocks.length;
    var dp = [];
    for (var i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(0)); }
    for (var i2 = n - 1; i2 >= 0; i2--) {
      for (var j2 = m - 1; j2 >= 0; j2--) {
        dp[i2][j2] = (oldBlocks[i2].text === newBlocks[j2].text)
          ? dp[i2 + 1][j2 + 1] + 1
          : Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
      }
    }
    var i = 0, j = 0, oldOps = [], newOps = [];
    while (i < n && j < m) {
      if (oldBlocks[i].text === newBlocks[j].text) {
        oldOps.push({ type: "equal", block: oldBlocks[i] });
        newOps.push({ type: "equal", block: newBlocks[j] });
        i++; j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        oldOps.push({ type: "removed", block: oldBlocks[i] });
        i++;
      } else {
        newOps.push({ type: "added", block: newBlocks[j] });
        j++;
      }
    }
    while (i < n) { oldOps.push({ type: "removed", block: oldBlocks[i++] }); }
    while (j < m) { newOps.push({ type: "added", block: newBlocks[j++] }); }
    return { oldOps: oldOps, newOps: newOps };
  }

  function renderOps(bodyEl, ops) {
    bodyEl.innerHTML = ops.map(function (op) {
      if (op.type === "equal") return op.block.html;
      var cls = op.type === "added" ? "diff-added" : "diff-removed";
      return '<div class="' + cls + '">' + op.block.html + "</div>";
    }).join("");
  }

  function renderVersionBlock(bodyEl, metaEl, version, emptyMessage) {
    if (!version) {
      bodyEl.innerHTML = '<p class="t-sm">' + emptyMessage + "</p>";
      metaEl.textContent = "-";
      return;
    }
    bodyEl.innerHTML = version.content;
    metaEl.textContent = "v" + version.versionLabel + " · 시행일 " + version.effectiveDate;
  }

  function renderComparison(detail) {
    var prev = detail.previousVersion;
    var next = detail.newVersion;
    if (prevMeta) prevMeta.textContent = prev ? "v" + prev.versionLabel + " · 시행일 " + prev.effectiveDate : "-";
    if (newMeta) newMeta.textContent = next ? "v" + next.versionLabel + " · 시행일 " + next.effectiveDate : "-";

    if (!prev) {
      // 최초 버전 공지 — 비교 대상이 없으니 하이라이트 없이 그대로 보여준다.
      renderVersionBlock(prevBody, prevMeta, prev, "이 공지는 최초 버전 게시라 비교할 이전 버전이 없습니다.");
      renderVersionBlock(newBody, newMeta, next, "-");
      return;
    }

    var diff = diffBlocks(extractBlocks(prev.content), extractBlocks(next.content));
    renderOps(prevBody, diff.oldOps);
    renderOps(newBody, diff.newOps);
  }

  var noticeId = getNoticeId();
  if (!noticeId) {
    window.location.replace("/");
    return;
  }

  Api.request("/api/notices/" + noticeId, { auth: false })
    .then(function (detail) {
      titleEl.textContent = detail.title;
      effectiveDateEl.textContent = detail.effectiveDate;
      postedAtEl.textContent = detail.postedAt ? detail.postedAt.slice(0, 10) : "-";
      renderComparison(detail);
    })
    .catch(function () {
      // 존재하지 않는 noticeId로 들어오면(2026-08-14 수정) 이 페이지에 에러 문구만 띄워두는 대신
      // 바로 메인으로 돌려보낸다 — 링크가 없으면 못 들어오는 페이지라는 설계 의도에 맞춰, 없는 링크로
      // 억지로 들어와도 뭔가 볼 게 없게 한다.
      if (window.Eatty) Eatty.toast("존재하지 않는 공지입니다.", "error");
      window.location.replace("/");
    });
})();
