package com.woojugonggang.server.collaboration;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CollaborationService {
    private static final Set<String> DAYS = Set.of("월", "화", "수", "목", "금");
    private final UserAccountRepository users;
    private final CourseSlotRepository courses;
    private final MeetupPostRepository posts;
    private final PostParticipationRepository participants;
    private final ChatMessageRepository messages;
    private final String demoPassword;

    public CollaborationService(UserAccountRepository users, CourseSlotRepository courses,
                                MeetupPostRepository posts, PostParticipationRepository participants,
                                ChatMessageRepository messages, @Value("${app.demo-password}") String demoPassword) {
        this.users = users; this.courses = courses; this.posts = posts; this.participants = participants;
        this.messages = messages; this.demoPassword = demoPassword;
    }

    public UserView login(String username, String password) {
        String clean = requireText(username, "아이디", 40);
        if (!demoPassword.equals(password)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 올바르지 않습니다.");
        UserAccount user = users.findByUsername(clean).orElseGet(() -> users.save(new UserAccount(clean, "admin".equals(clean) ? "김우주" : clean)));
        return UserView.from(user);
    }

    @Transactional(readOnly = true)
    public UserView profile(String username) { return UserView.from(requireUser(username)); }

    public UserView updateProfile(String username, ProfileRequest request) {
        UserAccount user = requireUser(username);
        user.update(request.age(), trim(request.gender()), trim(request.department()), trim(request.grade()));
        return UserView.from(user);
    }

    @Transactional(readOnly = true)
    public List<CourseView> courses(String username) {
        requireUser(username);
        return courses.findByUsernameOrderByDayAscHourAsc(username).stream().map(CourseView::from).toList();
    }

    public List<CourseView> replaceCourses(String username, List<CourseRequest> requested) {
        requireUser(username);
        List<CourseRequest> unique = requested == null ? List.of() : requested.stream().distinct().toList();
        for (CourseRequest slot : unique) {
            if (!DAYS.contains(slot.day()) || slot.hour() < 9 || slot.hour() > 17)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시간표 값이 올바르지 않습니다.");
        }
        courses.deleteByUsername(username);
        courses.flush();
        courses.saveAll(unique.stream().map(slot -> new CourseSlot(username, slot.day(), slot.hour())).toList());
        return courses(username);
    }

    @Transactional(readOnly = true)
    public List<PostView> posts(String username) {
        requireUser(username);
        return posts.findAllByOrderByCreatedAtDesc().stream().map(post -> view(post, username)).toList();
    }

    public PostView createPost(String username, PostRequest request) {
        UserAccount user = requireUser(username);
        if (!DAYS.contains(request.day()) || request.hour() < 9 || request.hour() > 17 || request.capacity() < 2 || request.capacity() > 20)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집 조건을 확인해 주세요.");
        String tags = String.join(",", request.tags() == null ? List.of() : request.tags().stream().map(String::trim).filter(s -> !s.isBlank()).toList());
        MeetupPost post = new MeetupPost(username, user.getDisplayName(), requireText(request.category(), "카테고리", 20),
                requireText(request.title(), "제목", 100), requireText(request.description(), "설명", 1000), tags,
                requireText(request.place(), "장소", 60), request.day(), request.hour(), request.capacity(), 1,
                fallback(request.grade(), "전 학년"), fallback(request.department(), "전공 무관"),
                fallback(request.matchType(), "시간표"), System.currentTimeMillis(), request.roomId());
        return view(posts.save(post), username);
    }

    public PostView join(String username, Long postId) {
        requireUser(username);
        MeetupPost post = requirePost(postId);
        if (post.getOwnerUsername().equals(username)) return view(post, username);
        if (!participants.existsByPostIdAndUsername(postId, username)) {
            if (current(post) >= post.getCapacity()) throw new ResponseStatusException(HttpStatus.CONFLICT, "모집이 마감되었습니다.");
            participants.save(new PostParticipation(postId, username));
        }
        return view(post, username);
    }

    public PostView leave(String username, Long postId) {
        MeetupPost post = requirePost(postId);
        if (post.getOwnerUsername().equals(username)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "작성자는 참여를 취소할 수 없습니다.");
        participants.findByPostIdAndUsername(postId, username).ifPresent(participants::delete);
        return view(post, username);
    }

    @Transactional(readOnly = true)
    public List<PostView> rooms(String username) {
        requireUser(username);
        return posts.findAllByOrderByCreatedAtDesc().stream()
                .filter(post -> post.getOwnerUsername().equals(username) || participants.existsByPostIdAndUsername(post.getId(), username))
                .map(post -> view(post, username)).toList();
    }

    @Transactional(readOnly = true)
    public List<MessageView> messages(String username, Long roomId) {
        assertRoomMember(username, roomId);
        return messages.findByRoomIdOrderBySentAtAsc(roomId).stream().map(message -> MessageView.from(message, username)).toList();
    }

    public MessageView sendMessage(String username, Long roomId, MessageRequest request) {
        UserAccount user = requireUser(username);
        assertRoomMember(username, roomId);
        ChatMessage message = new ChatMessage(roomId, username, user.getDisplayName(), requireText(request.text(), "메시지", 500), System.currentTimeMillis());
        return MessageView.from(messages.save(message), username);
    }

    private void assertRoomMember(String username, Long roomId) {
        boolean member = posts.findAll().stream().filter(post -> Objects.equals(post.getRoomId(), roomId))
                .anyMatch(post -> post.getOwnerUsername().equals(username) || participants.existsByPostIdAndUsername(post.getId(), username));
        if (!member) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 참여자만 접근할 수 있습니다.");
    }

    private UserAccount requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."));
    }
    private MeetupPost requirePost(Long id) { return posts.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "모집글을 찾을 수 없습니다.")); }
    private int current(MeetupPost post) { return post.getBaseParticipants() + (int) participants.countByPostId(post.getId()); }
    private PostView view(MeetupPost post, String username) {
        boolean owner = post.getOwnerUsername().equals(username);
        boolean joined = participants.existsByPostIdAndUsername(post.getId(), username);
        return PostView.from(post, current(post), owner, joined);
    }
    private static String requireText(String value, String name, int max) {
        String result = trim(value);
        if (result.isEmpty() || result.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " 값을 확인해 주세요.");
        return result;
    }
    private static String trim(String value) { return value == null ? "" : value.trim(); }
    private static String fallback(String value, String fallback) { String clean = trim(value); return clean.isEmpty() ? fallback : clean; }

    public record LoginRequest(String username, String password) {}
    public record UserView(String username, String displayName, Integer age, String gender, String department, String grade) {
        static UserView from(UserAccount u) { return new UserView(u.getUsername(), u.getDisplayName(), u.getAge(), u.getGender(), u.getDepartment(), u.getGrade()); }
    }
    public record ProfileRequest(Integer age, String gender, String department, String grade) {}
    public record CourseRequest(String day, int hour) {}
    public record CourseView(Long id, String day, int hour) { static CourseView from(CourseSlot c) { return new CourseView(c.getId(), c.getDay(), c.getHour()); } }
    public record PostRequest(String category, String title, List<String> tags, String description, String place, String day,
                              int hour, int capacity, String grade, String department, String matchType, Long roomId) {}
    public record PostView(Long id, String category, String title, String author, List<String> tags, String description,
                           String place, String day, int hour, String time, int current, int capacity, String grade,
                           String department, String matchType, long createdAt, boolean owner, boolean joined, Long roomId) {
        static PostView from(MeetupPost p, int current, boolean owner, boolean joined) {
            List<String> tags = p.getTags().isBlank() ? List.of() : Arrays.stream(p.getTags().split(",")).toList();
            return new PostView(p.getId(), p.getCategory(), p.getTitle(), p.getAuthor(), tags, p.getDescription(), p.getPlace(),
                    p.getDay(), p.getHour(), p.getDay() + "요일 " + String.format("%02d:00", p.getHour()), current,
                    p.getCapacity(), p.getGrade(), p.getDepartment(), p.getMatchType(), p.getCreatedAt(), owner, joined, p.getRoomId());
        }
    }
    public record MessageRequest(String text) {}
    public record MessageView(Long id, String sender, String text, long sentAt, boolean mine) {
        static MessageView from(ChatMessage m, String username) { return new MessageView(m.getId(), m.getSenderName(), m.getText(), m.getSentAt(), m.getSenderUsername().equals(username)); }
    }
}
