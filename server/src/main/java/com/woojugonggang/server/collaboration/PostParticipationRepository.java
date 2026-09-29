package com.woojugonggang.server.collaboration;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostParticipationRepository extends JpaRepository<PostParticipation, Long> {
    long countByPostId(Long postId);
    boolean existsByPostIdAndUsername(Long postId, String username);
    Optional<PostParticipation> findByPostIdAndUsername(Long postId, String username);
    List<PostParticipation> findByUsername(String username);
}
