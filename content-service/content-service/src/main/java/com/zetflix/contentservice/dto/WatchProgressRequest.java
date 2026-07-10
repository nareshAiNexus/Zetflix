package com.zetflix.contentservice.dto;

import lombok.Data;

@Data
public class WatchProgressRequest {
    private double lastWatchedTimeSeconds;
    private double totalDurationSeconds;
}
