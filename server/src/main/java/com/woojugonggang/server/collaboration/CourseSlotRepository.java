package com.woojugonggang.server.collaboration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseSlotRepository extends JpaRepository<CourseSlot, Long> {
    List<CourseSlot> findByUsernameOrderByDayAscHourAsc(String username);
    void deleteByUsername(String username);
}
