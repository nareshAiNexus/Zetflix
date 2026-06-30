package com.zetflix.encodingservice.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.zetflix.encodingservice.event.VideoUploadedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class VideoEventConsumer {

    private final EncodingService encodingService;

    /**
     * Listeners to video.uploaded Kafka topic.
     * Triggered when video service uploads a raw video to S3.
     * 
     * FLOW: 
     * 
     * Video Service -> S3 upload -> kafka (video.uploaded)
     *                            -> This Consumer
     *                            -> EncodingService -> FFmpeg -> S3
     *                            -> Kafka (video.encoded)
     */


    @KafkaListener(
        topics = "video.uploaded",
        groupId = "encoding-service-group"
    )

    public void consumeVideoUploadedEvent(VideoUploadedEvent event){
        log.info("Consumed VideoUploadedEvent for movie : {} file : {}", event.getMovieId(), event.getOriginalFileName());

        try {
            encodingService.encodeVideo(event);
        } catch (Exception e) {
            log.error("Failed to process encooding for movie : {} - {}", event.getMovieId(), e.getMessage());
        }
    }

}
