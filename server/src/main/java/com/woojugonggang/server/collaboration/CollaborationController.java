package com.woojugonggang.server.collaboration;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CollaborationController {
    private static final String USER_HEADER = "X-User-Name";
    private final CollaborationService service;
    public CollaborationController(CollaborationService service) { this.service = service; }

    @PostMapping("/auth/login")
    public CollaborationService.UserView login(@RequestBody CollaborationService.LoginRequest request) {
        return service.login(request.username(), request.password());
    }
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public CollaborationService.UserView register(@RequestBody CollaborationService.RegisterRequest request) {
        return service.register(request);
    }
    @GetMapping("/users/me")
    public CollaborationService.UserView profile(@RequestHeader(USER_HEADER) String username) { return service.profile(username); }
    @PatchMapping("/users/me")
    public CollaborationService.UserView updateProfile(@RequestHeader(USER_HEADER) String username,
            @RequestBody CollaborationService.ProfileRequest request) { return service.updateProfile(username, request); }
    @GetMapping("/courses")
    public List<CollaborationService.CourseView> courses(@RequestHeader(USER_HEADER) String username) { return service.courses(username); }
    @PutMapping("/courses")
    public List<CollaborationService.CourseView> replaceCourses(@RequestHeader(USER_HEADER) String username,
            @RequestBody List<CollaborationService.CourseRequest> request) { return service.replaceCourses(username, request); }
    @GetMapping("/posts")
    public List<CollaborationService.PostView> posts(@RequestHeader(USER_HEADER) String username) { return service.posts(username); }
    @PostMapping("/posts") @ResponseStatus(HttpStatus.CREATED)
    public CollaborationService.PostView createPost(@RequestHeader(USER_HEADER) String username,
            @RequestBody CollaborationService.PostRequest request) { return service.createPost(username, request); }
    @PutMapping("/posts/{id}")
    public CollaborationService.PostView updatePost(@RequestHeader(USER_HEADER) String username, @PathVariable Long id,
            @RequestBody CollaborationService.PostRequest request) { return service.updatePost(username, id, request); }
    @DeleteMapping("/posts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@RequestHeader(USER_HEADER) String username, @PathVariable Long id) { service.deletePost(username, id); }
    @PostMapping("/posts/{id}/participants")
    public CollaborationService.PostView join(@RequestHeader(USER_HEADER) String username, @PathVariable Long id) { return service.join(username, id); }
    @DeleteMapping("/posts/{id}/participants/me")
    public CollaborationService.PostView leave(@RequestHeader(USER_HEADER) String username, @PathVariable Long id) { return service.leave(username, id); }
    @GetMapping("/chat-rooms")
    public List<CollaborationService.PostView> rooms(@RequestHeader(USER_HEADER) String username) { return service.rooms(username); }
    @GetMapping("/chat-rooms/{id}/messages")
    public List<CollaborationService.MessageView> messages(@RequestHeader(USER_HEADER) String username, @PathVariable Long id) { return service.messages(username, id); }
    @PostMapping("/chat-rooms/{id}/messages") @ResponseStatus(HttpStatus.CREATED)
    public CollaborationService.MessageView sendMessage(@RequestHeader(USER_HEADER) String username, @PathVariable Long id,
            @RequestBody CollaborationService.MessageRequest request) { return service.sendMessage(username, id, request); }
    @GetMapping("/notifications")
    public List<CollaborationService.NotificationView> notifications(@RequestHeader(USER_HEADER) String username) {
        return service.notifications(username);
    }
    @PatchMapping("/notifications/{id}/read")
    public CollaborationService.NotificationView readNotification(@RequestHeader(USER_HEADER) String username, @PathVariable Long id) {
        return service.readNotification(username, id);
    }
}
