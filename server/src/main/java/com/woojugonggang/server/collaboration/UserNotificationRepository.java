package com.woojugonggang.server.collaboration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {
    List<UserNotification> findByRecipientUsernameOrderByCreatedAtDesc(String recipientUsername);
    void deleteByPostId(Long postId);
}
