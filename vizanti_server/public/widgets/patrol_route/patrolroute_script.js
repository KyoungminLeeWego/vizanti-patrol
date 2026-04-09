// ============================================================
// Patrol Route Widget — 개선 버전
// Task 1: 맵 위 웨이포인트/경로 시각화
// Task 2: 맵 클릭으로 웨이포인트 추가 (편집 모드)
// Task 3: 웨이포인트 목록 UI (드래그 정렬, 삭제)
// Task 4: 실시간 순찰 실행 상태 표시
// Task 5: 이름 있는 경로 저장/불러오기 (서버 REST API)
// ============================================================

let viewModule = await import(`${base_url}/js/modules/view.js`);
let tfModule = await import(`${base_url}/js/modules/tf.js`);
let persistentModule = await import(`${base_url}/js/modules/persistent.js`);
let StatusModule = await import(`${base_url}/js/modules/status.js`);

let view = viewModule.view;
let tf = tfModule.tf;
let settings = persistentModule.settings;
let Status = StatusModule.Status;

const {uniqueID}_API = 'http://' + window.location.hostname + ':8080';

const {uniqueID}_status = new Status(
	document.getElementById("{uniqueID}_icon"),
	document.getElementById("{uniqueID}_status")
);

// ── 상태 변수 ────────────────────────────────────────────────
let {uniqueID}_waypoints = [];
let {uniqueID}_editMode = false;
let {uniqueID}_activeWaypoint = -1;   // 순찰 중 현재 목표 인덱스
let {uniqueID}_selectedWaypoint = -1; // UI에서 선택된 인덱스
let {uniqueID}_fixed_frame = tf.fixed_frame;
let {uniqueID}_wasRunning = false;    // 이전 순찰 실행 상태 (완료 감지용)
let {uniqueID}_loadedRouteName = null; // 불러온 named route 이름 (없으면 null)

// 드래그 상태
let {uniqueID}_dragPoint = -1;
let {uniqueID}_dragRotate = -1;       // yaw 편집 중인 waypoint 인덱스
let {uniqueID}_dragStartPos = undefined;

// ── Canvas ───────────────────────────────────────────────────
const {uniqueID}_canvas = document.getElementById('{uniqueID}_canvas');
const {uniqueID}_ctx = {uniqueID}_canvas.getContext('2d', { colorSpace: 'srgb' });
const {uniqueID}_view_container = document.getElementById("view_container");

// ── 로그 (색상 지원) ─────────────────────────────────────────
function {uniqueID}_log(msg, color) {
	const el = document.getElementById("{uniqueID}_log");
	el.textContent = msg;
	el.style.color = color || '#6c7086';
}

// ── 루프 토글 버튼 상태 업데이트 ────────────────────────────
// state를 전달하면 checkbox와 버튼을 함께 설정, 생략하면 현재 checkbox 값을 읽음
function {uniqueID}_updateLoopBtn(state) {
	const cb = document.getElementById("{uniqueID}_loop");
	const btn = document.getElementById("{uniqueID}_loop_btn");
	if (!btn) return;
	if (state !== undefined) cb.checked = state;
	if (cb.checked) {
		btn.style.background = '#4CAF50';
		btn.style.color = '#fff';
		btn.textContent = '🔁 반복 순찰  ON';
	} else {
		btn.style.background = '#444';
		btn.style.color = '#aaa';
		btn.textContent = '🔁 반복 순찰  OFF';
	}
}

// ── 좌표 변환 (waypoints 위젯과 동일한 패턴) ─────────────────
function {uniqueID}_pointToScreen(point) {
	const transformed = tf.transformPose(
		{uniqueID}_fixed_frame,
		tf.fixed_frame,
		{ x: point.x, y: point.y, z: point.z || 0 },
		new Quaternion()
	);
	return view.fixedToScreen({
		x: transformed.translation.x,
		y: transformed.translation.y
	});
}

function {uniqueID}_screenToPoint(click) {
	return tf.transformPose(
		tf.fixed_frame,
		{uniqueID}_fixed_frame,
		view.screenToFixed(click),
		new Quaternion()
	).translation;
}

// ── 캔버스 그리기 (Task 1) ───────────────────────────────────
function {uniqueID}_resizeCanvas() {
	{uniqueID}_canvas.height = window.innerHeight;
	{uniqueID}_canvas.width = window.innerWidth;
	{uniqueID}_drawRoute();
}

function {uniqueID}_drawRoute() {
	const ctx = {uniqueID}_ctx;
	const canvas = {uniqueID}_canvas;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const wps = {uniqueID}_waypoints;
	if (wps.length === 0) return;

	const frame = tf.absoluteTransforms[{uniqueID}_fixed_frame];
	if (!frame) return;

	const viewPoints = wps.map(wp => {uniqueID}_pointToScreen(wp));
	const loop = document.getElementById("{uniqueID}_loop").checked;

	// ── 경로선 ──
	if (viewPoints.length > 1) {
		ctx.lineWidth = 2;
		ctx.strokeStyle = {uniqueID}_editMode
			? "rgba(137, 180, 250, 0.85)"
			: "rgba(166, 227, 161, 0.75)";
		ctx.setLineDash([]);
		ctx.beginPath();
		viewPoints.forEach((vp, i) => {
			if (i === 0) ctx.moveTo(vp.x, vp.y);
			else ctx.lineTo(vp.x, vp.y);
		});
		ctx.stroke();

		// 루프 닫힘선 (마지막 → 첫 번째)
		if (loop) {
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(166, 227, 161, 0.4)";
			ctx.setLineDash([6, 4]);
			ctx.beginPath();
			const last = viewPoints[viewPoints.length - 1];
			ctx.moveTo(last.x, last.y);
			ctx.lineTo(viewPoints[0].x, viewPoints[0].y);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	// yaw 화살표 끝점 사전 계산
	const arrowPts  = wps.map(wp => ({ x: wp.x + Math.cos(wp.yaw || 0) * 0.4, y: wp.y + Math.sin(wp.yaw || 0) * 0.4 }));
	const arrowTips = arrowPts.map(wp => {uniqueID}_pointToScreen(wp));

	// ── 마커 + yaw 화살표 ──
	viewPoints.forEach((vp, i) => {
		const isActive   = i === {uniqueID}_activeWaypoint;
		const isSelected = i === {uniqueID}_selectedWaypoint;
		const wp = wps[i];

		// 외곽 테두리
		ctx.beginPath();
		ctx.arc(vp.x, vp.y, 13, 0, 2 * Math.PI);
		ctx.fillStyle = "#1e1e2e";
		ctx.fill();

		// 내부 원
		ctx.beginPath();
		ctx.arc(vp.x, vp.y, 10, 0, 2 * Math.PI);
		if (isActive) {
			ctx.fillStyle = "#f38ba8";
		} else if (isSelected) {
			ctx.fillStyle = "#89b4fa";
		} else if ({uniqueID}_editMode) {
			ctx.fillStyle = "#89dceb";
		} else {
			ctx.fillStyle = "#a6e3a1";
		}
		ctx.fill();

		// 번호
		ctx.font = "bold 11px Monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#1e1e2e";
		ctx.fillText(i + 1, vp.x, vp.y);

		// yaw 화살표 (arrowTips[i] = 사전 계산된 끝점)
		const at = arrowTips[i];
		let arrowColor = isActive ? '#f38ba8' : (isSelected ? '#89b4fa' : '#a6e3a1');
		{uniqueID}_dragRotate === i && (arrowColor = '#fab387');
		const adx = at.x - vp.x;
		const ady = at.y - vp.y;
		const alen = Math.hypot(adx, ady);
		if (alen > 2) {
			const ang = Math.atan2(ady, adx);
			const headLen = 7;
			ctx.beginPath();
			ctx.moveTo(vp.x, vp.y);
			ctx.lineTo(at.x, at.y);
			ctx.strokeStyle = arrowColor;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(at.x, at.y);
			ctx.lineTo(
				at.x - headLen * Math.cos(ang - Math.PI / 6),
				at.y - headLen * Math.sin(ang - Math.PI / 6)
			);
			ctx.lineTo(
				at.x - headLen * Math.cos(ang + Math.PI / 6),
				at.y - headLen * Math.sin(ang + Math.PI / 6)
			);
			ctx.closePath();
			ctx.fillStyle = arrowColor;
			ctx.fill();
		}
	});

	ctx.textBaseline = "alphabetic";
}

// ── 웨이포인트 목록 UI (Task 3) ──────────────────────────────
function {uniqueID}_moveWaypoint(fromIdx, toIdx) {
	if (toIdx < 0 || toIdx >= {uniqueID}_waypoints.length) return;
	const moved = {uniqueID}_waypoints.splice(fromIdx, 1)[0];
	{uniqueID}_waypoints.splice(toIdx, 0, moved);
	if ({uniqueID}_selectedWaypoint === fromIdx) {
		{uniqueID}_selectedWaypoint = toIdx;
	}
	{uniqueID}_renderList();
	{uniqueID}_drawRoute();
}

function {uniqueID}_renderList() {
	const ul = document.getElementById("{uniqueID}_wp_list");
	if ({uniqueID}_waypoints.length === 0) {
		ul.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:14px 0;">웨이포인트 없음</li>';
		return;
	}

	ul.innerHTML = '';
	{uniqueID}_waypoints.forEach((wp, i) => {
		const isActive   = i === {uniqueID}_activeWaypoint;
		const isSelected = i === {uniqueID}_selectedWaypoint;
		const isFirst    = i === 0;
		const isLast     = i === {uniqueID}_waypoints.length - 1;

		const li = document.createElement('li');
		li.dataset.index = i;
		li.style.cssText = [
			'display:flex',
			'align-items:center',
			'gap:4px',
			'padding:4px 6px',
			'border-radius:5px',
			'margin-bottom:3px',
			'font-size:12px',
			'user-select:none',
			'background:' + (isActive ? '#313244' : (isSelected ? '#2a2a3c' : '#181825')),
			'border:1px solid ' + (isActive ? '#f38ba8' : (isSelected ? '#89b4fa' : 'transparent'))
		].join(';');

		const btnStyle = 'background:#313244;color:#cdd6f4;border:none;border-radius:3px;' +
			'width:20px;height:20px;font-size:11px;cursor:pointer;flex-shrink:0;line-height:1;padding:0;';
		const btnDisabled = 'background:#1e1e2e;color:#45475a;border:none;border-radius:3px;' +
			'width:20px;height:20px;font-size:11px;cursor:default;flex-shrink:0;line-height:1;padding:0;';

		const upBtn = {uniqueID}_editMode
			? '<button class="{uniqueID}_wp_up" data-idx="' + i + '" ' +
				'style="' + (isFirst ? btnDisabled : btnStyle) + '"' +
				(isFirst ? ' disabled' : '') + '>▲</button>'
			: '';
		const dnBtn = {uniqueID}_editMode
			? '<button class="{uniqueID}_wp_dn" data-idx="' + i + '" ' +
				'style="' + (isLast ? btnDisabled : btnStyle) + '"' +
				(isLast ? ' disabled' : '') + '>▼</button>'
			: '';

		// 순찰 옵션 선택 드롭다운 — 현재 선택된 옵션 표시
		const PATROL_OPTIONS = [
			{ value: '',            label: '없음' },
			{ value: 'yolo_camera', label: '📷 카메라' },
			{ value: 'photo',       label: '🖼 사진 저장' },
			{ value: 'alarm',       label: '🚨 경보' },
		];
		const currentOption = (wp.patrol_options && wp.patrol_options[0]) || '';
		const optionsHtml = PATROL_OPTIONS.map(opt =>
			`<option value="${opt.value}" ${currentOption === opt.value ? 'selected' : ''}>${opt.label}</option>`
		).join('');

		li.innerHTML =
			upBtn + dnBtn +
			'<span style="min-width:18px;text-align:center;font-weight:bold;font-size:12px;color:' +
				(isActive ? '#f38ba8' : '#89b4fa') + ';margin:0 3px;">' + (i + 1) + '</span>' +
			'<span style="flex:1;font-family:monospace;font-size:11px;color:#cdd6f4;">' +
				'x=' + wp.x.toFixed(2) + ' y=' + wp.y.toFixed(2) +
				' <span style="color:#f9e2af;">yaw=' + Math.round((wp.yaw || 0) * 180 / Math.PI) + '\u00b0</span></span>' +
			// 이름 입력란
			'<input class="{uniqueID}_wp_name" data-idx="' + i + '" type="text" ' +
				'value="' + (wp.name || '').replace(/"/g, '&quot;') + '" ' +
				'placeholder="이름(선택)" ' +
				'style="width:70px;padding:2px 5px;background:#313244;border:1px solid #45475a;' +
				'border-radius:4px;color:#cdd6f4;font-size:11px;flex-shrink:0;">' +
			// 순찰 옵션 선택
			'<select class="{uniqueID}_wp_option" data-idx="' + i + '" ' +
				'style="padding:2px 4px;background:#313244;border:1px solid #45475a;' +
				'border-radius:4px;color:#cdd6f4;font-size:11px;flex-shrink:0;">' +
				optionsHtml +
			'</select>' +
			// 삭제 버튼
			'<button class="{uniqueID}_del_wp" data-idx="' + i + '" ' +
				'style="background:#f38ba8;color:#1e1e2e;padding:1px 6px;font-size:11px;' +
				'border:none;border-radius:4px;cursor:pointer;flex-shrink:0;">✕</button>';

		ul.appendChild(li);

		// 이름 입력 이벤트
		li.querySelector('.{uniqueID}_wp_name').addEventListener('input', e => {
			const idx = parseInt(e.target.dataset.idx);
			{uniqueID}_waypoints[idx].name = e.target.value;
		});

		// 순찰 옵션 선택 이벤트
		li.querySelector('.{uniqueID}_wp_option').addEventListener('change', e => {
			const idx = parseInt(e.target.dataset.idx);
			const val = e.target.value;
			{uniqueID}_waypoints[idx].patrol_options = val ? [val] : [];
		});
	});
}

// ── 편집 모드 / 맵 인터랙션 (Task 2) ────────────────────────
function {uniqueID}_findNearWaypoint(screenPos, radius) {
	const r = radius || 16;
	let found = -1;
	{uniqueID}_waypoints.forEach((wp, i) => {
		const sp = {uniqueID}_pointToScreen(wp);
		if (Math.hypot(sp.x - screenPos.x, sp.y - screenPos.y) < r) {
			found = i;
		}
	});
	return found;
}

function {uniqueID}_onMapMouseDown(e) {
	if (!{uniqueID}_editMode) return;
	view.setInputMovementEnabled(false);
	const pos = { x: e.clientX, y: e.clientY };
	const idxC = {uniqueID}_findNearWaypoint(pos, 12);
	const idxO = {uniqueID}_findNearWaypoint(pos, 22);
	if (idxC >= 0) {
		{uniqueID}_dragPoint = idxC;
	} else if (idxO >= 0) {
		{uniqueID}_dragRotate = idxO;
	}
	{uniqueID}_dragStartPos = pos;
}

function {uniqueID}_onMapMouseMove(e) {
	if (!{uniqueID}_editMode) return;
	if ({uniqueID}_dragPoint >= 0) {
		const worldPt = {uniqueID}_screenToPoint({ x: e.clientX, y: e.clientY });
		{uniqueID}_waypoints[{uniqueID}_dragPoint].x = worldPt.x;
		{uniqueID}_waypoints[{uniqueID}_dragPoint].y = worldPt.y;
		{uniqueID}_drawRoute();
	} else if ({uniqueID}_dragRotate >= 0) {
		const wp = {uniqueID}_waypoints[{uniqueID}_dragRotate];
		const mpt = {uniqueID}_screenToPoint({ x: e.clientX, y: e.clientY });
		wp.yaw = Math.atan2(mpt.y - wp.y, mpt.x - wp.x);
		{uniqueID}_drawRoute();
	} else if ({uniqueID}_dragStartPos) {
		// 새 waypoint 드래그 미리보기
		{uniqueID}_drawRoute();
		const sp = {uniqueID}_dragStartPos;
		const moved = Math.hypot(e.clientX - sp.x, e.clientY - sp.y) > 5;
		if (moved) {
			const ctx = {uniqueID}_ctx;
			const ang = Math.atan2(e.clientY - sp.y, e.clientX - sp.x);
			const len = Math.min(Math.hypot(e.clientX - sp.x, e.clientY - sp.y), 50);
			const ex = sp.x + Math.cos(ang) * len;
			const ey = sp.y + Math.sin(ang) * len;
			ctx.beginPath();
			ctx.arc(sp.x, sp.y, 10, 0, 2 * Math.PI);
			ctx.fillStyle = 'rgba(137,180,250,0.4)';
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(sp.x, sp.y);
			ctx.lineTo(ex, ey);
			ctx.strokeStyle = 'rgba(137,180,250,0.9)';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(ex, ey);
			ctx.lineTo(ex - 8 * Math.cos(ang - Math.PI / 6), ey - 8 * Math.sin(ang - Math.PI / 6));
			ctx.lineTo(ex - 8 * Math.cos(ang + Math.PI / 6), ey - 8 * Math.sin(ang + Math.PI / 6));
			ctx.closePath();
			ctx.fillStyle = 'rgba(137,180,250,0.9)';
			ctx.fill();
		}
	}
}

function {uniqueID}_onMapMouseUp(e) {
	if (!{uniqueID}_editMode) return;
	view.setInputMovementEnabled(true);

	const moved = {uniqueID}_dragStartPos &&
		Math.hypot(e.clientX - {uniqueID}_dragStartPos.x, e.clientY - {uniqueID}_dragStartPos.y) > 5;

	if ({uniqueID}_dragPoint >= 0) {
		if (moved) {
			{uniqueID}_renderList();
		}
		{uniqueID}_dragPoint = -1;
	} else if ({uniqueID}_dragRotate >= 0) {
		{uniqueID}_dragRotate = -1;
		{uniqueID}_renderList();
	} else if (moved) {
		const sp = {uniqueID}_dragStartPos;
		const startPt = {uniqueID}_screenToPoint(sp);
		const endPt   = {uniqueID}_screenToPoint({ x: e.clientX, y: e.clientY });
		const yaw = Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x);
		{uniqueID}_loadedRouteName = null;
		{uniqueID}_waypoints.push({ x: startPt.x, y: startPt.y, yaw: yaw, name: '', patrol_options: [] });
		{uniqueID}_renderList();
		{uniqueID}_log('#' + {uniqueID}_waypoints.length + ' 추가됨 (yaw ' + Math.round(yaw * 180 / Math.PI) + '\u00b0)');
	} else {
		const worldPt = {uniqueID}_screenToPoint({ x: e.clientX, y: e.clientY });
		{uniqueID}_loadedRouteName = null;
		{uniqueID}_waypoints.push({ x: worldPt.x, y: worldPt.y, yaw: 0, name: '', patrol_options: [] });
		{uniqueID}_renderList();
		{uniqueID}_log('#' + {uniqueID}_waypoints.length + ' 추가됨 (' +
			worldPt.x.toFixed(2) + ', ' + worldPt.y.toFixed(2) + ')');
	}

	{uniqueID}_dragStartPos = undefined;
	{uniqueID}_drawRoute();
}

function {uniqueID}_onMapContextMenu(e) {
	if (!{uniqueID}_editMode) return;
	e.preventDefault();
	const idx = {uniqueID}_findNearWaypoint({ x: e.clientX, y: e.clientY });
	if (idx >= 0) {
		{uniqueID}_waypoints.splice(idx, 1);
		if ({uniqueID}_selectedWaypoint >= {uniqueID}_waypoints.length) {
			{uniqueID}_selectedWaypoint = -1;
		}
		{uniqueID}_renderList();
		{uniqueID}_drawRoute();
		{uniqueID}_log('#' + (idx + 1) + ' 삭제됨 (우클릭)');
	}
}

function {uniqueID}_setEditMode(enabled) {
	{uniqueID}_editMode = enabled;
	const btn = document.getElementById("{uniqueID}_btn_edit");

	if (enabled) {
		btn.style.background = "#89b4fa";
		btn.style.color = "#1e1e2e";
		btn.textContent = "✏️ 편집 중 (종료)";
		{uniqueID}_view_container.style.cursor = "crosshair";
		{uniqueID}_canvas.style.zIndex = "999";
		{uniqueID}_view_container.addEventListener('mousedown',   {uniqueID}_onMapMouseDown);
		{uniqueID}_view_container.addEventListener('mousemove',   {uniqueID}_onMapMouseMove);
		{uniqueID}_view_container.addEventListener('mouseup',     {uniqueID}_onMapMouseUp);
		{uniqueID}_view_container.addEventListener('contextmenu', {uniqueID}_onMapContextMenu);
	} else {
		btn.style.background = "#45475a";
		btn.style.color = "#cdd6f4";
		btn.textContent = "✏️ 편집 모드";
		{uniqueID}_view_container.style.cursor = "";
		{uniqueID}_canvas.style.zIndex = "2";
		{uniqueID}_view_container.removeEventListener('mousedown',   {uniqueID}_onMapMouseDown);
		{uniqueID}_view_container.removeEventListener('mousemove',   {uniqueID}_onMapMouseMove);
		{uniqueID}_view_container.removeEventListener('mouseup',     {uniqueID}_onMapMouseUp);
		{uniqueID}_view_container.removeEventListener('contextmenu', {uniqueID}_onMapContextMenu);
	}

	{uniqueID}_renderList();
	{uniqueID}_drawRoute();
}

// ── Patrol API 호출 ──────────────────────────────────────────
async function {uniqueID}_startPatrol() {
	if ({uniqueID}_waypoints.length === 0) {
		{uniqueID}_log('웨이포인트가 없습니다', '#f38ba8');
		return;
	}
	const loop = document.getElementById("{uniqueID}_loop").checked;
	{uniqueID}_log('순찰 시작 요청 중...');
	try {
		let res;
		if ({uniqueID}_loadedRouteName) {
			res = await fetch(
				{uniqueID}_API + '/api/waypoints/routes/' + encodeURIComponent({uniqueID}_loadedRouteName) + '/run?loop=' + loop,
				{ method: 'POST' }
			);
		} else {
			res = await fetch({uniqueID}_API + '/api/waypoints/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ points: {uniqueID}_waypoints, loop }),
			});
		}
		const data = await res.json();
		// 서버가 실제로 사용한 loop 값으로 UI 동기화
		if (typeof data.loop === 'boolean') {
			{uniqueID}_updateLoopBtn(data.loop);
			{uniqueID}_drawRoute();
		}
		{uniqueID}_log(data.message || (data.success ? '순찰 시작됨' : '시작 실패'));
		{uniqueID}_status.setOK();
	} catch (e) {
		{uniqueID}_log('오류 발생 — patrol_api 미연결', '#f38ba8');
		{uniqueID}_status.setError('patrol_api 미연결');
	}
}

async function {uniqueID}_stopPatrol() {
	{uniqueID}_log('순찰 중지 요청 중...');
	try {
		const res  = await fetch({uniqueID}_API + '/api/navigate/cancel', { method: 'POST' });
		const data = await res.json();
		{uniqueID}_log(data.success ? '순찰 중지됨' : '중지 실패');
	} catch (e) {
		{uniqueID}_log('오류 발생 — ' + e.message, '#f38ba8');
	}
}

// ── 실행 상태 WebSocket (Task 4) ─────────────────────────────
let {uniqueID}_ws = null;
let {uniqueID}_wsRetryTimer = null;

function {uniqueID}_connectStatusWS() {
	if ({uniqueID}_wsRetryTimer) {
		clearTimeout({uniqueID}_wsRetryTimer);
		{uniqueID}_wsRetryTimer = null;
	}

	try {
		const wsUrl = 'ws://' + window.location.hostname + ':8080/ws/status';
		{uniqueID}_ws = new WebSocket(wsUrl);

		{uniqueID}_ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const idx     = typeof data.waypoint_index  === 'number' ? data.waypoint_index  : -1;
				const total   = typeof data.waypoints_total === 'number' ? data.waypoints_total : 0;
				const running = data.patrol_running === true;

				const stateEl = document.getElementById("{uniqueID}_patrol_state");
				if (stateEl) {
					if (running && idx >= 0 && total > 0) {
						stateEl.textContent = '순찰 중 — 웨이포인트 ' + (idx + 1) + ' / ' + total;
						stateEl.style.color = '#f9e2af'; // 노랑 — 이동 중
					} else if (running) {
						stateEl.textContent = '순찰 중...';
						stateEl.style.color = '#f9e2af';
					} else {
						if ({uniqueID}_wasRunning) {
							// 순찰이 방금 완료됨
							stateEl.textContent = '순찰 완료';
							stateEl.style.color = '#a6e3a1';
							setTimeout(() => {
								stateEl.textContent = '대기 중';
								stateEl.style.color = '#a6e3a1';
							}, 3000);
						} else {
							stateEl.textContent = '대기 중';
							stateEl.style.color = '#a6e3a1'; // 초록 — 정상/대기
						}
					}
				}

				{uniqueID}_wasRunning = running;

				// 순찰 중 loop 상태 UI 동기화
				if (running && typeof data.patrol_loop === 'boolean') {
					{uniqueID}_updateLoopBtn(data.patrol_loop);
				}

				// 순찰 중 웨이포인트 UI 동기화 (API 시작 포함)
				if (running && Array.isArray(data.current_waypoints) && data.current_waypoints.length > 0) {
					{uniqueID}_waypoints = data.current_waypoints.map(wp => ({
						...wp,
						name: wp.name || '',
						patrol_options: wp.patrol_options || [],
					}));
					{uniqueID}_renderList();
					{uniqueID}_drawRoute();
				}

				const newActive = running ? idx : -1;
				if ({uniqueID}_activeWaypoint !== newActive) {
					{uniqueID}_activeWaypoint = newActive;
					{uniqueID}_renderList();
					{uniqueID}_drawRoute();
				}
			} catch (_) { /* JSON 파싱 오류 무시 */ }
		};

		{uniqueID}_ws.onclose = () => {
			{uniqueID}_wsRetryTimer = setTimeout({uniqueID}_connectStatusWS, 3000);
		};

		{uniqueID}_ws.onerror = () => {
			{uniqueID}_ws.close();
		};

	} catch (e) {
		{uniqueID}_wsRetryTimer = setTimeout({uniqueID}_connectStatusWS, 5000);
	}
}

{uniqueID}_connectStatusWS();

// ── 경로 저장 — POST /api/waypoints/routes ───────────────────
async function {uniqueID}_saveRoute() {
	if ({uniqueID}_waypoints.length === 0) {
		{uniqueID}_log('웨이포인트가 없습니다', '#f38ba8');
		return;
	}
	const defaultName = '경로_' + new Date().toLocaleString('ko-KR', {
		month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit'
	}).replace(/[\s:\/]/g, '_');
	const name = prompt('저장할 경로 이름을 입력하세요:', defaultName);
	if (!name || !name.trim()) return;
	const trimmed = name.trim();

	{uniqueID}_log('저장 중...', '#f9e2af');
	try {
		const res = await fetch({uniqueID}_API + '/api/waypoints/routes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: trimmed,
				waypoints: {uniqueID}_waypoints,
				loop: document.getElementById("{uniqueID}_loop").checked
			})
		});
		const data = await res.json();
		if (res.ok && data.success) {
			{uniqueID}_log('"' + trimmed + '" 저장 완료', '#a6e3a1');
		} else {
			{uniqueID}_log('저장 실패 — 서버 오류', '#f38ba8');
		}
	} catch (e) {
		{uniqueID}_log('저장 실패 — 서버 오류', '#f38ba8');
	}
}

// ── 경로 불러오기 — GET /api/waypoints/routes ────────────────
async function {uniqueID}_loadRoute() {
	{uniqueID}_log('불러오는 중...', '#f9e2af');
	try {
		const res = await fetch({uniqueID}_API + '/api/waypoints/routes');
		const data = await res.json();
		if (!data.routes || data.routes.length === 0) {
			{uniqueID}_log('저장된 경로 없음', '#6c7086');
			return;
		}
		{uniqueID}_showLoadDialog(data.routes);
		{uniqueID}_log('');
	} catch (e) {
		{uniqueID}_log('불러오기 실패 — 서버 오류', '#f38ba8');
	}
}

function {uniqueID}_showLoadDialog(routeNames) {
	const existing = document.getElementById('{uniqueID}_load_dialog');
	if (existing) existing.remove();

	const overlay = document.createElement('div');
	overlay.id = '{uniqueID}_load_dialog';
	overlay.style.cssText = [
		'position:fixed', 'inset:0',
		'display:flex', 'align-items:center', 'justify-content:center',
		'z-index:10000',
		'background:rgba(0,0,0,0.5)'
	].join(';');

	const box = document.createElement('div');
	box.style.cssText = [
		'background:#1e1e2e',
		'border:1px solid #45475a',
		'border-radius:10px',
		'padding:16px',
		'min-width:280px', 'max-width:380px', 'width:90%',
		'box-shadow:0 8px 32px rgba(0,0,0,0.6)'
	].join(';');

	let listHtml = '';
	routeNames.forEach(name => {
		listHtml +=
			'<div class="{uniqueID}_route_row" data-name="' + encodeURIComponent(name) + '" ' +
			'style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;' +
			'margin-bottom:5px;background:#313244;cursor:pointer;">' +
			'<div style="flex:1;overflow:hidden;">' +
			'<div style="font-size:13px;color:#cdd6f4;font-weight:bold;white-space:nowrap;' +
			'overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
			'</div>' +
			'<button class="{uniqueID}_del_route" data-name="' + encodeURIComponent(name) + '" ' +
			'style="background:#f38ba8;color:#1e1e2e;border:none;border-radius:4px;' +
			'padding:3px 8px;font-size:11px;cursor:pointer;flex-shrink:0;">🗑</button>' +
			'</div>';
	});

	box.innerHTML =
		'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
		'<strong style="color:#cdd6f4;font-size:14px;">📂 경로 불러오기</strong>' +
		'<button id="{uniqueID}_close_load_dialog" style="background:none;border:none;color:#6c7086;font-size:18px;cursor:pointer;line-height:1;">✕</button>' +
		'</div>' +
		'<div style="max-height:240px;overflow-y:auto;">' + listHtml + '</div>';

	overlay.appendChild(box);
	document.body.appendChild(overlay);

	const closeBtn = document.getElementById('{uniqueID}_close_load_dialog');
	if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove());
	overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

	// 경로 선택 — GET /api/waypoints/routes/{name}
	overlay.querySelectorAll('.{uniqueID}_route_row').forEach(row => {
		row.addEventListener('click', async e => {
			if (e.target.classList.contains('{uniqueID}_del_route')) return;
			const name = decodeURIComponent(row.dataset.name);
			try {
				const res = await fetch({uniqueID}_API + '/api/waypoints/routes/' + encodeURIComponent(name));
				if (!res.ok) throw new Error('not found');
				const r = await res.json();
				{uniqueID}_waypoints = r.waypoints.map(wp => ({
					...wp,
					name: wp.name || '',
					patrol_options: wp.patrol_options || [],
				}));
				{uniqueID}_loadedRouteName = name;
				{uniqueID}_updateLoopBtn(r.loop === true);
				{uniqueID}_selectedWaypoint = -1;
				{uniqueID}_renderList();
				{uniqueID}_drawRoute();
				{uniqueID}_log('"' + name + '" 불러옴 (' + {uniqueID}_waypoints.length + '개)', '#a6e3a1');
				overlay.remove();
			} catch (e2) {
				{uniqueID}_log('불러오기 실패', '#f38ba8');
			}
		});
	});

	// 경로 삭제 — DELETE /api/waypoints/routes/{name}
	overlay.querySelectorAll('.{uniqueID}_del_route').forEach(btn => {
		btn.addEventListener('click', async e => {
			e.stopPropagation();
			const name = decodeURIComponent(btn.dataset.name);
			try {
				const res = await fetch(
					{uniqueID}_API + '/api/waypoints/routes/' + encodeURIComponent(name),
					{ method: 'DELETE' }
				);
				if (!res.ok) throw new Error('failed');
				{uniqueID}_log('"' + name + '" 삭제됨', '#6c7086');
				overlay.remove();
				// 남은 경로 있으면 다이얼로그 재표시
				const listRes = await fetch({uniqueID}_API + '/api/waypoints/routes');
				const listData = await listRes.json();
				if (listData.routes && listData.routes.length > 0) {
					{uniqueID}_showLoadDialog(listData.routes);
				}
			} catch (e2) {
				{uniqueID}_log('삭제 실패', '#f38ba8');
			}
		});
	});
}

// ── 좌표 입력으로 웨이포인트 추가 ───────────────────────────
function {uniqueID}_addWaypoint() {
	const x   = parseFloat(document.getElementById("{uniqueID}_wp_x").value);
	const y   = parseFloat(document.getElementById("{uniqueID}_wp_y").value);
	const yaw = parseFloat(document.getElementById("{uniqueID}_wp_yaw").value) || 0;
	if (isNaN(x) || isNaN(y)) { {uniqueID}_log('x, y 값을 입력하세요', '#f38ba8'); return; }
	{uniqueID}_loadedRouteName = null;
	{uniqueID}_waypoints.push({ x, y, yaw, name: '', patrol_options: [] });
	{uniqueID}_renderList();
	{uniqueID}_drawRoute();
	{uniqueID}_log('#' + {uniqueID}_waypoints.length + ' 추가됨 (' + x + ', ' + y + ')');
}

function {uniqueID}_clearAll() {
	{uniqueID}_waypoints = [];
	{uniqueID}_loadedRouteName = null;
	{uniqueID}_selectedWaypoint = -1;
	{uniqueID}_activeWaypoint = -1;
	{uniqueID}_renderList();
	{uniqueID}_drawRoute();
	{uniqueID}_log('전체 삭제됨');
}

// ── 이벤트 바인딩 ────────────────────────────────────────────
document.getElementById("{uniqueID}_btn_add").addEventListener('click',   {uniqueID}_addWaypoint);
document.getElementById("{uniqueID}_btn_start").addEventListener('click', {uniqueID}_startPatrol);
document.getElementById("{uniqueID}_btn_stop").addEventListener('click',  {uniqueID}_stopPatrol);
document.getElementById("{uniqueID}_btn_save").addEventListener('click',  {uniqueID}_saveRoute);
document.getElementById("{uniqueID}_btn_load").addEventListener('click',  {uniqueID}_loadRoute);
document.getElementById("{uniqueID}_btn_clear").addEventListener('click', {uniqueID}_clearAll);
document.getElementById("{uniqueID}_btn_edit").addEventListener('click',  () => {uniqueID}_setEditMode(!{uniqueID}_editMode));

// 루프 토글 버튼
document.getElementById("{uniqueID}_loop_btn").addEventListener('click', () => {
	const cb = document.getElementById("{uniqueID}_loop");
	cb.checked = !cb.checked;
	{uniqueID}_updateLoopBtn();
	{uniqueID}_drawRoute();
});

// 목록 버튼 위임 (▲▼ 이동, ✕ 삭제)
document.getElementById("{uniqueID}_wp_list").addEventListener('click', e => {
	const idx = parseInt(e.target.dataset.idx);
	if (isNaN(idx)) return;

	if (e.target.classList.contains('{uniqueID}_wp_up')) {
		{uniqueID}_loadedRouteName = null;
		{uniqueID}_moveWaypoint(idx, idx - 1);
	} else if (e.target.classList.contains('{uniqueID}_wp_dn')) {
		{uniqueID}_loadedRouteName = null;
		{uniqueID}_moveWaypoint(idx, idx + 1);
	} else if (e.target.classList.contains('{uniqueID}_del_wp')) {
		{uniqueID}_loadedRouteName = null;
		{uniqueID}_waypoints.splice(idx, 1);
		if ({uniqueID}_selectedWaypoint >= {uniqueID}_waypoints.length) {
			{uniqueID}_selectedWaypoint = -1;
		}
		{uniqueID}_renderList();
		{uniqueID}_drawRoute();
		{uniqueID}_log('#' + (idx + 1) + ' 삭제됨');
	}
});

// ── 캔버스 크기 / TF 이벤트 ─────────────────────────────────
window.addEventListener('resize',            {uniqueID}_resizeCanvas);
window.addEventListener('orientationchange', {uniqueID}_resizeCanvas);
window.addEventListener("view_changed",      {uniqueID}_drawRoute);
window.addEventListener("tf_fixed_frame_changed", () => {
	{uniqueID}_fixed_frame = tf.fixed_frame;
	{uniqueID}_drawRoute();
});
window.addEventListener("tf_changed", () => {
	if ({uniqueID}_fixed_frame !== tf.fixed_frame) {
		{uniqueID}_fixed_frame = tf.fixed_frame;
	}
	{uniqueID}_drawRoute();
});

// ── 초기화 ───────────────────────────────────────────────────
{uniqueID}_resizeCanvas();
{uniqueID}_renderList();
{uniqueID}_updateLoopBtn();

console.log("PatrolRoute Widget Loaded {uniqueID}");