const $ = (s) => document.querySelector(s);
const icons = { 학습: "📚", 운동: "🏃", 동아리: "👥", 취미: "🎨" };
const interestDetailsByCategory = {
    학습: ["시험·자격증", "전공 공부", "프로젝트"],
    운동: ["헬스", "러닝", "구기 운동"],
    동아리: ["전공 동아리", "봉사 동아리", "친목 동아리"],
    취미: ["게임", "영화·공연", "맛집·카페"]
};
const interestKeywords = {
    "시험·자격증": ["시험", "자격증"],
    "전공 공부": ["전공", "공부", "스터디", "자료구조"],
    "프로젝트": ["프로젝트", "개발", "포트폴리오", "경진대회"],
    "헬스": ["헬스", "웨이트", "근력"],
    "러닝": ["러닝", "달리기", "조깅"],
    "구기 운동": ["축구", "농구", "야구", "배구", "배드민턴", "테니스", "구기"],
    "전공 동아리": ["전공", "개발동아리", "학술동아리"],
    "봉사 동아리": ["봉사"],
    "친목 동아리": ["친목", "친구", "모임"],
    "게임": ["게임", "보드게임", "e스포츠"],
    "영화·공연": ["영화", "공연", "연극", "뮤지컬"],
    "맛집·카페": ["맛집", "카페", "식사", "디저트"]
};
const days = ["월", "화", "수", "목", "금"], hours = Array.from({ length: 9 }, (_, i) => i + 9);
const API = window.WOOJOO_API_URL || "";
let user = readUser(), courses = [], posts = [], rooms = [], messages = [], noticeItems = [];
let category = "전체", interestDetail = "전체", selected = new Set(), postId = null, roomId = null, chatTimer, statusTimer;
let postMode = "create", editingPostId = null;
const unreadByRoom = new Map();

function readUser() { try { return JSON.parse(localStorage.getItem("woojoo-user") || sessionStorage.getItem("woojoo-user")); } catch { return null; } }
function saveUser(value) { localStorage.setItem("woojoo-user", JSON.stringify(value)); sessionStorage.removeItem("woojoo-user"); }
function clearUser() { localStorage.removeItem("woojoo-user"); sessionStorage.removeItem("woojoo-user"); }
function esc(v) { return String(v).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]); }
function checkedValues(name) { return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value); }
function setCheckedValues(name, values = []) { document.querySelectorAll(`input[name="${name}"]`).forEach(input => input.checked = values.includes(input.value)); }
function checkedInterestCategories(name) { return [...new Set([...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.dataset.category))]; }
function showStatus(message, type = "info", timeout = 2600) {
    clearTimeout(statusTimer); const box = $("#appStatus"); box.textContent = message; box.className = `app-status ${type}`; box.hidden = false;
    if (timeout) statusTimer = setTimeout(() => box.hidden = true, timeout);
}
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
function fail(error) { console.error(error); showStatus(error.message || "서버 연결을 확인해 주세요.", "error", 4500); }

async function start() {
    try {
        [user, courses, posts, rooms, noticeItems] = await Promise.all([request("/api/users/me"), request("/api/courses"), request("/api/posts"), request("/api/chat-rooms"), request("/api/notifications")]);
        saveUser(user);
        $("#loginScreen").hidden = true; $("#appShell").hidden = false;
        $("#profileButton").textContent = user.displayName; $("#welcomeText").textContent = `${user.displayName}님의 오늘의 공강`;
        $("#profileForm input[disabled]").value = user.displayName; $(".profile-avatar").textContent = user.displayName[0];
        loadProfile(); renderInterestFilters(); renderPosts(); renderCourses(); renderRooms(); renderFreeTimes(); renderNotifications(); refreshUnreadCounts();
        requestAnimationFrame(syncNavigationFromScroll);
    } catch (error) {
        clearUser(); user = null; $("#loginScreen").hidden = false; $("#appShell").hidden = true;
        $("#loginError").textContent = "서버를 실행한 후 다시 로그인해 주세요.";
    }
}
$("#loginForm").addEventListener("submit", async e => {
    e.preventDefault(); $("#loginError").textContent = "";
    try {
        user = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: $("#username").value.trim(), password: $("#password").value }) });
        saveUser(user); await start();
    } catch (error) { user = null; $("#loginError").textContent = error.message; }
});

function showAuthForm(mode) {
    const registering = mode === "register";
    $("#loginForm").hidden = registering;
    $("#registerForm").hidden = !registering;
    $("#loginTab").classList.toggle("active", !registering);
    $("#registerTab").classList.toggle("active", registering);
    $("#loginTab").setAttribute("aria-selected", String(!registering));
    $("#registerTab").setAttribute("aria-selected", String(registering));
    $("#loginError").textContent = "";
    $("#registerError").textContent = "";
}
$("#loginTab").addEventListener("click", () => showAuthForm("login"));
$("#registerTab").addEventListener("click", () => showAuthForm("register"));
$("#registerForm").addEventListener("submit", async e => {
    e.preventDefault();
    const password = $("#registerPassword").value;
    $("#registerError").textContent = "";
    if (password !== $("#registerPasswordConfirm").value) {
        $("#registerError").textContent = "비밀번호 확인이 일치하지 않습니다.";
        return;
    }
    try {
        user = await request("/api/auth/register", { method: "POST", body: JSON.stringify({
            displayName: $("#registerName").value.trim(),
            username: $("#registerUsername").value.trim(),
            password,
            age: Number($("#registerAge").value),
            gender: $("#registerGender").value,
            department: $("#registerDepartment").value.trim(),
            interests: checkedInterestCategories("registerInterestDetail"),
            interestDetails: checkedValues("registerInterestDetail")
        }) });
        saveUser(user);
        await start();
    } catch (error) {
        user = null;
        $("#registerError").textContent = error.message;
    }
});
$("#logoutButton").addEventListener("click", () => {
    clearInterval(chatTimer); clearUser(); user = null; courses = []; posts = []; rooms = []; messages = []; noticeItems = [];
    $("#appShell").hidden = true; $("#loginScreen").hidden = false; $("#password").value = ""; showAuthForm("login");
});

const navigationLinks = [...document.querySelectorAll(".desktop-nav a, .mobile-nav a")];
const navigationIds = ["home", "meetups", "chat", "timetable", "profile"];
function activateNavigation(id) {
    const activeId = navigationIds.includes(id) ? id : "home";
    navigationLinks.forEach(link => {
        const active = link.getAttribute("href") === `#${activeId}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
}
function syncNavigationFromScroll() {
    if ($("#appShell").hidden) return;
    let activeId = "home";
    for (const id of ["meetups", "chat", "timetable", "profile"]) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 130) activeId = id;
    }
    activateNavigation(activeId);
}
navigationLinks.forEach(link => link.addEventListener("click", () => activateNavigation(link.hash.slice(1))));
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener("click", () => {
    if (navigationIds.includes(link.hash.slice(1))) activateNavigation(link.hash.slice(1));
}));
window.addEventListener("hashchange", () => activateNavigation(location.hash.slice(1)));
window.addEventListener("scroll", syncNavigationFromScroll, { passive: true });
activateNavigation(location.hash.slice(1));

function full(p) { return p.current >= p.capacity; }
function normalizedPostText(p) {
    return [p.title, p.description, ...(p.tags || [])].join(" ").toLowerCase().replace(/\s+/g, "");
}
function matchesInterestDetail(p, detail) {
    const text = normalizedPostText(p);
    return (interestKeywords[detail] || [detail]).some(keyword => text.includes(keyword.toLowerCase().replace(/\s+/g, "")));
}
function renderInterestFilters() {
    const personal = Array.isArray(user?.interestDetails) ? user.interestDetails : [];
    const details = category === "전체" ? personal : (interestDetailsByCategory[category] || []);
    const panel = $("#interestFilterPanel");
    if (!details.includes(interestDetail)) interestDetail = "전체";
    panel.hidden = details.length === 0;
    if (!details.length) return;
    $("#interestFilterTitle").textContent = category === "전체" ? "내 관심사로 찾기" : `${icons[category]} ${category} 세부 필터`;
    $("#interestFilterList").innerHTML = ["전체", ...details].map(detail => `<button class="interest-filter ${interestDetail === detail ? "active" : ""}" type="button" data-interest-detail="${esc(detail)}">${detail === "전체" ? "전체 보기" : esc(detail)}</button>`).join("");
}
function renderPosts() {
    const q = $("#postSearch").value.trim().toLowerCase(), type = $("#matchTypeFilter").value, day = $("#postDayFilter").value;
    const list = posts.filter(p => category === "전체" || p.category === category).filter(p => type === "전체" || p.matchType === type)
        .filter(p => day === "전체" || p.day === day).filter(p => !$("#openOnlyFilter").checked || !full(p))
        .filter(p => interestDetail === "전체" || matchesInterestDetail(p, interestDetail))
        .filter(p => !q || normalizedPostText(p).includes(q.replace(/\s+/g, ""))).sort((a, b) => b.createdAt - a.createdAt);
    $("#meetupList").innerHTML = list.map(p => `<button class="meetup-card" type="button" data-post="${p.id}">
        <div class="meetup-meta"><span>${icons[p.category] || "✨"} ${esc(p.category)} · ${esc(p.matchType)} 매칭</span><span class="visibility-badge ${full(p) ? "private" : ""}">${full(p) ? "비공개 · 마감" : "공개 · 모집중"}</span></div>
        <h3>${esc(p.title)}</h3><span class="post-author">작성자 ${esc(p.author)} · ${esc(p.time)}</span>
        <div class="post-tags">${p.tags.map(t => `<span>#${esc(t)}</span>`).join("")}</div>
        <div class="meetup-footer"><span>📍 ${esc(p.place)}</span><span class="spots">${p.current} / ${p.capacity}명</span></div></button>`).join("");
    $("#postEmpty").hidden = list.length > 0;
}
document.querySelectorAll(".category").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(b => b.classList.remove("active")); button.classList.add("active"); category = button.dataset.category; interestDetail = "전체"; renderInterestFilters(); renderPosts();
}));
$("#interestFilterList").addEventListener("click", e => {
    const button = e.target.closest("[data-interest-detail]");
    if (!button) return;
    interestDetail = button.dataset.interestDetail;
    renderInterestFilters();
    renderPosts();
});
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
    $("#editMeetupButton").hidden = !p.owner; $("#deleteMeetupButton").hidden = !p.owner;
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
$("#editMeetupButton").addEventListener("click", () => {
    const p = posts.find(item => item.id === postId); if (!p?.owner) return;
    $("#meetupDialog").close(); openPostForm("edit", p);
});
$("#deleteMeetupButton").addEventListener("click", async () => {
    const p = posts.find(item => item.id === postId); if (!p?.owner || !confirm(`'${p.title}' 모집글을 삭제할까요?`)) return;
    try {
        await request(`/api/posts/${p.id}`, { method: "DELETE" }); $("#meetupDialog").close();
        await refreshPosts(); await refreshRooms(); showStatus("모집글을 삭제했습니다.");
    } catch (error) { fail(error); }
});

async function refreshRooms() { rooms = await request("/api/chat-rooms"); renderRooms(); }
function roomPost(id) { return rooms.find(p => p.roomId === id) || posts.find(p => p.roomId === id); }
function renderRooms() {
    const unique = [...new Map(rooms.map(p => [p.roomId, p])).values()];
    $("#chatRoomList").innerHTML = unique.length ? unique.map(p => { const unread = unreadByRoom.get(p.roomId) || 0; return `<button class="chat-room" type="button" data-room="${p.roomId}"><span class="chat-room-icon">${icons[p.category] || "✨"}</span><span class="chat-room-copy"><strong>${esc(p.title)}</strong><span>${esc(p.time)} · ${esc(p.place)}</span></span>${unread ? `<span class="nav-badge">${unread}</span>` : ""}<span class="chat-room-arrow">›</span></button>`; }).join("") : `<div class="compact-empty"><strong>참여한 모임이 없습니다.</strong><span>모집글에서 참여해 보세요.</span></div>`;
}
$("#chatRoomList").addEventListener("click", e => { const button = e.target.closest("[data-room]"); if (button) openRoom(Number(button.dataset.room)); });
async function openRoom(id) {
    const p = roomPost(id); if (!p) return; roomId = id; $("#chatDialogTitle").textContent = p.title;
    $("#promoteRoomButton").disabled = !p.owner; $("#promoteRoomButton").textContent = p.owner ? "모집공고 올리기" : "방장만 게시 가능";
    try { await refreshMessages(); markRoomRead(id); $("#chatDialog").showModal(); clearInterval(chatTimer); chatTimer = setInterval(() => $("#chatDialog").open && refreshMessages().then(() => markRoomRead(id)).catch(console.error), 3000); } catch (error) { fail(error); }
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
function readKey(id) { return `woojoo-read-${user?.username || "guest"}-${id}`; }
function markRoomRead(id) {
    const latest = messages.at(-1)?.id || 0; localStorage.setItem(readKey(id), String(latest)); unreadByRoom.set(id, 0); updateUnreadBadges(); renderRooms();
}
async function refreshUnreadCounts() {
    if (!user) return;
    const unique = [...new Map(rooms.map(p => [p.roomId, p])).values()];
    await Promise.all(unique.map(async p => {
        if ($("#chatDialog").open && roomId === p.roomId) return;
        try {
            const list = await request(`/api/chat-rooms/${p.roomId}/messages`), lastRead = Number(localStorage.getItem(readKey(p.roomId)) || 0);
            unreadByRoom.set(p.roomId, list.filter(message => !message.mine && message.id > lastRead).length);
        } catch { unreadByRoom.set(p.roomId, 0); }
    }));
    updateUnreadBadges(); renderRooms();
}
function updateUnreadBadges() {
    const total = [...unreadByRoom.values()].reduce((sum, count) => sum + count, 0);
    for (const badge of [$("#desktopUnreadBadge"), $("#mobileUnreadBadge")]) { badge.textContent = String(total); badge.hidden = total === 0; }
}
async function refreshNotifications() { noticeItems = await request("/api/notifications"); renderNotifications(); }
function renderNotifications() {
    const unread = noticeItems.filter(item => !item.read).length;
    $("#notificationBadge").textContent = String(unread); $("#notificationBadge").hidden = unread === 0;
    $("#notificationList").innerHTML = noticeItems.length ? noticeItems.map(item => `<button class="notification-item ${item.read ? "" : "unread"}" type="button" data-notification="${item.id}" data-notification-post="${item.postId}"><strong>${esc(item.message)}</strong><span>${new Date(item.createdAt).toLocaleString("ko-KR")}</span></button>`).join("") : `<div class="compact-empty"><strong>새로운 알림이 없습니다.</strong><span>관심사와 맞는 모집글이 등록되면 알려드릴게요.</span></div>`;
}
$("#notificationButton").addEventListener("click", async () => {
    try { await refreshNotifications(); $("#notificationDialog").showModal(); } catch (error) { fail(error); }
});
$("#closeNotificationDialog").addEventListener("click", () => $("#notificationDialog").close());
$("#notificationList").addEventListener("click", async e => {
    const item = e.target.closest("[data-notification]"); if (!item) return;
    try {
        await request(`/api/notifications/${item.dataset.notification}/read`, { method: "PATCH" }); await refreshNotifications();
        $("#notificationDialog").close(); const target = posts.find(p => p.id === Number(item.dataset.notificationPost));
        if (target) openPost(target.id); else showStatus("해당 모집글을 찾을 수 없습니다.", "error");
    } catch (error) { fail(error); }
});
$("#promoteRoomButton").addEventListener("click", () => {
    const p = roomPost(roomId); if (!p?.owner) return; $("#chatDialog").close(); clearInterval(chatTimer);
    openPostForm("promote", { ...p, title: `${p.title} 추가 모집` });
});
$("#closePostDialog").addEventListener("click", () => $("#postDialog").close());
$("#createPostButton").addEventListener("click", () => openPostForm("create"));
function openPostForm(mode, p = null) {
    postMode = mode; editingPostId = mode === "edit" ? p.id : null; $("#postError").textContent = ""; $("#postForm").reset();
    $("#postDialogTitle").textContent = mode === "edit" ? "모집글 수정" : "모집글 작성";
    $("#postDialogEyebrow").textContent = mode === "promote" ? "채팅방 추가 모집" : mode === "edit" ? "내용과 조건 변경" : "새로운 만남 만들기";
    $("#savePostButton").textContent = mode === "edit" ? "수정 저장" : "게시하기";
    if (p) {
        $("#newPostCategory").value = p.category; $("#newPostMatchType").value = p.matchType; $("#newPostTitle").value = p.title;
        $("#newPostTags").value = p.tags.join(", "); $("#newPostDescription").value = p.description; $("#newPostPlace").value = p.place;
        $("#newPostCapacity").value = String(p.capacity); $("#newPostDay").value = p.day; $("#newPostHour").value = String(p.hour);
        $("#newPostGrade").value = p.grade; $("#newPostDepartment").value = p.department;
    } else {
        $("#newPostDay").value = days[new Date().getDay() - 1] || "월"; $("#newPostGrade").value = user.grade ? `${user.grade}학년` : "전 학년";
        $("#newPostDepartment").value = user.department || "전공 무관";
    }
    $("#postDialog").showModal();
}
function postFormPayload() {
    const tags = $("#newPostTags").value.split(",").map(t => t.trim()).filter(Boolean);
    return { category: $("#newPostCategory").value, matchType: $("#newPostMatchType").value,
        title: $("#newPostTitle").value.trim(), tags, description: $("#newPostDescription").value.trim(),
        place: $("#newPostPlace").value.trim(), capacity: Number($("#newPostCapacity").value),
        day: $("#newPostDay").value, hour: Number($("#newPostHour").value),
        grade: $("#newPostGrade").value.trim() || "전 학년", department: $("#newPostDepartment").value.trim() || "전공 무관",
        roomId: postMode === "promote" ? roomId : null };
}
$("#postForm").addEventListener("submit", async e => {
    e.preventDefault(); const payload = postFormPayload();
    if (!payload.tags.length) { $("#postError").textContent = "태그를 한 개 이상 입력해 주세요."; return; }
    try {
        const path = postMode === "edit" ? `/api/posts/${editingPostId}` : "/api/posts", method = postMode === "edit" ? "PUT" : "POST";
        await request(path, { method, body: JSON.stringify(payload) });
        $("#postDialog").close(); await refreshPosts(); await refreshRooms(); $("#meetups").scrollIntoView({ behavior: "smooth" });
        showStatus(postMode === "edit" ? "모집글을 수정했습니다." : "모집글을 등록했습니다.");
    } catch (error) { $("#postError").textContent = error.message; }
});

const slotKey = (day, hour) => `${day}-${hour}`, time = hour => `${String(hour).padStart(2, "0")}:00`;
const gridHead = () => `<div class="grid-head">시간</div>${days.map(day => `<div class="grid-head">${day}</div>`).join("")}`;
function renderCourses() {
    $("#timetableGrid").innerHTML = gridHead() + hours.map(hour => `<div class="time-label">${time(hour)}</div>${days.map(day => { const used = courses.some(c => c.day === day && c.hour === hour); return `<div class="schedule-cell ${used ? "has-class" : ""}" title="${used ? "수업" : "공강"}"><span>${used ? "■" : ""}</span></div>`; }).join("")}`).join("");
}
function renderFreeTimes() {
    const today = days[new Date().getDay() - 1], list = $("#freeTimeList");
    if (!today) { $("#freeTimeCount").textContent = "주말"; list.innerHTML = `<div class="compact-empty"><span>주말에는 평일 시간표를 표시하지 않아요.</span></div>`; return; }
    $("#welcomeText").textContent = `${user.displayName}님의 오늘의 공강 · ${today}요일`;
    const free = hours.filter(hour => !courses.some(c => c.day === today && c.hour === hour)), ranges = [];
    for (const hour of free) {
        const last = ranges.at(-1); if (last && last.end === hour) last.end = hour + 1; else ranges.push({ start: hour, end: hour + 1 });
    }
    $("#freeTimeCount").textContent = `${ranges.length}개`;
    list.innerHTML = ranges.length ? ranges.slice(0, 3).map(range => `<div class="time-slot"><time>${time(range.start)}</time><div><strong>${range.end - range.start}시간 공강</strong><span>${time(range.start)} ~ ${time(range.end)}</span></div></div>`).join("") : `<div class="compact-empty"><span>오늘 등록된 공강이 없습니다.</span></div>`;
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
    try { courses = await request("/api/courses", { method: "PUT", body: JSON.stringify(body) }); $("#classDialog").close(); renderCourses(); renderFreeTimes(); showStatus("시간표를 저장했습니다."); } catch (error) { $("#classError").textContent = error.message; }
});

hours.forEach(hour => { $("#matchHour").insertAdjacentHTML("beforeend", `<option value="${hour}">${time(hour)}</option>`); $("#newPostHour").insertAdjacentHTML("beforeend", `<option value="${hour}">${time(hour)}</option>`); });
$("#quickMatchForm").addEventListener("submit", e => {
    e.preventDefault(); const day = $("#matchDay").value, hour = Number($("#matchHour").value), grade = $("#matchGrade").value;
    const department = $("#matchDepartment").value.trim().toLowerCase(), needed = Number($("#matchCapacity").value);
    const matched = posts.filter(p => !full(p) && p.day === day && p.hour === hour && p.capacity - p.current >= needed - 1)
        .filter(p => !grade || p.grade.includes(grade) || p.grade.includes("전 학년"))
        .filter(p => !department || p.department.toLowerCase().includes(department) || p.department.includes("무관"));
    $("#quickMatchResult").innerHTML = matched.length ? `<strong>${matched.length}개의 모집을 찾았습니다.</strong><span>${day}요일 · ${time(hour)} · ${grade ? `${grade}학년` : "학년 무관"} · ${department || "학과 무관"}</span><div class="match-result-list">${matched.map(p => `<button class="match-result-item" type="button" data-match-post="${p.id}"><strong>${esc(p.title)}</strong><span>${p.current}/${p.capacity}명 · ${esc(p.place)}</span></button>`).join("")}</div>` : `<strong>조건에 맞는 모집이 없습니다.</strong><span>시간이나 조건을 바꿔 다시 찾아보세요.</span>`;
    $("#quickMatchResult").hidden = false;
});
$("#quickMatchResult").addEventListener("click", e => { const item = e.target.closest("[data-match-post]"); if (item) openPost(Number(item.dataset.matchPost)); });
function loadProfile() {
    $("#profileAge").value = user.age || ""; $("#profileGender").value = user.gender || ""; $("#profileDepartment").value = user.department || ""; $("#profileGrade").value = user.grade || "";
    setCheckedValues("profileInterestDetail", user.interestDetails || []);
}
$("#profileForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        user = await request("/api/users/me", { method: "PATCH", body: JSON.stringify({ age: $("#profileAge").value ? Number($("#profileAge").value) : null, gender: $("#profileGender").value, department: $("#profileDepartment").value.trim(), grade: $("#profileGrade").value, interests: checkedInterestCategories("profileInterestDetail"), interestDetails: checkedValues("profileInterestDetail") }) });
        saveUser(user); interestDetail = "전체"; renderInterestFilters(); renderPosts(); $("#profileSaveMessage").textContent = "저장되었습니다."; setTimeout(() => $("#profileSaveMessage").textContent = "", 2000);
    } catch (error) { fail(error); }
});
$("#profileButton").addEventListener("click", () => $("#profile").scrollIntoView({ behavior: "smooth" }));
async function refreshPosts() { posts = await request("/api/posts"); renderPosts(); }
setInterval(() => { if (user && !document.hidden) { refreshPosts().catch(console.error); refreshRooms().then(refreshUnreadCounts).catch(console.error); refreshNotifications().catch(console.error); } }, 10000);
if (user?.username) start();
