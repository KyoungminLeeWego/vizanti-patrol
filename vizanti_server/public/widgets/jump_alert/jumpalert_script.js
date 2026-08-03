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
let {uniqueID}_count = 0;

// reason 코드 → 사용자 표시 문구
const {uniqueID}_reasonMap = {
	feature_insufficient:   "특징점 부족",
	reloc_timeout:          "재위치 시간 초과",
	reloc_service_failed:   "재위치 서비스 실패",
	reloc_status_failed:    "재위치 상태 실패",
	reloc_verify_failed:    "재위치 검증 실패",
	device_running_timeout: "기기 실행 시간 초과",
};

function {uniqueID}_getValue(msg, key) {
	if (!msg || !Array.isArray(msg.values)) return undefined;
	const found = msg.values.find(v => v.key === key);
	return found ? found.value : undefined;
}

function {uniqueID}_showToast(reasonCode, message) {
	const container = document.getElementById("{uniqueID}_toast_container");
	if (!container) return;

	const reasonText = {uniqueID}_reasonMap[reasonCode] || reasonCode || "알 수 없음";

	const toast = document.createElement("div");
	toast.style.cssText = [
		"pointer-events:auto",
		"background:#1e1e2e",
		"border:1px solid #f38ba8",
		"border-left:5px solid #f38ba8",
		"border-radius:8px",
		"padding:12px 14px",
		"box-shadow:0 4px 16px rgba(0,0,0,0.45)",
		"color:#cdd6f4",
		"font-size:13px",
		"line-height:1.5",
		"opacity:0",
		"transform:translateX(20px)",
		"transition:opacity 0.25s ease, transform 0.25s ease",
	].join(";");

	const title = document.createElement("div");
	title.style.cssText = "font-weight:700;color:#f38ba8;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;";
	const titleText = document.createElement("span");
	titleText.textContent = "⚠ 로봇 정지 — 수동 개입 필요";
	const closeBtn = document.createElement("span");
	closeBtn.textContent = "✕";
	closeBtn.style.cssText = "cursor:pointer;color:#6c7086;font-weight:400;margin-left:10px;";
	closeBtn.onclick = () => {uniqueID}_dismiss(toast);
	title.appendChild(titleText);
	title.appendChild(closeBtn);

	const body = document.createElement("div");
	body.innerHTML = "<b>사유:</b> " + reasonText;
	if (message) {
		const raw = document.createElement("div");
		raw.style.cssText = "color:#6c7086;font-size:11px;margin-top:4px;word-break:break-all;";
		raw.textContent = message;
		body.appendChild(raw);
	}

	toast.appendChild(title);
	toast.appendChild(body);
	container.appendChild(toast);

	// 진입 애니메이션
	requestAnimationFrame(() => {
		toast.style.opacity = "1";
		toast.style.transform = "translateX(0)";
	});

	// 8초 후 자동 소멸
	setTimeout(() => {uniqueID}_dismiss(toast), 8000);
}

function {uniqueID}_dismiss(toast) {
	if (!toast || !toast.isConnected) return;
	toast.style.opacity = "0";
	toast.style.transform = "translateX(20px)";
	setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
}

function {uniqueID}_handle(msg) {
	const reason = {uniqueID}_getValue(msg, "reason");
	{uniqueID}_showToast(reason, msg.message);

	{uniqueID}_count++;
	document.getElementById("{uniqueID}_count").textContent  = {uniqueID}_count;
	document.getElementById("{uniqueID}_reason").textContent = {uniqueID}_reasonMap[reason] || reason || "—";
	document.getElementById("{uniqueID}_last").textContent   = new Date().toLocaleTimeString();
}

function {uniqueID}_connect() {
	if ({uniqueID}_topic !== undefined) {
		{uniqueID}_topic.unsubscribe({uniqueID}_listener);
	}

	{uniqueID}_topic = new ROSLIB.Topic({
		ros: rosbridge.ros,
		name: '/jump_recovery_alert',
		messageType: 'diagnostic_msgs/msg/DiagnosticStatus',
		compression: rosbridge.compression
	});

	{uniqueID}_status.setOK("구독 중");

	{uniqueID}_listener = {uniqueID}_topic.subscribe(msg => {
		try {
			{uniqueID}_handle(msg);
			{uniqueID}_status.setOK("최근 알림 수신");
		} catch (e) {
			{uniqueID}_status.setError('메시지 파싱 오류');
			console.error("JumpAlert parse error", e);
		}
	});
}

// 테스트 버튼 — 로봇 없이 토스트 확인
document.getElementById("{uniqueID}_test").addEventListener("click", () => {
	{uniqueID}_handle({
		message: "robot stopped, manual intervention required (feature_insufficient)",
		values: [
			{ key: "reason", value: "feature_insufficient" },
			{ key: "feature_count", value: "300" },
		],
	});
});

rosbridge.ros.on('connection', {uniqueID}_connect);

if (rosbridge.ros.isConnected) {
	{uniqueID}_connect();
}

console.log("JumpAlert Widget Loaded {uniqueID}");
