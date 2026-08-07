/* ---------------------------------------------------------------------------
   admin-test 데모 스크립트
   실제 API 연결 시 아래 TODO 위치에 fetch() 를 넣으면 됩니다.
   --------------------------------------------------------------------------- */
(function () {
  var out = document.getElementById('apiResponseBox');
  var statusEl = document.getElementById('apiStatusText');

  function print(obj, ok) {
    out.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
    statusEl.textContent = ok ? '200 OK · 0ms (mock)' : 'ERROR';
    statusEl.className = 'tstatus ' + (ok ? 'tstatus--ok' : 'tstatus--err');
  }

  /* 프리셋 */
  document.getElementById('apiPresetList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-preset-path]');
    if (!b) return;
    document.getElementById('apiMethodSelect').value = b.getAttribute('data-preset-method');
    document.getElementById('apiPathInput').value = b.getAttribute('data-preset-path');
  });

  /* 요청 보내기 */
  document.getElementById('apiSendBtn').addEventListener('click', function () {
    var method = document.getElementById('apiMethodSelect').value;
    var path = document.getElementById('apiPathInput').value.trim();
    var body = document.getElementById('apiBodyInput').value.trim();

    /* ---------------- TODO: 실제 fetch 연결 ----------------
    fetch(path, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: (method === 'GET' || !body) ? undefined : body
    })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, status: res.status, json: j }; }); })
      .then(function (r) { print(r.json, r.ok); })
      .catch(function (err) { print(String(err), false); });
    ------------------------------------------------------- */

    print({
      _mock: true,
      request: { method: method, path: path, body: body ? JSON.parse(body || '{}') : null },
      message: '아직 fetch() 가 연결되지 않았습니다. 스크립트의 TODO 주석을 해제하세요.'
    }, true);
  });

  /* 회원 정지 / 해제 */
  document.getElementById('testMemberTable').addEventListener('click', function (e) {
    var row = e.target.closest('tr[data-member-id]');
    if (!row) return;
    var id = row.getAttribute('data-member-id');

    if (e.target.closest('[data-test-suspend]')) {
      /* TODO: POST /api/admin/members/{id}/suspend */
      row.children[4].textContent = 'SUSPENDED';
      print({ _mock: true, action: 'suspend', memberId: id }, true);
    }
    if (e.target.closest('[data-test-release]')) {
      /* TODO: POST /api/admin/members/{id}/release */
      row.children[4].textContent = 'ACTIVE';
      print({ _mock: true, action: 'release', memberId: id }, true);
    }
    if (e.target.closest('[data-test-approve]')) {
      /* TODO: POST /api/admin/business/{id}/approve */
      row.children[4].textContent = 'ACTIVE';
      print({ _mock: true, action: 'approve', memberId: id }, true);
    }
    if (e.target.closest('[data-test-reject-biz]')) {
      /* TODO: POST /api/admin/business/{id}/reject */
      row.children[4].textContent = 'REJECTED';
      print({ _mock: true, action: 'rejectBusiness', memberId: id }, true);
    }
  });

  /* 신고 처리 / 반려 */
  document.getElementById('testReportTable').addEventListener('click', function (e) {
    var row = e.target.closest('tr[data-report-id]');
    if (!row) return;
    var id = row.getAttribute('data-report-id');

    if (e.target.closest('[data-test-handle]')) {
      /* TODO: POST /api/admin/reports/{id}/handle */
      row.children[5].textContent = 'DONE';
      print({
        _mock: true, action: 'handle', reportId: id,
        body: {
          action: document.getElementById('testReportAction').value,
          memo: document.getElementById('testReportMemo').value
        }
      }, true);
    }
    if (e.target.closest('[data-test-reject]')) {
      /* TODO: POST /api/admin/reports/{id}/reject */
      row.children[5].textContent = 'REJECTED';
      print({ _mock: true, action: 'reject', reportId: id }, true);
    }
  });

  /* 목록 조회 버튼들 */
  document.getElementById('testMemberLoadBtn').addEventListener('click', function () {
    print({
      _mock: true, endpoint: 'GET /api/admin/members',
      params: {
        role: document.getElementById('testMemberRoleFilter').value,
        status: document.getElementById('testMemberStatusFilter').value,
        q: document.getElementById('testMemberSearchInput').value
      }
    }, true);
  });

  document.getElementById('testReportLoadBtn').addEventListener('click', function () {
    print({
      _mock: true, endpoint: 'GET /api/admin/reports',
      params: {
        status: document.getElementById('testReportStatusFilter').value,
        type: document.getElementById('testReportTypeFilter').value
      }
    }, true);
  });

  document.getElementById('testHealthLoadBtn').addEventListener('click', function () {
    print({ _mock: true, endpoint: 'GET /api/admin/health' }, true);
  });

  document.getElementById('testStatsLoadBtn').addEventListener('click', function () {
    print({ _mock: true, endpoint: 'GET /api/admin/stats/summary' }, true);
  });

  /* WebSocket 테스트 (mock 로그) */
  var wsLog = document.getElementById('wsLogBox');
  var wsStatus = document.getElementById('wsStatusText');
  function wlog(line) {
    wsLog.textContent += '\n' + new Date().toLocaleTimeString() + '  ' + line;
    wsLog.scrollTop = wsLog.scrollHeight;
  }

  document.getElementById('wsConnectBtn').addEventListener('click', function () {
    /* TODO: SockJS + Stomp 연결 */
    wsStatus.textContent = 'connected (mock)';
    wsStatus.className = 'tstatus tstatus--ok';
    wlog('CONNECT ' + document.getElementById('wsUrlInput').value);
    wlog('SUBSCRIBE /topic/rooms/' + document.getElementById('wsRoomInput').value);
  });

  document.getElementById('wsDisconnectBtn').addEventListener('click', function () {
    wsStatus.textContent = 'disconnected';
    wsStatus.className = 'tstatus';
    wlog('DISCONNECT');
  });

  document.getElementById('wsSendBtn').addEventListener('click', function () {
    var msg = document.getElementById('wsSendInput').value.trim();
    if (!msg) return;
    /* TODO: client.send('/app/rooms/{roomId}/send', {}, JSON.stringify({ content: msg })) */
    wlog('SEND /app/rooms/' + document.getElementById('wsRoomInput').value + '/send  ' + JSON.stringify({ content: msg }));
    document.getElementById('wsSendInput').value = '';
  });

  /* 현재 로그인 상태 표시 */
  function syncAuthText() {
    var el = document.getElementById('currentAuthText');
    if (el && window.Eatty) el.textContent = '현재: ' + Eatty.getAuth();
  }
  document.addEventListener('eatty:authchange', syncAuthText);
  setTimeout(syncAuthText, 100);
})();
