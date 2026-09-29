package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "post_participants", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "username"}))
public class PostParticipation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "post_id", nullable = false) private Long postId;
    @Column(nullable = false, length = 40) private String username;
    protected PostParticipation() {}
    public PostParticipation(Long postId, String username) { this.postId = postId; this.username = username; }
    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public String getUsername() { return username; }
}
