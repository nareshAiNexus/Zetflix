package com.zetflix.streamingservice.controller;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zetflix.streamingservice.dto.StreamingResponse;
import com.zetflix.streamingservice.service.StreamingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/stream")
@Slf4j
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class StreamingController {

    private final StreamingService streamingService;
    private final RedisTemplate<String, String> redisTemplate;
    private static final String MASTER_PLAYLIST_KEY_PREFIX = "streaming:playlist";

    /**
     * GET Streaming URL for a movie
     * Returns presigned HLS master playlist URL
     * 
     * GET /api/v1/stream/{movieId}
     * @param movieId
     * @return StreamingResponse
     */

    @GetMapping("/{movieId}")
    public ResponseEntity<StreamingResponse> getStreamingURL(@PathVariable String movieId) {
        movieId = movieId.replace("\"", "").replace("'", "").trim();
        log.info("Request received to get streaming URL for movie : {}", movieId);

        // GET master playlist key from redis
        String playlistKey = redisTemplate.opsForValue().get(MASTER_PLAYLIST_KEY_PREFIX + ":" + movieId);
        if (playlistKey == null) {
            log.warn("Master playlist key not found in Redis for movie: {}. Attempting fallback to Content Service...", movieId);
            playlistKey = fetchPlaylistKeyFromContentService(movieId);
            if (playlistKey != null) {
                // Populate Redis cache
                redisTemplate.opsForValue().set(MASTER_PLAYLIST_KEY_PREFIX + ":" + movieId, playlistKey);
                log.info("Successfully recovered master playlist key from Content Service for movie: {}", movieId);
            } else {
                log.error("Master playlist key not found in redis or content-service for movie : {}", movieId);
                return ResponseEntity.notFound().build();
            }
        }

        StreamingResponse response = streamingService.getStreamingURL(movieId, playlistKey);
        return ResponseEntity.ok(response);

    }

    /**
     * Server signed m3u8 playlist content
     * Called by HLS player for each quality
     * 
     * @param movieId
     * @param path
     * @return
     */

    @GetMapping("/{movieId}/playlist")
    public ResponseEntity<String> getSignedPlaylist(@PathVariable String movieId, @RequestParam String path){
        movieId = movieId.replace("\"", "").replace("'", "").trim();
        String signedPlaylist = streamingService.getSignedPlaylist(movieId, path);

        return ResponseEntity.ok()
            .header("Content-Type", "application/x-mpegURL")
            .header("Cache-Control", "no-cache, no-store, must-revalidate")
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .body(signedPlaylist);
    }

    private String fetchPlaylistKeyFromContentService(String movieId) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:8081/api/v1/movies/" + movieId))
                    .GET()
                    .build();
            
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                String body = response.body();
                // If an HLS URL is present and not null/empty, the movie is ready to stream
                if (body.contains("\"hlsUrl\"") && !body.contains("\"hlsUrl\":null") && !body.contains("\"hlsUrl\":\"\"")) {
                    return "encoded/" + movieId + "/master.m3u8";
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch movie metadata from content service", e);
        }
        return null;
    }

}
