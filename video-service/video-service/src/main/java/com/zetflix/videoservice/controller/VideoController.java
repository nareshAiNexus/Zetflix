package com.zetflix.videoservice.controller;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import com.zetflix.videoservice.service.VideoService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/videos")
@Slf4j
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class VideoController {

    private final VideoService videoService;

    /**
     * Upload video file for a movie Accepts multipart file upload POST
     * /api/v1/videos/upload/{movieId}
     */
    @PostMapping("/upload/{movieId}")
    public ResponseEntity<String> uploadVideo(@PathVariable String movieId, @RequestParam("file") MultipartFile file) throws IOException {
        log.info("Video uploaded request for movie : {}, file size {} ", movieId, file.getSize() / (1024 * 1024));
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is Empty");
        }
        String videoKey = videoService.uploadVideo(movieId, file);

        return ResponseEntity.ok("Video Uploaded Succesfully" + videoKey + "- Encoding started automatically via kafka");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body("File too large. Maximum upload size is 2GB.");
    }
}
