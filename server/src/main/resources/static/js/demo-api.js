(function () {
    const stateKey = "woojoo-demo-state-v1";
    const now = Date.now();
    const initialState = {
        users: {
            admin: {
                username: "admin", displayName: "김우주", password: "admin", age: 23, gender: "남성",
                department: "컴퓨터공학과", grade: "3", interests: ["학습", "운동"],
                interestDetails: ["프로젝트", "전공 공부", "러닝"]
            }
        },
        courses: { admin: [{ id: 1, day: "월", hour: 10 }, { id: 2, day: "화", hour: 13 }, { id: 3, day: "목", hour: 11 }] },
        posts: [
            { id: 1, ownerUsername: "admin", author: "김우주", category: "학습", title: "Java 프로젝트 같이 만들어요", tags: ["java프로젝트", "spring", "포트폴리오"], description: "공강 시간에 Java와 Spring으로 작은 웹 프로젝트를 함께 만들 팀원을 모집합니다.", place: "중앙도서관", day: "화", hour: 15, capacity: 4, grade: "2~4학년", department: "컴퓨터공학과", matchType: "시간표", createdAt: now - 600000, roomId: 101, participants: ["park"] },
            { id: 2, ownerUsername: "park", author: "박별이", category: "학습", title: "자료구조 시험 공동학습", tags: ["java공동학습", "자료구조", "시험"], description: "각자 공부하다가 모르는 문제를 함께 설명하며 시험을 준비해요.", place: "중앙도서관", day: "수", hour: 13, capacity: 3, grade: "2학년", department: "전공 무관", matchType: "시간표", createdAt: now - 500000, roomId: 102, participants: ["admin"] },
            { id: 3, ownerUsername: "lee", author: "이샛별", category: "학습", title: "교내 경진대회 준비팀", tags: ["경진대회", "알고리즘", "팀프로젝트"], description: "교내 소프트웨어 경진대회를 준비할 Java 개발자를 찾습니다.", place: "공학관", day: "금", hour: 16, capacity: 3, grade: "전 학년", department: "소프트웨어학과", matchType: "상시", createdAt: now - 400000, roomId: 103, participants: [] },
            { id: 4, ownerUsername: "choi", author: "최은하", category: "운동", title: "공강 배드민턴 한 게임", tags: ["배드민턴", "초보환영"], description: "실력과 장비 상관없이 재미있게 칠 분을 모집합니다.", place: "체육관", day: "목", hour: 14, capacity: 4, grade: "전 학년", department: "전공 무관", matchType: "시간표", createdAt: now - 300000, roomId: 104, participants: ["admin"] },
            { id: 5, ownerUsername: "jung", author: "정하늘", category: "동아리", title: "앱 개발 동아리 신규 모집", tags: ["개발동아리", "android", "java"], description: "기획부터 개발까지 함께 경험할 동아리원을 상시 모집합니다.", place: "학생회관", day: "수", hour: 17, capacity: 5, grade: "전 학년", department: "전공 무관", matchType: "상시", createdAt: now - 200000, roomId: 105, participants: [] }
        ],
        messages: {
            101: [{ id: 1, senderUsername: "park", sender: "박별이", text: "프로젝트 주제부터 같이 정해봐요!", sentAt: now - 120000 }],
            102: [{ id: 2, senderUsername: "park", sender: "박별이", text: "이번 주는 연결 리스트를 공부해요.", sentAt: now - 90000 }],
            104: [{ id: 3, senderUsername: "choi", sender: "최은하", text: "라켓은 여분이 있습니다!", sentAt: now - 60000 }]
        },
        notifications: {
            admin: [{ id: 1, postId: 3, message: "관심사와 맞는 새 모집: 교내 경진대회 준비팀", read: false, createdAt: now - 180000 }]
        }
    };

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function load() {
        try { return { ...clone(initialState), ...JSON.parse(localStorage.getItem(stateKey) || "{}") }; }
        catch { return clone(initialState); }
    }
    function save(state) { localStorage.setItem(stateKey, JSON.stringify(state)); }
    function body(options) { try { return JSON.parse(options.body || "{}"); } catch { return {}; } }
    function fail(message) { throw new Error(message); }
    function publicUser(account) {
        const { password, ...safe } = account;
        return clone(safe);
    }
    function postView(post, username) {
        const joined = post.participants.includes(username);
        return { ...clone(post), current: 1 + post.participants.length, owner: post.ownerUsername === username, joined, time: `${post.day}요일 ${String(post.hour).padStart(2, "0")}:00` };
    }
    function requireUser(state, username) {
        const account = state.users[username];
        if (!account) fail("다시 로그인해 주세요.");
        return account;
    }

    window.WOOJOO_DEMO_API = async function (path, options = {}, username) {
        const method = (options.method || "GET").toUpperCase();
        const payload = body(options);
        const state = load();

        if (path === "/api/auth/login" && method === "POST") {
            const account = state.users[payload.username];
            if (!account || account.password !== payload.password) fail("아이디 또는 비밀번호를 확인해 주세요.");
            return publicUser(account);
        }
        if (path === "/api/auth/register" && method === "POST") {
            if (!payload.username || !payload.password || !payload.displayName) fail("가입 정보를 확인해 주세요.");
            if (state.users[payload.username]) fail("이미 사용 중인 아이디입니다.");
            state.users[payload.username] = { ...payload, grade: "", interests: payload.interests || [], interestDetails: payload.interestDetails || [] };
            state.courses[payload.username] = [];
            state.notifications[payload.username] = [];
            save(state);
            return publicUser(state.users[payload.username]);
        }

        const account = requireUser(state, username);
        if (path === "/api/users/me") {
            if (method === "PATCH") { Object.assign(account, payload); save(state); }
            return publicUser(account);
        }
        if (path === "/api/courses") {
            if (method === "PUT") {
                state.courses[username] = (Array.isArray(payload) ? payload : []).map((course, index) => ({ id: index + 1, day: course.day, hour: course.hour }));
                save(state);
            }
            return clone(state.courses[username] || []);
        }
        if (path === "/api/posts" && method === "GET") return state.posts.map(post => postView(post, username));
        if (path === "/api/posts" && method === "POST") {
            const id = Math.max(0, ...state.posts.map(post => post.id)) + 1;
            const roomId = payload.roomId || 100 + id;
            state.posts.push({ ...payload, id, roomId, ownerUsername: username, author: account.displayName, createdAt: Date.now(), participants: [] });
            save(state);
            return postView(state.posts.at(-1), username);
        }

        const participantMatch = path.match(/^\/api\/posts\/(\d+)\/participants(\/me)?$/);
        if (participantMatch) {
            const post = state.posts.find(item => item.id === Number(participantMatch[1]));
            if (!post) fail("모집글을 찾을 수 없습니다.");
            if (method === "POST" && !post.participants.includes(username)) post.participants.push(username);
            if (method === "DELETE") post.participants = post.participants.filter(member => member !== username);
            save(state);
            return postView(post, username);
        }
        const postMatch = path.match(/^\/api\/posts\/(\d+)$/);
        if (postMatch) {
            const index = state.posts.findIndex(item => item.id === Number(postMatch[1]));
            if (index < 0) fail("모집글을 찾을 수 없습니다.");
            if (state.posts[index].ownerUsername !== username) fail("작성자만 변경할 수 있습니다.");
            if (method === "DELETE") { state.posts.splice(index, 1); save(state); return null; }
            if (method === "PUT") { state.posts[index] = { ...state.posts[index], ...payload }; save(state); return postView(state.posts[index], username); }
        }

        if (path === "/api/chat-rooms") return state.posts.filter(post => post.ownerUsername === username || post.participants.includes(username)).map(post => postView(post, username));
        const messageMatch = path.match(/^\/api\/chat-rooms\/(\d+)\/messages$/);
        if (messageMatch) {
            const id = Number(messageMatch[1]);
            if (method === "POST") {
                const list = state.messages[id] || (state.messages[id] = []);
                list.push({ id: Math.max(0, ...Object.values(state.messages).flat().map(message => message.id)) + 1, senderUsername: username, sender: account.displayName, text: payload.text, sentAt: Date.now() });
                save(state);
            }
            return clone(state.messages[id] || []).map(message => ({ ...message, mine: message.senderUsername === username }));
        }

        if (path === "/api/notifications") return clone(state.notifications[username] || []);
        const noticeMatch = path.match(/^\/api\/notifications\/(\d+)\/read$/);
        if (noticeMatch && method === "PATCH") {
            const item = (state.notifications[username] || []).find(notice => notice.id === Number(noticeMatch[1]));
            if (item) item.read = true;
            save(state);
            return clone(item);
        }
        fail("데모에서 지원하지 않는 요청입니다.");
    };
})();
