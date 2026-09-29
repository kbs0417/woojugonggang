package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long roomId;
    @Column(nullable = false, length = 40) private String senderUsername;
    @Column(nullable = false, length = 40) private String senderName;
    @Column(nullable = false, length = 500) private String text;
    @Column(nullable = false) private long sentAt;
    protected ChatMessage() {}
    public ChatMessage(Long roomId, String senderUsername, String senderName, String text, long sentAt) {
        this.roomId = roomId; this.senderUsername = senderUsername; this.senderName = senderName; this.text = text; this.sentAt = sentAt;
    }
    public Long getId() { return id; }
    public Long getRoomId() { return roomId; }
    public String getSenderUsername() { return senderUsername; }
    public String getSenderName() { return senderName; }
    public String getText() { return text; }
    public long getSentAt() { return sentAt; }
}
