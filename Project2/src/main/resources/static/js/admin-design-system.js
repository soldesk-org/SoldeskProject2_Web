/* 2026-07-26 — 사용자가 업로드한 "잇티웨이-관리자콘솔-standalone.html"에서 그대로 추출한 컴포넌트 코드
   (React.createElement 컴파일 결과물, 손으로 다시 구현한 것 아님). 딱 네 군데만 수정했다 — (1) 원본
   목업엔 신고 상태를 바꾸는 UI 자체가 없어서(로컬 삭제만 가능), 실제 백엔드의 처리완료/처리불가 API를
   쓸 수 있도록 ReportsScreen에 onResolveReport/onRejectReport prop과 "접수" 탭 전용 버튼 2개 추가.
   (2) 같은 컬럼 폭이 좁아 버튼 4개가 세로로 깨지던 것을 360px로 확장. (3) MembersScreen 이름 버튼의
   밑줄(textDecoration:"underline")을 제거(사용자 요청, 2026-07-26). (4) "처리 불가" 버튼을 variant
   "ghost"(테두리 없음)에서 "outline"(테두리 있음)으로 — 옆의 "처리 완료"/"삭제"와 테두리가 안 맞아
   어색해 보인다는 사용자 지적(2026-07-27). 나머지는 전부 원본 그대로. */
/* @ds-bundle: {"format":4,"namespace":"AdminDesignSystem_daf0d7","components":[{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"Pagination","sourcePath":"components/data/Pagination.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"ConfirmModal","sourcePath":"components/feedback/ConfirmModal.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"StatusBadge","sourcePath":"components/feedback/StatusBadge.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"}],"sourceHashes":{"components/data/DataTable.jsx":"b16dde77798b","components/data/Pagination.jsx":"4b904df5a50a","components/data/StatCard.jsx":"4e4c67ab9e1a","components/data/Tabs.jsx":"61f5b233cb69","components/feedback/ConfirmModal.jsx":"2ec8bb129fff","components/feedback/Modal.jsx":"cf33d5220130","components/feedback/StatusBadge.jsx":"e3bb280a70a8","components/forms/Button.jsx":"14fba59f7bf6","components/forms/Checkbox.jsx":"b22a43f415c8","components/forms/Input.jsx":"0a843e3706a1","components/forms/Select.jsx":"b102816e9350","components/forms/Textarea.jsx":"13bcc0a814f7","components/navigation/Sidebar.jsx":"bbec53e398c0","ui_kits/admin/DashboardScreen.jsx":"ad0296f18d6b","ui_kits/admin/MembersScreen.jsx":"1e8ba1fb31dc","ui_kits/admin/ReportsScreen.jsx":"4315ef6c3469","ui_kits/admin/ReviewsScreen.jsx":"28222efce664","ui_kits/admin/data.js":"33ba92ea59f1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AdminDesignSystem_daf0d7 = window.AdminDesignSystem_daf0d7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  onRowClick,
  emptyText = "데이터가 없습니다.",
  card = true,
  style
}) {
  const [hov, setHov] = React.useState(null);
  const table = /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      minWidth: 960,
      borderCollapse: "collapse",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--ink-1)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || "left",
      padding: "0 16px",
      height: 44,
      fontSize: 13,
      fontWeight: 500,
      color: "var(--ink-3)",
      borderBottom: "1px solid var(--border-1)",
      whiteSpace: "nowrap",
      width: c.width
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      padding: "40px 16px",
      textAlign: "center",
      color: "var(--ink-3)"
    }
  }, emptyText)), rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r[rowKey] ?? i,
    onClick: onRowClick ? () => onRowClick(r) : undefined,
    onMouseEnter: () => setHov(i),
    onMouseLeave: () => setHov(null),
    style: {
      background: hov === i ? "var(--surface-sunken)" : "transparent",
      cursor: onRowClick ? "pointer" : "default",
      transition: "background var(--dur-fast) var(--ease-standard)"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align || "left",
      padding: "8px 16px",
      height: "var(--row-h)",
      borderBottom: "1px solid var(--border-1)",
      verticalAlign: "middle"
    }
  }, c.render ? c.render(r) : r[c.key]))))));
  if (!card) return table;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border-1)",
      boxShadow: "var(--shadow-card)",
      overflow: "auto",
      ...style
    }
  }, table);
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/Pagination.jsx
try { (() => {
function Pagination({
  page = 1,
  totalPages = 1,
  onChange,
  style
}) {
  const go = p => {
    if (p >= 1 && p <= totalPages && onChange) onChange(p);
  };
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  const btn = (key, content, onClick, active, disabled) => /*#__PURE__*/React.createElement("button", {
    key: key,
    disabled: disabled,
    onClick: onClick,
    style: {
      minWidth: 32,
      height: 32,
      padding: "0 6px",
      border: "1px solid " + (active ? "var(--brand-navy)" : "transparent"),
      borderRadius: "var(--radius-sm)",
      background: active ? "var(--brand-navy)" : "transparent",
      color: active ? "#fff" : disabled ? "var(--ink-disabled)" : "var(--ink-2)",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      cursor: disabled ? "default" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, content);
  const chev = d => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: {
      width: 14,
      height: 14,
      stroke: "currentColor",
      fill: "none",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      transform: d === "l" ? "rotate(180deg)" : "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m9 18 6-6-6-6"
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      alignItems: "center",
      justifyContent: "center",
      ...style
    }
  }, btn("prev", chev("l"), () => go(page - 1), false, page <= 1), pages.map(p => btn(p, p, () => go(p), p === page, false)), btn("next", chev("r"), () => go(page + 1), false, page >= totalPages));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function StatCard({
  label,
  value,
  unit,
  hint,
  tone,
  style
}) {
  const toneColor = {
    positive: "var(--positive)",
    danger: "var(--danger)",
    warning: "var(--warning)",
    accent: "var(--accent-hover)"
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      boxSizing: "border-box",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)",
      border: "1px solid var(--border-1)",
      padding: "20px 24px",
      fontFamily: "var(--font-sans)",
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: "var(--ink-2)",
      marginBottom: 10
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-stat)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-snug)",
      color: tone ? toneColor : "var(--ink-1)",
      lineHeight: 1
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: "var(--ink-3)"
    }
  }, unit)), hint && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ink-3)",
      marginTop: 10
    }
  }, hint));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  style
}) {
  const [hov, setHov] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      borderBottom: "1px solid var(--border-1)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, items.map(it => {
    const act = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onChange && onChange(it.id),
      onMouseEnter: () => setHov(it.id),
      onMouseLeave: () => setHov(null),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        padding: "12px 2px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 600,
        color: act ? "var(--ink-1)" : hov === it.id ? "var(--ink-2)" : "var(--ink-3)",
        boxShadow: act ? "inset 0 -2px 0 var(--brand-navy)" : "none",
        transition: "color var(--dur-fast) var(--ease-standard)"
      }
    }, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: act ? "var(--accent-hover)" : "var(--ink-3)"
      }
    }, it.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  open,
  title,
  onClose,
  width = 480,
  children,
  footer
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "var(--overlay-scrim)",
      backdropFilter: "blur(var(--overlay-blur))",
      WebkitBackdropFilter: "blur(var(--overlay-blur))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      animation: "dsModalFade var(--dur-normal) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("style", null, "@keyframes dsModalFade{from{opacity:0}to{opacity:1}}@keyframes dsModalPop{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}"), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: "relative",
      boxSizing: "border-box",
      width,
      maxWidth: "100%",
      maxHeight: "90vh",
      overflow: "auto",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-modal)",
      padding: "28px 28px 24px",
      animation: "dsModalPop var(--dur-normal) var(--ease-standard)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "\uB2EB\uAE30",
    onClick: onClose,
    style: {
      position: "absolute",
      top: 18,
      right: 18,
      width: 32,
      height: 32,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      borderRadius: "var(--radius-sm)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: {
      width: 18,
      height: 18,
      stroke: "var(--ink-1)",
      fill: "none",
      strokeWidth: 2,
      strokeLinecap: "round"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-section-title)",
      fontWeight: 600,
      color: "var(--ink-1)",
      letterSpacing: "var(--tracking-snug)",
      marginBottom: 14,
      paddingRight: 32
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: "160%",
      color: "var(--ink-2)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 22
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusBadge.jsx
try { (() => {
const TONES = {
  active: {
    fg: "var(--status-active)",
    bg: "var(--status-active-bg)"
  },
  suspended: {
    fg: "var(--status-suspended)",
    bg: "var(--status-suspended-bg)"
  },
  received: {
    fg: "var(--status-received)",
    bg: "var(--status-received-bg)"
  },
  done: {
    fg: "var(--status-done)",
    bg: "var(--status-done-bg)"
  },
  rejected: {
    fg: "var(--status-rejected)",
    bg: "var(--status-rejected-bg)"
  },
  accent: {
    fg: "var(--accent-hover)",
    bg: "var(--accent-soft)"
  },
  neutral: {
    fg: "var(--neutral-badge)",
    bg: "var(--neutral-badge-soft)"
  }
};
const LABELS = {
  active: "정상",
  suspended: "정지",
  received: "접수",
  done: "처리 완료",
  rejected: "처리 반려"
};
function StatusBadge({
  status = "neutral",
  children,
  dot = true,
  style
}) {
  const t = TONES[status] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 26,
      padding: "0 10px",
      borderRadius: "var(--radius-pill)",
      background: t.bg,
      color: t.fg,
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: "nowrap",
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: t.fg
    }
  }), children ?? LABELS[status] ?? status);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const V = {
  primary: {
    bg: "var(--brand-navy)",
    hbg: "#1C2B3C",
    fg: "#fff",
    bd: "transparent"
  },
  accent: {
    bg: "var(--accent)",
    hbg: "var(--accent-hover)",
    fg: "#fff",
    bd: "transparent"
  },
  danger: {
    bg: "var(--danger)",
    hbg: "#C93A3F",
    fg: "#fff",
    bd: "transparent"
  },
  outline: {
    bg: "var(--surface-card)",
    hbg: "var(--surface-sunken)",
    fg: "var(--ink-1)",
    bd: "var(--border-2)"
  },
  ghost: {
    bg: "transparent",
    hbg: "var(--surface-sunken)",
    fg: "var(--ink-1)",
    bd: "transparent"
  }
};
const S = {
  sm: {
    height: "var(--control-h-sm)",
    padding: "0 12px",
    fontSize: 13
  },
  md: {
    height: "var(--control-h-md)",
    padding: "0 16px",
    fontSize: 14
  },
  lg: {
    height: "var(--control-h-lg)",
    padding: "0 20px",
    fontSize: 15
  }
};
function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  disabled,
  style,
  children,
  ...rest
}) {
  const [hov, setHov] = React.useState(false);
  const v = V[variant] || V.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxSizing: "border-box",
      width: fullWidth ? "100%" : undefined,
      background: hov && !disabled ? v.hbg : v.bg,
      color: v.fg,
      border: "1px solid " + v.bd,
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .45 : 1,
      transition: "background var(--dur-fast) var(--ease-standard)",
      ...(S[size] || S.md),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .45 : 1,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--ink-1)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 18,
      height: 18,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0,
      margin: 0,
      cursor: "inherit"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: 4,
      border: "1.5px solid " + (checked ? "var(--brand-navy)" : "var(--border-2)"),
      background: checked ? "var(--brand-navy)" : "var(--surface-card)",
      transition: "all var(--dur-fast) var(--ease-standard)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: {
      width: 12,
      height: 12,
      stroke: "#fff",
      fill: "none",
      strokeWidth: 3,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  size = "md",
  search,
  invalid,
  style,
  wrapStyle,
  ...rest
}) {
  const [foc, setFoc] = React.useState(false);
  const h = {
    sm: "var(--control-h-sm)",
    md: "var(--control-h-md)",
    lg: "var(--control-h-lg)"
  }[size];
  const input = /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFoc(true),
    onBlur: () => setFoc(false),
    style: {
      boxSizing: "border-box",
      width: "100%",
      height: h,
      padding: search ? "0 12px 0 38px" : "0 12px",
      borderRadius: "var(--radius-md)",
      border: "1px solid " + (invalid ? "var(--danger)" : foc ? "var(--border-focus)" : "var(--border-1)"),
      outline: "none",
      background: "var(--surface-card)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--ink-1)",
      transition: "border-color var(--dur-fast) var(--ease-standard)",
      ...style
    }
  }, rest));
  if (!search) return input;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      ...wrapStyle
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: {
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)",
      width: 16,
      height: 16,
      stroke: "var(--ink-3)",
      fill: "none",
      strokeWidth: 2,
      strokeLinecap: "round"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })), input);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  size = "md",
  options = [],
  style,
  wrapStyle,
  ...rest
}) {
  const h = {
    sm: "var(--control-h-sm)",
    md: "var(--control-h-md)",
    lg: "var(--control-h-lg)"
  }[size];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "inline-block",
      ...wrapStyle
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    style: {
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      height: h,
      padding: "0 34px 0 12px",
      width: "100%",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-1)",
      background: "var(--surface-card)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--ink-1)",
      cursor: "pointer",
      outline: "none",
      ...style
    }
  }, rest), options.map(o => typeof o === "string" ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      width: 14,
      height: 14,
      stroke: "var(--ink-2)",
      fill: "none",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  rows = 4,
  invalid,
  style,
  ...rest
}) {
  const [foc, setFoc] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: () => setFoc(true),
    onBlur: () => setFoc(false),
    style: {
      boxSizing: "border-box",
      width: "100%",
      padding: "10px 12px",
      borderRadius: "var(--radius-md)",
      resize: "vertical",
      border: "1px solid " + (invalid ? "var(--danger)" : foc ? "var(--border-focus)" : "var(--border-1)"),
      outline: "none",
      background: "var(--surface-card)",
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: "150%",
      color: "var(--ink-1)",
      transition: "border-color var(--dur-fast) var(--ease-standard)",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmModal.jsx
try { (() => {
function ConfirmModal({
  open,
  title,
  message,
  reasonLabel = "사유",
  reasonPlaceholder = "사유를 입력해 주세요.",
  onConfirm,
  onCancel,
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  requireReason = true
}) {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: open,
    title: title,
    onClose: onCancel,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "outline",
      onClick: onCancel
    }, cancelText), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: danger ? "danger" : "primary",
      disabled: requireReason && !reason.trim(),
      onClick: () => onConfirm && onConfirm(reason.trim())
    }, confirmText))
  }, message && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px"
    }
  }, message), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--ink-1)",
      marginBottom: 6
    }
  }, reasonLabel), /*#__PURE__*/React.createElement(__ds_scope.Textarea, {
    rows: 4,
    placeholder: reasonPlaceholder,
    value: reason,
    onChange: e => setReason(e.target.value)
  }));
}
Object.assign(__ds_scope, { ConfirmModal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmModal.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function Sidebar({
  items = [],
  active,
  onSelect,
  logoSrc,
  brand = "잇티웨이",
  footer,
  width = "var(--sidebar-width)",
  style
}) {
  const [hov, setHov] = React.useState(null);
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      boxSizing: "border-box",
      width,
      flex: "none",
      minHeight: "100%",
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sidebar)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-sans)",
      position: "relative",
      zIndex: 2,
      ...style
    }
  }, logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: brand,
    style: {
      width: "100%",
      aspectRatio: "1/1",
      objectFit: "cover",
      display: "block"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "32px 24px",
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: "var(--tracking-tight)",
      color: "var(--brand-navy)"
    }
  }, brand), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "12px 16px"
    }
  }, items.map(it => {
    const act = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onSelect && onSelect(it.id),
      onMouseEnter: () => setHov(it.id),
      onMouseLeave: () => setHov(null),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        height: 58,
        padding: "0 16px",
        border: "none",
        borderRadius: "var(--radius-md)",
        textAlign: "left",
        cursor: "pointer",
        background: act ? "var(--accent-soft)" : hov === it.id ? "var(--surface-sunken)" : "transparent",
        color: "var(--brand-navy)",
        fontFamily: "inherit",
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: "var(--tracking-tight)",
        whiteSpace: "nowrap",
        transition: "background var(--dur-fast) var(--ease-standard)"
      }
    }, it.icon && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none"
      }
    }, it.icon), it.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, footer));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/DashboardScreen.jsx
try { (() => {
const DS = window.AdminDesignSystem_daf0d7;
function PageHeader({
  title,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-page-title)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-snug)",
      color: "var(--brand-navy)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, children)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      background: "var(--brand-navy)",
      marginTop: 14
    }
  }));
}
function DashboardScreen({
  members,
  reports
}) {
  const {
    StatCard,
    DataTable,
    StatusBadge
  } = DS;
  const biz = members.filter(m => m.type === "사업자").length;
  const susp = members.filter(m => m.status === "suspended").length;
  const recent = reports.filter(r => r.status === "received").slice(0, 5);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\uB300\uC2DC\uBCF4\uB4DC"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "\uC0AC\uC5C5\uC790 \uD68C\uC6D0 \uC218",
    value: biz.toLocaleString(),
    unit: "\uBA85",
    hint: "\uC804\uC6D4 \uB300\uBE44 +2"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\uC804\uCCB4 \uD68C\uC6D0 \uC218",
    value: members.length.toLocaleString(),
    unit: "\uBA85",
    hint: "\uC774\uBC88 \uC8FC \uC2E0\uADDC 3\uBA85"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\uC815\uC9C0\uB41C \uD68C\uC6D0 \uC218",
    value: susp.toLocaleString(),
    unit: "\uBA85",
    tone: "danger",
    hint: "\uC774\uBC88 \uC8FC +1"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "API \uC11C\uBC84 \uC0C1\uD0DC",
    value: "\uC815\uC0C1",
    tone: "positive",
    hint: "\uD3C9\uADE0 \uC751\uB2F5 42ms \xB7 \uAC00\uB3D9\uB960 99.98%"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-section-title)",
      fontWeight: 600,
      color: "var(--ink-1)",
      marginBottom: 12
    }
  }, "\uC811\uC218\uB41C \uC2E0\uACE0 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-hover)"
    }
  }, recent.length)), /*#__PURE__*/React.createElement(DataTable, {
    rows: recent,
    columns: [{
      key: "kind",
      label: "신고 종류",
      width: 130,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        status: "accent",
        dot: false
      }, window.MOCK.kindLabel[r.kind])
    }, {
      key: "category",
      label: "카테고리",
      width: 120
    }, {
      key: "content",
      label: "신고 내용"
    }, {
      key: "reporter",
      label: "신고자",
      width: 220,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-2)"
        }
      }, r.reporter)
    }, {
      key: "date",
      label: "접수일",
      width: 110,
      align: "right",
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-3)"
        }
      }, r.date)
    }]
  }));
}
Object.assign(window, {
  PageHeader,
  DashboardScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/MembersScreen.jsx
try { (() => {
const DSm = window.AdminDesignSystem_daf0d7;
function MembersScreen({
  members,
  onToggleStatus
}) {
  const {
    Input,
    Select,
    DataTable,
    StatusBadge,
    ConfirmModal,
    Pagination
  } = DSm;
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("전체");
  const [target, setTarget] = React.useState(null);
  const rows = members.filter(m => (filter === "전체" || (filter === "정상" ? m.status === "active" : filter === "정지" ? m.status === "suspended" : m.type === filter)) && (m.name.includes(q) || m.email.includes(q)));
  const suspend = target && target.status === "active";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.PageHeader, {
    title: "\uD68C\uC6D0 \uAD00\uB9AC"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    search: true,
    placeholder: "\uD68C\uC6D0 \uAC80\uC0C9 (\uC774\uB984, \uC774\uBA54\uC77C)",
    value: q,
    onChange: e => setQ(e.target.value),
    wrapStyle: {
      width: 300
    }
  }), /*#__PURE__*/React.createElement(Select, {
    options: ["전체", "정상", "정지", "사업자", "일반"],
    value: filter,
    onChange: e => setFilter(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      alignSelf: "center",
      fontSize: 13,
      color: "var(--ink-3)"
    }
  }, "\uCD1D ", rows.length, "\uBA85")), /*#__PURE__*/React.createElement(DataTable, {
    rows: rows,
    columns: [{
      key: "name",
      label: "이름",
      width: 140,
      render: r => /*#__PURE__*/React.createElement("button", {
        onClick: () => setTarget(r),
        style: {
          background: "none",
          border: "none",
          padding: 0,
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--brand-navy)",
          cursor: "pointer",
          textDecoration: "none"
        }
      }, r.name)
    }, {
      key: "email",
      label: "이메일",
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-2)"
        }
      }, r.email)
    }, {
      key: "type",
      label: "회원 유형",
      width: 110
    }, {
      key: "status",
      label: "현재 상태",
      width: 120,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        status: r.status
      })
    }, {
      key: "joined",
      label: "가입일",
      width: 120,
      align: "right",
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-3)"
        }
      }, r.joined)
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: 1,
    totalPages: 1
  })), /*#__PURE__*/React.createElement(ConfirmModal, {
    open: !!target,
    danger: suspend,
    title: suspend ? "회원을 정지하시겠습니까?" : "회원 정지를 해제하시겠습니까?",
    message: target ? `${target.name} (${target.email}) · 현재 상태: ${target.status === "active" ? "정상" : "정지"}` : "",
    reasonLabel: suspend ? "정지 사유" : "해제 사유",
    reasonPlaceholder: suspend ? "정지 사유를 입력해 주세요." : "해제 사유를 입력해 주세요.",
    onCancel: () => setTarget(null),
    onConfirm: () => {
      onToggleStatus(target.id);
      setTarget(null);
    }
  }));
}
Object.assign(window, {
  MembersScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/MembersScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/ReportsScreen.jsx
try { (() => {
const DSp = window.AdminDesignSystem_daf0d7;
function ReportsScreen({
  reports,
  members,
  onDeleteReport,
  onSuspendMemberByName,
  onResolveReport,
  onRejectReport
}) {
  const {
    Tabs,
    Select,
    Input,
    DataTable,
    Button,
    ConfirmModal,
    StatusBadge,
    Pagination
  } = DSp;
  const [tab, setTab] = React.useState("received");
  const [kind, setKind] = React.useState("전체");
  const [q, setQ] = React.useState("");
  const [modal, setModal] = React.useState(null);
  const KL = window.MOCK.kindLabel;
  const count = s => reports.filter(r => r.status === s).length;
  const rows = reports.filter(r => r.status === tab && (kind === "전체" || KL[r.kind] === kind) && (r.content.includes(q) || r.target.includes(q) || r.reporter.includes(q)));
  const susp = name => {
    const m = members.find(m => m.name === name);
    return m && m.status === "suspended";
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.PageHeader, {
    title: "\uC2E0\uACE0 \uAD00\uB9AC"
  }), /*#__PURE__*/React.createElement(Tabs, {
    style: {
      marginBottom: 16
    },
    value: tab,
    onChange: setTab,
    items: [{
      id: "received",
      label: "접수",
      count: count("received")
    }, {
      id: "done",
      label: "처리 완료",
      count: count("done")
    }, {
      id: "rejected",
      label: "처리 반려",
      count: count("rejected")
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["전체", "리뷰 신고", "채팅방 신고", "해당 채팅 신고"],
    value: kind,
    onChange: e => setKind(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    search: true,
    placeholder: "\uC2E0\uACE0 \uAC80\uC0C9 (\uB0B4\uC6A9, \uB300\uC0C1, \uC2E0\uACE0\uC790)",
    value: q,
    onChange: e => setQ(e.target.value),
    wrapStyle: {
      width: 300
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      alignSelf: "center",
      fontSize: 13,
      color: "var(--ink-3)"
    }
  }, "\uCD1D ", rows.length, "\uAC74")), /*#__PURE__*/React.createElement(DataTable, {
    rows: rows,
    columns: [{
      key: "kind",
      label: "신고 종류",
      width: 130,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        status: "accent",
        dot: false
      }, KL[r.kind])
    }, {
      key: "category",
      label: "카테고리",
      width: 120
    }, {
      key: "content",
      label: "신고 내용",
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 300
        }
      }, r.content)
    }, {
      key: "target",
      label: "신고 대상",
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 280
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--ink-3)",
          marginBottom: 2
        }
      }, window.MOCK.targetLabel[r.kind], " \xB7 ", r.targetUser), /*#__PURE__*/React.createElement("div", {
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, r.target))
    }, {
      key: "reporter",
      label: "신고자 이메일",
      width: 210,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-2)"
        }
      }, r.reporter)
    }, {
      key: "status",
      label: "상태",
      width: 120,
      render: r => /*#__PURE__*/React.createElement(StatusBadge, {
        status: r.status
      })
    }, {
      key: "act",
      label: "관리",
      width: 360,
      align: "right",
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          justifyContent: "flex-end"
        }
      }, tab === "received" && onResolveReport && /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "outline",
        onClick: () => onResolveReport(r.id)
      }, "\uCC98\uB9AC \uC644\uB8CC"), tab === "received" && onRejectReport && /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "outline",
        onClick: () => onRejectReport(r.id)
      }, "\uCC98\uB9AC \uBD88\uAC00"), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "outline",
        onClick: () => setModal({
          type: "delete",
          report: r
        })
      }, "\uC0AD\uC81C"), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "danger",
        disabled: susp(r.targetUser),
        onClick: () => setModal({
          type: "suspend",
          report: r
        })
      }, "\uD68C\uC6D0 \uC815\uC9C0"))
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: 1,
    totalPages: 1
  })), /*#__PURE__*/React.createElement(ConfirmModal, {
    open: !!modal && modal.type === "delete",
    danger: true,
    title: "\uC2E0\uACE0\uB41C \uCF58\uD150\uCE20\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    message: modal ? `${KL[modal.report.kind]} · ${modal.report.category} · 대상: ${modal.report.target.slice(0, 40)}` : "",
    reasonLabel: "\uC0AD\uC81C \uC0AC\uC720",
    reasonPlaceholder: "\uC0AD\uC81C \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    onCancel: () => setModal(null),
    onConfirm: () => {
      onDeleteReport(modal.report.id);
      setModal(null);
    }
  }), /*#__PURE__*/React.createElement(ConfirmModal, {
    open: !!modal && modal.type === "suspend",
    danger: true,
    title: "\uD68C\uC6D0\uC744 \uC815\uC9C0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    message: modal ? `${modal.report.targetUser} · 사유 근거: ${modal.report.category}` : "",
    reasonLabel: "\uC815\uC9C0 \uC0AC\uC720",
    reasonPlaceholder: "\uC815\uC9C0 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    onCancel: () => setModal(null),
    onConfirm: () => {
      onSuspendMemberByName(modal.report.targetUser);
      setModal(null);
    }
  }));
}
Object.assign(window, {
  ReportsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/ReportsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/ReviewsScreen.jsx
try { (() => {
const DSr = window.AdminDesignSystem_daf0d7;
function Stars({
  n
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-hover)",
      fontSize: 13,
      letterSpacing: 1
    }
  }, "★".repeat(n), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--border-2)"
    }
  }, "★".repeat(5 - n)));
}
function ReviewsScreen({
  reviews,
  members,
  onDeleteReview,
  onSuspendMember
}) {
  const {
    Input,
    DataTable,
    Button,
    ConfirmModal,
    StatusBadge,
    Pagination
  } = DSr;
  const [q, setQ] = React.useState("");
  const [modal, setModal] = React.useState(null); // {type:'delete'|'suspend', review}
  const rows = reviews.filter(r => r.content.includes(q) || r.author.includes(q) || r.place.includes(q));
  const memberOf = r => members.find(m => m.email === r.email);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.PageHeader, {
    title: "\uB9AC\uBDF0 \uAD00\uB9AC"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    search: true,
    placeholder: "\uB9AC\uBDF0 \uAC80\uC0C9 (\uB0B4\uC6A9, \uC791\uC131\uC790, \uAC00\uAC8C\uBA85)",
    value: q,
    onChange: e => setQ(e.target.value),
    wrapStyle: {
      width: 320
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      alignSelf: "center",
      fontSize: 13,
      color: "var(--ink-3)"
    }
  }, "\uCD1D ", rows.length, "\uAC74")), /*#__PURE__*/React.createElement(DataTable, {
    rows: rows,
    columns: [{
      key: "author",
      label: "작성자",
      width: 150,
      render: r => {
        const m = memberOf(r);
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontWeight: 600
          }
        }, r.author), m && m.status === "suspended" && /*#__PURE__*/React.createElement(StatusBadge, {
          status: "suspended",
          style: {
            marginTop: 4,
            height: 22,
            fontSize: 12
          }
        }));
      }
    }, {
      key: "place",
      label: "가게",
      width: 170,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-2)"
        }
      }, r.place)
    }, {
      key: "rating",
      label: "별점",
      width: 110,
      render: r => /*#__PURE__*/React.createElement(Stars, {
        n: r.rating
      })
    }, {
      key: "content",
      label: "리뷰 내용",
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          display: "block",
          maxWidth: 420,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, r.content)
    }, {
      key: "date",
      label: "작성일",
      width: 110,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--ink-3)"
        }
      }, r.date)
    }, {
      key: "act",
      label: "관리",
      width: 170,
      align: "right",
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          justifyContent: "flex-end"
        }
      }, /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "outline",
        onClick: () => setModal({
          type: "delete",
          review: r
        })
      }, "\uC0AD\uC81C"), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "danger",
        disabled: (memberOf(r) || {}).status === "suspended",
        onClick: () => setModal({
          type: "suspend",
          review: r
        })
      }, "\uD68C\uC6D0 \uC815\uC9C0"))
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: 1,
    totalPages: 1
  })), /*#__PURE__*/React.createElement(ConfirmModal, {
    open: !!modal && modal.type === "delete",
    danger: true,
    title: "\uB9AC\uBDF0\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    message: modal ? `${modal.review.author} · ${modal.review.place} · "${modal.review.content.slice(0, 40)}…"` : "",
    reasonLabel: "\uC0AD\uC81C \uC0AC\uC720",
    reasonPlaceholder: "\uC0AD\uC81C \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    onCancel: () => setModal(null),
    onConfirm: () => {
      onDeleteReview(modal.review.id);
      setModal(null);
    }
  }), /*#__PURE__*/React.createElement(ConfirmModal, {
    open: !!modal && modal.type === "suspend",
    danger: true,
    title: "\uD68C\uC6D0\uC744 \uC815\uC9C0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
    message: modal ? `${modal.review.author} (${modal.review.email})` : "",
    reasonLabel: "\uC815\uC9C0 \uC0AC\uC720",
    reasonPlaceholder: "\uC815\uC9C0 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    onCancel: () => setModal(null),
    onConfirm: () => {
      onSuspendMember(modal.review.email);
      setModal(null);
    }
  }));
}
Object.assign(window, {
  ReviewsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/ReviewsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/data.js
try { (() => {
window.MOCK = {
  members: [{
    id: 1,
    name: "김민혜",
    email: "minhye.kim@gmail.com",
    type: "일반",
    status: "active",
    joined: "2026.07.12"
  }, {
    id: 2,
    name: "박준서",
    email: "owner@sundubu-house.kr",
    type: "사업자",
    status: "active",
    joined: "2026.07.03"
  }, {
    id: 3,
    name: "이도영",
    email: "doyoung.lee@naver.com",
    type: "일반",
    status: "suspended",
    joined: "2026.06.28"
  }, {
    id: 4,
    name: "최정훈",
    email: "jh.choi@hanmail.net",
    type: "일반",
    status: "active",
    joined: "2026.06.21"
  }, {
    id: 5,
    name: "정수아",
    email: "sua@dalgona-cafe.com",
    type: "사업자",
    status: "active",
    joined: "2026.06.17"
  }, {
    id: 6,
    name: "강태오",
    email: "taeoh.kang@gmail.com",
    type: "일반",
    status: "suspended",
    joined: "2026.06.09"
  }, {
    id: 7,
    name: "윤세라",
    email: "sera.yoon@kakao.com",
    type: "일반",
    status: "active",
    joined: "2026.05.30"
  }, {
    id: 8,
    name: "한지웅",
    email: "biz@hanwoo-garden.kr",
    type: "사업자",
    status: "active",
    joined: "2026.05.22"
  }, {
    id: 9,
    name: "오하린",
    email: "harin.oh@naver.com",
    type: "일반",
    status: "active",
    joined: "2026.05.14"
  }, {
    id: 10,
    name: "서믿음",
    email: "mideum.seo@gmail.com",
    type: "일반",
    status: "active",
    joined: "2026.05.02"
  }],
  reviews: [{
    id: 101,
    author: "김민혜",
    email: "minhye.kim@gmail.com",
    place: "순두부하우스 강남점",
    rating: 5,
    content: "국물이 진하고 반찬이 계속 리필돼요. 점심시간엔 웨이팅 필수!",
    date: "2026.07.20"
  }, {
    id: 102,
    author: "강태오",
    email: "taeoh.kang@gmail.com",
    place: "달고나카페",
    rating: 1,
    content: "사장 얼굴도 보기 싫음. 여기 가는 사람들 다 바보임 ㅋㅋ",
    date: "2026.07.19"
  }, {
    id: 103,
    author: "윤세라",
    email: "sera.yoon@kakao.com",
    place: "한우가든 본점",
    rating: 4,
    content: "고기 질은 좋은데 주차가 조금 불편했어요. 그래도 재방문 의사 있습니다.",
    date: "2026.07.18"
  }, {
    id: 104,
    author: "이도영",
    email: "doyoung.lee@naver.com",
    place: "멘야준 홍대점",
    rating: 1,
    content: "위생 최악. 알바가 손도 안 씻고 조리함. 신고합니다. 절대 가지 마세요.",
    date: "2026.07.16"
  }, {
    id: 105,
    author: "오하린",
    email: "harin.oh@naver.com",
    place: "순두부하우스 강남점",
    rating: 5,
    content: "잇티웨이 AI 추천 보고 갔는데 취향 저격이었어요. 굴순두부 추천!",
    date: "2026.07.15"
  }, {
    id: 106,
    author: "최정훈",
    email: "jh.choi@hanmail.net",
    place: "파스타공방",
    rating: 3,
    content: "맛은 평범한데 분위기가 좋아요. 데이트 코스로는 괜찮습니다.",
    date: "2026.07.13"
  }, {
    id: 107,
    author: "서믿음",
    email: "mideum.seo@gmail.com",
    place: "달고나카페",
    rating: 2,
    content: "음료가 너무 달아요. 당도 조절이 안 된다고 하네요.",
    date: "2026.07.11"
  }, {
    id: 108,
    author: "김민혜",
    email: "minhye.kim@gmail.com",
    place: "멘야준 홍대점",
    rating: 4,
    content: "돈코츠 국물이 진해요. 면 추가 무료인 점도 좋았습니다.",
    date: "2026.07.08"
  }],
  reports: [{
    id: 201,
    kind: "review",
    category: "욕설/비방",
    content: "리뷰에 사장님 인신공격성 표현이 있습니다.",
    reporter: "owner@sundubu-house.kr",
    target: "사장 얼굴도 보기 싫음. 여기 가는 사람들 다 바보임 ㅋㅋ",
    targetUser: "강태오",
    status: "received",
    date: "2026.07.21"
  }, {
    id: 202,
    kind: "chatroom",
    category: "스팸/광고",
    content: "채팅방에서 도배성 광고 링크를 반복 전송합니다.",
    reporter: "sera.yoon@kakao.com",
    target: "강남 맛집 원정대",
    targetUser: "이도영",
    status: "received",
    date: "2026.07.20"
  }, {
    id: 203,
    kind: "chat",
    category: "혐오 발언",
    content: "특정 지역 비하 발언을 했습니다.",
    reporter: "harin.oh@naver.com",
    target: "\"그 동네 사람들은 원래 다 그럼\"",
    targetUser: "강태오",
    status: "received",
    date: "2026.07.19"
  }, {
    id: 204,
    kind: "review",
    category: "허위 사실",
    content: "방문한 적 없는 사용자가 허위 위생 리뷰를 작성했습니다.",
    reporter: "biz@hanwoo-garden.kr",
    target: "위생 최악. 알바가 손도 안 씻고 조리함.",
    targetUser: "이도영",
    status: "received",
    date: "2026.07.17"
  }, {
    id: 205,
    kind: "chat",
    category: "욕설/비방",
    content: "1:1 채팅에서 욕설을 했습니다.",
    reporter: "minhye.kim@gmail.com",
    target: "\"ㅄ인가 진짜 말귀를 못 알아듣네\"",
    targetUser: "강태오",
    status: "done",
    date: "2026.07.14"
  }, {
    id: 206,
    kind: "review",
    category: "개인정보 노출",
    content: "리뷰에 직원 실명과 전화번호가 포함되어 있습니다.",
    reporter: "sua@dalgona-cafe.com",
    target: "직원 김OO(010-1234-5678)이 불친절함",
    targetUser: "서믿음",
    status: "done",
    date: "2026.07.12"
  }, {
    id: 207,
    kind: "chatroom",
    category: "음란물",
    content: "채팅방 대표 이미지가 부적절합니다.",
    reporter: "jh.choi@hanmail.net",
    target: "심야 먹방 토크방",
    targetUser: "윤세라",
    status: "rejected",
    date: "2026.07.10"
  }, {
    id: 208,
    kind: "review",
    category: "스팸/광고",
    content: "타 업체 홍보성 리뷰입니다.",
    reporter: "owner@sundubu-house.kr",
    target: "여기 말고 옆집 OO식당 가세요~ 쿠폰도 줘요",
    targetUser: "오하린",
    status: "rejected",
    date: "2026.07.07"
  }, {
    id: 209,
    kind: "chatroom",
    category: "사기 의심",
    content: "공동구매를 빙자한 선입금 요구가 있었습니다.",
    reporter: "mideum.seo@gmail.com",
    target: "홍대 디저트 공구방",
    targetUser: "이도영",
    status: "done",
    date: "2026.07.05"
  }],
  kindLabel: {
    review: "리뷰 신고",
    chatroom: "채팅방 신고",
    chat: "해당 채팅 신고"
  },
  targetLabel: {
    review: "신고된 리뷰",
    chatroom: "채팅방 이름",
    chat: "채팅 내용"
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/data.js", error: String((e && e.message) || e) }); }

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ConfirmModal = __ds_scope.ConfirmModal;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Sidebar = __ds_scope.Sidebar;

})();
