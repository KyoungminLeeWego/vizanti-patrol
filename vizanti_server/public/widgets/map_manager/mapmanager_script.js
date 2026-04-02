let StatusModule = await import(`${base_url}/js/modules/status.js`);
let Status = StatusModule.Status;

const {uniqueID}_API = 'http://' + window.location.hostname + ':8080';

const {uniqueID}_status = new Status(
	document.getElementById("{uniqueID}_icon"),
	document.getElementById("{uniqueID}_status")
);

function {uniqueID}_log(msg) {
	document.getElementById("{uniqueID}_log").textContent = msg;
}

function {uniqueID}_setListHTML(html) {
	document.getElementById("{uniqueID}_list").innerHTML = html;
}

async function {uniqueID}_loadMapList() {
	{uniqueID}_setListHTML('<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">로딩 중...</li>');
	{uniqueID}_log('');
	try {
		const res  = await fetch({uniqueID}_API + '/api/maps');
		const data = await res.json();
		const maps = data.maps || [];

		if (maps.length === 0) {
			{uniqueID}_setListHTML('<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">저장된 맵 없음</li>');
			{uniqueID}_status.setWarn('맵 없음');
			return;
		}

		const ul = document.getElementById("{uniqueID}_list");
		ul.innerHTML = '';
		maps.forEach(name => {
			const li = document.createElement('li');
			li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 8px;border-radius:6px;margin-bottom:4px;background:#313244;font-size:13px;';
			li.dataset.mapname = name;
			li.innerHTML =
				'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + name + '">' + name + '</span>' +
				'<span style="display:flex;gap:4px;flex-shrink:0;">' +
					'<button class="{uniqueID}_load_btn" style="background:#89b4fa;color:#1e1e2e;padding:4px 9px;font-size:11px;border:none;border-radius:6px;cursor:pointer;">로드</button>' +
					'<button class="{uniqueID}_del_btn"  style="background:#f38ba8;color:#1e1e2e;padding:4px 9px;font-size:11px;border:none;border-radius:6px;cursor:pointer;">삭제</button>' +
				'</span>';
			ul.appendChild(li);
		});
		{uniqueID}_status.setOK();
	} catch (e) {
		{uniqueID}_setListHTML('<li style="font-size:12px;color:#6c7086;text-align:center;padding:20px 0;">서버 연결 실패</li>');
		{uniqueID}_log('오류: ' + e.message);
		{uniqueID}_status.setError('patrol_api 미연결');
	}
}

async function {uniqueID}_loadMap(name) {
	{uniqueID}_log(name + ' 로드 중...');
	try {
		const res  = await fetch({uniqueID}_API + '/api/map/load', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		});
		const data = await res.json();
		{uniqueID}_log(data.message || (data.success ? '로드 완료' : '로드 실패'));
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message);
	}
}

async function {uniqueID}_deleteMap(name, li) {
	if (!confirm('"' + name + '" 를 삭제하시겠습니까?\n(~/maps/' + name + '.yaml, .pgm 파일 삭제)')) return;
	{uniqueID}_log(name + ' 삭제 중...');
	try {
		const res  = await fetch({uniqueID}_API + '/api/map', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		});
		const data = await res.json();
		if (data.success && li) li.remove();
		{uniqueID}_log(data.message || (data.success ? '삭제 완료' : '삭제 실패'));
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message);
	}
}

document.getElementById("{uniqueID}_btn_refresh").addEventListener('click', {uniqueID}_loadMapList);

document.getElementById("{uniqueID}_list").addEventListener('click', e => {
	const li = e.target.closest('li[data-mapname]');
	if (!li) return;
	const name = li.dataset.mapname;
	if (e.target.classList.contains('{uniqueID}_load_btn')) {uniqueID}_loadMap(name);
	if (e.target.classList.contains('{uniqueID}_del_btn'))  {uniqueID}_deleteMap(name, li);
});

{uniqueID}_loadMapList();

console.log("MapManager Widget Loaded {uniqueID}");
