package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "user_notifications", indexes = @Index(columnList = "recipientUsername,createdAt"))
public class UserNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 40) private String recipientUsername;
    @Column(nullable = false) private Long postId;
    @Column(nullable = false, length = 200) private String message;
    @Column(nullable = false) private boolean readFlag;
    @Column(nullable = false) private long createdAt;

    protected UserNotification() {}
    public UserNotification(String recipientUsername, Long postId, String message, long createdAt) {
        this.recipientUsername = recipientUsername; this.postId = postId; this.message = message; this.createdAt = createdAt;
    }
    public Long getId() { return id; }
    public String getRecipientUsername() { return recipientUsername; }
    public Long getPostId() { return postId; }
    public String getMessage() { return message; }
    public boolean isReadFlag() { return readFlag; }
    public long getCreatedAt() { return createdAt; }
    public void markRead() { this.readFlag = true; }
}
