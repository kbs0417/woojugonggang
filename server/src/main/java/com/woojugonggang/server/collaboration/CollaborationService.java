package com.woojugonggang.server.collaboration;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserNotificationRepository notifications;
    private final PasswordEncoder passwordEncoder;

    public CollaborationService(UserAccountRepository users, CourseSlotRepository courses,
                                MeetupPostRepository posts, PostParticipationRepository participants,
                                ChatMessageRepository messages, UserNotificationRepository notifications,
                                PasswordEncoder passwordEncoder) {
        this.users = users; this.courses = courses; this.posts = posts; this.participants = participants;
        this.messages = messages; this.notifications = notifications; this.passwordEncoder = passwordEncoder;
    }

    public UserView login(String username, String password) {
        String clean = requireText(username, "아이디", 40);
        UserAccount user = users.findByUsername(clean)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password == null ? "" : password, user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        return UserView.from(user);
    }

    public UserView register(RegisterRequest request) {
        String username = requireText(request.username(), "아이디", 40);
        String displayName = requireText(request.displayName(), "이름", 40);
        String password = request.password() == null ? "" : request.password();
        if (!username.matches("[A-Za-z0-9_]{4,40}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디는 영문, 숫자, 밑줄로 4자 이상 입력해 주세요.");
        if (password.length() < 8 || password.length() > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 8자 이상 입력해 주세요.");
        if (request.age() == null || request.age() < 17 || request.age() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "나이는 17세부터 100세까지 입력해 주세요.");
        String gender = requireText(request.gender(), "성별", 20);
        String department = requireText(request.department(), "학과", 60);
        if (users.findByUsername(username).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        UserAccount user = new UserAccount(username, displayName, passwordEncoder.encode(password),
                cleanList(request.interests(), 200), cleanList(request.interestTags(), 500));
        user.update(request.age(), gender, department, "", user.getInterestCategories(), user.getInterestTags());
        return UserView.from(users.save(user));
    }

    @Transactional(readOnly = true)
    public UserView profile(String username) { return UserView.from(requireUser(username)); }

    public UserView updateProfile(String username, ProfileRequest request) {
        UserAccount user = requireUser(username);
        user.update(request.age(), trim(request.gender()), trim(request.department()), trim(request.grade()),
                cleanList(request.interests(), 200), cleanList(request.interestTags(), 500));
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
        MeetupPost saved = posts.save(post);
        createInterestNotifications(saved);
        return view(saved, username);
    }

    public PostView updatePost(String username, Long postId, PostRequest request) {
        MeetupPost post = requireOwnedPost(username, postId);
        validatePostRequest(request);
        if (request.capacity() < current(post))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 참여 인원보다 목표 인원을 줄일 수 없습니다.");
        post.update(requireText(request.category(), "카테고리", 20), requireText(request.title(), "제목", 100),
                requireText(request.description(), "설명", 1000), cleanTags(request.tags()),
                requireText(request.place(), "장소", 60), request.day(), request.hour(), request.capacity(),
                fallback(request.grade(), "전 학년"), fallback(request.department(), "전공 무관"),
                fallback(request.matchType(), "시간표"));
        return view(posts.save(post), username);
    }

    public void deletePost(String username, Long postId) {
        MeetupPost post = requireOwnedPost(username, postId);
        participants.deleteByPostId(postId);
        notifications.deleteByPostId(postId);
        posts.delete(post);
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

    @Transactional(readOnly = true)
    public List<NotificationView> notifications(String username) {
        requireUser(username);
        return notifications.findByRecipientUsernameOrderByCreatedAtDesc(username).stream().map(NotificationView::from).toList();
    }

    public NotificationView readNotification(String username, Long id) {
        UserNotification notification = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));
        if (!notification.getRecipientUsername().equals(username))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "내 알림만 확인할 수 있습니다.");
        notification.markRead();
        return NotificationView.from(notification);
    }

    private void createInterestNotifications(MeetupPost post) {
        Set<String> postTags = lowerSet(Arrays.asList(post.getTags().split(",")));
        List<UserNotification> created = users.findAll().stream()
                .filter(account -> !account.getUsername().equals(post.getOwnerUsername()))
                .filter(account -> splitSet(account.getInterestCategories()).contains(post.getCategory())
                        || !Collections.disjoint(lowerSet(splitSet(account.getInterestTags())), postTags))
                .map(account -> new UserNotification(account.getUsername(), post.getId(),
                        "관심사와 맞는 새 모집: " + post.getTitle(), System.currentTimeMillis()))
                .toList();
        notifications.saveAll(created);
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
    private MeetupPost requireOwnedPost(String username, Long id) {
        MeetupPost post = requirePost(id);
        if (!post.getOwnerUsername().equals(username))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "작성자만 수정하거나 삭제할 수 있습니다.");
        return post;
    }
    private void validatePostRequest(PostRequest request) {
        if (!DAYS.contains(request.day()) || request.hour() < 9 || request.hour() > 17 || request.capacity() < 2 || request.capacity() > 20)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "모집 조건을 확인해 주세요.");
    }
    private String cleanTags(List<String> tags) {
        return String.join(",", tags == null ? List.of() : tags.stream().map(String::trim).filter(s -> !s.isBlank()).toList());
    }
    private static String cleanList(List<String> values, int max) {
        String result = String.join(",", values == null ? List.of() : values.stream().map(String::trim).filter(s -> !s.isBlank()).distinct().toList());
        if (result.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "관심사 또는 해시태그가 너무 깁니다.");
        return result;
    }
    private static Set<String> splitSet(String value) {
        return value == null || value.isBlank() ? Set.of() : new LinkedHashSet<>(Arrays.asList(value.split(",")));
    }
    private static Set<String> lowerSet(Collection<String> values) {
        Set<String> result = new HashSet<>();
        values.stream().map(String::trim).filter(s -> !s.isBlank()).map(s -> s.toLowerCase(Locale.ROOT)).forEach(result::add);
        return result;
    }
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
    public record RegisterRequest(String username, String displayName, String password, Integer age, String gender,
                                  String department, List<String> interests, List<String> interestTags) {}
    public record UserView(String username, String displayName, Integer age, String gender, String department, String grade,
                           List<String> interests, List<String> interestTags) {
        static UserView from(UserAccount u) { return new UserView(u.getUsername(), u.getDisplayName(), u.getAge(), u.getGender(),
                u.getDepartment(), u.getGrade(), new ArrayList<>(splitSet(u.getInterestCategories())), new ArrayList<>(splitSet(u.getInterestTags()))); }
    }
    public record ProfileRequest(Integer age, String gender, String department, String grade, List<String> interests, List<String> interestTags) {}
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
    public record NotificationView(Long id, Long postId, String message, boolean read, long createdAt) {
        static NotificationView from(UserNotification n) { return new NotificationView(n.getId(), n.getPostId(), n.getMessage(), n.isReadFlag(), n.getCreatedAt()); }
    }
}
