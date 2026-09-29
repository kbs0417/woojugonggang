package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "course_slots", uniqueConstraints = @UniqueConstraint(columnNames = {"username", "day_code", "class_hour"}))
public class CourseSlot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 40) private String username;
    @Column(name = "day_code", nullable = false, length = 2) private String day;
    @Column(name = "class_hour", nullable = false) private int hour;
    protected CourseSlot() {}
    public CourseSlot(String username, String day, int hour) { this.username = username; this.day = day; this.hour = hour; }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getDay() { return day; }
    public int getHour() { return hour; }
}
