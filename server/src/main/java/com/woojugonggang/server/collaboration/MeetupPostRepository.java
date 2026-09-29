package com.woojugonggang.server.collaboration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetupPostRepository extends JpaRepository<MeetupPost, Long> {
    List<MeetupPost> findAllByOrderByCreatedAtDesc();
}
