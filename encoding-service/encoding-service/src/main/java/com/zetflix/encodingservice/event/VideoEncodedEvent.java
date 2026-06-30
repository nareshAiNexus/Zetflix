package com.zetflix.encodingservice.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor
@AllArgsConstructor
public class VideoEncodedEvent {
    private String movieId;
    private String hlsUrl; // Master playlist URL for streaming 
    private String masterPlaylistKey; // S3 key if master.m3u8 
    private boolean success;
    private String errorMessage; // Id encoding failed 
}
