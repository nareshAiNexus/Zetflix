package com.zetflix.contentservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

/**
 * kafkaListener
 */
@Service
@Slf4j
public class kafkaListener {

    @KafkaListener(topics = "video-processing", groupId = "content-service")
    public void listen(String message){
        log.info("Received message: {}", message);
    }

}
