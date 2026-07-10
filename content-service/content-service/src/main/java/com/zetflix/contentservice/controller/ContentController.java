package com.zetflix.contentservice.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zetflix.contentservice.dto.MovieRequest;
import com.zetflix.contentservice.dto.MovieResponse;
import com.zetflix.contentservice.dto.WatchProgressRequest;
import com.zetflix.contentservice.model.Genre;
import com.zetflix.contentservice.model.Movie;
import com.zetflix.contentservice.model.WatchHistory;
import com.zetflix.contentservice.repository.ContentRepository;
import com.zetflix.contentservice.repository.WatchHistoryRepository;
import com.zetflix.contentservice.service.ContentService;
import com.zetflix.contentservice.security.UserContext;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("api/v1/movies")
@Slf4j
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ContentController {

    private final ContentService contentService;
    private final ContentRepository contentRepository;
    private final WatchHistoryRepository watchHistoryRepository;

    @PostMapping
    public ResponseEntity<MovieResponse> addMovie(
        @Valid @RequestBody MovieRequest movieRequest) {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(contentService.addMovie(movieRequest));
    }

    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAllMovies() {
        return ResponseEntity.ok(contentService.getAllMovies());
    }

    @GetMapping("genre/{genre}")
    public ResponseEntity<List<MovieResponse>> getMoviesByGenre(
        @PathVariable Genre genre) {
            return ResponseEntity.ok(contentService.getMoviesByGenre(genre));
    }
    
    @GetMapping("/{movieId}")
    public ResponseEntity<MovieResponse> getMovieById(
        @PathVariable String movieId) {
            return ResponseEntity.ok(contentService.getMovieById(movieId));
    }
        
    @GetMapping("/search")
    public ResponseEntity<List<MovieResponse>> searchMovies(
        @RequestParam String title) {
            return ResponseEntity.ok(contentService.searchMovies(title));
    }

    // ─── Encoding Progress (Transient / In-Memory / Unauthenticated) ────
    private static final java.util.concurrent.ConcurrentHashMap<String, java.util.Map<String, Object>> progressCache = 
        new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/{movieId}/progress")
    public ResponseEntity<Void> updateProgress(
            @PathVariable String movieId,
            @RequestBody java.util.Map<String, Object> progress) {
        progressCache.put(movieId, progress);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{movieId}/progress")
    public ResponseEntity<java.util.Map<String, Object>> getProgress(
            @PathVariable String movieId) {
        java.util.Map<String, Object> progress = progressCache.get(movieId);
        if (progress == null) {
            progress = new java.util.HashMap<>();
            progress.put("movieId", movieId);
            progress.put("status", "UNKNOWN");
        }
        return ResponseEntity.ok(progress);
    }

    // ─── User Watch Progress (Persisted / MySQL / Authenticated) ────────
    @PostMapping("/{movieId}/watch-progress")
    public ResponseEntity<Void> updateWatchProgress(
            @PathVariable String movieId,
            @RequestBody WatchProgressRequest progressRequest) {
        String userId = UserContext.getUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Movie movie = contentRepository.findById(movieId).orElse(null);
        if (movie == null) {
            return ResponseEntity.notFound().build();
        }

        WatchHistory history = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId)
                .orElse(new WatchHistory());
        
        history.setUserId(userId);
        history.setMovieId(movieId);
        history.setLastWatchedTimeSeconds(progressRequest.getLastWatchedTimeSeconds());
        history.setTotalDurationSeconds(progressRequest.getTotalDurationSeconds());
        history.setGenre(movie.getGenre());
        
        if (progressRequest.getTotalDurationSeconds() > 0) {
            boolean completed = (progressRequest.getLastWatchedTimeSeconds() / progressRequest.getTotalDurationSeconds()) > 0.9;
            history.setCompleted(completed);
        }

        watchHistoryRepository.save(history);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{movieId}/watch-progress")
    public ResponseEntity<java.util.Map<String, Object>> getWatchProgress(
            @PathVariable String movieId) {
        String userId = UserContext.getUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        WatchHistory history = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId).orElse(null);
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        if (history != null) {
            response.put("movieId", movieId);
            response.put("watchedTimeSeconds", history.getLastWatchedTimeSeconds());
            response.put("totalDurationSeconds", history.getTotalDurationSeconds());
            response.put("completed", history.isCompleted());
            response.put("status", "FOUND");
        } else {
            response.put("movieId", movieId);
            response.put("watchedTimeSeconds", 0.0);
            response.put("totalDurationSeconds", 0.0);
            response.put("completed", false);
            response.put("status", "NOT_FOUND");
        }
        return ResponseEntity.ok(response);
    }
}
