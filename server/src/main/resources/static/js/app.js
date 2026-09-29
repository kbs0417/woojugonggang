const $ = (s) => document.querySelector(s);
const icons = { 학습: "📚", 운동: "🏃", 동아리: "👥", 취미: "🎨" };
const days = ["월", "화", "수", "목", "금"], hours = Array.from({ length: 9 }, (_, i) => i + 9);
const API = window.WOOJOO_API_URL || "";
let user = readUser(), courses = [], posts = [], rooms = [], messages = [];
let category = "전체", selected = new Set(), postId = null, roomId = null, chatTimer;

function readUser() { try { return JSON.parse(sessionStorage.getItem("woojoo-user")); } catch { return null; } }
function esc(v) { return String(v).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]); }
async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (user?.username) headers["X-User-Name"] = user.username;
    const response = await fetch(API + path, { ...options, headers });
    if (!response.ok) {
        let message = `요청 실패 (${response.status})`;
        try { const body = await response.json(); message = body.detail || body.message || message; } catch { /* empty */ }
        throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
}
function fail(error) { console.error(error); alert(error.message || "서버 연결을 확인해 주세요."); }

async function start() {
    try {
        [user, courses, posts, rooms] = await Promise.all([request("/api/users/me"), request("/api/courses"), request("/api/posts"), request("/api/chat-rooms")]);
        sessionStorage.setItem("woojoo-user", JSON.stringify(user));
        $("#loginScreen").hidden = true; $("#appShell").hidden = false;
        $("#profileButton").textContent = user.displayName; $("#welcomeText").textContent = `${user.displayName}님의 오늘의 공강`;
        $("#profileForm input[disabled]").value = user.displayName; $(".profile-avatar").textContent = user.displayName[0];
        loadProfile(); renderPosts(); renderCourses(); renderRooms();
    } catch (error) {
        sessionStorage.removeItem("woojoo-user"); user = null; $("#loginScreen").hidden = false; $("#appShell").hidden = true;
        $("#loginError").textContent = "서버를 실행한 후 다시 로그인해 주세요.";
    }
}
$("#loginForm").addEventListener("submit", async e => {
    e.preventDefault(); $("#loginError").textContent = "";
    try {
        user = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: $("#username").value.trim(), password: $("#password").value }) });
        sessionStorage.setItem("woojoo-user", JSON.stringify(user)); await start();
    } catch (error) { user = null; $("#loginError").textContent = error.message; }
});

function full(p) { return p.current >= p.capacity; }
function renderPosts() {
    const q = $("#postSearch").value.trim().toLowerCase(), type = $("#matchTypeFilter").value, day = $("#postDayFilter").value;
    const list = posts.filter(p => category === "전체" || p.category === category).filter(p => type === "전체" || p.matchType === type)
        .filter(p => day === "전체" || p.day === day).filter(p => !$("#openOnlyFilter").checked || !full(p))
        .filter(p => !q || p.tags.some(t => t.toLowerCase().includes(q))).sort((a, b) => b.createdAt - a.createdAt);
    $("#meetupList").innerHTML = list.map(p => `<button class="meetup-card" type="button" data-post="${p.id}">
        <div class="meetup-meta"><span>${icons[p.category] || "✨"} ${esc(p.category)} · ${esc(p.matchType)} 매칭</span><span class="visibility-badge ${full(p) ? "private" : ""}">${full(p) ? "비공개 · 마감" : "공개 · 모집중"}</span></div>
        <h3>${esc(p.title)}</h3><span class="post-author">작성자 ${esc(p.author)} · ${esc(p.time)}</span>
        <div class="post-tags">${p.tags.map(t => `<span>#${esc(t)}</span>`).join("")}</div>
        <div class="meetup-footer"><span>📍 ${esc(p.place)}</span><span class="spots">${p.current} / ${p.capacity}명</span></div></button>`).join("");
    $("#postEmpty").hidden = list.length > 0;
}
document.querySelectorAll(".category").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(b => b.classList.remove("active")); button.classList.add("active"); category = button.dataset.category; renderPosts();
}));
["#postSearch", "#matchTypeFilter", "#postDayFilter", "#openOnlyFilter"].forEach(s => $(s).addEventListener("input", renderPosts));
$("#meetupList").addEventListener("click", e => { const card = e.target.closest("[data-post]"); if (card) openPost(Number(card.dataset.post)); });
function openPost(id) {
    const p = posts.find(item => item.id === id); if (!p) return; postId = id; roomId = p.roomId;
    $("#meetupDetailCategory").textContent = `${icons[p.category] || "✨"} ${p.category} · ${full(p) ? "비공개" : "공개"}`;
    $("#meetupDetailTitle").textContent = p.title; $("#meetupDetailTime").textContent = `🕒 ${p.time}`; $("#meetupDetailPlace").textContent = `📍 ${p.place}`;
    $("#meetupDetailMembers").textContent = `👥 ${p.current} / ${p.capacity}명`; $("#meetupDetailTags").innerHTML = p.tags.map(t => `<span>#${esc(t)}</span>`).join("");
    $("#meetupDetailConditions").innerHTML = `<span>${esc(p.grade)}</span><span>${esc(p.department)}</span><span>${p.day}요일</span><span>${esc(p.matchType)} 매칭</span>`;
    $("#meetupDetailDescription").textContent = p.description; $("#meetupDetailAuthor").textContent = p.author; $("#hostAvatar").textContent = p.author[0];
    postButtons(p); $("#meetupDialog").showModal();
}
function postButtons(p) {
    const button = $("#joinMeetupButton"), member = p.owner || p.joined;
    button.disabled = p.owner || (full(p) && !member); button.textContent = p.owner ? "내가 만든 모집" : p.joined ? "참여 취소" : full(p) ? "모집 마감" : "참여하기";
    button.classList.toggle("secondary", member); button.classList.toggle("primary", !member); $("#meetupChatButton").hidden = !member;
}
$("#joinMeetupButton").addEventListener("click", async () => {
    const p = posts.find(item => item.id === postId); if (!p || p.owner) return;
    try {
        const changed = await request(`/api/posts/${p.id}/participants${p.joined ? "/me" : ""}`, { method: p.joined ? "DELETE" : "POST" });
        posts = posts.map(item => item.id === changed.id ? changed : item); postButtons(changed); $("#meetupDetailMembers").textContent = `👥 ${changed.current} / ${changed.capacity}명`;
        await refreshRooms(); renderPosts();
    } catch (error) { fail(error); }
});
$("#closeMeetupDialog").addEventListener("click", () => $("#meetupDialog").close());
$("#meetupChatButton").addEventListener("click", () => { $("#meetupDialog").close(); openRoom(roomId); });

async function refreshRooms() { rooms = await request("/api/chat-rooms"); renderRooms(); }
function roomPost(id) { return rooms.find(p => p.roomId === id) || posts.find(p => p.roomId === id); }
function renderRooms() {
    const unique = [...new Map(rooms.map(p => [p.roomId, p])).values()];
    $("#chatRoomList").innerHTML = unique.length ? unique.map(p => `<button class="chat-room" type="button" data-room="${p.roomId}"><span class="chat-room-icon">${icons[p.category] || "✨"}</span><span class="chat-room-copy"><strong>${esc(p.title)}</strong><span>${esc(p.time)} · ${esc(p.place)}</span></span><span class="chat-room-arrow">›</span></button>`).join("") : `<div class="compact-empty"><strong>참여한 모임이 없습니다.</strong><span>모집글에서 참여해 보세요.</span></div>`;
}
$("#chatRoomList").addEventListener("click", e => { const button = e.target.closest("[data-room]"); if (button) openRoom(Number(button.dataset.room)); });
async function openRoom(id) {
    const p = roomPost(id); if (!p) return; roomId = id; $("#chatDialogTitle").textContent = p.title;
    $("#promoteRoomButton").disabled = !p.owner; $("#promoteRoomButton").textContent = p.owner ? "모집공고 올리기" : "방장만 게시 가능";
    try { await refreshMessages(); $("#chatDialog").showModal(); clearInterval(chatTimer); chatTimer = setInterval(() => $("#chatDialog").open && refreshMessages().catch(console.error), 3000); } catch (error) { fail(error); }
}
async function refreshMessages() { messages = await request(`/api/chat-rooms/${roomId}/messages`); renderMessages(); }
function renderMessages() {
    $("#messageList").innerHTML = messages.length ? messages.map(m => `<div class="message ${m.mine ? "mine" : ""}"><small>${esc(m.sender)}</small>${esc(m.text)}</div>`).join("") : `<div class="compact-empty"><span>첫 메시지를 보내보세요.</span></div>`;
    $("#messageList").scrollTop = $("#messageList").scrollHeight;
}
$("#messageForm").addEventListener("submit", async e => {
    e.preventDefault(); const text = $("#messageInput").value.trim(); if (!text) return;
    try { await request(`/api/chat-rooms/${roomId}/messages`, { method: "POST", body: JSON.stringify({ text }) }); $("#messageInput").value = ""; await refreshMessages(); } catch (error) { fail(error); }
});
$("#closeChatDialog").addEventListener("click", () => { $("#chatDialog").close(); clearInterval(chatTimer); });
$("#promoteRoomButton").addEventListener("click", () => {
    const p = roomPost(roomId); if (!p?.owner) return; $("#newPostCategory").value = p.category; $("#newPostTitle").value = `${p.title} 추가 모집`;
    $("#newPostTags").value = p.tags.join(", "); $("#newPostCapacity").value = String(p.capacity); $("#chatDialog").close(); clearInterval(chatTimer); $("#postDialog").showModal();
});
$("#closePostDialog").addEventListener("click", () => $("#postDialog").close());
$("#postForm").addEventListener("submit", async e => {
    e.preventDefault(); const p = roomPost(roomId), tags = $("#newPostTags").value.split(",").map(t => t.trim()).filter(Boolean);
    if (!p || !tags.length) { $("#postError").textContent = "태그를 한 개 이상 입력해 주세요."; return; }
    try {
        await request("/api/posts", { method: "POST", body: JSON.stringify({ category: $("#newPostCategory").value, title: $("#newPostTitle").value.trim(), tags, description: p.description, place: p.place, day: p.day, hour: p.hour, capacity: Number($("#newPostCapacity").value), grade: p.grade, department: p.department, matchType: p.matchType, roomId }) });
        $("#postDialog").close(); await refreshPosts(); await refreshRooms(); $("#meetups").scrollIntoView({ behavior: "smooth" });
    } catch (error) { $("#postError").textContent = error.message; }
});

const slotKey = (day, hour) => `${day}-${hour}`, time = hour => `${String(hour).padStart(2, "0")}:00`;
const gridHead = () => `<div class="grid-head">시간</div>${days.map(day => `<div class="grid-head">${day}</div>`).join("")}`;
function renderCourses() {
    $("#timetableGrid").innerHTML = gridHead() + hours.map(hour => `<div class="time-label">${time(hour)}</div>${days.map(day => { const used = courses.some(c => c.day === day && c.hour === hour); return `<div class="schedule-cell ${used ? "has-class" : ""}" title="${used ? "수업" : "공강"}"><span>${used ? "■" : ""}</span></div>`; }).join("")}`).join("");
}
function renderPicker() {
    $("#slotPicker").innerHTML = gridHead() + hours.map(hour => `<div class="time-label">${time(hour)}</div>${days.map(day => { const on = selected.has(slotKey(day, hour)); return `<button class="slot-cell ${on ? "selected" : ""}" type="button" data-day="${day}" data-hour="${hour}" aria-pressed="${on}">${on ? "■" : ""}</button>`; }).join("")}`).join("");
}
function editCourses() { selected = new Set(courses.map(c => slotKey(c.day, c.hour))); $("#classError").textContent = ""; renderPicker(); $("#classDialog").showModal(); }
$("#addClassButton").addEventListener("click", editCourses); $(".floating-button").addEventListener("click", editCourses);
$("#closeClassDialog").addEventListener("click", () => $("#classDialog").close()); $("#cancelClassButton").addEventListener("click", () => $("#classDialog").close());
$("#slotPicker").addEventListener("click", e => { const cell = e.target.closest(".slot-cell"); if (!cell) return; const key = slotKey(cell.dataset.day, Number(cell.dataset.hour)); selected.has(key) ? selected.delete(key) : selected.add(key); renderPicker(); });
$("#classForm").addEventListener("submit", async e => {
    e.preventDefault(); const body = [...selected].map(key => { const [day, hour] = key.split("-"); return { day, hour: Number(hour) }; });
    try { courses = await request("/api/courses", { method: "PUT", body: JSON.stringify(body) }); $("#classDialog").close(); renderCourses(); } catch (error) { $("#classError").textContent = error.message; }
});

hours.forEach(hour => $("#matchHour").insertAdjacentHTML("beforeend", `<option value="${hour}">${time(hour)}</option>`));
$("#quickMatchForm").addEventListener("submit", e => {
    e.preventDefault(); const values = [$("#matchDay").value + "요일", time(Number($("#matchHour").value)), $("#matchGrade").value ? `${$("#matchGrade").value}학년` : "학년 무관", $("#matchAge").value ? `${$("#matchAge").value}세` : "나이 무관", $("#matchGender").value || "성별 무관", `${$("#matchCapacity").value}명`, $("#matchDepartment").value.trim() || "학과 무관"];
    $("#quickMatchResult").innerHTML = `<strong>실시간 매칭 대기를 시작했습니다.</strong><span>${values.map(esc).join(" · ")}</span><p>같은 조건의 사용자가 모이면 채팅방이 생성됩니다.</p>`; $("#quickMatchResult").hidden = false;
});
function loadProfile() { $("#profileAge").value = user.age || ""; $("#profileGender").value = user.gender || ""; $("#profileDepartment").value = user.department || ""; $("#profileGrade").value = user.grade || ""; }
$("#profileForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        user = await request("/api/users/me", { method: "PATCH", body: JSON.stringify({ age: $("#profileAge").value ? Number($("#profileAge").value) : null, gender: $("#profileGender").value, department: $("#profileDepartment").value.trim(), grade: $("#profileGrade").value }) });
        sessionStorage.setItem("woojoo-user", JSON.stringify(user)); $("#profileSaveMessage").textContent = "저장되었습니다."; setTimeout(() => $("#profileSaveMessage").textContent = "", 2000);
    } catch (error) { fail(error); }
});
$("#profileButton").addEventListener("click", () => $("#profile").scrollIntoView({ behavior: "smooth" }));
async function refreshPosts() { posts = await request("/api/posts"); renderPosts(); }
setInterval(() => { if (user && !document.hidden) { refreshPosts().catch(console.error); refreshRooms().catch(console.error); } }, 10000);
if (user?.username) start();
