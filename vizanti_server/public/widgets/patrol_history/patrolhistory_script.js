let StatusModule = await import(`${base_url}/js/modules/status.js`);
let Status = StatusModule.Status;

const {uniqueID}_API = 'http://' + window.location.hostname + ':8080';

const {uniqueID}_status = new Status(
	document.getElementById("{uniqueID}_icon"),
	document.getElementById("{uniqueID}_status")
);

function {uniqueID}_log(msg, color) {
	const el = document.getElementById("{uniqueID}_log");
	el.textContent = msg;
	el.style.color = color || '#6c7086';
}

// ── 상태 아이콘 ──────────────────────────────────────────────
function {uniqueID}_statusIcon(status) {
	const map = {
		completed: '✅',
		stopped:   '⚠️',
		error:     '❌',
		running:   '🔄',
	};
	return map[status] || '❓';
}

// ── 순찰 옵션 라벨 ───────────────────────────────────────────
function {uniqueID}_optionLabel(option) {
	const map = {
		yolo_camera: '📷 카메라',
		photo:       '🖼 사진저장',
		lidar_check: '📡 전방감지',
		alarm:       '🚨 경보',
		log_pose:    '📋 위치로그',
	};
	return map[option] || option;
}

// ── 화면 전환 ────────────────────────────────────────────────
function {uniqueID}_showList() {
	document.getElementById("{uniqueID}_list_view").style.display = 'block';
	document.getElementById("{uniqueID}_detail_view").style.display = 'none';
}

function {uniqueID}_showDetail() {
	document.getElementById("{uniqueID}_list_view").style.display = 'none';
	document.getElementById("{uniqueID}_detail_view").style.display = 'block';
}

// ── 이력 목록 로드 ───────────────────────────────────────────
async function {uniqueID}_loadList() {
	const ul = document.getElementById("{uniqueID}_list");
	ul.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">로딩 중...</li>';
	{uniqueID}_log('');

	try {
		const res  = await fetch({uniqueID}_API + '/api/patrol/history');
		const data = await res.json();
		const list = data.history || [];

		if (list.length === 0) {
			ul.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">순찰 이력 없음</li>';
			{uniqueID}_status.setWarn('이력 없음');
			return;
		}

		ul.innerHTML = '';
		list.forEach(h => {
			const li = document.createElement('li');
			li.dataset.id = h.id;
			li.style.cssText = [
				'display:flex',
				'align-items:center',
				'justify-content:space-between',
				'padding:7px 10px',
				'border-radius:6px',
				'margin-bottom:4px',
				'background:#313244',
				'font-size:12px',
				'cursor:pointer',
				'gap:6px',
			].join(';');

			const icon    = {uniqueID}_statusIcon(h.status);
			const dateStr = h.started_at ? h.started_at.slice(0, 16) : '-';
			const wpInfo  = `${h.done_waypoints}/${h.total_waypoints} 지점`;
			const statusLabel = {
				completed: '완료', stopped: '중단', error: '오류', running: '진행중'
			}[h.status] || h.status;

			li.innerHTML =
				`<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">` +
					`${icon} ${dateStr} &nbsp; <span style="color:#89b4fa;">${wpInfo}</span>` +
					` &nbsp; <span style="color:#a6e3a1;font-size:11px;">${statusLabel}</span>` +
				`</span>` +
				`<button class="{uniqueID}_del_btn" style="background:#f38ba8;color:#1e1e2e;padding:3px 8px;font-size:11px;border:none;border-radius:4px;cursor:pointer;flex-shrink:0;">삭제</button>`;

			ul.appendChild(li);
		});

		{uniqueID}_status.setOK();

	} catch (e) {
		ul.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">서버 연결 실패</li>';
		{uniqueID}_log('오류: ' + e.message, '#f38ba8');
		{uniqueID}_status.setError('patrol_api 미연결');
	}
}

// ── 이력 상세 로드 ───────────────────────────────────────────
async function {uniqueID}_loadDetail(id) {
	{uniqueID}_showDetail();
	const detailList = document.getElementById("{uniqueID}_detail_list");
	const detailHeader = document.getElementById("{uniqueID}_detail_header");
	detailList.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">로딩 중...</li>';
	detailHeader.innerHTML = '';

	try {
		const res  = await fetch({uniqueID}_API + '/api/patrol/history/' + id);
		const data = await res.json();

		// 헤더
		const statusLabel = {
			completed: '완료', stopped: '중단', error: '오류', running: '진행중'
		}[data.status] || data.status;
		const icon = {uniqueID}_statusIcon(data.status);
		const startTime = data.started_at ? data.started_at.slice(11, 19) : '-';
		const endTime   = data.finished_at ? data.finished_at.slice(11, 19) : '-';

		detailHeader.innerHTML =
			`<div style="margin-bottom:4px;font-weight:bold;color:#cdd6f4;">${icon} ${data.started_at ? data.started_at.slice(0, 16) : id}</div>` +
			`<div style="color:#6c7086;">상태: <span style="color:#a6e3a1;">${statusLabel}</span>` +
			` &nbsp;|&nbsp; 시작: ${startTime} &nbsp;|&nbsp; 종료: ${endTime}` +
			` &nbsp;|&nbsp; ${data.loop ? '🔁 반복' : '1회'}</div>`;

		// 웨이포인트 목록
		const waypoints = data.waypoints || [];
		if (waypoints.length === 0) {
			detailList.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">웨이포인트 기록 없음</li>';
			return;
		}

		detailList.innerHTML = '';
		waypoints.forEach(wp => {
			const li = document.createElement('li');
			li.style.cssText = [
				'padding:7px 10px',
				'border-radius:6px',
				'margin-bottom:4px',
				'background:#181825',
				'font-size:12px',
			].join(';');

			const timeStr = wp.arrived_at ? wp.arrived_at.slice(11, 19) : '-';
			const name    = wp.name || `WP#${wp.index}`;
			// 미션 결과 렌더링
			const results = wp.script_result?.results || [];
			let optionsHtml = '';

			if (results.length === 0) {
				optionsHtml = '<span style="color:#6c7086;">없음</span>';
			} else {
				optionsHtml = results.map(r => {
					const label   = {uniqueID}_optionLabel(r.option);
					const icon    = r.success ? '✅' : '❌';
					const color   = r.success ? '#a6e3a1' : '#f38ba8';
					// 실패 이유 — output 첫 줄 또는 reason 필드
					let reason = '';
					if (!r.success) {
						reason = r.reason
							|| (r.output ? r.output.split('\n').find(l => l.trim()) || '' : '');
						// 너무 길면 자르기
						if (reason.length > 40) reason = reason.slice(0, 40) + '…';
						reason = ` &nbsp;<span style="color:#6c7086;font-size:10px;">${reason}</span>`;
					}
					return `<div style="color:${color};">${icon} ${label}${reason}</div>`;
				}).join('');
			}

			li.innerHTML =
				`<div style="display:flex;justify-content:space-between;margin-bottom:3px;">` +
					`<span style="color:#89b4fa;font-weight:bold;">WP#${wp.index} "${name}"</span>` +
					`<span style="color:#6c7086;">${timeStr}</span>` +
				`</div>` +
				`<div style="color:#cdd6f4;font-size:11px;margin-bottom:4px;">` +
					`x=${wp.x?.toFixed(2)} y=${wp.y?.toFixed(2)}` +
				`</div>` +
				`<div style="font-size:11px;">${optionsHtml}</div>`;

			detailList.appendChild(li);
		});

	} catch (e) {
		detailList.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">로드 실패</li>';
		{uniqueID}_log('오류: ' + e.message, '#f38ba8');
	}
}

// ── 이력 삭제 ────────────────────────────────────────────────
async function {uniqueID}_deleteHistory(id, li) {
	if (!confirm(`이 순찰 이력을 삭제하시겠습니까?\n(${id})`)) return;
	try {
		const res  = await fetch({uniqueID}_API + '/api/patrol/history/' + id, { method: 'DELETE' });
		const data = await res.json();
		if (data.success && li) li.remove();
		{uniqueID}_log(data.success ? '삭제 완료' : '삭제 실패', data.success ? '#a6e3a1' : '#f38ba8');
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message, '#f38ba8');
	}
}

// ── 이벤트 바인딩 ────────────────────────────────────────────
document.getElementById("{uniqueID}_btn_refresh").addEventListener('click', {uniqueID}_loadList);
document.getElementById("{uniqueID}_btn_back").addEventListener('click', () => {
	{uniqueID}_showList();
	{uniqueID}_loadList();
});

// 목록 클릭 — 행 클릭 시 상세, 삭제 버튼 클릭 시 삭제
document.getElementById("{uniqueID}_list").addEventListener('click', e => {
	const li = e.target.closest('li[data-id]');
	if (!li) return;
	const id = li.dataset.id;
	if (e.target.classList.contains('{uniqueID}_del_btn')) {
		{uniqueID}_deleteHistory(id, li);
	} else {
		{uniqueID}_loadDetail(id);
	}
});

// 초기 로드
{uniqueID}_loadList();

console.log("PatrolHistory Widget Loaded {uniqueID}");
