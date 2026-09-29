package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "app_users", uniqueConstraints = @UniqueConstraint(columnNames = "username"))
public class UserAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40) private String username;
    @Column(nullable = false, length = 40) private String displayName;
    private Integer age;
    @Column(length = 20) private String gender;
    @Column(length = 60) private String department;
    @Column(length = 20) private String grade;

    protected UserAccount() {}
    public UserAccount(String username, String displayName) { this.username = username; this.displayName = displayName; }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public Integer getAge() { return age; }
    public String getGender() { return gender; }
    public String getDepartment() { return department; }
    public String getGrade() { return grade; }
    public void update(Integer age, String gender, String department, String grade) {
        this.age = age; this.gender = gender; this.department = department; this.grade = grade;
    }
}
