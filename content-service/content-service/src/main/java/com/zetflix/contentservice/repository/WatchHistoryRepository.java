package com.zetflix.contentservice.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.zetflix.contentservice.model.WatchHistory;

public interface WatchHistoryRepository extends JpaRepository<WatchHistory, Long> {
    Optional<WatchHistory> findByUserIdAndMovieId(String userId, String movieId);
    List<WatchHistory> findByUserIdOrderByLastWatchedAtDesc(String userId);
    Optional<WatchHistory> findFirstByUserIdOrderByLastWatchedAtDesc(String userId);
}
