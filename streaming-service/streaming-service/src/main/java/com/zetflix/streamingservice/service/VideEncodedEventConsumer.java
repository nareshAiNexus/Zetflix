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
    public void consumeVideoEncodedEvent(VideoEncodedEvent event) {
        log.info("Consumed VideoEncodedEvent for movie : {} success: {}", event.getMovieId(), event.isSuccess());

        if (event.isSuccess()) {
            // Store master playlist key in redis 
            String cacheKey = MASTER_PLAYLIST_KEY_PREFIX + event.getMovieId();
            redisTemplate.opsForValue().set(cacheKey, event.getMasterPlaylistKey());
            log.info("Stored master playlist key in Redis for movie: {} with key: {}", event.getMovieId(), cacheKey);
        }
        else{
            log.error("Video encoding failed for movie: {} with error: {}", event.getMovieId(), event.getErrorMessage());
            
        }
    }
}
 