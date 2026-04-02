let rosbridgeModule = await import(`${base_url}/js/modules/rosbridge.js`);
let StatusModule = await import(`${base_url}/js/modules/status.js`);
let rosbridge = rosbridgeModule.rosbridge;
let Status = StatusModule.Status;

const {uniqueID}_status = new Status(
	document.getElementById("{uniqueID}_icon"),
	document.getElementById("{uniqueID}_status")
);

let {uniqueID}_listener = undefined;
let {uniqueID}_topic = undefined;

function {uniqueID}_updateUI(data) {
	const fmt = v => (v !== undefined && v !== null) ? v : '—';

	document.getElementById("{uniqueID}_state").textContent    = fmt(data.state);
	document.getElementById("{uniqueID}_frontier").textContent = fmt(data.frontier_count);

	const gx = data.current_goal?.x?.toFixed(2) ?? '—';
	const gy = data.current_goal?.y?.toFixed(2) ?? '—';
	document.getElementById("{uniqueID}_goal").textContent = '(' + gx + ', ' + gy + ')';

	const sec = data.elapsed_sec ?? 0;
	const mm  = String(Math.floor(sec / 60)).padStart(2, '0');
	const ss  = String(sec % 60).padStart(2, '0');
	document.getElementById("{uniqueID}_elapsed").textContent = mm + ':' + ss;

	const pct = (data.progress_pct ?? 0).toFixed(1);
	document.getElementById("{uniqueID}_pct").textContent  = pct + '%';
	document.getElementById("{uniqueID}_bar").style.width  = pct + '%';
}

function {uniqueID}_connect() {
	if ({uniqueID}_topic !== undefined) {
		{uniqueID}_topic.unsubscribe({uniqueID}_listener);
	}

	{uniqueID}_topic = new ROSLIB.Topic({
		ros: rosbridge.ros,
		name: '/explore/status',
		messageType: 'std_msgs/msg/String',
		throttle_rate: 1000,
		compression: rosbridge.compression
	});

	{uniqueID}_status.setWarn('데이터 수신 대기 중');

	{uniqueID}_listener = {uniqueID}_topic.subscribe(msg => {
		try {
			const data = JSON.parse(msg.data);
			{uniqueID}_updateUI(data);
			{uniqueID}_status.setOK();
		} catch (e) {
			{uniqueID}_status.setError('메시지 파싱 오류');
		}
	});
}

rosbridge.ros.on('connection', {uniqueID}_connect);

if (rosbridge.ros.isConnected) {
	{uniqueID}_connect();
}

console.log("ExplorerStatus Widget Loaded {uniqueID}");
