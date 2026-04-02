let persistentModule = await import(`${base_url}/js/modules/persistent.js`);
let StatusModule = await import(`${base_url}/js/modules/status.js`);
let settings = persistentModule.settings;
let Status = StatusModule.Status;

const {uniqueID}_API = 'http://' + window.location.hostname + ':8080';

const {uniqueID}_status = new Status(
	document.getElementById("{uniqueID}_icon"),
	document.getElementById("{uniqueID}_status")
);

function {uniqueID}_log(msg) {
	document.getElementById("{uniqueID}_log").textContent = msg;
}

function {uniqueID}_setBadge(state) {
	const badge = document.getElementById("{uniqueID}_badge");
	badge.textContent = state;
	const colors = { exploring: ['#a6e3a1','#1e1e2e'], saving: ['#fab387','#1e1e2e'], error: ['#f38ba8','#1e1e2e'] };
	const c = colors[state] || ['#45475a','#cdd6f4'];
	badge.style.background = c[0];
	badge.style.color = c[1];
	const isExploring = state === 'exploring';
	document.getElementById("{uniqueID}_btn_start").disabled = isExploring;
	document.getElementById("{uniqueID}_btn_stop").disabled  = !isExploring;
}

async function {uniqueID}_startMapping() {
	{uniqueID}_log('맵핑 시작 요청 중...');
	try {
		const res = await fetch({uniqueID}_API + '/api/mapping/start', { method: 'POST' });
		const data = await res.json();
		{uniqueID}_log(data.message || (data.success ? '시작됨' : '실패'));
		if (data.success) {uniqueID}_setBadge('exploring');
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message);
		{uniqueID}_setBadge('error');
	}
}

async function {uniqueID}_stopMapping() {
	{uniqueID}_log('맵핑 중지 요청 중...');
	try {
		const res = await fetch({uniqueID}_API + '/api/mapping/stop', { method: 'POST' });
		const data = await res.json();
		{uniqueID}_log(data.message || (data.success ? '중지됨' : '실패'));
		if (data.success) {uniqueID}_setBadge('idle');
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message);
	}
}

async function {uniqueID}_saveMap() {
	const name = document.getElementById("{uniqueID}_map_name").value.trim();
	if (!name) { {uniqueID}_log('맵 이름을 입력하세요'); return; }
	{uniqueID}_log('저장 중: ' + name);
	try {
		const res = await fetch({uniqueID}_API + '/api/map/save', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		});
		const data = await res.json();
		{uniqueID}_log(data.message || (data.success ? '저장 완료' : '저장 실패'));
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message);
	}
}

async function {uniqueID}_pollStatus() {
	try {
		const res = await fetch({uniqueID}_API + '/api/status');
		if (!res.ok) return;
		const data = await res.json();
		{uniqueID}_setBadge(data.explore_status?.state ?? 'idle');
		{uniqueID}_status.setOK();
	} catch (_) {
		{uniqueID}_status.setWarn('patrol_api 미연결');
	}
}

document.getElementById("{uniqueID}_btn_start").addEventListener('click', {uniqueID}_startMapping);
document.getElementById("{uniqueID}_btn_stop").addEventListener('click',  {uniqueID}_stopMapping);
document.getElementById("{uniqueID}_btn_save").addEventListener('click',  {uniqueID}_saveMap);

setInterval({uniqueID}_pollStatus, 3000);
{uniqueID}_pollStatus();

console.log("AutoMapping Widget Loaded {uniqueID}");
