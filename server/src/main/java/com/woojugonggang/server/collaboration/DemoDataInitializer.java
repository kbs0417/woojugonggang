package com.woojugonggang.server.collaboration;

import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoDataInitializer {
    @Bean
    CommandLineRunner seedDemoData(UserAccountRepository users, MeetupPostRepository posts,
                                   PasswordEncoder passwordEncoder,
                                   @Value("${app.demo-password}") String demoPassword,
                                   @Value("${app.seed-demo-data:true}") boolean seedDemoData) {
        return args -> {
            UserAccount admin = users.findByUsername("admin")
                    .orElseGet(() -> users.save(new UserAccount("admin", "김우주", passwordEncoder.encode(demoPassword))));
            if (admin.getPasswordHash() == null || admin.getPasswordHash().isBlank()) {
                admin.setPasswordHash(passwordEncoder.encode(demoPassword));
                users.save(admin);
            }
            if (!seedDemoData) return;
            if (posts.count() > 0) return;
            long now = System.currentTimeMillis();
            List<MeetupPost> demo = List.of(
                post("admin", "김우주", "학습", "Java 프로젝트 같이 만들어요", "공강 시간에 Java와 Spring으로 작은 웹 프로젝트를 함께 만들 팀원을 모집합니다.", "java프로젝트,spring,포트폴리오", "중앙도서관", "화", 15, 4, 2, "2~4학년", "컴퓨터공학과", "시간표", now - 6000),
                post("park", "박별이", "학습", "자료구조 시험 공동학습", "각자 공부하다가 모르는 문제를 함께 설명하며 시험을 준비해요.", "java공동학습,자료구조,시험", "중앙도서관", "수", 13, 3, 2, "2학년", "전공 무관", "시간표", now - 5000),
                post("lee", "이샛별", "학습", "교내 경진대회 준비팀", "교내 소프트웨어 경진대회를 준비할 Java 개발자를 찾습니다.", "경진대회_java,알고리즘,팀프로젝트", "공학관", "금", 16, 3, 3, "전 학년", "소프트웨어학과", "상시", now - 4000),
                post("choi", "최은하", "운동", "공강 배드민턴 한 게임", "실력과 장비 상관없이 재미있게 칠 분을 모집합니다.", "배드민턴,초보환영", "체육관", "목", 14, 4, 2, "전 학년", "전공 무관", "시간표", now - 3000),
                post("jung", "정하늘", "동아리", "앱 개발 동아리 신규 모집", "기획부터 개발까지 함께 경험할 동아리원을 상시 모집합니다.", "개발동아리,android,java", "학생회관", "수", 17, 5, 4, "전 학년", "전공 무관", "상시", now - 2000),
                post("han", "한봄", "취미", "점심시간 사진 산책", "휴대폰 카메라도 좋아요. 캠퍼스를 걸으며 사진을 찍어요.", "사진,산책,카메라", "정문", "월", 12, 3, 1, "전 학년", "전공 무관", "시간표", now - 1000)
            );
            posts.saveAll(demo);
        };
    }
    private static MeetupPost post(String owner, String author, String category, String title, String description, String tags,
                                   String place, String day, int hour, int capacity, int current, String grade,
                                   String department, String matchType, long createdAt) {
        return new MeetupPost(owner, author, category, title, description, tags, place, day, hour, capacity, current,
                grade, department, matchType, createdAt, null);
    }
}
