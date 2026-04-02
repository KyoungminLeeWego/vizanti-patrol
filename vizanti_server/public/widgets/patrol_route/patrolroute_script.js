let persistentModule = await import(`${base_url}/js/modules/persistent.js`);
let StatusModule = await import(`${base_url}/js/modules/status.js`);
let settings = persistentModule.settings;
let Status = StatusModule.Status;

const {uniqueID}_API = 'http://' + window.location.hostname + ':8080';
const {uniqueID}_STORAGE_KEY = 'patrol_route_{uniqueID}';

const {uniqueID}_status = new Status(
	document.getElementById("{uniqueID}_icon"),
	document.getElementById("{uniqueID}_status")
);

let {uniqueID}_waypoints = [];

function {uniqueID}_log(msg) {
	document.getElementById("{uniqueID}_log").textContent = msg;
}

function {uniqueID}_renderList() {
	const ul = document.getElementById("{uniqueID}_wp_list");
	if ({uniqueID}_waypoints.length === 0) {
		ul.innerHTML = '<li style="font-size:12px;color:#6c7086;text-align:center;padding:14px 0;">웨이포인트 없음</li>';
		return;
	}
	ul.innerHTML = '';
	{uniqueID}_waypoints.forEach((wp, i) => {
		const li = document.createElement('li');
		li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:#313244;border-radius:5px;margin-bottom:3px;font-size:12px;';
		li.dataset.index = i;
		li.innerHTML =
			'<span style="color:#6c7086;margin-right:6px;flex-shrink:0;">#' + (i + 1) + '</span>' +
			'<span style="flex:1;font-family:monospace;">x=' + wp.x.toFixed(2) + '  y=' + wp.y.toFixed(2) + '  yaw=' + wp.yaw.toFixed(2) + '</span>' +
			'<button class="{uniqueID}_del_wp" style="background:#f38ba8;color:#1e1e2e;padding:2px 7px;font-size:11px;border:none;border-radius:5px;cursor:pointer;">✕</button>';
		ul.appendChild(li);
	});
}

function {uniqueID}_addWaypoint() {
	const x   = parseFloat(document.getElementById("{uniqueID}_wp_x").value);
	const y   = parseFloat(document.getElementById("{uniqueID}_wp_y").value);
	const yaw = parseFloat(document.getElementById("{uniqueID}_wp_yaw").value) || 0;
	if (isNaN(x) || isNaN(y)) { {uniqueID}_log('x, y 값을 입력하세요'); return; }
	{uniqueID}_waypoints.push({ x, y, yaw });
	{uniqueID}_renderList();
	{uniqueID}_log('#' + {uniqueID}_waypoints.length + ' 추가됨 (' + x + ', ' + y + ')');
}

async function {uniqueID}_startPatrol() {
	if ({uniqueID}_waypoints.length === 0) { {uniqueID}_log('웨이포인트가 없습니다'); return; }
	const loop = document.getElementById("{uniqueID}_loop").checked;
	{uniqueID}_log('순찰 시작 요청 중...');
	try {
		const res = await fetch({uniqueID}_API + '/api/waypoints', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ points: {uniqueID}_waypoints, loop }),
		});
		const data = await res.json();
		{uniqueID}_log(data.message || (data.success ? '순찰 시작' : '실패'));
		{uniqueID}_status.setOK();
	} catch (e) {
		{uniqueID}_log('오류: ' + e.message);
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
		{uniqueID}_log('오류: ' + e.message);
	}
}

function {uniqueID}_saveRoute() {
	localStorage.setItem({uniqueID}_STORAGE_KEY, JSON.stringify({uniqueID}_waypoints));
	{uniqueID}_log({uniqueID}_waypoints.length + '개 웨이포인트 저장됨');
}

function {uniqueID}_loadRoute() {
	const raw = localStorage.getItem({uniqueID}_STORAGE_KEY);
	if (!raw) { {uniqueID}_log('저장된 경로 없음'); return; }
	try {
		{uniqueID}_waypoints = JSON.parse(raw);
		{uniqueID}_renderList();
		{uniqueID}_log({uniqueID}_waypoints.length + '개 웨이포인트 불러옴');
	} catch (e) {
		{uniqueID}_log('불러오기 실패: 데이터 손상');
	}
}

function {uniqueID}_clearAll() {
	{uniqueID}_waypoints = [];
	{uniqueID}_renderList();
	{uniqueID}_log('전체 삭제됨');
}

document.getElementById("{uniqueID}_btn_add").addEventListener('click',   {uniqueID}_addWaypoint);
document.getElementById("{uniqueID}_btn_start").addEventListener('click', {uniqueID}_startPatrol);
document.getElementById("{uniqueID}_btn_stop").addEventListener('click',  {uniqueID}_stopPatrol);
document.getElementById("{uniqueID}_btn_save").addEventListener('click',  {uniqueID}_saveRoute);
document.getElementById("{uniqueID}_btn_load").addEventListener('click',  {uniqueID}_loadRoute);
document.getElementById("{uniqueID}_btn_clear").addEventListener('click', {uniqueID}_clearAll);

document.getElementById("{uniqueID}_wp_list").addEventListener('click', e => {
	if (!e.target.classList.contains('{uniqueID}_del_wp')) return;
	const li = e.target.closest('li[data-index]');
	if (!li) return;
	const idx = parseInt(li.dataset.index);
	{uniqueID}_waypoints.splice(idx, 1);
	{uniqueID}_renderList();
	{uniqueID}_log('#' + (idx + 1) + ' 삭제됨');
});

{uniqueID}_renderList();

console.log("PatrolRoute Widget Loaded {uniqueID}");
