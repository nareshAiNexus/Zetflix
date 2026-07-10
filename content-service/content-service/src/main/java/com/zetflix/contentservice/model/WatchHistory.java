package com.zetflix.contentservice.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "watch_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String movieId;

    @Column(nullable = false)
    private double lastWatchedTimeSeconds;

    @Column(nullable = false)
    private double totalDurationSeconds;

    @Enumerated(EnumType.STRING)
    private Genre genre;

    @Column(nullable = false)
    private boolean completed = false;

    @UpdateTimestamp
    private LocalDateTime lastWatchedAt;
}
