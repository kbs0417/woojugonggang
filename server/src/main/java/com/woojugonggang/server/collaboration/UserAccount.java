package com.woojugonggang.server.collaboration;

import jakarta.persistence.*;

@Entity
@Table(name = "app_users", uniqueConstraints = @UniqueConstraint(columnNames = "username"))
public class UserAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40) private String username;
    @Column(nullable = false, length = 40) private String displayName;
    @Column(length = 100) private String passwordHash;
    private Integer age;
    @Column(length = 20) private String gender;
    @Column(length = 60) private String department;
    @Column(length = 20) private String grade;
    @Column(length = 200) private String interestCategories;
    @Column(length = 500) private String interestTags;

    protected UserAccount() {}
    public UserAccount(String username, String displayName, String passwordHash) {
        this(username, displayName, passwordHash, "", "");
    }
    public UserAccount(String username, String displayName, String passwordHash, String interestCategories, String interestTags) {
        this.username = username; this.displayName = displayName; this.passwordHash = passwordHash;
        this.interestCategories = interestCategories; this.interestTags = interestTags;
    }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public Integer getAge() { return age; }
    public String getGender() { return gender; }
    public String getDepartment() { return department; }
    public String getGrade() { return grade; }
    public String getInterestCategories() { return interestCategories == null ? "" : interestCategories; }
    public String getInterestTags() { return interestTags == null ? "" : interestTags; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void update(Integer age, String gender, String department, String grade, String interestCategories, String interestTags) {
        this.age = age; this.gender = gender; this.department = department; this.grade = grade;
        this.interestCategories = interestCategories; this.interestTags = interestTags;
    }
}
