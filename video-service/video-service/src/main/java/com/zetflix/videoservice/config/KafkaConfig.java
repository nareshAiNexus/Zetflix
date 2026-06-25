package com.zetflix.videoservice.config;

import org.springframework.context.annotation.Configuration;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    /**
     * Published when the video is uploaded to S3
     * Encoding Service consumes this
     */
    @Bean
    public NewTopic videoUploadedtopic(){
        return TopicBuilder.name("video.uploaded")
            .partitions(3)
            .replicas(1)
            .build();
    }

    // Published when encoding is completed
    // ?
    @Bean
    public NewTopic videoEncodedTopic(){
        return TopicBuilder.name("video.encoded")
            .partitions(3)
            .replicas(1)
            .build();
    }
}
