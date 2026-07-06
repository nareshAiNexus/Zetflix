package com.zetflix.videoservice.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.zetflix.videoservice.event.VideoUploadedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;


@Service
@Slf4j
@RequiredArgsConstructor
public class VideoService {
    private final S3Client s3Client;
    private final KafkaTemplate<String, VideoUploadedEvent> kafkaTemplate;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    private static final String VIDEO_UPLOADED_TOPIC = "video.uploaded";
    
    /**
     * Upload video to AWS S3 and publish VideoEvent to kafka
     * 
     * FLOW
     * 1. Receive Multipart video file
     * 2. generate unique s3 key 
     * 3. Upload to S3
     * 4. Publish video uploaded event to kafka
     * 5. Encoding Service picks up and start FFmpeg
     */

    public String uploadVideo(String movieId, MultipartFile file) throws IOException{
        log.info("Starting Video upload for movie: {} file : {}", movieId, file.getOriginalFilename());

        // Generate unique S3 key for raw video
        // Format : raw/movieId/uuid_filename

        String videoKey = "raw/" + movieId + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
        
        // Save multipart file to temp file first — AWS SDK requires mark/reset
        // support on input streams for retry logic, which MultipartFile doesn't provide.
        Path tempFile = Files.createTempFile("zetflix-upload-", ".tmp");
        try {
            Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);

            // Build send request to send video to S3
            log.info("Uploading to bucket: [{}]", bucketName);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(videoKey)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromFile(tempFile));
            log.info("Video uploaded to S3 Successfully Key: {}", videoKey);
        } finally {
            // Clean up temp file
            Files.deleteIfExists(tempFile);
        }

        // Publish event to kafka
        // Encoding Service will consume this and start FFmpeg processing

        VideoUploadedEvent event = new VideoUploadedEvent(
            movieId,
            videoKey,
            bucketName,
            file.getOriginalFilename(),
            file.getSize()
        );

        kafkaTemplate.send(VIDEO_UPLOADED_TOPIC, movieId, event);
        log.info("VideoUploadedEvent published for movie: {}", movieId);

        return videoKey;
    }
}

