package com.zetflix.contentservice.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WatchedMovieInfo {
    private String movieId;
    private String title;
    private String thumbnailUrl;
    private double lastWatchedTimeSeconds;
    private double totalDurationSeconds;
    private boolean completed;
    private LocalDateTime lastWatchedAt;
}
