package com.zetflix.contentservice.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import com.zetflix.contentservice.model.VideoStatus;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class VideoUploadedEncodedEventConsumer {

    private final ContentService contentService;

    @KafkaListener(topics = "video.uploaded")
    public void consumeVideoUploadedEvent(@Payload Map<String, Object> payload) {
        String movieId = (String) payload.get("movieId");
        String videoKey = (String) payload.get("videoKey");
        log.info("Video uploaded for movie : {} key: {}", movieId, videoKey);
        contentService.updateVideoKey(movieId, videoKey);
    }

    @KafkaListener(topics = "video.encoded")
    public void consumeVideoEncodedEvent(@Payload Map<String, Object> payload) {
        String movieId = (String) payload.get("movieId");
        String hlsUrl = (String) payload.get("hlsUrl");
        Boolean success = (Boolean) payload.get("success");

        if (Boolean.TRUE.equals(success)) {
            contentService.updateHlsUrl(movieId, hlsUrl);
        } else {
            String errorMessage = (String) payload.get("errorMessage");
            contentService.updateVideoStatus(movieId, VideoStatus.FAILED);
            log.error("Video encoding failed for movie : {} error: {}", movieId, errorMessage);
        }
    }
}
