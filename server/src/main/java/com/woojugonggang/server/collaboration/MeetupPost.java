package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "meetup_posts")
public class MeetupPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 40) private String ownerUsername;
    @Column(nullable = false, length = 40) private String author;
    @Column(nullable = false, length = 20) private String category;
    @Column(nullable = false, length = 100) private String title;
    @Column(nullable = false, length = 1000) private String description;
    @Column(nullable = false, length = 300) private String tags;
    @Column(nullable = false, length = 60) private String place;
    @Column(name = "day_code", nullable = false, length = 2) private String day;
    @Column(name = "activity_hour", nullable = false) private int hour;
    @Column(nullable = false) private int capacity;
    @Column(nullable = false) private int baseParticipants;
    @Column(nullable = false, length = 20) private String grade;
    @Column(nullable = false, length = 60) private String department;
    @Column(nullable = false, length = 20) private String matchType;
    @Column(nullable = false) private long createdAt;
    private Long roomId;

    protected MeetupPost() {}
    public MeetupPost(String ownerUsername, String author, String category, String title, String description,
                      String tags, String place, String day, int hour, int capacity, int baseParticipants,
                      String grade, String department, String matchType, long createdAt, Long roomId) {
        this.ownerUsername = ownerUsername; this.author = author; this.category = category; this.title = title;
        this.description = description; this.tags = tags; this.place = place; this.day = day; this.hour = hour;
        this.capacity = capacity; this.baseParticipants = baseParticipants; this.grade = grade;
        this.department = department; this.matchType = matchType; this.createdAt = createdAt; this.roomId = roomId;
    }
    public Long getId() { return id; }
    public String getOwnerUsername() { return ownerUsername; }
    public String getAuthor() { return author; }
    public String getCategory() { return category; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getTags() { return tags; }
    public String getPlace() { return place; }
    public String getDay() { return day; }
    public int getHour() { return hour; }
    public int getCapacity() { return capacity; }
    public int getBaseParticipants() { return baseParticipants; }
    public String getGrade() { return grade; }
    public String getDepartment() { return department; }
    public String getMatchType() { return matchType; }
    public long getCreatedAt() { return createdAt; }
    public Long getRoomId() { return roomId == null ? id : roomId; }
    public void update(String category, String title, String description, String tags, String place,
                       String day, int hour, int capacity, String grade, String department, String matchType) {
        this.category = category; this.title = title; this.description = description; this.tags = tags;
        this.place = place; this.day = day; this.hour = hour; this.capacity = capacity;
        this.grade = grade; this.department = department; this.matchType = matchType;
    }
}
