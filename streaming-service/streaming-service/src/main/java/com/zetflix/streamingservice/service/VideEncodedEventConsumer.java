package com.zetflix.streamingservice.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.zetflix.streamingservice.event.VideoEncodedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class VideEncodedEventConsumer {

    private final RedisTemplate<String, String> redisTemplate;

    private static final String MASTER_PLAYLIST_KEY_PREFIX = "streaming:playlist";


    /**
     * Listens to video.encoded Kafka topic.
     * Stores master playlist key in Redis when encoding is complete
     * This allows StreaminService to quickly find the playlist key by movieId. 
     */

    @KafkaListener(
        topics="video.encoded",
        groupId="streaming-service"
    )
    public void consumeVideoEncodedEvent(java.util.Map<String, Object> payload) {
        String movieId = (String) payload.get("movieId");
        Boolean success = (Boolean) payload.get("success");
        String masterPlaylistKey = (String) payload.get("masterPlaylistKey");
        String errorMessage = (String) payload.get("errorMessage");

        log.info("Consumed VideoEncodedEvent for movie : {} success: {}", movieId, success);

        if (Boolean.TRUE.equals(success)) {
            // Store master playlist key in redis 
            String cacheKey = MASTER_PLAYLIST_KEY_PREFIX + ":" + movieId;
            redisTemplate.opsForValue().set(cacheKey, masterPlaylistKey);
            log.info("Stored master playlist key in Redis for movie: {} with key: {}", movieId, cacheKey);

            // Evict any cached partial signed playlists for this movie to prevent playing outdated segments
            try {
                java.util.Set<String> keys = redisTemplate.keys("streaming:signed:" + movieId + ":*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.delete(keys);
                    log.info("Evicted {} cached signed playlist keys for movie: {}", keys.size(), movieId);
                }
            } catch (Exception e) {
                log.warn("Failed to evict signed playlist keys: {}", e.getMessage());
            }
        }
        else{
            log.error("Video encoding failed for movie: {} with error: {}", movieId, errorMessage);
        }
    }
}
 